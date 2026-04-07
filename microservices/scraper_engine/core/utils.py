import httpx
from urllib.parse import urlparse, urlunparse
from core.config import config, setup_logger

from core.models import Review

logger = setup_logger("core_utils")

def identify_new_reviews(session, source_id: str, scraped_reviews: list) -> tuple[int, list[str]]:
    """
    Compares scraped reviews with existing database records for a given source.
    Returns:
        tuple: (count_of_new_reviews, list_of_new_platform_review_ids)
    """
    if not scraped_reviews:
        return 0, []

    # Get all existing platform_review_ids for this source
    # We use a set for O(1) lookups
    existing_ids = {
        r[0] for r in session.query(Review.platform_review_id)
        .filter(Review.source_id == source_id)
        .filter(Review.platform_review_id.isnot(None))
        .all()
    }

    new_review_ids = []
    for r in scraped_reviews:
        # Extract ID based on object type (dict for TripAdvisor, objects for others)
        if isinstance(r, dict):
            r_id = r.get('id') or r.get('external_review_id')
        else:
            r_id = getattr(r, 'id', None) or getattr(r, 'external_review_id', None)

        if r_id and str(r_id) not in existing_ids:
            new_review_ids.append(str(r_id))

    return len(new_review_ids), new_review_ids


def notify_backend_sync_status(source_id: str, status: str, new_review_count: int = 0, error_message: str = None):
    """
    Notifies the backend about the current status of a sync task.
    Statuses: QUEUED, RUNNING, COMPLETED, FAILED
    """
    if not source_id:
        logger.warning("No source_id provided for backend notification.")
        return

    try:
        # User changed endpoint from sync-complete to sync-status
        url = f"{config.backend_url}/api/source/tasks/{source_id}/sync-status"
        logger.info(f"Notifying backend of sync status '{status}' for source {source_id} at {url}")

        payload = {
            "status": status,
            "new_review_count": new_review_count,
            "error_message": error_message
        }
        response = httpx.post(url, json=payload, timeout=10)
        response.raise_for_status()
        logger.info(f"Backend notified successfully for source {source_id} status {status}.")
    except httpx.HTTPError as e:
        logger.error(f"HTTP error notifying backend: {e}")
    except Exception as e:
        logger.error(f"Unexpected error notifying backend: {e}")

def normalize_url(url: str) -> str:
    """
    Normalizes a URL by stripping query parameters and fragments.
    Example: https://example.com/page.html?aid=1&sid=2#sec -> https://example.com/page.html
    """
    if not url:
        return ""
    
    parsed = urlparse(url)
    # Reconstruct without query and fragment
    normalized = urlunparse((
        parsed.scheme,
        parsed.netloc,
        parsed.path,
        '',  # params (rarely used in modern URLs, separate from query)
        '',  # query
        ''   # fragment
    ))
    
    # Ensure trailing slash consistency (optional, but good for deduplication)
    # For now, we'll keep it exactly as path provides.
    return normalized
