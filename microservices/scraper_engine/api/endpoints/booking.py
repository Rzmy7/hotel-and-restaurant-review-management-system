"""Booking.com scrape + review retrieval endpoints — reads from unified schema."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from platforms.booking.logic import scrape_booking
from core.database import get_session
from core.job_manager import job_manager
from core.scrape_pool import scrape_pool
from core.config import setup_logger
from core.models import Review, OrganizationSource, Source, BookingReviewDetail, ReviewMedia
from sqlalchemy.orm import joinedload

logger = setup_logger("booking_api")
router = APIRouter(prefix="/booking", tags=["Booking.com Reviews"])

class BookingScrapeRequest(BaseModel):
    url: str
    headless: bool = True
    pages: str = "1"

@router.post("/scrape")
def trigger_booking_scrape(request: BookingScrapeRequest):
    """Triggers the Playwright scraper via the thread pool (max 7 concurrent)."""
    logger.info(f"API Request to scrape {request.url} (Headless: {request.headless}, Pages: {request.pages})")
    try:
        job_id = job_manager.create_job(platform="booking", url=request.url)
        scrape_pool.submit(job_id, scrape_booking, request.url, request.headless, request.pages, job_id)
        pool = scrape_pool.get_pool_status()
        return {"status": "submitted", "job_id": job_id, "pool": pool, "message": "Job submitted to scrape pool."}
    except Exception as e:
        logger.error(f"Booking API Exception: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reviews")
def get_booking_reviews(hotel_url: str = None, limit: int = 100, skip: int = 0):
    """Retrieve stored Booking.com reviews from the unified database."""
    session = get_session()
    try:
        source = session.query(Source).filter_by(platform_name="Booking").first()
        if not source:
            return {"total_returned": 0, "data": []}

        query = session.query(Review).join(OrganizationSource).filter(
            OrganizationSource.source_id == source.source_id
        ).options(
            joinedload(Review.booking_detail),
            joinedload(Review.media)
        )

        if hotel_url:
            query = query.filter(OrganizationSource.external_url == hotel_url)

        reviews = query.order_by(Review.review_id).offset(skip).limit(limit).all()

        result = []
        for r in reviews:
            entry = {
                "review_id": r.review_id,
                "external_id": r.external_review_id,
                "author": r.author,
                "score": float(r.rating) if r.rating else None,
                "title": r.review_title,
                "text": r.review_text,
                "date": r.review_date,
                "reply": r.reply_text,
                "media": [{"url": m.media_url, "type": m.media_type} for m in r.media] if r.media else [],
            }
            if r.booking_detail:
                entry["reviewer_nationality"] = r.booking_detail.reviewer_nationality
                entry["positive_txt"] = r.booking_detail.positive_txt
                entry["negative_txt"] = r.booking_detail.negative_txt
                entry["reviewer_stay_date"] = r.booking_detail.reviewer_stay_date
                entry["num_of_nights"] = r.booking_detail.num_of_nights
                entry["traveler_type"] = r.booking_detail.traveler_type
                entry["room_name"] = r.booking_detail.room_name
                entry["posted_date"] = r.booking_detail.posted_date
            result.append(entry)

        return {"total_returned": len(result), "data": result}
    except Exception as e:
        logger.error(f"Database query failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()
