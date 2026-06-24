import logging
import pyodbc
from app.core.pyodbc_connection import get_connection_string
from app.modules.admin.services.system_settings_service import (
    get_setting_int, 
    ensure_system_settings_table,
    DEFAULT_REVIEW_PROCESSING_INTERVAL_MINUTES,
    DEFAULT_DEDUPLICATION_INTERVAL_MINUTES
)
from app.modules.scheduler.services.scheduler_service import scheduler, start_scheduler, stop_scheduler
from app.modules.scheduler.tasks.sync_tasks import process_pending_syncs
from app.modules.scheduler.tasks.broadcasting_tasks import process_pending_broadcasts
from app.modules.scheduler.tasks.reconciliation_tasks import reconcile_scraper_jobs
from app.modules.reviews.tasks import process_pending_reviews, deduplicate_reviews_task
from app.modules.scheduler.tasks.resume_tasks import auto_resume_sources

def setup_scheduler():
    """
    Register all recurring jobs onto the APScheduler instance.
    Intervals are loaded from the system_settings table.
    """
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            ensure_system_settings_table(cursor)
            
            review_interval = get_setting_int(
                cursor, 
                "scheduler_review_processing_interval_minutes", 
                default=DEFAULT_REVIEW_PROCESSING_INTERVAL_MINUTES
            )
            dedup_interval = get_setting_int(
                cursor, 
                "scheduler_deduplication_interval_minutes", 
                default=DEFAULT_DEDUPLICATION_INTERVAL_MINUTES
            )
    except Exception as e:
        logging.error(f"Scheduler: Failed to load intervals from DB: {e}. Using defaults.")
        review_interval = DEFAULT_REVIEW_PROCESSING_INTERVAL_MINUTES
        dedup_interval = DEFAULT_DEDUPLICATION_INTERVAL_MINUTES

    scheduler.add_job(
        process_pending_syncs, 
        'interval', 
        minutes=1, 
        id='sync_sources_job', 
        replace_existing=True,
        jitter=5
    )
    
    scheduler.add_job(
        process_pending_broadcasts,
        'interval',
        minutes=1,
        id='process_broadcasts_job',
        replace_existing=True,
        jitter=5
    )

    scheduler.add_job(
        reconcile_scraper_jobs,
        'interval',
        minutes=30,
        id='reconcile_scraper_jobs',
        replace_existing=True,
        jitter=30
    )

    scheduler.add_job(
        process_pending_reviews,
        'interval',
        minutes=review_interval,
        id='process_reviews_job',
        replace_existing=True,
        misfire_grace_time=30,
        coalesce=True,
        jitter=5
    )

    scheduler.add_job(
        auto_resume_sources,
        'interval',
        minutes=30,
        id='auto_resume_sources_job',
        replace_existing=True
    )

    scheduler.add_job(
        deduplicate_reviews_task,
        'interval',
        minutes=dedup_interval,
        id='deduplicate_reviews_job',
        replace_existing=True,
        misfire_grace_time=60,
        coalesce=True,
        jitter=60
    )
