from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc, func
import uuid
from typing import List, Optional
from fastapi import HTTPException, status, BackgroundTasks
import pyodbc

from app.modules.source.models import Tenant, Organization, Platform, Source, SyncLog, SyncFrequency
from app.modules.admin.services.subscription_service import increment_feature_usage
from app.core.db_utils import get_connection_string

# Backward-compatible aliases for any remaining references
TenantSource = Tenant
OrganizationSource = Organization
PlatformSource = Platform
SourceSource = Source
SyncLogSource = SyncLog
from app.modules.source.schemas import (
    SourceCreate, SourceUpdate, SourceRead, SourceStatus,
    PlatformRead, OrganizationRead, OrganizationSourceDetails, SourceStats,
    SyncLogRead, SyncStatus, SyncStatusRequest
)

def calculate_next_sync_time(base_time: datetime, frequency_id: int) -> datetime:
    """Calculate the next sync time based on base_time and frequency ID."""
    if frequency_id == 1: # daily
        delta = timedelta(days=1)
    elif frequency_id == 2: # three_days
        delta = timedelta(days=3)
    elif frequency_id == 3: # weekly
        delta = timedelta(days=7)
    else:
        delta = timedelta(days=1)  # Default to daily
    
    return base_time + delta
    
def calculate_success_rate(
    success_count: int, 
    total_syncs: int, 
    platform_success_count: int, 
    platform_total_syncs: int
) -> float:
    """
    Calculate success rate based on the following logic:
    - PSR = platform_success / platform_total
    - ISR = source_success / source_total
    - If source_total == 0: Rate = PSR
    - If source_total > 0: Rate = (PSR + ISR) / 2
    """
    psr = 0.0
    if platform_total_syncs > 0:
        psr = platform_success_count / platform_total_syncs
        
    if total_syncs == 0:
        return round(psr * 100, 2)
        
    isr = success_count / total_syncs
    return round(((psr + isr) / 2) * 100, 2)


def get_platforms(db: Session, include_inactive: bool = False) -> List[PlatformRead]:
    query = db.query(PlatformSource)
    if not include_inactive:
        query = query.filter(PlatformSource.platform_status == "active")
    platforms = query.all()
    return [
        PlatformRead(
            platform_id=p.platform_id,
            platform_name=p.platform_name,
            base_url=p.base_url,
            fetching_type=p.fetching_type,
            platform_status=p.platform_status,
            num_of_syncs=p.num_of_syncs,
            success_sync_count=p.success_sync_count,
            success_rate=round((p.success_sync_count / p.num_of_syncs) * 100, 2) if p.num_of_syncs > 0 else 0.0,
            created_at=p.created_at
        ) for p in platforms
    ]

def get_organizations_by_tenant(db: Session, tenant_id: uuid.UUID) -> List[OrganizationSource]:
    return db.query(OrganizationSource).filter(OrganizationSource.tenant_id == tenant_id).all()

def get_organization_sources_with_stats(
    db: Session, organization_id: uuid.UUID
) -> OrganizationSourceDetails:
    # Fetch organization and its sources in a single query with joinedload
    org = db.query(OrganizationSource).options(
        joinedload(OrganizationSource.sources).joinedload(SourceSource.platform)
    ).filter(
        OrganizationSource.organization_id == organization_id
    ).first()
    
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found for this tenant"
        )

    sources_read = []
    total = 0
    active = 0
    paused = 0
    errors = 0

    for source in org.sources:
        sources_read.append(SourceRead(
            source_id=source.source_id,
            organization_id=source.organization_id,
            platform_id=source.platform_id,
            platform_name=source.platform.platform_name,
            platform_status=source.platform.platform_status,
            source_url=source.source_url,
            source_status=source.source_status,
            fetching_frequency=source.fetching_frequency,
            last_synced_at=source.last_synced_at,
            next_synced_at=source.next_synced_at,
            num_of_syncs=source.num_of_syncs,
            success_sync_count=source.success_sync_count,
            platform_num_of_syncs=source.platform.num_of_syncs,
            platform_success_sync_count=source.platform.success_sync_count,
            success_rate=calculate_success_rate(
                source.success_sync_count, 
                source.num_of_syncs,
                source.platform.success_sync_count,
                source.platform.num_of_syncs
            ),
            created_at=source.created_at
        ))
        
        total += 1
        if source.source_status == "active":
            active += 1
        elif source.source_status == "paused":
            paused += 1
        elif source.source_status == "error":
            errors += 1

    stats = SourceStats(
        total_sources=total,
        active_sources=active,
        paused_sources=paused,
        sync_error_count=errors
    )

    return OrganizationSourceDetails(
        organization_id=org.organization_id,
        organization_name=org.organization_name,
        sources=sources_read,
        stats=stats
    )

