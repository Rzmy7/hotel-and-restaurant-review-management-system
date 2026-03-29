# app/db.py

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os
from pathlib import Path

# Load backend/.env explicitly
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./app.db" # Fallback instead of crash

# Detect unconfigured template strings
if "<username>" in DATABASE_URL or "<server>" in DATABASE_URL:
    print("WARNING: Unconfigured DATABASE_URL detected. Falling back to sqlite for startup.")
    DATABASE_URL = "sqlite:///./app.db"

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()