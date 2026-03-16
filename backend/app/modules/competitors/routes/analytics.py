"""
Competitor analytics routes — compare, insights, rankings.
"""

from fastapi import APIRouter, HTTPException

from app.modules.competitors.services.analytics_service import (
    get_comparison_data,
    get_rankings_data,
    get_ai_comparison_insights,
)

router = APIRouter()


@router.get("/rankings")
def competitor_rankings():
    try:
        return get_rankings_data()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{competitor_id}/compare")
def compare_with_competitor(competitor_id: int):
    try:
        data = get_comparison_data(competitor_id)
        if not data:
            raise HTTPException(status_code=404, detail="Competitor not found")
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{competitor_id}/insights")
def ai_competitor_insights(competitor_id: int):
    try:
        return get_ai_comparison_insights(competitor_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