def create_source(db: Session, source_data: SourceCreate) -> SourceRead:
    # Check if a source already exists for this org, and platform
    existing = db.query(SourceSource).filter(
        SourceSource.organization_id == source_data.organization_id,
        SourceSource.platform_id == source_data.platform_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A source link already exists for this organization and platform."
        )

    # Check platform status
    platform = db.query(Platform).filter(Platform.platform_id == source_data.platform_id).first()
    if not platform:
        raise HTTPException(status_code=404, detail="Platform not found")
    
    if platform.platform_status == "inactive":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"The platform '{platform.platform_name}' is currently inactive and cannot be added."
        )

    now = datetime.now(timezone.utc)
    new_source = SourceSource(
        organization_id=source_data.organization_id,
        platform_id=source_data.platform_id,
        source_url=source_data.source_url,
        source_status=source_data.source_status,
        fetching_frequency=source_data.fetching_frequency,
        next_synced_at=calculate_next_sync_time(now, source_data.fetching_frequency)
    )
    
    db.add(new_source)
    db.commit()

    # Get platform name for logging
    platform = db.query(Platform).filter(Platform.platform_id == source_data.platform_id).first()
    platform_name = platform.platform_name if platform else "Unknown"

    # Log Activity
    log_activity(
        db, 
        new_source.source_id, 
        activity_type="SOURCE_ADDED", 
        activity_details=f"Connected {platform_name} source: {source_data.source_url}",
        is_important=True
    )

    db.refresh(new_source)
    
    # Load platform for the response
    source = db.query(SourceSource).options(
        joinedload(SourceSource.platform)
    ).filter(SourceSource.source_id == new_source.source_id).first()

    return SourceRead(
        source_id=source.source_id,
        organization_id=source.organization_id,
        platform_id=source.platform_id,
        platform_name=source.platform.platform_name,
        platform_status=source.platform.platform_status,
        source_url=source.source_url,
        source_status=source.source_status,
        fetching_frequency=source.fetching_frequency,
        last_synced_at=source.last_synced_at,
        next_synced_at=source.next_synced_at,
        num_of_syncs=source.num_of_syncs,
        success_sync_count=source.success_sync_count,
        platform_num_of_syncs=source.platform.num_of_syncs,
        platform_success_sync_count=source.platform.success_sync_count,
        success_rate=calculate_success_rate(
            source.success_sync_count,
            source.num_of_syncs,
            source.platform.success_sync_count,
            source.platform.num_of_syncs
        ),
        created_at=source.created_at,
    )

def update_source(db: Session, source_id: uuid.UUID, source_data: SourceUpdate) -> SourceRead: #
    source = db.query(SourceSource).options(
        joinedload(SourceSource.platform)
    ).filter(SourceSource.source_id == source_id).first()
    
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    
    update_data = source_data.dict(exclude_unset=True)

    # If platform_id is being changed, verify the new platform is active
    if "platform_id" in update_data and update_data["platform_id"] != source.platform_id:
        new_platform = db.query(Platform).filter(Platform.platform_id == update_data["platform_id"]).first()
        if not new_platform:
            raise HTTPException(status_code=404, detail="New platform not found")
        if new_platform.platform_status == "inactive":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"The platform '{new_platform.platform_name}' is currently inactive."
            )
    
    # Check if frequency is being updated to recalculate next_synced_at
    if "fetching_frequency" in update_data and update_data["fetching_frequency"] != source.fetching_frequency:
        base_time = source.last_synced_at or source.created_at
        source.next_synced_at = calculate_next_sync_time(base_time, update_data["fetching_frequency"])

    for key, value in update_data.items():
        setattr(source, key, value)
    
    # Log Activity for schedule changes
    if "fetching_frequency" in update_data:
        log_activity(
            db,
            source_id,
            activity_type="SYNC_SCHEDULE_UPDATED",
            activity_details=f"Sync frequency changed to {update_data['fetching_frequency']}"
        )
    
    db.commit()
    db.refresh(source)
    
    return SourceRead(
        source_id=source.source_id,
        organization_id=source.organization_id,
        platform_id=source.platform_id,
        platform_name=source.platform.platform_name,
        platform_status=source.platform.platform_status,
        source_url=source.source_url,
        source_status=source.source_status,
        fetching_frequency=source.fetching_frequency,
        last_synced_at=source.last_synced_at,
        next_synced_at=source.next_synced_at,
        num_of_syncs=source.num_of_syncs,
        success_sync_count=source.success_sync_count,
        platform_num_of_syncs=source.platform.num_of_syncs,
        platform_success_sync_count=source.platform.success_sync_count,
        success_rate=calculate_success_rate(
            source.success_sync_count,
            source.num_of_syncs,
            source.platform.success_sync_count,
            source.platform.num_of_syncs
        ),
        created_at=source.created_at,
    )

