import logging
from sqlalchemy.orm import Session
from core.models import AgodaReviewDetail
from core.deduplication.base import find_duplicate_review_ids, remove_duplicate_reviews

logger = logging.getLogger(__name__)


def clean_agoda_duplicates(session: Session, source_id: str) -> int:
    columns = [
        AgodaReviewDetail.author,
        AgodaReviewDetail.review_date,
        AgodaReviewDetail.review_text,
    ]
    duplicate_ids = find_duplicate_review_ids(
        session, AgodaReviewDetail, source_id, columns
    )
    removed = remove_duplicate_reviews(session, duplicate_ids)
    if removed > 0:
        logger.info(
            f"Removed {removed} duplicate Agoda reviews for source {source_id}."
        )
    return removed
