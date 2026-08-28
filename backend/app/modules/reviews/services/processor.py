"""
Review Processor — orchestrates the AI analysis pipeline.
"""

from pyasn1.type.univ import Any
import asyncio
import json
import uuid
import logging
import os
import time
from datetime import datetime

import pyodbc
from app.core.pyodbc_connection import get_raw_connection, retry_on_deadlock
from app.modules.reviews.repository import (
    get_pending_batch,
    get_review_by_id,
    get_org_ids_for_reviews,
)
from app.modules.reviews.services.llm_client import analyze_reviews_batch

logger = logging.getLogger(__name__)

MAX_RETRIES = int(os.getenv("MAX_RETRY_ATTEMPTS", 3))
MAX_RUN_TIME = 35  # Reduced from 45 to allow more buffer for individual batch overhead


@retry_on_deadlock(max_retries=3)
def _update_reviews_batch_tx(reviews_batch: list, results_map: dict, error_msg: str = None) -> int:
    """Update a small batch of reviews inside a single database transaction, with deadlock retries."""
    with get_raw_connection() as conn:
        cursor = conn.cursor()
        success_count = 0
        for review in reviews_batch:
            r_id_str = str(review["id"])
            if error_msg:
                _update_review_failure(cursor, review["id"], error_msg)
            else:
                analysis = results_map.get(r_id_str)
                if analysis:
                    try:
                        success = _update_review_success(cursor, review, analysis)
                        if success:
                            success_count += 1
                    except Exception as e:
                        logger.error(f"Failed to update review {r_id_str}: {e}")
                        _update_review_failure(cursor, review["id"], f"Update failed: {e}")
                else:
                    logger.warning(f"No AI result found for review {r_id_str}")
                    _update_review_failure(cursor, review["id"], "AI skipped this record.")
        return success_count


@retry_on_deadlock(max_retries=3)
def _update_single_review_tx(review: dict, analysis: dict) -> bool:
    """Update a single review inside its own transaction block with deadlock retries."""
    with get_raw_connection() as conn:
        return _update_review_success(conn.cursor(), review, analysis)


@retry_on_deadlock(max_retries=3)
def _reset_reviews_to_pending_tx(reviews_batch: list) -> None:
    """Reset a batch of reviews from 'processing' status back to 'pending'."""
    if not reviews_batch:
        return
    with get_raw_connection() as conn:
        cursor = conn.cursor()
        ids = [r["id"] for r in reviews_batch]
        placeholders = ",".join(["?"] * len(ids))
        cursor.execute(
            f"UPDATE dbo.processed_review SET status = 'pending' WHERE id IN ({placeholders}) AND status = 'processing'",
            *ids
        )
        conn.commit()


