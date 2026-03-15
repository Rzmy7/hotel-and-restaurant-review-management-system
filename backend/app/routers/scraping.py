"""
Scraping endpoints.

Extracted from test/main.py.
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.schemas.review import BookingScrapeRequest

router = APIRouter(tags=["Scraping"])

# Lazy import to handle missing playwright gracefully
try:
    from app.scraping.booking import scrape_booking
except Exception:
    def scrape_booking(url, headless=True):
        raise RuntimeError("scrape_booking not available in this environment")


@router.post("/scrape/booking")
async def start_booking_scrape(payload: BookingScrapeRequest, background_tasks: BackgroundTasks):
    """Kick off a Booking.com scrape. Runs as a background task."""
    try:
        background_tasks.add_task(scrape_booking, str(payload.url), payload.headless)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to start scrape: {exc}")

    return {
        "message": "Booking.com scrape started",
        "url": str(payload.url),
        "headless": payload.headless,
    }
