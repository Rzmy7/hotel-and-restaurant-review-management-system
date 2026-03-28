from app.modules.scheduler.services.scheduler_service import scheduler, start_scheduler, stop_scheduler
from app.modules.scheduler.tasks.sync_tasks import process_pending_syncs
from app.modules.scheduler.tasks.broadcasting_tasks import process_pending_broadcasts

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
    
    scheduler.add_job(
        process_pending_broadcasts,
        'interval',
        minutes=1,
        id='process_broadcasts_job',
        replace_existing=True
    )
