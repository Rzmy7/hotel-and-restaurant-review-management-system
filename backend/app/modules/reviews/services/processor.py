"""
Review Processor — orchestrates the AI analysis pipeline.
Refactored to use SQLAlchemy ORM for database operations.
"""

import asyncio
import json
import logging
import os
import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.modules.reviews.models import ProcessedReview, ReviewCategory
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
        db = SessionLocal()
        try:
            # Check if processing is paused
            from app.modules.admin.services.system_settings_service import get_setting_bool_orm
            if get_setting_bool_orm(db, "review_processing_paused", default=False):
                logger.warning("Review processing is paused due to Gemini API limits. Skipping...")
                break

            # 1. Fetch pending reviews
            pending_reviews = get_pending_batch(db, limit=BATCH_SIZE)

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
            ai_input = [
                {
                    "id": str(r.id),
                    "rating": r.rating,
                    "reviewerName": r.reviewerName,
                    "text": r.text,
                    "positive_text": r.positive_text,
                    "negative_text": r.negative_text,
                    "heading": r.heading,
                    "reviewDate": str(r.reviewDate),
                }
                for r in pending_reviews
            ]

            try:
                ai_results = await asyncio.to_thread(analyze_reviews_batch, ai_input)
            except Exception as e:
                logger.error(f"!!! Gemini batch analysis FAILED: {e}", exc_info=True)
                _mark_batch_as_failed(db, pending_reviews, str(e))
                db.commit()

                # Log system alert
                try:
                    from app.modules.admin.services.system_alert_logger import (
                        alert_review_processing_batch_failed_orm,
                    )
                    alert_review_processing_batch_failed_orm(
                        db,
                        batch_size=len(pending_reviews),
                        error_msg=str(e)[:300],
                    )
                except Exception as alert_err:
                    logger.warning(f"Failed to log alert: {alert_err}")

                break

            # 3. Process results and update DB
            results_map = {str(res["id"]): res for res in ai_results if "id" in res}

            batch_success_count = 0
            for review in pending_reviews:
                r_id_str = str(review.id)
                analysis = results_map.get(r_id_str)

                if analysis:
                    try:
                        success = _update_review_success(db, review, analysis)
                        if success:
                            batch_success_count += 1
                    except Exception as e:
                        logger.error(f"Failed to update review {r_id_str}: {e}")
                        _update_review_failure(db, review, f"Update failed: {e}")
                else:
                    logger.warning(f"No AI result found for review {r_id_str}")
                    _update_review_failure(db, review, "AI skipped this record.")

            db.commit()
            total_processed += batch_success_count
            logger.info(
                f"Batch {loop_count} COMPLETED: {batch_success_count}/{len(pending_reviews)} successful."
            )
        except Exception as outer_err:
            logger.error(f"Outer pipeline loop error: {outer_err}")
            break
        finally:
            db.close()
    
    if loop_count >= max_loops:
        logger.warning(f"Pipeline reached max_loops ({max_loops}). Some pending reviews may remain.")


async def process_single_review(review_id: uuid.UUID) -> dict:
    """
    On-demand AI processing for a single review.
    """
    logger.info(f"--- Starting Single Review Analysis: {review_id} ---")

    db = SessionLocal()
    try:
        # 1. Fetch the specific review
        review = get_review_by_id(db, review_id)
        if not review:
            raise ValueError(f"Review with ID {review_id} not found.")

        # 2. Analyze with Gemini
        ai_input = [{
            "id": str(review.id),
            "rating": review.rating,
            "reviewerName": review.reviewerName,
            "text": review.text,
            "positive_text": review.positive_text,
            "negative_text": review.negative_text,
            "heading": review.heading,
            "reviewDate": str(review.reviewDate),
        }]

        try:
            ai_results = await asyncio.to_thread(analyze_reviews_batch, ai_input)
            if not ai_results:
                raise RuntimeError("AI analysis returned no results.")
            
            analysis = ai_results[0]
        except Exception as e:
            logger.error(f"!!! Single review analysis FAILED for {review_id}: {e}")
            _update_review_failure(db, review, f"Single process failed: {e}")
            db.commit()
            raise e

        # 3. Update DB
        try:
            success = _update_review_success(db, review, analysis)
            if not success:
               raise RuntimeError("Failed to update review record in database.")
            
            db.commit()
            logger.info(f"Single review {review_id} PROCESSED successfully.")
            return analysis
        except Exception as e:
            logger.error(f"Failed to update single review {review_id}: {e}")
            db.rollback()
            raise e
    finally:
        db.close()


def _update_review_success(
    db: Session, review: ProcessedReview, analysis: dict
) -> bool:
    """Update a review with AI-generated insights and set status to 'processed'."""
    review.sentiment = analysis.get("sentiment", "Neutral")
    review.sentiment_score = analysis.get("sentiment_score", 3.0)
    review.language = analysis.get("language", "English")
    review.categories = json.dumps(analysis.get("categories", []), ensure_ascii=False)
    review.keyPhrases = json.dumps(analysis.get("keyPhrases", []), ensure_ascii=False)
    review.summary = analysis.get("summary")
    review.ai_reply = analysis.get("ai_reply")
    review.status = "processed"
    review.last_attempt = datetime.now()
    review.error_message = None

    # Sync categories to dedicated table
    try:
        # Delete existing categories for this review
        db.query(ReviewCategory).filter(ReviewCategory.review_id == review.id).delete()
        
        raw_list = analysis.get("categories", [])
        if isinstance(raw_list, list):
            for cat_item in raw_list:
                name = ""
                score = None
                
                if isinstance(cat_item, dict):
                    name = str(cat_item.get("name", "")).strip()
                    score = cat_item.get("score") or cat_item.get("value")
                else:
                    name = str(cat_item).strip()
                
                if score is None:
                    score = float(review.sentiment_score) * 100
                else:
                    try:
                        score = float(score)
                    except (ValueError, TypeError):
                        score = 50.0

                if name:
                    db.add(ReviewCategory(
                        review_id=review.id,
                        name=name,
                        score=score
                    ))
    except Exception as e:
        logger.error(f"Failed to sync categories for review {review.id}: {e}")
        
    return True


def _update_review_failure(db: Session, review: ProcessedReview, error: str):
    """Log a failure for a specific review and increment retry count."""
    review.retry_count += 1
    if review.retry_count >= MAX_RETRIES:
        review.status = "failed"
    else:
        review.status = "pending"
    
    review.error_message = error[:500]
    review.last_attempt = datetime.now()


def _mark_batch_as_failed(db: Session, batch: List[ProcessedReview], error: str):
    """Mark an entire batch as pending/failed if the API call itself fails."""
    for review in batch:
        _update_review_failure(db, review, error)
