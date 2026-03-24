# app/db.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Initialize storage
engine = None
SessionLocal = None
Base = declarative_base()

def _ensure_engine():
    """Lazily create engine when first needed."""
    global engine, SessionLocal
    if engine is None:
        if not DATABASE_URL:
            raise RuntimeError("DATABASE_URL is not set in .env")
        engine = create_engine(DATABASE_URL, pool_pre_ping=True)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return engine

def get_db():
    """Get a database session. Ensures engine is initialized."""
    _ensure_engine()
    if SessionLocal is None:
        raise RuntimeError("Database not initialized. DATABASE_URL must be set.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()