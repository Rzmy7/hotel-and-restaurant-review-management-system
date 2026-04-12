"""
Review Processor — orchestrates the AI analysis pipeline.
"""

import json
import logging
import os
from datetime import datetime

import pyodbc
from app.core.pyodbc_connection import get_connection_string
from app.modules.reviews.repository import get_pending_batch
from app.modules.reviews.services.gemini_client import analyze_reviews_batch

logger = logging.getLogger(__name__)

# Configuration from environment
BATCH_SIZE = int(os.getenv("GEMINI_BATCH_SIZE", 10))
MAX_RETRIES = int(os.getenv("MAX_RETRY_ATTEMPTS", 3))


async def run_analysis_pipeline():
    """
    Main entry point for the AI processing background task.
    Fetches pending reviews, analyzes with Gemini, and updates the database.
    """
    logger.info("--- Starting Review Analysis Pipeline ---")
    
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        
        # 1. Fetch pending reviews
        try:
            pending_reviews = get_pending_batch(cursor, limit=BATCH_SIZE)
        except Exception as e:
            logger.error(f"Failed to fetch pending reviews: {e}")
            return

        if not pending_reviews:
            logger.info("Pipeline: No pending reviews found in DB. Nothing to analyze.")
            return

        logger.info(f"Pipeline: Processing batch of {len(pending_reviews)} reviews with Gemini...")

        # 2. Analyze with Gemini
        try:
            # Prepare data for AI (only send fields needed for context)
            ai_input = [
                {
                    "id": str(r["id"]),
                    "rating": r["rating"],
                    "reviewerName": r["reviewerName"],
                    "text": r["text"],
                    "reviewDate": str(r["reviewDate"])
                }
                for r in pending_reviews
            ]
            
            ai_results = analyze_reviews_batch(ai_input)
            
        except Exception as e:
            logger.error(f"!!! Gemini batch analysis FAILED: {e}", exc_info=True)
            # Mark these as failed for retry
            _mark_batch_as_failed(cursor, pending_reviews, str(e))
            conn.commit()
            return

        # 3. Process results and update DB
        # We use a map for faster lookup since AI might reorder results
        results_map = {str(res["id"]): res for res in ai_results if "id" in res}
        
        processed_count = 0
        for review in pending_reviews:
            r_id_str = str(review["id"])
            analysis = results_map.get(r_id_str)
            
            if analysis:
                try:
                    success = _update_review_success(cursor, review["id"], analysis)
                    if success:
                        processed_count += 1
                except Exception as e:
                    logger.error(f"Failed to update review {r_id_str}: {e}")
                    _update_review_failure(cursor, review["id"], f"Update failed: {e}")
            else:
                logger.warning(f"No AI result found for review {r_id_str}")
                _update_review_failure(cursor, review["id"], "AI skipped this record.")

        conn.commit()
        logger.info(f"Successfully processed {processed_count}/{len(pending_reviews)} reviews.")


def _update_review_success(cursor: pyodbc.Cursor, review_id: Any, analysis: dict) -> bool:
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
    
    cursor.execute(
        sql,
        analysis.get("sentiment", "Neutral"),
        analysis.get("sentiment_score", 3.0),
        analysis.get("language", "English"),
        categories,
        key_phrases,
        analysis.get("summary"),
        analysis.get("positive_text"),
        analysis.get("negative_text"),
        analysis.get("ai_reply"),
        datetime.now(),
        review_id
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
