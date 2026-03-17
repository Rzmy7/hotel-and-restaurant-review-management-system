from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
import uuid

from app.core.database import get_db
from app.modules.source.services import source_service
from app.modules.source.schemas import SourceRead

router = APIRouter()

@router.post("/{source_id}/sync-complete", response_model=SourceRead)
def complete_sync(source_id: uuid.UUID, db: Session = Depends(get_db)):
    """
    Endpoint to simulate sync completion.
    Updates last_synced_at and schedules next_synced_at.
    """
    return source_service.complete_sync_task(db, source_id)
