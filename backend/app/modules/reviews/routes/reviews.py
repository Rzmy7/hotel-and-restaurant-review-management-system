"""
Review list/delete/count routes — GET /reviews, GET /reviews_count, DELETE /delete_reviews
"""

from typing import List
from fastapi import APIRouter, HTTPException

from app.modules.reviews.schemas import ReviewModel
from app.modules.reviews.schemas import ReplyGenerationRequest, ReplyGenerationResponse
from app.modules.reviews.services.review_service import (
    get_all_reviews_from_db,
    remove_all_reviews_from_db,
    count_all_reviews,
)
from app.modules.reviews.services.reply_generation_service import generate_review_reply
from app.modules.dashboard.services.stats_service import get_stats

router = APIRouter()


@router.get("/reviews", response_model=List[ReviewModel])
def read_reviews():
    """Fetch all processed reviews from the database."""
    try:
        return get_all_reviews_from_db()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reviews_count")
def count_reviews():
    """Returns the total number of reviews in the database."""
    try:
        count = count_all_reviews()
        return {"total_reviews": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/delete_reviews")
def delete_all_reviews():
    """Deletes all reviews from the database."""
    try:
        success = remove_all_reviews_from_db()
        if success:
            return {"status": "success", "message": "All reviews deleted."}
        raise HTTPException(status_code=500, detail="Failed to delete reviews.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reviews/stats")
def reviews_stats():
    """Retrieve summarized KPIs for the reviews page."""
    try:
        stats = get_stats()
        # Ensure keys match frontend ReviewStats interface
        return {
            "totalReviews": stats["totalReviews"],
            "averageRating": stats["averageRating"],
            "pendingReplies": stats["pendingReviews"],
            "sentimentScore": 75,  # Mocked sentiment for now as it's missing in service
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reviews/generate", response_model=ReplyGenerationResponse)
def generate_reply(payload: ReplyGenerationRequest):
    """Generate an AI reply using admin-selected provider + embedding context."""
    try:
        result = generate_review_reply(payload)
        return ReplyGenerationResponse(**result)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Reply generation failed: {exc}") from exc
