"""Dashboard routes — alerts and activity feed."""
from fastapi import APIRouter, HTTPException
from app.modules.dashboard.services.activity_service import get_alerts, get_activities, get_negative_reviews_for_org, get_sentiment_counts

router = APIRouter()

@router.get("/dashboard/alerts")
def alerts(org_id: str = None):
    try:
        return get_alerts(org_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard/activities")
def activities(org_id: str = None):
    try:
        return get_activities(org_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard/sentiment-counts")
def sentiment_counts(org_id: str):
    try:
        return get_sentiment_counts(org_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard/negative-reviews")
def negative_reviews(org_id: str):
    try:
        return get_negative_reviews_for_org(org_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
