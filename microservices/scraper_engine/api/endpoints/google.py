"""Google Maps scrape + review retrieval endpoints — reads from unified schema."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from platforms.google.logic import scrape_google
from core.database import get_session
from core.job_manager import job_manager
from core.scrape_pool import scrape_pool
from core.config import setup_logger
from core.models import Review, OrganizationSource, Source, GoogleReviewDetail, ReviewMedia
from sqlalchemy.orm import joinedload

logger = setup_logger("google_api")
router = APIRouter(prefix="/google", tags=["Google Reviews"])

class GoogleScrapeRequest(BaseModel):
    url: str
    headless: bool = True
    pages: str = "*"

@router.post("/scrape")
def trigger_google_scrape(request: GoogleScrapeRequest):
    """Triggers the Playwright scraper via the thread pool (max 7 concurrent)."""
    logger.info(f"API Request to scrape Google: {request.url} (Headless: {request.headless}, Target: {request.pages})")
    try:
        job_id = job_manager.create_job(platform="google", url=request.url)
        scrape_pool.submit(job_id, scrape_google, request.url, request.headless, request.pages, job_id)
        pool = scrape_pool.get_pool_status()
        return {"status": "submitted", "job_id": job_id, "pool": pool, "message": "Google scrape submitted to pool."}
    except Exception as e:
        logger.error(f"Google API Exception: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reviews")
def get_google_reviews(place_url: str = None, limit: int = 100, skip: int = 0):
    """Retrieve stored Google reviews from the unified database."""
    session = get_session()
    try:
        source = session.query(Source).filter_by(platform_name="Google").first()
        if not source:
            return {"total_returned": 0, "data": []}

        query = session.query(Review).join(OrganizationSource).filter(
            OrganizationSource.source_id == source.source_id
        ).options(
            joinedload(Review.google_detail),
            joinedload(Review.media)
        )

        if place_url:
            query = query.filter(OrganizationSource.external_url == place_url)

        reviews = query.order_by(Review.review_id).offset(skip).limit(limit).all()

        result = []
        for r in reviews:
            entry = {
                "review_id": r.review_id,
                "external_id": r.external_review_id,
                "author": r.author,
                "rating": float(r.rating) if r.rating else None,
                "text": r.review_text,
                "date": r.review_date,
                "reply": r.reply_text,
                "media": [{"url": m.media_url, "type": m.media_type} for m in r.media] if r.media else [],
            }
            if r.google_detail:
                entry["author_badge"] = r.google_detail.author_badge
                entry["place_url"] = r.google_detail.place_url
            result.append(entry)

        return {"total_returned": len(result), "data": result}
    except Exception as e:
        logger.error(f"Database query failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()
