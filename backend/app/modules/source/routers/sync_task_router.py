from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
import uuid

from app.core.database import get_db
from app.modules.source.services import source_service
from app.modules.source.schemas import SourceRead, SyncCompleteRequest

router = APIRouter()

@router.post("/{source_id}/sync-complete", response_model=SourceRead)
def complete_sync(source_id: uuid.UUID, request: SyncCompleteRequest, db: Session = Depends(get_db)):
    """
    Endpoint for scraper to notify sync completion.
    Updates last_synced_at and records new review count.
    """
    return source_service.complete_sync_task(db, source_id, request.new_review_count)
