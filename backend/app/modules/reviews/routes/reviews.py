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
from app.modules.auth.utils.jwt_utils import get_current_user
from app.modules.admin.services.subscription_service import increment_feature_usage
from app.core.db_utils import get_connection_string
from fastapi import APIRouter, HTTPException, Depends
import pyodbc

router = APIRouter()


@router.get("/reviews/{organization_id}", response_model=List[ReviewModel])
def read_reviews(organization_id: str):
    """Fetch all processed reviews from the database."""
    try:
        return get_all_reviews_from_db(organization_id)
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
def generate_reply(payload: ReplyGenerationRequest, current_user = Depends(get_current_user)):
    """Generate an AI reply using admin-selected provider + embedding context."""
    try:
        result = generate_review_reply(payload)
        
        # Increment usage
        try:
            user_id = str(current_user.user_id) if hasattr(current_user, "user_id") else str(current_user.id)
            with pyodbc.connect(get_connection_string()) as conn:
                cursor = conn.cursor()
                increment_feature_usage(cursor, user_id, "reply_generations")
                conn.commit()
        except Exception as e:
            print(f"FAILED TO INCREMENT REPLY_GENERATION USAGE: {e}")
            
        return ReplyGenerationResponse(**result)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Reply generation failed: {exc}") from exc