async def run_analysis_pipeline():
    """
    Main entry point for the AI processing background task.
    Fetches pending reviews, analyzes with LLM, and updates the database.
    Processes in batches until no pending reviews remain or time limit is reached.
    """
    logger.info("--- Starting Review Analysis Pipeline ---")
    start_time = time.time()

    # 0. Startup recovery: Reset any reviews stuck in 'processing' status (e.g. from an abrupt crash/restart) back to 'pending'
    try:
        with get_raw_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE dbo.processed_review SET status = 'pending' WHERE status = 'processing'")
            conn.commit()
    except Exception as e:
        logger.warning(f"Pipeline: Failed to reset stuck 'processing' reviews on start: {e}")

    # Read batch size and parallel batches from DB so admin panel changes take effect each run.
    batch_size = 5  # safe fallback if DB read fails
    parallel_batches = 1  # safe fallback
    try:
        from app.modules.admin.services.system_settings_service import get_review_batch_size, get_review_parallel_batches
        with get_raw_connection() as _conf_conn:
            cursor = _conf_conn.cursor()
            batch_size = get_review_batch_size(cursor)
            parallel_batches = get_review_parallel_batches(cursor)
    except Exception as _e:
        logger.warning(f"Could not read settings from DB, using defaults: {_e}")
    logger.info(f"Pipeline: batch_size={batch_size}, parallel_batches={parallel_batches}")

    total_processed = 0
    max_loops = 50  # Safety cap to prevent infinite processing in one task
    loop_count = 0
    affected_org_ids: set = set()  # orgs with newly processed reviews (cache invalidation)

    while loop_count < max_loops:
        # Check if we have exceeded the time limit for this run
        elapsed = time.time() - start_time
        if elapsed > MAX_RUN_TIME:
            logger.info(f"Pipeline: Reached time limit ({elapsed:.1f}s / {MAX_RUN_TIME}s). Exiting current run.")
            # Revert any remaining unprocessed reviews back to pending if they are still 'processing'
            break

        loop_count += 1

        # 1. Fetch pending reviews inside a short-lived connection
        try:
            with get_raw_connection() as conn:
                cursor = conn.cursor()
                from app.modules.admin.services.system_settings_service import get_setting_bool
                if get_setting_bool(cursor, "review_processing_paused", default=False):
                    logger.warning("Review processing is paused due to API limits. Skipping...")
                    break
                total_limit = batch_size * parallel_batches
                pending_reviews = get_pending_batch(cursor, limit=total_limit)
        except Exception as e:
            logger.error(f"Failed to check paused setting or fetch pending reviews: {e}")
            break

        if not pending_reviews:
            if loop_count == 1:
                logger.info("Pipeline: No pending reviews found in DB. Nothing to analyze.")
            else:
                logger.info(f"Pipeline: Finished processing. Total processed: {total_processed}")
            break

        logger.info(
            f"Pipeline [Iteration {loop_count}]: Processing {len(pending_reviews)} reviews in up to {parallel_batches} parallel batches..."
        )

        # Split pending reviews into chunks of size batch_size
        chunks = [pending_reviews[i:i + batch_size] for i in range(0, len(pending_reviews), batch_size)]

        # Define an async helper to process a single chunk
        async def process_chunk(chunk):
            try:
                ai_input = [
                    {
                        "id": str(r["id"]),
                        "rating": r["rating"],
                        "reviewerName": r["reviewerName"],
                        "text": r.get("text"),
                        "positive_text": r.get("positive_text"),
                        "negative_text": r.get("negative_text"),
                        "heading": r.get("heading"),
                        "reviewDate": str(r["reviewDate"]),
                    }
                    for r in chunk
                ]
                ai_results = await asyncio.to_thread(analyze_reviews_batch, ai_input)
                
                results_map = {str(res["id"]): res for res in ai_results if "id" in res}
                
                # Update DB in small transaction blocks
                chunk_success_count = 0
                UPDATE_TX_BATCH_SIZE = 15
                for j in range(0, len(chunk), UPDATE_TX_BATCH_SIZE):
                    sub_batch = chunk[j:j + UPDATE_TX_BATCH_SIZE]
                    chunk_success_count += _update_reviews_batch_tx(sub_batch, results_map)
                
                return chunk_success_count, None
            except Exception as exc:
                return 0, (chunk, exc)

        # 2. Analyze all chunks concurrently with LLM
        tasks = [process_chunk(chunk) for chunk in chunks]
        results = await asyncio.gather(*tasks)

        batch_success_count = 0
        chunk_errors = []
        for success_count, err_info in results:
            batch_success_count += success_count
            if err_info:
                chunk_errors.append(err_info)

        total_processed += batch_success_count

        # Collect orgs affected by this iteration for post-run cache invalidation
        if batch_success_count > 0:
            try:
                with get_raw_connection() as conn:
                    _affected = get_org_ids_for_reviews(
                        conn.cursor(), [r["id"] for r in pending_reviews]
                    )
                affected_org_ids.update(_affected)
            except Exception as e:
                logger.warning(f"Pipeline: failed to resolve org ids for batch: {e}")

        # Handle any chunk errors
        if chunk_errors:
            for chunk, e in chunk_errors:
                err_msg = str(e)
                from tenacity import RetryError
                from app.modules.reviews.services.llm_client import _detect_fatal_error, auto_pause_review_processing

                # Determine if the error is a general API/network/overload error
                underlying_exc = e
                if isinstance(e, RetryError):
                    underlying_exc = e.last_attempt.exception() or e

                underlying_msg = str(underlying_exc)
                underlying_msg_lower = underlying_msg.lower()

                is_fatal, fatal_reason = _detect_fatal_error(underlying_exc)

                is_api_error = is_fatal or any(
                    k in underlying_msg_lower for k in [
                        "overloaded", "busy", "rate limit", "rate_limit", "quota",
                        "credit", "billing", "token limit", "connection", "timeout",
                        "platform overloaded", "try again later", "503", "502", "504", "500", "429",
                        "encryption", "key"
                    ]
                )

                # Pure JSON format error from LLM output (not an API or runtime failure)
                is_json_parse_error = isinstance(underlying_exc, (json.JSONDecodeError, ValueError)) and ("json" in underlying_msg_lower or "decode" in underlying_msg_lower or "delimiter" in underlying_msg_lower) and not is_api_error

                # Fallback: ONLY attempt single-review processing if it's purely a JSON formatting issue in the batch output
                if is_json_parse_error and not is_api_error:
                    logger.warning(f"Chunk JSON parse failed ({err_msg}). Attempting single-review fallback for {len(chunk)} reviews...")
                    fallback_success = 0
                    stop_run = False
                    for r in chunk:
                        try:
                            single_input = [{
                                "id": str(r["id"]),
                                "rating": r["rating"],
                                "reviewerName": r["reviewerName"],
                                "text": r.get("text"),
                                "positive_text": r.get("positive_text"),
                                "negative_text": r.get("negative_text"),
                                "heading": r.get("heading"),
                                "reviewDate": str(r["reviewDate"]),
                            }]
                            single_res = await asyncio.to_thread(analyze_reviews_batch, single_input)
                            if single_res and len(single_res) > 0:
                                success = _update_single_review_tx(r, single_res[0])
                                if success:
                                    fallback_success += 1
                        except Exception as se:
                            logger.error(f"Fallback failed for review {r['id']}: {se}")
                            stop_run = True
                            break

                    total_processed += fallback_success
                    logger.info(f"Fallback completed: {fallback_success}/{len(chunk)} recovered.")
                    if stop_run:
                        unprocessed = [r for r in chunk if r["id"] not in [x["id"] for x in chunk[:fallback_success]]]
                        _reset_reviews_to_pending_tx(unprocessed)
                        break
                    continue

                # If it's an API error, encryption/config failure, or quota limit:
                # 1. Revert reviews in this chunk back to pending status
                # 2. Trigger auto-pause if fatal
                # 3. Stop current pipeline run immediately
                _reset_reviews_to_pending_tx(chunk)

                if is_fatal:
                    logger.warning(f"Fatal/API error in review processing pipeline: {underlying_msg}. Auto-pausing.")
                    auto_pause_review_processing(
                        reason=fatal_reason or "api_error",
                        error_message=underlying_msg,
                    )
                else:
                    logger.error(f"LLM chunk analysis failed due to API/network error: {underlying_msg}")

            # Stop execution of the current pipeline run immediately on chunk failure
            break

        logger.info(
            f"Iteration {loop_count} COMPLETED: {batch_success_count}/{len(pending_reviews)} successful."
        )

    if loop_count >= max_loops:
        logger.warning(f"Pipeline reached max_loops ({max_loops}). Some pending reviews may remain.")

    # Post-run: invalidate caches for orgs with newly processed reviews.
    # Fully guarded so cache failures never break the pipeline.
    if affected_org_ids:
        try:
            from app.core.redis_client import invalidate_review_cache, invalidate_ai_cache
            for org_id in affected_org_ids:
                invalidate_review_cache(org_id)
                invalidate_ai_cache(org_id)
        except Exception as e:
            logger.warning(f"Pipeline: cache invalidation failed: {e}")



