import logging
import httpx
import os
from datetime import datetime, timezone
from sqlalchemy.orm import joinedload

from app.core.database import SessionLocal
from app.modules.source.models import SourceSource
from app.modules.source.services.source_service import complete_sync_task

logger = logging.getLogger(__name__)

# Scraper microservice URL, default to 8001 if backend is on 8000
SCRAPER_API_BASE_URL = os.getenv("SCRAPER_API_URL", "http://127.0.0.1:8001")

def trigger_platform_scrape(platform_name: str, url: str, source_id: str) -> bool:
    """
    Trigger the scraper microservice for a specific platform.
    Mapping logic handles typical names like 'Google Reviews' -> 'google'.
    """
    platform_key = platform_name.lower().replace(" reviews", "").replace(".com", "")
    
    endpoint = f"{SCRAPER_API_BASE_URL}/api/{platform_key}/scrape"
    payload = {
        "source_id": str(source_id),
        "source_url": url,
        "headless": True
    }
    
    logger.info(f"Triggering scheduled scrape for {platform_name} at {endpoint}")
    
    try:
        with httpx.Client() as client:
            response = client.post(endpoint, json=payload, timeout=20.0)
            response.raise_for_status()
            logger.info(f"Scrape triggered successfully: {response.json()}")
            return True
    except httpx.HTTPError as e:
         logger.error(f"HTTP error triggering scraper for {platform_name}: {e}")
         return False
    except Exception as e:
         logger.error(f"Unexpected error triggering scraper: {e}")
         return False

def process_pending_syncs():
    """
    Scheduled task to find pending sources and trigger their sync.
    Runs every minute.
    """
    logger.info("Running scheduled sync check...")
    
    try:
        db = SessionLocal()
    except Exception as e:
        logger.error(f"Database unavailable for sync check: {e}")
        return

    try:
        now_utc = datetime.now(timezone.utc)
        
        # Find ACTIVE sources where next_synced_at has passed
        pending_sources = db.query(SourceSource).options(
            joinedload(SourceSource.platform)
        ).filter(
            SourceSource.source_status == 'active',
            SourceSource.next_synced_at <= now_utc
        ).all()
        
        if not pending_sources:
            logger.info("No pending sync tasks found.")
            return

        logger.info(f"Found {len(pending_sources)} sources pending synchronization.")
        
        for source in pending_sources:
            if not source.platform:
                logger.warning(f"Source {source.source_id} has no linked platform. Skipping.")
                continue

            # Trigger the microservice
            trigger_platform_scrape(
                platform_name=source.platform.platform_name,
                url=source.source_url,
                source_id=source.source_id
            )
            # Timestamps will be updated via callback to /source/tasks/{source_id}/sync-complete
                
    except Exception as e:
        # Avoid massive tracebacks on timeout by just logging the error string
        logger.error(f"Error during scheduled sync processing: {e}")
    finally:
        db.close()
