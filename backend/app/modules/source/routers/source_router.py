from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List
import uuid


from app.database import get_db
from app.modules.source.services import source_service
from app.modules.source.schemas import (
    SourceCreate,
    SourceUpdate,
    SourceRead,
    PlatformRead,
    OrganizationRead,
    OrganizationSourceDetails,
    SyncLogRead,
    SourceStatus,
    SyncFrequencyRead,
)
from app.modules.source.models import (
    Source as SourceSource,
)  # alias for backward compat
from app.modules.scheduler.tasks.sync_tasks import trigger_platform_scrape


router = APIRouter()


@router.get(
    "/organizations/{organization_id}/sync-logs", response_model=List[SyncLogRead]
)
def get_sync_logs(
    organization_id: uuid.UUID,
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db),
):
    """Fetch recent synchronization logs for an organization with pagination."""
    return source_service.get_sync_logs(db, organization_id, skip, limit)


@router.get("/platforms", response_model=List[PlatformRead])
def get_platforms(db: Session = Depends(get_db)):
    """Fetch all available review platforms."""
    return source_service.get_platforms(db)

@router.get("/stuck-tasks", response_model=List[SourceRead])
def get_stuck_tasks(db: Session = Depends(get_db)):
    """Fetch all sources that are marked 'running' or 'queued', meaning they may be stuck if the engine restarted."""
    return source_service.get_stuck_sources(db)



@router.get("/sync-frequencies", response_model=List[SyncFrequencyRead])
def get_sync_frequencies(db: Session = Depends(get_db)):
    """Fetch all synchronization frequency options."""
    return source_service.get_sync_frequencies(db)


@router.get("/tenants/{tenant_id}/organizations", response_model=List[OrganizationRead])
def get_organizations(tenant_id: uuid.UUID, db: Session = Depends(get_db)):
    """Fetch all organizations for a specific tenant."""
    return source_service.get_organizations_by_tenant(db, tenant_id)


@router.get("/tenants/{tenant_id}/sources", response_model=List[SourceRead])
def get_tenant_sources(tenant_id: uuid.UUID, db: Session = Depends(get_db)):
    """Fetch all sources for a specific tenant across all organizations."""
    return source_service.get_tenant_sources(db, tenant_id)


@router.get(
    "/organizations/{organization_id}/sources", response_model=OrganizationSourceDetails
)
def get_organization_sources(organization_id: uuid.UUID, db: Session = Depends(get_db)):
    """Fetch source details and stats for a specific organization."""
    return source_service.get_organization_sources_with_stats(db, organization_id)


@router.post("/", response_model=SourceRead, status_code=status.HTTP_201_CREATED)
def create_source(source_data: SourceCreate, db: Session = Depends(get_db)):
    """Add a new source for an organization and platform."""
    return source_service.create_source(db, source_data)


@router.patch("/{source_id}", response_model=SourceRead)
def update_source(
    source_id: uuid.UUID, source_data: SourceUpdate, db: Session = Depends(get_db)
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
    source = source_service.get_source_by_id(db, source_id)
    platform_name = source.platform_name
    source_url = source.source_url

    # We do NOT set status to QUEUED here.
    # The Scraper Engine will notify us if it's actually QUEUED or RUNNING.
    trigger_platform_scrape(str(platform_name), str(source_url), str(source_id))
    return {"message": "Sync triggered successfully", "source_id": str(source_id)}


@router.post("/{source_id}/stop-sync")
def stop_sync(source_id: uuid.UUID, db: Session = Depends(get_db)):
    """
    Stop any active scrape for a source.
    Sends a cancel request to the scraper engine, and resets source status to 'active'.
    """
    import os
    import httpx

    scraper_url = os.getenv("SCRAPER_API_URL", "http://127.0.0.1:8001")
    cancel_endpoint = f"{scraper_url}/api/system/jobs/{source_id}/cancel"

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(cancel_endpoint)
            resp.raise_for_status()
    except Exception:
        pass  # Best-effort: scraper may not be running or job already finished

    # Reset source status back to active
    source_service.update_source(
        db, source_id,
        SourceUpdate(source_status=SourceStatus.ACTIVE)
    )

    return {"message": "Sync stopped successfully", "source_id": str(source_id)}

