import logging
from sqlalchemy.orm import Session
from core.models import BookingReviewDetail
from core.deduplication.base import find_duplicate_review_ids, remove_duplicate_reviews

logger = logging.getLogger(__name__)

def clean_booking_duplicates(session: Session, source_id: str) -> int:
    columns = [
        BookingReviewDetail.author,
        BookingReviewDetail.review_date,
        BookingReviewDetail.positive_text,
        BookingReviewDetail.negative_text
    ]
    duplicate_ids = find_duplicate_review_ids(session, BookingReviewDetail, source_id, columns)
    removed = remove_duplicate_reviews(session, duplicate_ids)
    if removed > 0:
        logger.info(f"Removed {removed} duplicate Booking reviews for source {source_id}.")
    return removed