async def process_single_review(review_id: uuid.UUID) -> dict:
    """
    On-demand AI processing for a single review.
    Fetches the record, analyzes with LLM Gateway, and updates the database.
    """
    logger.info(f"--- Starting Single Review Analysis: {review_id} ---")

    # 1. Fetch the specific review in a short-lived connection
    try:
        with get_raw_connection() as conn:
            cursor = conn.cursor()
            review = get_review_by_id(cursor, review_id)
            if not review:
                raise ValueError(f"Review with ID {review_id} not found.")
    except Exception as e:
        logger.error(f"Failed to fetch single review {review_id}: {e}")
        raise e

    # 2. Analyze with LLM Gateway
    ai_input = [{
        "id": str(review["id"]),
        "rating": review["rating"],
        "reviewerName": review["reviewerName"],
        "text": review.get("text"),
        "positive_text": review.get("positive_text"),
        "negative_text": review.get("negative_text"),
        "heading": review.get("heading"),
        "reviewDate": str(review["reviewDate"]),
    }]

    try:
        ai_results = await asyncio.to_thread(analyze_reviews_batch, ai_input)
        if not ai_results:
            raise RuntimeError("AI analysis returned no results.")
        analysis = ai_results[0]
    except Exception as e:
        logger.error(f"!!! Single review analysis FAILED for {review_id}: {e}")
        _update_single_review_failure_tx(review_id, f"Single process failed: {e}")
        raise e

    # 3. Update DB in its own transaction with deadlock retry
    try:
        success = _update_single_review_tx(review, analysis)
        if not success:
            raise RuntimeError("Failed to update review record in database.")
        logger.info(f"Single review {review_id} PROCESSED successfully.")
    except Exception as e:
        logger.error(f"Failed to update single review {review_id}: {e}")
        raise e

    # 4. Post-processing: invalidate caches for the affected org.
    #    Guarded — must not fail the call.
    try:
        with get_raw_connection() as conn:
            org_ids = get_org_ids_for_reviews(conn.cursor(), [review["id"]])
        if org_ids:
            from app.core.redis_client import invalidate_review_cache, invalidate_ai_cache
            for org_id in org_ids:
                invalidate_review_cache(org_id)
                invalidate_ai_cache(org_id)
    except Exception as e:
        logger.warning(f"Single review: cache invalidation failed: {e}")

    return analysis



