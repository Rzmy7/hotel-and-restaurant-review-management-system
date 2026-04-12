"""
Review Management Routes — API endpoints for listing, deleting, and AI reply generation.
"""

import uuid
import logging
from typing import List

import pyodbc
from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.db_utils import get_connection_string
from app.modules.auth.utils.auth_utils import get_current_user
from app.modules.admin.services.subscription_service import increment_feature_usage
from app.modules.reviews.schemas import ReviewModel, ReplyGenerationRequest, ReplyGenerationResponse
from app.modules.reviews.services.processor import process_single_review
from app.modules.reviews.services.review_service import (
    get_all_reviews_from_db,
    count_all_reviews,
    start_ingestion_and_processing_flow,
    get_processing_report
)
from app.modules.reviews.services.reply_generation_service import generate_review_reply

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


@router.get("/{organization_id}", response_model=List[ReviewModel])
def read_reviews(organization_id: uuid.UUID):
    """Fetch all processed reviews for a specific organization."""
    try:
        return get_all_reviews_from_db(str(organization_id))
    except Exception as e:
        logger.error(f"Read reviews error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch reviews.")


@router.post("/trigger/{source_id}")
async def trigger_review_sync(source_id: uuid.UUID, background_tasks: BackgroundTasks):
    """Manually trigger the ingestion and processing flow for a source."""
    background_tasks.add_task(start_ingestion_and_processing_flow, source_id)
    return {"message": "Processing flow started in background."}


@router.get("/meta/count")
def get_total_review_count():
    """Returns the total number of reviews across the entire platform."""
    try:
        count = count_all_reviews()
        return {"total_reviews": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/processing/status")
def get_processing_status(organization_id: uuid.UUID = Query(None)):
    """
    Get the current processing status of reviews.
    Optional organization_id filter.
    """
    try:
        return get_processing_report(str(organization_id) if organization_id else None)
    except Exception as e:
        logger.error(f"Failed to fetch processing status: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch processing status.")


@router.post("/process/{review_id}")
async def trigger_single_review_processing(review_id: uuid.UUID):
    """
    Manually trigger AI analysis for a specific review.
    This will analyze/re-analyze the review and update its analytical columns.
    """
    try:
        result = await process_single_review(review_id)
        return {
            "message": "Review processed successfully",
            "review_id": str(review_id),
            "analysis": result
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Single review processing failed for {review_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during processing.")


@router.post("/generate-reply", response_model=ReplyGenerationResponse)
def generate_reply(payload: ReplyGenerationRequest, current_user = Depends(get_current_user)):
    """Generate an AI reply for a specific review."""
    try:
        result = generate_review_reply(payload)
        
        # Increment usage tracker
        try:
            user_id = str(current_user.user_id) if hasattr(current_user, "user_id") else str(current_user.id)
            with pyodbc.connect(get_connection_string()) as conn:
                cursor = conn.cursor()
                increment_feature_usage(cursor, user_id, "reply_generations")
                conn.commit()
        except Exception as e:
            logger.warning(f"Failed to increment usage: {e}")
            
        return ReplyGenerationResponse(**result)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error(f"Reply generation failed: {exc}")
        raise HTTPException(status_code=500, detail="Failed to generate AI reply.")
