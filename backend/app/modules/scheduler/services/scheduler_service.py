import logging
import urllib.parse
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from app.core.pyodbc_connection import get_connection_string

logger = logging.getLogger(__name__)

def _get_scheduler_config():
    """Build configuration for a persistent database-backed scheduler."""
    raw_conn = get_connection_string()
    # SQLAlchemy requires the connection string to be URL-encoded and prefixed
    quoted_conn = urllib.parse.quote_plus(raw_conn)
    db_url = f"mssql+pyodbc:///?odbc_connect={quoted_conn}"

    jobstores = {
        'default': SQLAlchemyJobStore(url=db_url)
    }
    
    # Global job defaults for robustness
    job_defaults = {
        'coalesce': True,            # Combine multiple missed runs into one
        'max_instances': 1,          # Safety first: one instance per job
        'misfire_grace_time': 60     # Allow jobs to be up to 1 minute late
    }

    return {
        'jobstores': jobstores,
        'job_defaults': job_defaults
    }

# Initialize with persistent job store
try:
    scheduler = AsyncIOScheduler(**_get_scheduler_config())
except Exception as e:
    logger.error(f"Failed to initialize persistent scheduler: {e}. Falling back to in-memory.")
    scheduler = AsyncIOScheduler()

def start_scheduler():
    """Start the background task scheduler."""
    if not scheduler.running:
        scheduler.start()
        logger.info("APScheduler started successfully.")

def stop_scheduler():
    """Stop the background task scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("APScheduler shut down successfully.")


def reschedule_job_interval(job_id: str, minutes: int):
    """
    Update the interval for a specific job.
    Effectively reschedules the job without stopping the scheduler.
    """
    try:
        if scheduler.get_job(job_id):
            scheduler.reschedule_job(job_id, trigger='interval', minutes=minutes)
            logger.info(f"APScheduler: Job '{job_id}' rescheduled to run every {minutes} minutes.")
            return True
        else:
            logger.warning(f"APScheduler: Job '{job_id}' not found. Cannot reschedule.")
            return False
    except Exception as e:
        logger.error(f"APScheduler: Error rescheduling job '{job_id}': {e}")
        return False
