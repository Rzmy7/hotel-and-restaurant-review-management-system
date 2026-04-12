import logging
import asyncio
from app.modules.reviews.services.processor import run_analysis_pipeline

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