def delete_source(db: Session, source_id: uuid.UUID):
    source = db.query(SourceSource).options(
        joinedload(SourceSource.platform)
    ).filter(SourceSource.source_id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    # Capture info before deleting
    platform_name = source.platform.platform_name if source.platform else "Unknown"
    org_id = source.organization_id

    db.delete(source)
    db.commit()

    # Log Activity
    log_activity(
        db, 
        source_id, 
        activity_type="SOURCE_REMOVED", 
        activity_details=f"Disconnected {platform_name} source",
        is_important=True
    )

    return {"message": "Source deleted successfully"}

def get_tenant_sources(db: Session, tenant_id: uuid.UUID) -> List[SourceRead]:
    sources = db.query(SourceSource).join(
        OrganizationSource, SourceSource.organization_id == OrganizationSource.organization_id
    ).options(
        joinedload(SourceSource.platform)
    ).filter(
        OrganizationSource.tenant_id == tenant_id
    ).all()
    return [
        SourceRead(
            source_id=s.source_id,
            organization_id=s.organization_id,
            platform_id=s.platform_id,
            platform_name=s.platform.platform_name,
            platform_status=s.platform.platform_status,
            source_url=s.source_url,
            source_status=s.source_status,
            fetching_frequency=s.fetching_frequency,
            last_synced_at=s.last_synced_at,
            next_synced_at=s.next_synced_at,
            num_of_syncs=s.num_of_syncs,
            success_sync_count=s.success_sync_count,
            platform_num_of_syncs=s.platform.num_of_syncs,
            platform_success_sync_count=s.platform.success_sync_count,
            success_rate=calculate_success_rate(
                s.success_sync_count,
                s.num_of_syncs,
                s.platform.success_sync_count,
                s.platform.num_of_syncs
            ),
            created_at=s.created_at
        ) for s in sources
    ]

def get_sync_logs(
    db: Session, 
    organization_id: uuid.UUID, 
    skip: int = 0, 
    limit: int = 10,
    activity_type: Optional[str] = None,
    is_important: Optional[bool] = None,
    search: Optional[str] = None,
    source_id: Optional[uuid.UUID] = None
) -> List[SyncLogRead]:
    # Fetch logs for sources belonging to this organization
    query = db.query(SyncLogSource).join(
        SourceSource, SyncLogSource.source_id == SourceSource.source_id
    ).options(
        joinedload(SyncLogSource.source).joinedload(SourceSource.platform)
    ).filter(
        SourceSource.organization_id == organization_id
    )

    if source_id:
        query = query.filter(SyncLogSource.source_id == source_id)

    if activity_type:
        # Support multiple types if comma-separated
        if "," in activity_type:
            types = [t.strip() for t in activity_type.split(",")]
            query = query.filter(SyncLogSource.activity_type.in_(types))
        else:
            query = query.filter(SyncLogSource.activity_type == activity_type)
    
    if is_important is not None:
        query = query.filter(SyncLogSource.is_important == is_important)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                SyncLogSource.activity_details.ilike(search_filter),
                SyncLogSource.error_message.ilike(search_filter),
                SourceSource.platform_name.ilike(search_filter)
            )
        )

    logs = query.order_by(
        SyncLogSource.timestamp.desc()
    ).offset(skip).limit(limit).all()

    return [
        SyncLogRead(
            id=log.log_id,
            sourceId=log.source_id,
            platform=log.source.platform.platform_name,
            status=log.status,
            timestamp=log.timestamp,
            durationMs=log.duration_ms,
            reviewsFetched=log.reviews_fetched,
            errorMessage=log.error_message,
            activityType=log.activity_type,
            isImportant=log.is_important,
            activityDetails=log.activity_details
        ) for log in logs
    ]

