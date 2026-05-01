from app.modules.scheduler.services.scheduler_service import scheduler, start_scheduler, stop_scheduler
from app.modules.scheduler.tasks.sync_tasks import process_pending_syncs
from app.modules.scheduler.tasks.broadcasting_tasks import process_pending_broadcasts
from app.modules.scheduler.tasks.reconciliation_tasks import reconcile_scraper_jobs
from app.modules.reviews.tasks import process_pending_reviews
from app.modules.scheduler.tasks.resume_tasks import auto_resume_sources

def setup_scheduler():
    """
    Register all recurring jobs onto the APScheduler instance.
    """
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
        minutes=1,
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
