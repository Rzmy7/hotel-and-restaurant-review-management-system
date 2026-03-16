"""Dashboard routes — trends and recent reviews."""
from fastapi import APIRouter, HTTPException
from app.modules.dashboard.services.trends_service import get_usage, get_recent_reviews

router = APIRouter()

@router.get("/dashboard/usage")
def usage():
    try:
        return get_usage()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard/reviews")
def recent_reviews():
    try:
        return get_recent_reviews()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