def update_sync_status(
    db: Session, 
    source_id: uuid.UUID, 
    request: SyncStatusRequest, 
    background_tasks: Optional[BackgroundTasks] = None
) -> SourceRead:
    """Update the sync status of a source and record logs if necessary."""
    from app.modules.reviews.services.review_service import start_ingestion_and_processing_flow

    source = db.query(SourceSource).options(
        joinedload(SourceSource.platform)
    ).filter(SourceSource.source_id == source_id).first()
    
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    
    # Handle status-specific logic
    if request.status == SyncStatus.COMPLETED:
        source.last_synced_at = now
        source.next_synced_at = calculate_next_sync_time(now, source.fetching_frequency)
        source.source_status = SourceStatus.ACTIVE
        
        # Update counts
        source.num_of_syncs += 1
        source.success_sync_count += 1
        source.platform.num_of_syncs += 1
        source.platform.success_sync_count += 1
        
        # Create a sync log entry using log_activity
        sync_log = log_activity(
            db,
            source_id=source.source_id,
            activity_type="SYNC_COMPLETED",
            status="Success",
            reviews_fetched=request.new_review_count,
            activity_details=f"Synchronization successfully finished for {source.platform.platform_name}. {request.new_review_count} reviews were detected."
        )
        db.flush()

        # Trigger Review Ingestion and Processing Pipeline
        if background_tasks:
            background_tasks.add_task(start_ingestion_and_processing_flow, source_id, sync_log.log_id)
        
    elif request.status == SyncStatus.FAILED:
        source.source_status = SourceStatus.ERROR
        
        # Update counts
        source.num_of_syncs += 1
        source.platform.num_of_syncs += 1
        
        # Create a failure log entry using log_activity
        sync_log = log_activity(
            db,
            source_id=source.source_id,
            activity_type="SYNC_FAILED",
            status="Failed",
            error_message=request.error_message,
            activity_details=f"Synchronization failed for {source.platform.platform_name}. Error: {request.error_message or 'Unknown error'}",
            is_important=True
        )

        # ── Send scrape failed notification ──
        try:
            from app.services.notification_helpers import notify_scrape_failed
            org = db.query(Organization).filter(
                Organization.organization_id == source.organization_id
            ).first()
            if org and org.tenant_id:
                notify_scrape_failed(
                    user_id=str(org.tenant_id),
                    platform_name=source.platform.platform_name,
                    error_message=request.error_message,
                    org_name=org.organization_name,
                )
        except Exception:
            pass  # Best-effort

        # ── Log system alert for admin dashboard ──
        try:
            from app.modules.admin.services.system_alert_logger import alert_scraping_failure
            org = db.query(Organization).filter(
                Organization.organization_id == source.organization_id
            ).first()
            alert_scraping_failure(
                platform=source.platform.platform_name,
                error_msg=request.error_message or "",
                org_name=org.organization_name if org else "",
            )
        except Exception:
            pass  # Best-effort
        
    elif request.status == SyncStatus.RUNNING:
        source.source_status = SourceStatus.RUNNING.value
        log_activity(
            db, 
            source_id, 
            activity_type="SYNC_STARTED", 
            status="In Progress",
            activity_details=f"Synchronization process initiated for {source.platform.platform_name}."
        )
        
    elif request.status == SyncStatus.QUEUED:
        source.source_status = SourceStatus.QUEUED.value
        log_activity(
            db, 
            source_id, 
            activity_type="SYNC_QUEUED", 
            status="In Progress",
            activity_details=f"Source {source.platform.platform_name} placed in high-priority sync queue."
        )
        
    elif request.status == SyncStatus.VERIFY_DUPLICATION:
        source.source_status = SourceStatus.VERIFY_DUPLICATION.value

    db.commit()
    db.refresh(source)
    
    return SourceRead(
        source_id=source.source_id,
        organization_id=source.organization_id,
        platform_id=source.platform_id,
        platform_name=source.platform.platform_name,
        platform_status=source.platform.platform_status,
        source_url=source.source_url,
        source_status=source.source_status,
        fetching_frequency=source.fetching_frequency,
        last_synced_at=source.last_synced_at,
        next_synced_at=source.next_synced_at,
        num_of_syncs=source.num_of_syncs,
        success_sync_count=source.success_sync_count,
        platform_num_of_syncs=source.platform.num_of_syncs,
        platform_success_sync_count=source.platform.success_sync_count,
        success_rate=calculate_success_rate(
            source.success_sync_count,
            source.num_of_syncs,
            source.platform.success_sync_count,
            source.platform.num_of_syncs
        ),
        created_at=source.created_at
    )

