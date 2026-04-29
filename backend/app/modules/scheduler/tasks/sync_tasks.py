import logging
import httpx
import os
from datetime import datetime, timezone
from sqlalchemy.orm import joinedload

from app.database import SessionLocal
from app.modules.source.models import Source as SourceSource  # alias for backward compat
from app.modules.source.services.source_service import update_sync_status, log_activity
from app.core.config import SCRAPER_ENGINE_URL

logger = logging.getLogger(__name__)

# Scraper microservice URL from centralized config
SCRAPER_API_BASE_URL = SCRAPER_ENGINE_URL

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
        "headless": True,
        "pages": "*"  # Request full sync for all platforms
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


def _check_scraping_frequency_for_tenant(tenant_id: str) -> bool:
    """
    Returns True if the tenant is allowed to scrape (hasn't exceeded weekly limit).
    Returns True on any error (fail-open).
    """
    try:
        import pyodbc
        from app.core.db_utils import get_connection_string
        from app.modules.admin.services.subscription_service import (
            check_feature_limit,
            send_limit_reached_notification,
        )
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            limit_info = check_feature_limit(cursor, tenant_id, "scraping_frequency")
            if not limit_info["allowed"]:
                send_limit_reached_notification(tenant_id, limit_info["feature_name"])
                logger.info(
                    f"Tenant {tenant_id} has reached scraping frequency limit "
                    f"({limit_info['used']}/{limit_info['limit']} this week). Skipping."
                )
                return False
        return True
    except Exception as e:
        logger.warning(f"Scraping frequency check failed for tenant {tenant_id}: {e}")
        return True  # Fail-open


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
            joinedload(SourceSource.platform),
            joinedload(SourceSource.organization)
        ).filter(
            SourceSource.source_status == 'active',
            SourceSource.next_synced_at <= now_utc
        ).all()
        
        if not pending_sources:
            logger.info("No pending sync tasks found.")
            return

        logger.info(f"Found {len(pending_sources)} sources pending synchronization.")

        # Cache tenant limit checks to avoid redundant DB queries per tenant
        tenant_allowed_cache: dict[str, bool] = {}

        for source in pending_sources:
            if not source.platform:
                logger.warning(f"Source {source.source_id} has no linked platform. Skipping.")
                continue

            # Skip if platform is inactive
            if source.platform.platform_status == 'inactive':
                logger.info(f"Skipping source {source.source_id} because platform '{source.platform.platform_name}' is inactive.")
                continue

            # ── Check scraping_frequency limit for the source's tenant ──
            tenant_id = None
            if hasattr(source, 'organization') and source.organization and source.organization.tenant_id:
                tenant_id = str(source.organization.tenant_id)

            if tenant_id:
                if tenant_id not in tenant_allowed_cache:
                    tenant_allowed_cache[tenant_id] = _check_scraping_frequency_for_tenant(tenant_id)

                if not tenant_allowed_cache[tenant_id]:
                    logger.info(f"Skipping source {source.source_id} — tenant {tenant_id} weekly scrape limit reached. Auto-pausing source.")
                    # Auto-pause the source since limit is reached
                    if source.source_status != 'paused':
                        source.source_status = 'paused'
                        db.commit()
                        
                        # Log the activity
                        log_activity(
                            db, 
                            source.source_id, 
                            activity_type="SOURCE_AUTO_PAUSED", 
                            status="Success",
                            activity_details="Source auto-paused due to reaching the weekly scraping frequency limit.",
                            is_important=True
                        )
                    continue

            # Trigger the microservice
            success = trigger_platform_scrape(
                platform_name=source.platform.platform_name,
                url=source.source_url,
                source_id=source.source_id
            )

            if success:
                # Update status to queued to prevent redundant triggers before scraper callback arrives
                source.source_status = 'queued'
                db.commit()
                
                log_activity(
                    db,
                    source.source_id,
                    activity_type="SYNC_QUEUED",
                    status="In Progress",
                    activity_details=f"Scheduled synchronization initiated for {source.platform.platform_name}."
                )
            # Timestamps will be updated via callback to /api/source/{source_id}/sync-status
                
    except Exception as e:
        # Avoid massive tracebacks on timeout by just logging the error string
        logger.error(f"Error during scheduled sync processing: {e}")
    finally:
        db.close()
