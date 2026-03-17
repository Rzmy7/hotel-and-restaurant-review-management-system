from app.modules.scheduler.services.scheduler_service import scheduler, start_scheduler, stop_scheduler
from app.modules.scheduler.tasks.sync_tasks import process_pending_syncs

def setup_scheduler():
    """
    Register all recurring jobs onto the APScheduler instance.
    """
    scheduler.add_job(
        process_pending_syncs, 
        'interval', 
        minutes=1, 
        id='sync_sources_job', 
        replace_existing=True
    )
