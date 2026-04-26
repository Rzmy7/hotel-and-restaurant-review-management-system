import logging
from sqlalchemy.orm import Session
from core.models import TripAdvisorReviewDetail
from core.deduplication.base import find_duplicate_review_ids, remove_duplicate_reviews

logger = logging.getLogger(__name__)


def clean_tripadvisor_duplicates(session: Session, source_id: str) -> int:
    columns = [
        TripAdvisorReviewDetail.author,
        TripAdvisorReviewDetail.review_date,
        TripAdvisorReviewDetail.review_text,
    ]
    duplicate_ids = find_duplicate_review_ids(
        session, TripAdvisorReviewDetail, source_id, columns
    )
    removed = remove_duplicate_reviews(session, duplicate_ids)
    if removed > 0:
        logger.info(
            f"Removed {removed} duplicate TripAdvisor reviews for source {source_id}."
        )
    return removed
