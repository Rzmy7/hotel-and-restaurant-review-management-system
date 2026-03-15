"""
Health / root endpoints.

Combines the root endpoint from main.py, the health router from health.py,
and the debug db-test endpoint.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Literal

import psutil

from app.core.database import get_db

router = APIRouter(tags=["Health"])

# Store the service start time
SERVICE_START_TIME = datetime.now()


def _get_uptime() -> str:
    """Calculate service uptime in human-readable format."""
    uptime = datetime.now() - SERVICE_START_TIME
    days = uptime.days
    hours, remainder = divmod(uptime.seconds, 3600)
    minutes, _ = divmod(remainder, 60)
    return f"{days}d {hours}h {minutes}m"


def _get_cpu_usage() -> float:
    try:
        return round(psutil.cpu_percent(interval=1), 1)
    except Exception:
        return 0.0


def _get_ram_usage() -> float:
    try:
        return round(psutil.virtual_memory().percent, 1)
    except Exception:
        return 0.0


def _determine_status(cpu: float, ram: float) -> Literal["Online", "Warning", "Offline"]:
    if cpu >= 90 or ram >= 90:
        return "Warning"
    return "Online"


@router.get("/")
async def root():
    return {"message": "API is online", "status": "healthy"}


@router.get("/health")
async def health_check():
    """Health check endpoint for system monitoring."""
    cpu_usage = _get_cpu_usage()
    ram_usage = _get_ram_usage()
    status = _determine_status(cpu_usage, ram_usage)
    uptime = _get_uptime()

    return {
        "status": status,
        "cpu_usage": cpu_usage,
        "ram_usage": ram_usage,
        "uptime": uptime,
    }


@router.get("/db-test", tags=["Debug"])
def db_test(db: Session = Depends(get_db)):
    try:
        result = db.execute(text("SELECT 1 AS ok"))
        row = result.fetchone()
        return {
            "message": "Database connection successful",
            "result": row[0],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB connection failed: {str(e)}")
