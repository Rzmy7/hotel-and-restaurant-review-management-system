"""
Dashboard endpoints: stats, usage, review distribution, alerts, activities.
"""

from fastapi import APIRouter, HTTPException

from app.modules.dashboard.service import (
    get_stats,
    get_usage,
    get_recent_reviews,
    get_distribution,
    get_alerts,
    get_activities,
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
def get_dashboard_stats():
    """Core metrics for the dashboard cards."""
    try:
        return get_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/usage")
def get_dashboard_usage():
    """Reviews over time for trend chart (last 30 days, by day)."""
    try:
        return get_usage()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reviews")
def get_dashboard_reviews():
    """Most recent reviews for the dashboard list."""
    try:
        return get_recent_reviews()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/distribution")
def get_review_distribution():
    """Rating distribution for a bar/pie chart."""
    try:
        return get_distribution()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts")
def get_dashboard_alerts():
    """Alert notifications: new negative reviews, pending items."""
    try:
        return get_alerts()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/activities")
def get_recent_activities():
    """Recent activities for an activity feed."""
    try:
        return get_activities()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
