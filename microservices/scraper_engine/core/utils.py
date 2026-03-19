import httpx
from core.config import config, setup_logger

logger = setup_logger("core_utils")

def notify_backend_sync_complete(source_id: str):
    """
    Notifies the backend that a scrape sync task has completed.
    This triggers the backend to update last_sync_at and schedule the next sync.
    """
    if not source_id:
        logger.warning("No source_id provided for backend notification.")
        return

    # Endpoint: http://127.0.0.1:8000/source/tasks/{source_id}/sync-complete
    url = f"{config.backend_url}/source/tasks/{source_id}/sync-complete"
    
    logger.info(f"Notifying backend of sync completion for source {source_id} at {url}")
    
    try:
        with httpx.Client() as client:
            response = client.post(url, timeout=10.0)
            response.raise_for_status()
            logger.info(f"Backend notified successfully: {response.status_code}")
    except httpx.HTTPError as e:
        logger.error(f"HTTP error notifying backend: {e}")
    except Exception as e:
        logger.error(f"Unexpected error notifying backend: {e}")
