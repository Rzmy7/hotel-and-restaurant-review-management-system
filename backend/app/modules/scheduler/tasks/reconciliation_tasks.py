import os
import httpx
import logging
from app.database.session import SessionLocal
from app.modules.source.schemas import SyncStatus, SyncStatusRequest
from app.modules.source.services.source_service import get_stuck_sources, update_sync_status
from app.core.config import SCRAPER_ENGINE_URL as _SCRAPER_URL

logger = logging.getLogger(__name__)

_RECONCILIATION_SCRAPER_URL = _SCRAPER_URL.rstrip("/") + "/"

import asyncio

async def reconcile_scraper_jobs():
    """
    Checks the backend for 'stuck' tasks (source_status in running/queued) and 
    cross-references against the Scraper Engine's active jobs list.
    Marks any source not found in the Scraper Engine's active pool as FAILED.
    """
    db = SessionLocal()
    try:
        # Run DB query in thread to avoid blocking loop
        stuck_sources = await asyncio.to_thread(get_stuck_sources, db)
        if not stuck_sources:
            return

        logger.info(f"Reconciliation: Found {len(stuck_sources)} potentially stuck sources. Checking Scraper Engine...")

        # Contact Scraper Engine (now async)
        try:
            url = f"{_RECONCILIATION_SCRAPER_URL}api/system/jobs"
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                data = resp.json()
        except httpx.RequestError as e:
            logger.warning(f"Reconciliation failed: Could not connect to Scraper Engine at {_RECONCILIATION_SCRAPER_URL} ({e})")
            return
        except Exception as e:
            logger.error(f"Reconciliation failed: Unexpected error contacting Scraper Engine ({e})")
            return

        active_jobs = data.get("jobs", {})
        active_source_ids = {str(job.get("source_id")) for job in active_jobs.values() if job.get("source_id")}

        failed_count = 0
        for source in stuck_sources:
            if str(source.source_id) not in active_source_ids:
                logger.info(f"Reconciliation: Source {source.source_id} is marked as running in DB but not active in Scraper Engine. Failing...")
                # Run DB update in thread
                await asyncio.to_thread(
                    update_sync_status,
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
