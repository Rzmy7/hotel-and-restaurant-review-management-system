"""
SQLAlchemy engine, session factory, and declarative base.

Consolidated from app/db.py and app/core/database.py.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import DATABASE_URL

# Standard declarative base for all models
Base = declarative_base()

# Engine and session factory initialized with settings from app.core.config
if DATABASE_URL:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
else:
    import warnings
    warnings.warn("DATABASE_URL is not set — SQLAlchemy features will not work.")
    engine = None
    SessionLocal = None


def get_db():
    """FastAPI dependency that yields a DB session and closes it afterwards."""
    if SessionLocal is None:
        raise RuntimeError(
            "DATABASE_URL is not configured. "
            "Set it in your .env file to enable database features."
        )
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
