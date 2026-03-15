"""
Review endpoints: list, count, delete, and scrape.

Extracted from test/main.py and routers/scraping.py.
"""

from typing import List

from fastapi import APIRouter, HTTPException, BackgroundTasks

from app.modules.reviews.schemas import ReviewModel, BookingScrapeRequest
from app.modules.reviews.service import (
    get_all_reviews_from_db,
    remove_all_reviews_from_db,
    count_all_reviews,
)

router = APIRouter(tags=["Reviews"])

# Lazy import to handle missing playwright gracefully
try:
    from app.modules.reviews.scraper import scrape_booking
except Exception:
    def scrape_booking(url, headless=True):
        raise RuntimeError("scrape_booking not available in this environment")


# ── Review Data Endpoints ──────────────────────────────────────────

@router.get("/reviews", response_model=List[ReviewModel])
def read_reviews():
    """Fetch all processed reviews from the database."""
    try:
        return get_all_reviews_from_db()
    except Exception as e:
        print(f"API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reviews_count")
def count_reviews():
    """Returns the total number of reviews in the database."""
    try:
        count = count_all_reviews()
        return {"total_reviews": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/delete_reviews")
def delete_all_reviews():
    """Deletes all reviews from the database."""
    try:
        success = remove_all_reviews_from_db()
        if success:
            return {"status": "success", "message": "All reviews deleted."}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete reviews.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Scraping Endpoints ──────────────────────────────────────────────

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
