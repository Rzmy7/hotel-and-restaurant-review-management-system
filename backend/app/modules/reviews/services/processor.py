"""
Review Processor — orchestrates the AI analysis pipeline.
"""

from pyasn1.type.univ import Any
import asyncio
import json
import uuid
import logging
import os
from datetime import datetime

import pyodbc
from app.core.pyodbc_connection import get_connection_string
from app.modules.reviews.repository import get_pending_batch, get_review_by_id
from app.modules.reviews.services.gemini_client import analyze_reviews_batch

logger = logging.getLogger(__name__)

# Configuration from environment
BATCH_SIZE = int(os.getenv("GEMINI_BATCH_SIZE", 10))
MAX_RETRIES = int(os.getenv("MAX_RETRY_ATTEMPTS", 3))


async def run_analysis_pipeline():
    """
    Main entry point for the AI processing background task.
    Fetches pending reviews, analyzes with Gemini, and updates the database.
    Processes in batches until no pending reviews remain.
    """
    logger.info("--- Starting Review Analysis Pipeline ---")
    
    total_processed = 0
    max_loops = 50  # Safety cap to prevent infinite processing in one task
    loop_count = 0

    while loop_count < max_loops:
        loop_count += 1
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()

            # 1. Fetch pending reviews
            try:
                pending_reviews = get_pending_batch(cursor, limit=BATCH_SIZE)
            except Exception as e:
                logger.error(f"Failed to fetch pending reviews: {e}")
                break

            if not pending_reviews:
                if loop_count == 1:
                    logger.info("Pipeline: No pending reviews found in DB. Nothing to analyze.")
                else:
                    logger.info(f"Pipeline: Finished processing. Total processed: {total_processed}")
                break

            logger.info(
                f"Pipeline [Batch {loop_count}]: Processing {len(pending_reviews)} reviews..."
            )

            # 2. Analyze with Gemini
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
                    for r in pending_reviews
                ]

                ai_results = await asyncio.to_thread(analyze_reviews_batch, ai_input)

            except Exception as e:
                logger.error(f"!!! Gemini batch analysis FAILED: {e}", exc_info=True)
                _mark_batch_as_failed(cursor, pending_reviews, str(e))
                conn.commit()
                # Stop processing this run if API fails
                break

            # 3. Process results and update DB
            results_map = {str(res["id"]): res for res in ai_results if "id" in res}

            batch_success_count = 0
            for review in pending_reviews:
                r_id_str = str(review["id"])
                analysis = results_map.get(r_id_str)

                if analysis:
                    try:
                        success = _update_review_success(cursor, review, analysis)
                        if success:
                            batch_success_count += 1
                    except Exception as e:
                        logger.error(f"Failed to update review {r_id_str}: {e}")
                        _update_review_failure(cursor, review["id"], f"Update failed: {e}")
                else:
                    logger.warning(f"No AI result found for review {r_id_str}")
                    _update_review_failure(cursor, review["id"], "AI skipped this record.")

            conn.commit()
            total_processed += batch_success_count
            logger.info(
                f"Batch {loop_count} COMPLETED: {batch_success_count}/{len(pending_reviews)} successful."
            )
    
    if loop_count >= max_loops:
        logger.warning(f"Pipeline reached max_loops ({max_loops}). Some pending reviews may remain.")


async def process_single_review(review_id: uuid.UUID) -> dict:
    """
    On-demand AI processing for a single review.
    Fetches the record, analyzes with Gemini, and updates the database.
    """
    logger.info(f"--- Starting Single Review Analysis: {review_id} ---")

    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()

        # 1. Fetch the specific review
        review = get_review_by_id(cursor, review_id)
        if not review:
            raise ValueError(f"Review with ID {review_id} not found.")

        # 2. Analyze with Gemini
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
            _update_review_failure(cursor, review_id, f"Single process failed: {e}")
            conn.commit()
            raise e

        # 3. Update DB
        try:
            success = _update_review_success(cursor, review, analysis)
            if not success:
               raise RuntimeError("Failed to update review record in database.")
            
            conn.commit()
            logger.info(f"Single review {review_id} PROCESSED successfully.")
            return analysis
        except Exception as e:
            logger.error(f"Failed to update single review {review_id}: {e}")
            conn.rollback()
            raise e


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
    return cursor.rowcount > 0


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
