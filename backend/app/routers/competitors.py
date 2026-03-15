"""
Competitor endpoints: CRUD, track/untrack, scrape, compare, rankings.

Extracted from test/main.py.
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.schemas.competitor import (
    AddCompetitorRequest,
    TrackCompetitorRequest,
    ScrapeCompetitorRequest,
)
from app.services.competitor_service import (
    get_tracked_competitors,
    get_available_competitors,
    get_competitor_by_id,
    add_competitor as add_competitor_db,
    track_competitor as track_competitor_db,
    untrack_competitor as untrack_competitor_db,
    delete_competitor as delete_competitor_db,
    get_competitor_reviews,
    get_comparison_data,
    get_rankings_data,
    get_ai_comparison_insights,
    process_competitor_scrape,
)

router = APIRouter(prefix="/competitors", tags=["Competitors"])


@router.get("")
def list_competitors():
    """Get all competitors (tracked + available pool)."""
    try:
        return {
            "tracked": get_tracked_competitors(),
            "available": get_available_competitors(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
def create_competitor(payload: AddCompetitorRequest):
    """Add a new competitor to the available pool (admin action)."""
    try:
        competitor = add_competitor_db(payload.name, payload.location, payload.bookingUrl)
        return {"message": "Competitor added", "competitor": competitor}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/track")
def track_a_competitor(payload: TrackCompetitorRequest):
    """User tracks a competitor from the available pool."""
    try:
        result = track_competitor_db(payload.competitorId)
        if not result:
            raise HTTPException(status_code=404, detail="Competitor not found")
        return {"message": "Competitor now tracked", "competitor": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/untrack")
def untrack_a_competitor(payload: TrackCompetitorRequest):
    """User untracks a competitor."""
    try:
        untrack_competitor_db(payload.competitorId)
        return {"message": "Competitor untracked"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rankings")
def competitor_rankings():
    """Get rankings: your hotel + all tracked competitors sorted by rating."""
    try:
        return get_rankings_data()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{competitor_id}")
def remove_competitor(competitor_id: int):
    """Permanently delete a competitor and its reviews (admin action)."""
    try:
        delete_competitor_db(competitor_id)
        return {"message": "Competitor deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{competitor_id}/scrape")
def scrape_competitor(competitor_id: int, payload: ScrapeCompetitorRequest, background_tasks: BackgroundTasks):
    """Trigger scraping for a competitor's Booking.com page."""
    competitor = get_competitor_by_id(competitor_id)
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")
    if not competitor["bookingUrl"]:
        raise HTTPException(status_code=400, detail="Competitor has no Booking.com URL")

    background_tasks.add_task(
        process_competitor_scrape, competitor_id, competitor["bookingUrl"], payload.headless
    )
    return {
        "message": f"Scraping started for {competitor['name']}",
        "competitorId": competitor_id,
    }


@router.get("/{competitor_id}/reviews")
def get_reviews_for_competitor(competitor_id: int):
    """Get all scraped/processed reviews for a competitor."""
    try:
        reviews = get_competitor_reviews(competitor_id)
        return {"reviews": reviews, "total": len(reviews)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/{competitor_id}/compare")
def compare_with_competitor(competitor_id: int):
    """Get full comparison data (KPIs, charts, sentiment) vs a competitor."""
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
    """Get real-time AI-generated comparison insights vs a competitor."""
    try:
        insights = get_ai_comparison_insights(competitor_id)
        return insights
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
