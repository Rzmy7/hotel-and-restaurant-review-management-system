"""System monitoring endpoints — health, jobs, pool status, metrics."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import time
import sys
import os
from core.database import get_session
from core.job_manager import job_manager
from core.scrape_pool import scrape_pool
from sqlalchemy import text

router = APIRouter(prefix="/system", tags=["System Monitoring"])

START_TIME = time.time()


class PoolConfigRequest(BaseModel):
    max_workers: int


@router.get("/health")
def health_check():
    """Returns system status, DB connection, uptime, and pool info."""
    uptime = time.time() - START_TIME
    db_ok = False
    session = get_session()
    try:
        session.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass
    finally:
        session.close()

    return {
        "status": "online",
        "uptime_seconds": round(uptime, 2),
        "database_connected": db_ok,
        "active_jobs": len(job_manager.get_active_jobs()),
        "pool": scrape_pool.get_pool_status()
    }


@router.get("/jobs")
def list_active_jobs():
    """Returns all currently active background jobs with pool status."""
    return {
        "jobs": job_manager.get_active_jobs(),
        "pool": scrape_pool.get_pool_status()
    }


@router.get("/jobs/all")
def list_all_jobs():
    """Returns ALL jobs (including completed and failed)."""
    return {
        "jobs": job_manager.get_all_jobs(),
        "pool": scrape_pool.get_pool_status()
    }


@router.get("/pool")
def get_pool_status():
    """Returns current scrape pool statistics."""
    return scrape_pool.get_pool_status()


@router.put("/pool")
def configure_pool(body: PoolConfigRequest):
    """
    Change the max concurrent scrape workers at runtime.
    Existing running jobs will finish; new limit applies to subsequent jobs.
    """
    if body.max_workers < 1 or body.max_workers > 50:
        raise HTTPException(status_code=400, detail="max_workers must be between 1 and 50")
    scrape_pool.set_max_workers(body.max_workers)
    return {
        "status": "updated",
        "pool": scrape_pool.get_pool_status()
    }


@router.get("/metrics")
def system_metrics():
    """Returns application environment footprint."""
    return {
        "python_version": sys.version,
        "platform": sys.platform,
        "cpu_count": os.cpu_count(),
        "pool_max_workers": scrape_pool.max_workers
    }
