"""
SQLAlchemy engine, session factory, and declarative base.

Used by the auth / users / groups / roles domain
(anything using ORM models).
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import DATABASE_URL

Base = declarative_base()

# Engine and session factory are created only when DATABASE_URL is set.
# This allows the app to import cleanly even in environments without a DB
# (e.g. CI, static analysis). Requests that need the DB will fail at runtime
# with a clear error message.
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
