import os
import httpx
import logging
from app.database.session import SessionLocal
from app.modules.source.schemas import SyncStatus, SyncStatusRequest
from app.modules.source.services.source_service import get_stuck_sources, update_sync_status

logger = logging.getLogger(__name__)

SCRAPER_ENGINE_URL = os.getenv("SCRAPER_ENGINE_URL", "http://127.0.0.1:8001/")
if not SCRAPER_ENGINE_URL.endswith("/"):
    SCRAPER_ENGINE_URL += "/"

def reconcile_scraper_jobs():
    """
    Checks the backend for 'stuck' tasks (source_status in running/queued) and 
    cross-references against the Scraper Engine's active jobs list.
    Marks any source not found in the Scraper Engine's active pool as FAILED.
    """
    db = SessionLocal()
    try:
        stuck_sources = get_stuck_sources(db)
        if not stuck_sources:
            return

        logger.info(f"Reconciliation: Found {len(stuck_sources)} potentially stuck sources. Checking Scraper Engine...")

        # Contact Scraper Engine
        try:
            url = f"{SCRAPER_ENGINE_URL}api/system/jobs"
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(url)
                resp.raise_for_status()
                data = resp.json()
        except httpx.RequestError as e:
            logger.warning(f"Reconciliation failed: Could not connect to Scraper Engine at {SCRAPER_ENGINE_URL} ({e})")
            return
        except Exception as e:
            logger.error(f"Reconciliation failed: Unexpected error contacting Scraper Engine ({e})")
            return

        active_jobs = data.get("jobs", {})
        # Note: Scraper Engine returns dictionary of jobs: { job_id: { "source_id": "...", ... } }
        active_source_ids = {str(job.get("source_id")) for job in active_jobs.values() if job.get("source_id")}

        failed_count = 0
        for source in stuck_sources:
            if str(source.source_id) not in active_source_ids:
                logger.info(f"Reconciliation: Source {source.source_id} is marked as running in DB but not active in Scraper Engine. Failing...")
                update_sync_status(
                    db,
                    source.source_id,
                    SyncStatusRequest(
                        status=SyncStatus.FAILED,
                        error_message="Backend Reconciliation: Scraper Engine lost track of this job due to crash or failure."
                    )
                )
                failed_count += 1

        if failed_count > 0:
            logger.info(f"Reconciliation complete: Marked {failed_count} sources as failed.")

    except Exception as e:
        logger.error(f"Error during backend scraper job reconciliation: {e}")
    finally:
        db.close()
