# app/modules/source/query/source_queries.py
from sqlalchemy.orm import Session
from app.modules.source.models import SourceSource

def get_source_by_id(db: Session, source_id: str):
    return db.query(SourceSource).filter(SourceSource.source_id == source_id).first()
