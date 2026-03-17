from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
import uuid
from typing import List, Optional
from fastapi import HTTPException, status

from app.modules.source.models import TenantSource, OrganizationSource, PlatformSource, SourceSource
from app.modules.source.schemas import (
    SourceCreate, SourceUpdate, SourceRead, 
    PlatformRead, OrganizationRead, OrganizationSourceDetails, SourceStats
)

def get_platforms(db: Session) -> List[PlatformSource]:
    return db.query(PlatformSource).all()

def get_organizations_by_tenant(db: Session, tenant_id: uuid.UUID) -> List[OrganizationSource]:
    return db.query(OrganizationSource).filter(OrganizationSource.tenant_id == tenant_id).all()

def get_organization_sources_with_stats(
    db: Session, tenant_id: uuid.UUID, organization_id: uuid.UUID
) -> OrganizationSourceDetails:
    # Fetch organization and its sources in a single query with joinedload
    org = db.query(OrganizationSource).options(
        joinedload(OrganizationSource.sources).joinedload(SourceSource.platform)
    ).filter(
        OrganizationSource.organization_id == organization_id,
        OrganizationSource.tenant_id == tenant_id
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
            tenant_id=source.tenant_id,
            organization_id=source.organization_id,
            platform_id=source.platform_id,
            platform_name=source.platform.platform_name,
            source_url=source.source_url,
            source_status=source.source_status,
            fetching_frequency=source.fetching_frequency,
            last_synced_at=source.last_synced_at,
            next_synced_at=source.next_synced_at,
            success_rate=source.success_rate,
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
    # Check if a source already exists for this tenant, org, and platform
    existing = db.query(SourceSource).filter(
        SourceSource.tenant_id == source_data.tenant_id,
        SourceSource.organization_id == source_data.organization_id,
        SourceSource.platform_id == source_data.platform_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_VALUE,
            detail="A source link already exists for this organization and platform."
        )

    new_source = SourceSource(
        tenant_id=source_data.tenant_id,
        organization_id=source_data.organization_id,
        platform_id=source_data.platform_id,
        source_url=source_data.source_url,
        source_status=source_data.source_status,
        fetching_frequency=source_data.fetching_frequency
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
        tenant_id=source.tenant_id,
        organization_id=source.organization_id,
        platform_id=source.platform_id,
        platform_name=source.platform.platform_name,
        source_url=source.source_url,
        source_status=source.source_status,
        fetching_frequency=source.fetching_frequency,
        last_synced_at=source.last_synced_at,
        next_synced_at=source.next_synced_at,
        success_rate=source.success_rate,
        created_at=source.created_at,
    )

def update_source(db: Session, source_id: uuid.UUID, source_data: SourceUpdate) -> SourceRead:
    source = db.query(SourceSource).options(
        joinedload(SourceSource.platform)
    ).filter(SourceSource.source_id == source_id).first()
    
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    update_data = source_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(source, key, value)
    
    db.commit()
    db.refresh(source)
    
    return SourceRead(
        source_id=source.source_id,
        tenant_id=source.tenant_id,
        organization_id=source.organization_id,
        platform_id=source.platform_id,
        platform_name=source.platform.platform_name,
        source_url=source.source_url,
        source_status=source.source_status,
        fetching_frequency=source.fetching_frequency,
        last_synced_at=source.last_synced_at,
        next_synced_at=source.next_synced_at,
        success_rate=source.success_rate,
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
    sources = db.query(SourceSource).options(
        joinedload(SourceSource.platform)
    ).filter(
        SourceSource.tenant_id == tenant_id
    ).all()

    return [
        SourceRead(
            source_id=s.source_id,
            tenant_id=s.tenant_id,
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
