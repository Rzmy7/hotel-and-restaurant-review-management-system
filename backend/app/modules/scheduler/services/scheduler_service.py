import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler

logger = logging.getLogger(__name__)

# Single global instance of the scheduler
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
