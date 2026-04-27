"""
Agoda Scrape Endpoint
=====================
POST /api/agoda/scrape — triggers playwright scraper via the thread pool.
Body: { source_id, source_url, headless?, pages? }
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from core.database import get_session
from core.models import Source
from core.job_manager import job_manager
from core.scrape_pool import scrape_pool
from services.source_service import SourceService
from platforms.agoda.logic import scrape_agoda
from core.limiter import limiter
from core.config import config, setup_logger
from core.utils import normalize_url
from fastapi import Request

logger = setup_logger("agoda_api")
router = APIRouter(prefix="/agoda", tags=["Agoda"])


# ── Request Schema ──
class AgodaScrapeRequest(BaseModel):
    """Payload for triggering an Agoda scrape job."""
    source_id: str                  # Provided by the main backend
    source_url: str                 # Agoda hotel URL
    headless: Optional[bool] = True # Run browser headless?
    pages: Optional[str] = "1"     # Number of pages: "1", "5", "1-10", "*"


@router.post("/scrape")
@limiter.limit(config.rate_limit_scrape)
def trigger_agoda_scrape(request: Request, body: AgodaScrapeRequest):
    """
    Upserts the source in the database and submits a scrape job to the
    thread pool. Returns the job_id for real-time monitoring.
    """
    if scrape_pool.total_pending >= config.max_queue_size:
        raise HTTPException(
            status_code=429, 
            detail=f"Scraper queue depth limit reached ({config.max_queue_size}). Please try again later."
        )

    logger.info(f"Scrape request: source_id={body.source_id}, url={body.source_url}")
    
    # Normalize URL to base URL
    normalized_url = normalize_url(body.source_url)
    logger.info(f"Normalized URL: {normalized_url}")

    # Upsert the source record
    session = get_session()
    try:
        source = session.query(Source).filter_by(source_id=body.source_id).first()
        if not source:
            source = Source(
                source_id=body.source_id,
                source_url=normalized_url,
                platform_name="agoda"
            )
            session.add(source)
        else:
            source.source_url = normalized_url
            source.platform_name = "agoda"
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error(f"Source upsert failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Source upsert failed: {str(e)}")
    finally:
        session.close()

    # Submit the scrape job
    try:
        active_job = job_manager.get_active_job_by_url(normalized_url)
        if active_job:
            logger.info(f"Existing job {active_job['id']} found for {normalized_url}. Attaching source {body.source_id}.")
            
            # Immediately notify backend that this source is now matching the active job's status
            SourceService.notify_single(body.source_id, "RUNNING")
            
            return {
                "status": "attached",
                "job_id": active_job["id"],
                "source_id": body.source_id,
                "pool": scrape_pool.get_pool_status(),
                "message": "Attached to existing active scrape job for identical URL (normalized)."
            }

        job_id = job_manager.create_job(platform="agoda", url=normalized_url)
        scrape_pool.submit(
            job_id, scrape_agoda,
            url=normalized_url, headless=body.headless, pages=body.pages, 
            job_id=job_id, source_id=body.source_id, platform="agoda"
        )
        pool = scrape_pool.get_pool_status()
        return {
            "status": "submitted",
            "job_id": job_id,
            "source_id": body.source_id,
            "pool": pool,
            "message": "Agoda scrape job submitted to pool (normalized)."
        }
    except Exception as e:
        logger.error(f"Job submission failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