def _update_review_success(
    cursor: pyodbc.Cursor, original_review: dict, analysis: dict
) -> bool:
    """Update a review with AI-generated insights and set status to 'processed'."""
    sql = """
        UPDATE dbo.processed_review
        SET sentiment = ?,
            sentiment_score = ?,
            language = ?,
            categories = ?,
            keyPhrases = ?,
            summary = ?,
            positive_text = ?,
            negative_text = ?,
            ai_reply = ?,
            status = 'processed',
            last_attempt = ?,
            error_message = NULL
        WHERE id = ?
    """

    # Format list fields as JSON strings for SQL Server NVARCHAR(MAX)
    categories = json.dumps(analysis.get("categories", []), ensure_ascii=False)
    key_phrases = json.dumps(analysis.get("keyPhrases", []), ensure_ascii=False)

    # Strictly preserve original text if provided by scraper.
    # No extraction if original was null/empty (as requested: "remain empty").
    final_pos = original_review.get("positive_text")
    final_neg = original_review.get("negative_text")

    cursor.execute(
        sql,
        analysis.get("sentiment", "Neutral"),
        analysis.get("sentiment_score", 3.0),
        analysis.get("language", "English"),
        categories,
        key_phrases,
        analysis.get("summary"),
        final_pos,
        final_neg,
        analysis.get("ai_reply"),
        datetime.now(),
        original_review["id"],
    )

    # NEW: Sync categories to dedicated dbo.review_category table
    try:
        review_id = original_review["id"]
        # Using CAST to ensure UNIQUEIDENTIFIER compatibility across drivers
        cursor.execute("DELETE FROM dbo.review_category WHERE review_id = CAST(? AS UNIQUEIDENTIFIER)", review_id)
        
        raw_list = analysis.get("categories", [])
        if isinstance(raw_list, list):
            for cat_item in raw_list:
                name = ""
                score = None
                
                if isinstance(cat_item, dict):
                    name = str(cat_item.get("name", "")).strip()
                    # Support both 'score' and 'value' as keys (AI can be inconsistent)
                    score = cat_item.get("score") or cat_item.get("value")
                else:
                    name = str(cat_item).strip()
                
                # Default score if missing (fallback to overall sentiment mapping)
                if score is None:
                    sentiment_score = analysis.get("sentiment_score", 0.5) 
                    score = float(sentiment_score) * 100
                else:
                    try:
                        score = float(score)
                    except (ValueError, TypeError):
                        score = 50.0

                if name:
                    # Explicitly target columns, letting ID and CreatedAt use DB defaults
                    cursor.execute(
                        "INSERT INTO dbo.review_category (review_id, name, score) VALUES (CAST(? AS UNIQUEIDENTIFIER), ?, ?)",
                        review_id, name, score
                    )
    except Exception as e:
        logger.error(f"Failed to sync categories to table for review {original_review['id']}: {e}")
        # We don't fail the whole update if only the category sync fails
        
    return cursor.rowcount > 0


def _save_batch_results(cursor: pyodbc.Cursor, pending_reviews: list, ai_results: list):
    """Helper to save results for a whole batch. Used when exiting early due to time."""
    results_map = {str(res["id"]): res for res in ai_results if "id" in res}
    for review in pending_reviews:
        r_id_str = str(review["id"])
        analysis = results_map.get(r_id_str)
        if analysis:
            try:
                _update_review_success(cursor, review, analysis)
            except Exception as e:
                logger.error(f"Failed to update review {r_id_str} during early exit: {e}")
                _update_review_failure(cursor, review["id"], f"Update failed: {e}")
        else:
            _update_review_failure(cursor, review["id"], "AI skipped this record during early exit.")


def _update_review_failure(cursor: pyodbc.Cursor, review_id: Any, error: str):
    """Log a failure for a specific review and increment retry count."""
    sql = """
        UPDATE dbo.processed_review
        SET status = CASE WHEN retry_count >= ? THEN 'failed' ELSE 'pending' END,
            error_message = ?,
            retry_count = retry_count + 1,
            last_attempt = ?
        WHERE id = ?
    """
    cursor.execute(sql, MAX_RETRIES - 1, error[:500], datetime.now(), review_id)


def _mark_batch_as_failed(cursor: pyodbc.Cursor, batch: list, error: str):
    """Mark an entire batch as pending/failed if the API call itself fails."""
    for review in batch:
        _update_review_failure(cursor, review["id"], error)
