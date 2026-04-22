"""
System Monitoring Endpoints
===========================
GET  /api/system/health   — service health + DB connection + pool info
GET  /api/system/jobs     — active scrape jobs
GET  /api/system/jobs/all — all jobs (incl. completed/failed)
GET  /api/system/pool     — thread pool stats
PUT  /api/system/pool     — resize the thread pool at runtime
GET  /api/system/metrics  — python/OS/CPU info
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import time
import sys
import os
import psutil
from core.database import get_session
from core.job_manager import job_manager
from core.scrape_pool import scrape_pool
from sqlalchemy import text

router = APIRouter(prefix="/system", tags=["System Monitoring"])

# Track application start time for uptime calculation
START_TIME = time.time()


class PoolConfigRequest(BaseModel):
    """Request body for resizing the scrape thread pool."""
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

    days = int(uptime // 86400)
    hours = int((uptime % 86400) // 3600)
    minutes = int((uptime % 3600) // 60)
    
    return {
        "status": "online",
        "uptime": f"{days}d {hours}h {minutes}m",
        "uptime_seconds": round(uptime, 2),
        "database_connected": db_ok,
        "active_jobs": len(job_manager.get_active_jobs()),
        "pool": scrape_pool.get_pool_status()
    }


@router.get("/admin-health")
def admin_health_check():
    """Returns exactly the format expected by the admin panel."""
    uptime = time.time() - START_TIME
    days = int(uptime // 86400)
    hours = int((uptime % 86400) // 3600)
    minutes = int((uptime % 3600) // 60)
    
    cpu_usage = round(psutil.cpu_percent(interval=0.1), 1)
    memory = psutil.virtual_memory()
    ram_usage = round(memory.percent, 1)

    # Scraper doesn't strictly have a "paused" state conceptually identical to embedding service,
    # so we default to false or check if pool is empty. Let's just default to false for now.
    service_paused = False

    return {
        "status": "Online",
        "cpu_usage": cpu_usage,
        "ram_usage": ram_usage,
        "uptime": f"{days}d {hours}h {minutes}m",
        "service_paused": service_paused
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


@router.get("/queue")
def get_queue_details():
    """Returns the list of jobs currently waiting in the FCFS queue."""
    return {
        "size": scrape_pool.queued_count,
        "queue": scrape_pool.get_pool_status()["queue_ids"]
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


@router.post("/jobs/{source_id}/cancel")
def cancel_jobs_for_source(source_id: str):
    """
    Cancel all active scrape jobs for a given source_id.
    Looks up the source URL from the local database, then cancels any
    active job matching that URL.
    Note: Does NOT notify the backend — the calling backend endpoint
    handles status reset directly to avoid race conditions.
    """
    from core.database import get_session
    from core.models import Source

    # Look up the source URL so we can find matching jobs
    session = get_session()
    try:
        source = session.query(Source).filter_by(source_id=source_id).first()
        source_url = source.source_url if source else None
    finally:
        session.close()

    cancelled = False

    if source_url:
        # Find active jobs matching this URL and cancel them
        active_job = job_manager.get_active_job_by_url(source_url)
        if active_job:
            cancelled = scrape_pool.cancel_job(active_job["id"])

    # Also try to cancel any queued jobs for this source
    from core.queue import job_queue
    with job_queue._lock:
        for job in list(job_queue._queue):
            if job.kwargs.get("source_id") == source_id:
                job_queue._queue.remove(job)
                job_manager.update_job(job.job_id, status="failed", progress="Cancelled by user.")
                cancelled = True

    if cancelled:
        return {"status": "cancelled", "source_id": source_id}

    return {"status": "not_found", "source_id": source_id, "message": "No active jobs found for this source."}


@router.post("/jobs/cancel/{job_id}")
def cancel_job_by_id(job_id: str):
    """
    Cancel a specific scrape job by its internal job UUID.
    Used by the admin panel where jobs are referenced by their job ID.
    """
    cancelled = scrape_pool.cancel_job(job_id)

    if cancelled:
        return {"status": "cancelled", "job_id": job_id}

    return {"status": "not_found", "job_id": job_id, "message": "Job not found or already completed."}
