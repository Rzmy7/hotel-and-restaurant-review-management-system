"""
Competitor CRUD + track/untrack routes.
"""

from fastapi import APIRouter, HTTPException

from app.modules.competitors.schemas import AddCompetitorRequest, TrackCompetitorRequest
from app.modules.competitors.services.competitor_service import (
    get_tracked_competitors, get_available_competitors,
    get_competitor_by_id, add_competitor,
    track_competitor, untrack_competitor, delete_competitor,
    get_competitor_reviews,
)

router = APIRouter()


@router.get("/")
def list_competitors():
    try:
        return {"tracked": get_tracked_competitors(), "available": get_available_competitors()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/")
def create_competitor(payload: AddCompetitorRequest):
    try:
        competitor = add_competitor(payload.name, payload.location, payload.bookingUrl)
        return {"message": "Competitor added", "competitor": competitor}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/track")
def track_a_competitor(payload: TrackCompetitorRequest):
    try:
        result = track_competitor(payload.competitorId)
        if not result:
            raise HTTPException(status_code=404, detail="Competitor not found")
        return {"message": "Competitor now tracked", "competitor": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/untrack")
def untrack_a_competitor(payload: TrackCompetitorRequest):
    try:
        untrack_competitor(payload.competitorId)
        return {"message": "Competitor untracked"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{competitor_id}")
def remove_competitor(competitor_id: int):
    try:
        delete_competitor(competitor_id)
        return {"message": "Competitor deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{competitor_id}/reviews")
def get_reviews_for_competitor(competitor_id: int):
    try:
        reviews = get_competitor_reviews(competitor_id)
        return {"reviews": reviews, "total": len(reviews)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