def get_source_by_id(db: Session, source_id: uuid.UUID) -> SourceRead:
    source = db.query(SourceSource).options(
        joinedload(SourceSource.platform)
    ).filter(SourceSource.source_id == source_id).first()
    
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    return SourceRead(
        source_id=source.source_id,
        organization_id=source.organization_id,
        platform_id=source.platform_id,
        platform_name=source.platform.platform_name,
        platform_status=source.platform.platform_status,
        source_url=source.source_url,
        source_status=source.source_status,
        fetching_frequency=source.fetching_frequency,
        last_synced_at=source.last_synced_at,
        next_synced_at=source.next_synced_at,
        num_of_syncs=source.num_of_syncs,
        success_sync_count=source.success_sync_count,
        platform_num_of_syncs=source.platform.num_of_syncs,
        platform_success_sync_count=source.platform.success_sync_count,
        success_rate=calculate_success_rate(
            source.success_sync_count,
            source.num_of_syncs,
            source.platform.success_sync_count,
            source.platform.num_of_syncs
        ),
        created_at=source.created_at
    )

def get_sync_frequencies(db: Session) -> List[SyncFrequency]:
    """Fetch all synchronization frequency options."""
    return db.query(SyncFrequency).all()

def get_stuck_sources(db: Session) -> List[SourceRead]:
    """Fetch all sources that are currently running or queued (stuck state if scraper restarted)."""
    sources = db.query(SourceSource).options(
        joinedload(SourceSource.platform)
    ).filter(
        SourceSource.source_status.in_(["running", "queued", "verify_duplication"])
    ).all()
    
    return [
        SourceRead(
            source_id=s.source_id,
            organization_id=s.organization_id,
            platform_id=s.platform_id,
            platform_name=s.platform.platform_name,
            platform_status=s.platform.platform_status,
            source_url=s.source_url,
            source_status=s.source_status,
            fetching_frequency=s.fetching_frequency,
            last_synced_at=s.last_synced_at,
            next_synced_at=s.next_synced_at,
            num_of_syncs=s.num_of_syncs,
            success_sync_count=s.success_sync_count,
            platform_num_of_syncs=s.platform.num_of_syncs,
            platform_success_sync_count=s.platform.success_sync_count,
            success_rate=calculate_success_rate(
                s.success_sync_count,
                s.num_of_syncs,
                s.platform.success_sync_count,
                s.platform.num_of_syncs
            ),
            created_at=s.created_at
        ) for s in sources
    ]

def trigger_sync(db: Session, source_id: uuid.UUID):
    """Manually trigger a synchronization task for a specific source."""
    source = db.query(SourceSource).options(joinedload(SourceSource.platform)).filter(SourceSource.source_id == source_id).first()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")
    
    # Check platform status
    if source.platform.platform_status == "inactive":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Synchronization is disabled for the inactive platform '{source.platform.platform_name}'."
        )

    # Check if already syncing
    if source.source_status in ["running", "queued", "verify_duplication"]:
        return {"message": "Sync already in progress", "status": source.source_status}

    # Update status to queued
    source.source_status = "queued"
    db.commit()
    
    # Log activity
    log_activity(
        db,
        source_id=source.source_id,
        activity_type="SYNC_QUEUED",
        status="In Progress",
        activity_details=f"Manual sync request received. {source.platform.platform_name} placed in high-priority sync queue."
    )
    
    # Trigger the microservice (async trigger)
    import os
    import httpx
    SCRAPER_API_BASE_URL = os.getenv("SCRAPER_API_URL", "http://127.0.0.1:8001")
    platform_key = source.platform.platform_name.lower().replace(" reviews", "").replace(".com", "")
    endpoint = f"{SCRAPER_API_BASE_URL}/api/{platform_key}/scrape"
    
    payload = {
        "source_id": str(source.source_id),
        "source_url": source.source_url,
        "headless": True,
        "pages": "*"
    }
    
    try:
        # We use a short timeout and fire-and-forget approach for the trigger
        with httpx.Client() as client:
            resp = client.post(endpoint, json=payload, timeout=2.0)
            if resp.status_code in [200, 201, 202]:
                data = resp.json()
                job_id = data.get("job_id")
                if job_id:
                    from app.modules.source.services.sync_socket_manager import sync_socket_manager
                    sync_socket_manager.register_job(str(source_id), job_id)
    except Exception:
        # The scraper might be slow to respond or busy, but the status is already 'queued'
        # The scraper's own reconciliation will pick it up if it failed to receive the POST
        pass

    return {
        "message": "Synchronization triggered successfully",
        "source_id": str(source_id),
        "status": "queued"
    }

