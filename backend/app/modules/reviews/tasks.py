import logging
from app.modules.reviews.services.processor import run_analysis_pipeline
from app.modules.reviews.services.deduplication_service import run_review_deduplication

logger = logging.getLogger(__name__)


async def process_pending_reviews():
    """
    Background job wrapper for the review analysis pipeline.
    This function is designed to be called by APScheduler.
    """
    logger.info("Background TASKS: starting process_pending_reviews loop.")
    try:
        # Since run_analysis_pipeline is async, we await it directly.
        # AsyncIOScheduler will drive this coroutine.
        await run_analysis_pipeline()
    except Exception as e:
        logger.error(f"Background TASKS error in process_pending_reviews: {e}")


async def deduplicate_reviews_task():
    """
    Background job wrapper for the review deduplication service.
    Runs every hour to keep the processed_review table clean.
    """
    logger.info("Background TASKS: starting deduplicate_reviews_task.")
    try:
        # run_review_deduplication is synchronous, but we wrap it in an async task
        # for consistency with the AsyncIOScheduler.
        removed_count = run_review_deduplication()
        if removed_count > 0:
            logger.info(f"Background TASKS: deduplication completed. Removed {removed_count} duplicates.")
        elif removed_count == 0:
            logger.info("Background TASKS: deduplication completed. No duplicates found.")
    except Exception as e:
        logger.error(f"Background TASKS error in deduplicate_reviews_task: {e}")
