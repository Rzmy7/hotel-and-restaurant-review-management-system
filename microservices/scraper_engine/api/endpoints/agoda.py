"""Agoda scrape + review retrieval endpoints — reads from unified schema."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from platforms.agoda.logic import scrape_agoda
from core.database import get_session
from core.job_manager import job_manager
from core.scrape_pool import scrape_pool
from core.config import setup_logger
from core.models import Review, OrganizationSource, Source, AgodaReviewDetail, ReviewMedia
from sqlalchemy.orm import joinedload

logger = setup_logger("agoda_api")
router = APIRouter(prefix="/agoda", tags=["Agoda Reviews"])

class AgodaScrapeRequest(BaseModel):
    url: str
    headless: bool = True
    pages: str = "1"

@router.post("/scrape")
def trigger_agoda_scrape(request: AgodaScrapeRequest):
    """Triggers the Playwright scraper via the thread pool (max 7 concurrent)."""
    logger.info(f"API Request to scrape {request.url} (Headless: {request.headless}, Pages: {request.pages})")
    try:
        job_id = job_manager.create_job(platform="agoda", url=request.url)
        scrape_pool.submit(job_id, scrape_agoda, request.url, request.headless, request.pages, job_id)
        pool = scrape_pool.get_pool_status()
        return {"status": "submitted", "job_id": job_id, "pool": pool, "message": "Job submitted to scrape pool."}
    except Exception as e:
        logger.error(f"Agoda API Exception: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reviews")
def get_agoda_reviews(hotel_url: str = None, limit: int = 100, skip: int = 0):
    """Retrieve stored Agoda reviews from the unified database."""
    session = get_session()
    try:
        source = session.query(Source).filter_by(platform_name="Agoda").first()
        if not source:
            return {"total_returned": 0, "data": []}

        query = session.query(Review).join(OrganizationSource).filter(
            OrganizationSource.source_id == source.source_id
        ).options(
            joinedload(Review.agoda_detail),
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
                "rating": float(r.rating) if r.rating else None,
                "title": r.review_title,
                "text": r.review_text,
                "date": r.review_date,
                "reply": r.reply_text,
                "media": [{"url": m.media_url, "type": m.media_type} for m in r.media] if r.media else [],
            }
            if r.agoda_detail:
                entry["reviewer_nationality"] = r.agoda_detail.reviewer_nationality
                entry["stayed_dates"] = r.agoda_detail.stayed_dates
                entry["traveler_type"] = r.agoda_detail.traveler_type
                entry["room_type"] = r.agoda_detail.room_type
            result.append(entry)

        return {"total_returned": len(result), "data": result}
    except Exception as e:
        logger.error(f"Database query failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()