def prune_activities(db: Session, organization_id: uuid.UUID):
    """Keep only the latest 100 entries for a given organization."""
    # Find all source IDs for this organization
    source_ids_query = db.query(SourceSource.source_id).filter(
        SourceSource.organization_id == organization_id
    ).all()
    source_ids = [s[0] for s in source_ids_query]

    if not source_ids:
        return

    # Check total count first to avoid unnecessary subqueries
    total_count = db.query(SyncLogSource).filter(
        SyncLogSource.source_id.in_(source_ids)
    ).count()
    
    if total_count <= 100:
        return

    # Get the top 100 latest log IDs for this organization
    subquery = db.query(SyncLogSource.log_id).filter(
        SyncLogSource.source_id.in_(source_ids)
    ).order_by(SyncLogSource.timestamp.desc()).limit(100).all()
    
    latest_ids = [row[0] for row in subquery]
    
    if len(latest_ids) < 100:
        return

    # Delete logs for these sources that are NOT in the latest 100
    db.query(SyncLogSource).filter(
        SyncLogSource.source_id.in_(source_ids),
        ~SyncLogSource.log_id.in_(latest_ids)
    ).delete(synchronize_session=False)
    db.commit()

def log_activity(
    db: Session,
    source_id: uuid.UUID,
    activity_type: str,
    status: str = "Success",
    reviews_fetched: int = 0,
    duration_ms: int = 0,
    error_message: Optional[str] = None,
    activity_details: Optional[str] = None,
    is_important: bool = False
) -> SyncLogSource:
    """Create a new activity log and prune old ones."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    
    new_log = SyncLogSource(
        source_id=source_id,
        status=status,
        timestamp=now,
        reviews_fetched=reviews_fetched,
        duration_ms=duration_ms,
        error_message=error_message,
        activity_type=activity_type,
        is_important=is_important,
        activity_details=activity_details
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    
    # Prune old activities for the organization
    source = db.query(SourceSource).options(joinedload(SourceSource.platform)).filter(SourceSource.source_id == source_id).first()
    if source:
        prune_activities(db, source.organization_id)

        # Trigger notifications for important activities
        if is_important:
            try:
                from app.services.notification_helpers import send_notification
                org = db.query(Organization).filter(Organization.organization_id == source.organization_id).first()
                if org and org.tenant_id:
                    title = f"Activity: {activity_type.replace('_', ' ').title()}"
                    # Fallback message if activity_details is missing
                    message = activity_details or error_message or f"An important activity occurred for {source.platform.platform_name}."
                    notification_type = "error" if status == "Failed" or activity_type == "SOURCE_REMOVED" else "info"
                    send_notification(str(org.tenant_id), title, message, notification_type)
            except Exception:
                pass # Best-effort
    
    return new_log
def delete_organization_logs(db: Session, organization_id: uuid.UUID):
    """Delete all sync logs for an organization, except the most recent 5 for context."""
    # Find logs for this organization
    log_ids_query = db.query(SyncLogSource.log_id).join(SourceSource).filter(
        SourceSource.organization_id == organization_id
    ).order_by(SyncLogSource.timestamp.desc())
    
    # Keep the top 5
    logs_to_keep = [r[0] for r in log_ids_query.limit(5).all()]
    
    # Delete the rest
    db.query(SyncLogSource).filter(
        SyncLogSource.log_id.notin_(logs_to_keep)
    ).join(SourceSource).filter(
        SourceSource.organization_id == organization_id
    ).delete(synchronize_session=False)
    
    db.commit()
