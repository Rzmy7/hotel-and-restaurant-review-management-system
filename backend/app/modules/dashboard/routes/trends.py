"""Dashboard routes — trends and recent reviews."""

from fastapi import APIRouter, Depends, HTTPException
from app.modules.dashboard.services.trends_service import get_usage, get_recent_reviews
from app.modules.auth.utils.auth_utils import get_current_user

router = APIRouter()


@router.get("/dashboard/usage")
def usage(user=Depends(get_current_user)):
    try:
        return get_usage()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard/reviews")
def recent_reviews(user=Depends(get_current_user)):
    try:
        return get_recent_reviews()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
