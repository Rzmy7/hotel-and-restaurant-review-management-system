"""
Review list/delete/count routes — GET /reviews, GET /reviews_count, DELETE /delete_reviews
"""

from typing import List
from fastapi import APIRouter, HTTPException

from app.modules.reviews.schemas import ReviewModel
from app.modules.reviews.services.review_service import (
    get_all_reviews_from_db,
    remove_all_reviews_from_db,
    count_all_reviews,
)

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
