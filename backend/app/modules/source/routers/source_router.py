from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.core.database import get_db
from app.modules.source.services import source_service
from app.modules.source.schemas import (
    SourceCreate, SourceUpdate, SourceRead, 
    PlatformRead, OrganizationRead, OrganizationSourceDetails,
    SyncLogRead
)

router = APIRouter()

@router.get(
    "/tenants/{tenant_id}/organizations/{organization_id}/sync-logs", 
    response_model=List[SyncLogRead]
)
def get_sync_logs(
    tenant_id: uuid.UUID, 
    organization_id: uuid.UUID, 
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Fetch recent synchronization logs for an organization with pagination."""
    return source_service.get_sync_logs(db, tenant_id, organization_id, skip, limit)

@router.get("/platforms", response_model=List[PlatformRead])
def get_platforms(db: Session = Depends(get_db)):
    """Fetch all available review platforms."""
    return source_service.get_platforms(db)

@router.get("/tenants/{tenant_id}/organizations", response_model=List[OrganizationRead])
def get_organizations(tenant_id: uuid.UUID, db: Session = Depends(get_db)):
    """Fetch all organizations for a specific tenant."""
    return source_service.get_organizations_by_tenant(db, tenant_id)

@router.get("/tenants/{tenant_id}/sources", response_model=List[SourceRead])
def get_tenant_sources(tenant_id: uuid.UUID, db: Session = Depends(get_db)):
    """Fetch all sources for a specific tenant across all organizations."""
    return source_service.get_tenant_sources(db, tenant_id)

@router.get(
    "/tenants/{tenant_id}/organizations/{organization_id}/sources", 
    response_model=OrganizationSourceDetails
)
def get_organization_sources(
    tenant_id: uuid.UUID, 
    organization_id: uuid.UUID, 
    db: Session = Depends(get_db)
):
    """Fetch source details and stats for a specific organization of a tenant."""
    return source_service.get_organization_sources_with_stats(db, tenant_id, organization_id)

@router.post("/", response_model=SourceRead, status_code=status.HTTP_201_CREATED)
def create_source(source_data: SourceCreate, db: Session = Depends(get_db)):
    """Add a new source for an organization and platform."""
    return source_service.create_source(db, source_data)

@router.patch("/{source_id}", response_model=SourceRead)
def update_source(
    source_id: uuid.UUID, 
    source_data: SourceUpdate, 
    db: Session = Depends(get_db)
):
    """Update source settings or toggle status."""
    return source_service.update_source(db, source_id, source_data)

@router.delete("/{source_id}")
def delete_source(source_id: uuid.UUID, db: Session = Depends(get_db)):
    """Remove a source link."""
    return source_service.delete_source(db, source_id)

@router.post("/{source_id}/sync")
def sync_source(source_id: uuid.UUID, db: Session = Depends(get_db)):
    """Manually trigger a data sync for a source."""
    # This would typically trigger a Celery task
    return {"message": "Sync triggered successfully", "source_id": str(source_id)}




