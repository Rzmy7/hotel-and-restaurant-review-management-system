from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
import uuid
from typing import List, Optional
from fastapi import HTTPException, status

from app.modules.source.models import Tenant, Organization, Platform, Source, SyncLog

# Backward-compatible aliases for any remaining references
TenantSource = Tenant
OrganizationSource = Organization
PlatformSource = Platform
SourceSource = Source
SyncLogSource = SyncLog
from app.modules.source.schemas import (
    SourceCreate, SourceUpdate, SourceRead, FetchingFrequency, SourceStatus,
    PlatformRead, OrganizationRead, OrganizationSourceDetails, SourceStats,
    SyncLogRead, SyncStatus, SyncStatusRequest
)

def calculate_next_sync_time(base_time: datetime, frequency: FetchingFrequency) -> datetime:
    """Calculate the next sync time based on base_time and frequency."""
    if frequency == FetchingFrequency.DAILY:
        delta = timedelta(days=1)
    elif frequency == FetchingFrequency.THREE_DAYS:
        delta = timedelta(days=3)
    elif frequency == FetchingFrequency.WEEKLY:
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


def get_platforms(db: Session) -> List[PlatformRead]:
    platforms = db.query(PlatformSource).all()
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
    
    # Check if frequency is being updated to recalculate next_synced_at
    if "fetching_frequency" in update_data and update_data["fetching_frequency"] != source.fetching_frequency:
        base_time = source.last_synced_at or source.created_at
        source.next_synced_at = calculate_next_sync_time(base_time, update_data["fetching_frequency"])

    for key, value in update_data.items():
        setattr(source, key, value)
    
    db.commit()
    db.refresh(source)
    
    return SourceRead(
        source_id=source.source_id,
        organization_id=source.organization_id,
        platform_id=source.platform_id,
        platform_name=source.platform.platform_name,
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
    source = db.query(SourceSource).filter(SourceSource.source_id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    db.delete(source)
    db.commit()
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
            source_url=s.source_url,
            source_status=s.source_status,
            fetching_frequency=s.fetching_frequency,
            last_synced_at=s.last_synced_at,
            next_synced_at=s.next_synced_at,
            success_rate=s.success_rate,
            created_at=s.created_at
        ) for s in sources
    ]

def get_sync_logs(
    db: Session, organization_id: uuid.UUID, skip: int = 0, limit: int = 10
) -> List[SyncLogRead]:
    # Fetch logs for sources belonging to this organization
    logs = db.query(SyncLogSource).join(
        SourceSource, SyncLogSource.source_id == SourceSource.source_id
    ).options(
        joinedload(SyncLogSource.source).joinedload(SourceSource.platform)
    ).filter(
        SourceSource.organization_id == organization_id
    ).order_by(
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
            errorMessage=log.error_message
        ) for log in logs
    ]

def update_sync_status(db: Session, source_id: uuid.UUID, request: SyncStatusRequest) -> SourceRead:
    """Update the sync status of a source and record logs if necessary."""
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
        
        # Create a sync log entry
        sync_log = SyncLogSource(
            source_id=source.source_id,
            status="Success",
            timestamp=now,
            reviews_fetched=request.new_review_count
        )
        db.add(sync_log)
        
    elif request.status == SyncStatus.FAILED:
        source.source_status = SourceStatus.ERROR
        
        # Update counts
        source.num_of_syncs += 1
        source.platform.num_of_syncs += 1
        
        # Create a failure log entry
        sync_log = SyncLogSource(
            source_id=source.source_id,
            status="Failed",
            timestamp=now,
            error_message=request.error_message
        )
        db.add(sync_log)
        
    elif request.status == SyncStatus.RUNNING:
        source.source_status = SourceStatus.RUNNING.value
        
    elif request.status == SyncStatus.QUEUED:
        source.source_status = SourceStatus.QUEUED.value

    db.commit()
    db.refresh(source)
    
    return SourceRead(
        source_id=source.source_id,
        organization_id=source.organization_id,
        platform_id=source.platform_id,
        platform_name=source.platform.platform_name,
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
    