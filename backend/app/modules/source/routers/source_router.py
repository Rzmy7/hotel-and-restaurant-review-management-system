from fastapi import APIRouter, HTTPException, Depends, status, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.responses import StreamingResponse
import io
import csv
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import uuid

from app.database import get_db
from app.modules.source.services import source_service
from app.modules.auth.utils.auth_utils import get_current_user
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
    SyncStatusRequest,
)
from app.modules.source.models import (
    Source as SourceSource,
)  # alias for backward compat
from app.modules.scheduler.tasks.sync_tasks import trigger_platform_scrape

router = APIRouter()

@router.websocket("/{source_id}/progress")
async def websocket_sync_progress(
    websocket: WebSocket, 
    source_id: uuid.UUID,
    token: Optional[str] = None
):
    """
    WebSocket endpoint for the frontend to receive real-time sync progress.
    Acts as a proxy/relay to the Scraper Engine's internal WebSocket.
    """
    from app.modules.source.services.sync_socket_manager import sync_socket_manager
    
    await sync_socket_manager.connect_frontend(websocket, str(source_id))
    try:
        while True:
            # We just need to keep the connection open. 
            # We don't expect messages from the frontend, but we listen to detect disconnects.
            await websocket.receive_text()
    except WebSocketDisconnect:
        await sync_socket_manager.disconnect_frontend(websocket, str(source_id))

@router.get(
    "/organizations/{organization_id}/sync-logs", response_model=List[SyncLogRead]
)
def get_sync_logs(
    organization_id: uuid.UUID,
    skip: int = 0,
    limit: int = 10,
    activity_type: Optional[str] = None,
    is_important: Optional[bool] = None,
    search: Optional[str] = None,
    source_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Fetch recent synchronization logs for an organization with advanced filtering and pagination."""
    return source_service.get_sync_logs(
        db, 
        organization_id, 
        skip, 
        limit, 
        activity_type=activity_type, 
        is_important=is_important,
        search=search,
        source_id=source_id
    )

@router.get("/platforms", response_model=List[PlatformRead])
def get_platforms(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Fetch all available review platforms."""
    # Only admins can see inactive platforms
    is_admin = hasattr(user, 'role') and user.role.role_name.lower() == 'admin'
    return source_service.get_platforms(db, include_inactive=is_admin)

@router.get("/stuck-tasks", response_model=List[SourceRead])
def get_stuck_tasks(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Fetch all sources that are marked 'running' or 'queued', meaning they may be stuck if the engine restarted."""
    return source_service.get_stuck_sources(db)

@router.get("/sync-frequencies", response_model=List[SyncFrequencyRead])
def get_sync_frequencies(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Fetch all synchronization frequency options."""
    return source_service.get_sync_frequencies(db)

@router.get("/tenants/{tenant_id}/organizations", response_model=List[OrganizationRead])
def get_organizations(tenant_id: uuid.UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Fetch all organizations for a specific tenant."""
    return source_service.get_organizations_by_tenant(db, tenant_id)

@router.get("/tenants/{tenant_id}/sources", response_model=List[SourceRead])
def get_tenant_sources(tenant_id: uuid.UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Fetch all sources for a specific tenant across all organizations."""
    return source_service.get_tenant_sources(db, tenant_id)

@router.get(
    "/organizations/{organization_id}/sources", response_model=OrganizationSourceDetails
)
def get_organization_sources(organization_id: uuid.UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Fetch all sources for a specific organization with overall stats."""
    return source_service.get_organization_sources_with_stats(db, organization_id)

@router.post("/", response_model=SourceRead, status_code=status.HTTP_201_CREATED)
def add_source(
    source_data: SourceCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Add a new review source to an organization."""
    return source_service.create_source(db, source_data)

@router.patch("/{source_id}", response_model=SourceRead)
def update_source(
    source_id: uuid.UUID,
    updates: SourceUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Update an existing source's configuration."""
    return source_service.update_source(db, source_id, updates)

@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_source(
    source_id: uuid.UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Remove a source from the system."""
    source_service.delete_source(db, source_id)
    return None

@router.post("/{source_id}/sync", status_code=status.HTTP_202_ACCEPTED)
def trigger_sync(
    source_id: uuid.UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Manually trigger a synchronization task for a specific source."""
    return source_service.trigger_sync(db, source_id)

# Internal endpoint for Scraper Engine to update task status
@router.post("/{source_id}/sync-status", response_model=SourceRead)
def update_sync_status(
    source_id: uuid.UUID,
    request: SyncStatusRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Endpoint for the scraper engine to report synchronization progress or completion."""
    return source_service.update_sync_status(db, source_id, request, background_tasks)

@router.get("/organizations/{organization_id}/sync-logs/export")
def export_sync_logs(
    organization_id: uuid.UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Export all sync logs for an organization to a CSV file."""
    logs = source_service.get_sync_logs(db, organization_id, limit=1000) # Get a large batch
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Timestamp", "Platform", "Activity Type", "Status", "Reviews Fetched", "Details", "Error"])
    
    for log in logs:
        writer.writerow([
            log.timestamp.isoformat(),
            log.platform,
            log.activityType,
            log.status,
            log.reviewsFetched,
            log.activityDetails,
            log.errorMessage
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=sync_history_{organization_id}.csv"}
    )

@router.delete("/organizations/{organization_id}/sync-logs/clear", status_code=status.HTTP_204_NO_CONTENT)
def clear_sync_logs(
    organization_id: uuid.UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Clear activity history for an organization."""
    source_service.delete_organization_logs(db, organization_id)
    return None
