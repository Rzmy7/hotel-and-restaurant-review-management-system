import httpx
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


def notify_backend_sync_complete(source_id: str, new_review_count: int = 0):
    """
    Notifies the backend that a scrape sync task has completed.
    """
    if not source_id:
        logger.warning("No source_id provided for backend notification.")
        return

    try:
        url = f"{config.backend_url}/api/source/tasks/{source_id}/sync-complete"
        logger.info(f"Notifying backend of sync completion for source {source_id} at {url} with {new_review_count} new reviews.")

        payload = {"new_review_count": new_review_count}
        response = httpx.post(url, json=payload, timeout=10)
        response.raise_for_status()
        logger.info(f"Backend notified successfully for source {source_id}.")
    except httpx.HTTPError as e:
        logger.error(f"HTTP error notifying backend: {e}")
    except Exception as e:
        logger.error(f"Unexpected error notifying backend: {e}")
