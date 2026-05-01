import logging
import pyodbc
from sqlalchemy.orm import Session, joinedload

from app.database import SessionLocal
from app.core.db_utils import get_connection_string
from app.modules.source.models import (
    Source as SourceSource, 
    SyncLog as SyncLogSource,
    Organization
)
from app.modules.source.services.source_service import log_activity
from app.modules.admin.services.subscription_service import check_feature_limit

logger = logging.getLogger(__name__)

def auto_resume_sources():
    """
    Find sources that were auto-paused due to limit hits and resume them 
    if the limit has reset (e.g. at the start of a new week).
    """
    db: Session = SessionLocal()
    try:
        # 1. Fetch all paused sources with their organization info
        paused_sources = db.query(SourceSource).options(
            joinedload(SourceSource.organization)
        ).filter(
            SourceSource.source_status == 'paused'
        ).all()

        if not paused_sources:
            return

        conn_str = get_connection_string()
        # Use a single connection for all checks to be efficient
        with pyodbc.connect(conn_str) as conn:
            cursor = conn.cursor()
            
            for source in paused_sources:
                # 2. Check if the most recent activity was SOURCE_AUTO_PAUSED
                # This ensures we don't resume sources that were manually paused by the user.
                last_activity = db.query(SyncLogSource).filter(
                    SyncLogSource.source_id == source.source_id
                ).order_by(SyncLogSource.timestamp.desc()).first()

                if not last_activity or last_activity.activity_type != 'SOURCE_AUTO_PAUSED':
                    continue

                # 3. Check if limits are now cleared
                tenant_id = None
                if source.organization and source.organization.tenant_id:
                    tenant_id = str(source.organization.tenant_id)
                
                if not tenant_id:
                    continue

                # Check scraping frequency and review count
                scrape_limit = check_feature_limit(cursor, tenant_id, "scraping_frequency")
                review_limit = check_feature_limit(cursor, tenant_id, "review_count")

                # If both limits are now allowing usage (e.g. week reset or balance increased), resume.
                is_scrape_allowed = scrape_limit["allowed"]
                is_review_allowed = (review_limit["limit"] is None or review_limit["balance"] > 0)

                if is_scrape_allowed and is_review_allowed:
                    logger.info(f"Auto-resuming source {source.source_id} for tenant {tenant_id}. Subscription limits reset.")
                    
                    source.source_status = 'active'
                    db.commit()
                    
                    log_activity(
                        db,
                        source.source_id,
                        activity_type="SOURCE_AUTO_RESUMED",
                        status="Success",
                        activity_details="Source automatically resumed after subscription limits reset.",
                        is_important=True
                    )

    except Exception as e:
        logger.error(f"Error in auto_resume_sources task: {e}")
    finally:
        db.close()
