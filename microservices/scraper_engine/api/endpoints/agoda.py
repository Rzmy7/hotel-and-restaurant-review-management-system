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
from core.config import setup_logger
from platforms.agoda.logic import scrape_agoda

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
def trigger_agoda_scrape(body: AgodaScrapeRequest):
    """
    Upserts the source in the database and submits a scrape job to the
    thread pool. Returns the job_id for real-time monitoring.
    """
    logger.info(f"Scrape request: source_id={body.source_id}, url={body.source_url}")

    # Upsert the source record
    session = get_session()
    try:
        source = session.query(Source).filter_by(source_id=body.source_id).first()
        if not source:
            # Check if source_url already exists with a different ID
            conflict = session.query(Source).filter_by(source_url=body.source_url).first()
            if conflict:
                logger.warning(f"URL conflict: {body.source_url} already exists with ID {conflict.source_id}. Replacing it.")
                session.delete(conflict)
                session.commit() # Commit delete before inserting new one to avoid IntegrityError
            
            source = Source(
                source_id=body.source_id,
                source_url=body.source_url,
                platform_name="agoda"
            )
            session.add(source)
        else:
            source.source_url = body.source_url
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error(f"Source upsert failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Source upsert failed: {str(e)}")
    finally:
        session.close()

    # Submit the scrape job
    try:
        job_id = job_manager.create_job(platform="agoda", url=body.source_url)
        scrape_pool.submit(
            job_id, scrape_agoda,
            body.source_url, body.headless, body.pages, job_id, body.source_id
        )
        pool = scrape_pool.get_pool_status()
        return {
            "status": "submitted",
            "job_id": job_id,
            "source_id": body.source_id,
            "pool": pool,
            "message": "Agoda scrape job submitted to pool."
        }
    except Exception as e:
        logger.error(f"Job submission failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
