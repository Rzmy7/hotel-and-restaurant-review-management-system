from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
import uuid

from app.database import get_db
from app.modules.source.services import source_service
from app.modules.source.schemas import SourceRead, SyncStatusRequest

router = APIRouter()

@router.post("/{source_id}/sync-status", response_model=SourceRead)
def update_sync_status(source_id: uuid.UUID, request: SyncStatusRequest, db: Session = Depends(get_db)):
    """
    Endpoint for scraper to notify sync status changes (QUEUED, RUNNING, COMPLETED, FAILED).
    Updates source status and records sync logs.
    """
    return source_service.update_sync_status(db, source_id, request)
