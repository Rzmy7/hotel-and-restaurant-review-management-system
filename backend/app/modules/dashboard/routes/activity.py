"""Dashboard routes — alerts and activity feed."""
from fastapi import APIRouter, HTTPException
from app.modules.dashboard.services.activity_service import get_alerts, get_activities

router = APIRouter()

@router.get("/dashboard/alerts")
def alerts():
    try:
        return get_alerts()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard/activities")
def activities():
    try:
        return get_activities()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
