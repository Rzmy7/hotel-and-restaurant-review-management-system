"""
Competitor scraping trigger route — POST /{competitor_id}/scrape
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.modules.competitors.schemas import ScrapeCompetitorRequest
from app.modules.competitors.services.competitor_service import get_competitor_by_id
from app.modules.competitors.services.scraping_pipeline import process_competitor_scrape

router = APIRouter()


@router.post("/{competitor_id}/scrape")
def scrape_competitor(
    competitor_id: int,
    payload: ScrapeCompetitorRequest,
    background_tasks: BackgroundTasks,
):
    competitor = get_competitor_by_id(competitor_id)
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")
    if not competitor["bookingUrl"]:
        raise HTTPException(status_code=400, detail="Competitor has no Booking.com URL")

    background_tasks.add_task(
        process_competitor_scrape,
        competitor_id,
        competitor["bookingUrl"],
        payload.headless,
    )
    return {
        "message": f"Scraping started for {competitor['name']}",
        "competitorId": competitor_id,
    }
