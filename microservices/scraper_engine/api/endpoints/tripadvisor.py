"""
TripAdvisor API Endpoints.
Mirrors the agoda/booking/google endpoint pattern exactly.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from core.database import get_session
from core.config import setup_logger
from core.job_manager import job_manager
from core.scrape_pool import scrape_pool
from core.models import Review, OrganizationSource, Source, TripAdvisorReviewDetail, ReviewMedia
from sqlalchemy.orm import joinedload

logger = setup_logger("tripadvisor_api")
router = APIRouter(prefix="/tripadvisor", tags=["TripAdvisor"])


class ScrapeRequest(BaseModel):
    url: str
    headless: bool = True
    pages: str = "*"


@router.post("/scrape")
def trigger_tripadvisor_scrape(body: ScrapeRequest):
    """Submit a TripAdvisor scrape job to the thread pool."""
    from platforms.tripadvisor.logic import scrape_tripadvisor

    job_id = job_manager.create_job(platform="tripadvisor", url=body.url)
    scrape_pool.submit(job_id, scrape_tripadvisor, body.url, body.headless, body.pages, job_id)
    pool_status = scrape_pool.get_pool_status()
    return {
        "status": "submitted",
        "job_id": job_id,
        "platform": "tripadvisor",
        "url": body.url,
        "pool": pool_status
    }


@router.get("/reviews")
def get_tripadvisor_reviews(
    place_url: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    """Retrieve stored TripAdvisor reviews, optionally filtered by place URL."""
    session = get_session()
    try:
        source = session.query(Source).filter_by(platform_name="TripAdvisor").first()
        if not source:
            return {"total": 0, "returned": 0, "data": []}

        query = (
            session.query(Review)
            .join(OrganizationSource)
            .filter(OrganizationSource.source_id == source.source_id)
            .options(
                joinedload(Review.tripadvisor_detail),
                joinedload(Review.media),
            )
        )
        if place_url:
            query = query.filter(OrganizationSource.external_url == place_url)

        total = query.count()
        reviews = query.order_by(Review.review_id.desc()).offset(skip).limit(limit).all()

        results = []
        for r in reviews:
            d = r.tripadvisor_detail
            results.append({
                "review_id": r.review_id,
                "external_review_id": r.external_review_id,
                "author": r.author,
                "rating": float(r.rating) if r.rating else None,
                "review_title": r.review_title,
                "review_text": r.review_text,
                "review_date": r.review_date,
                "reply_text": r.reply_text,
                "reviewer_origin": d.reviewer_origin if d else None,
                "traveler_type": d.traveler_type if d else None,
                "trip_date": d.trip_date if d else None,
                "place_url": d.place_url if d else None,
                "images": [m.media_url for m in r.media],
                "created_at": str(r.created_at) if r.created_at else None,
            })

        return {"total": total, "returned": len(results), "data": results}
    except Exception as e:
        logger.error(f"Error fetching TripAdvisor reviews: {e}", exc_info=True)
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()
