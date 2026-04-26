"""
Booking — saves scraped reviews into the new source-centric schema.
===================================================================
Receives reviews from the scraper logic and persists them into:
  sources → reviews → booking_reviews + review_media
"""

from core.database import get_session
from core.config import setup_logger
from core.models import Source, Review, BookingReviewDetail, ReviewMedia

logger = setup_logger("booking_database")


import time


def save_reviews_to_db(reviews, source_id: str) -> int:
    """
    Persist a batch of extracted Booking reviews to the database with retries and verification.

    Args:
        reviews:   List of review dataclass objects from the extractor.
        source_id: The source_id this batch belongs to (provided by API).

    Returns:
        int: The number of reviews successfully saved.
    """
    if not reviews:
        return 0

    session = get_session()
    success_count = 0
    try:
        # Verify the source exists
        source = session.query(Source).filter_by(source_id=source_id).first()
        if not source:
            logger.error(f"Source {source_id} not found — cannot save reviews.")
            return 0

        logger.info(
            f"Attempting to write {len(reviews)} Booking reviews for source_id={source_id}"
        )

        for r in reviews:
            saved_successfully = False
            for attempt in range(1, 4):  # 3 attempts
                try:
                    # Use a sub-transaction (savepoint) for each review
                    with session.begin_nested():
                        # Create a new review entry in the central reviews table
                        platform_id = getattr(r, "id", None)
                        review_entry = Review(
                            source_id=source_id, platform_review_id=platform_id
                        )
                        session.add(review_entry)
                        session.flush()

                        # Create the Booking-specific detail row
                        detail = BookingReviewDetail(
                            review_id=review_entry.review_id,
                            rating=getattr(r, "score", None),
                            review_heading=getattr(r, "title", None),
                            author=getattr(r, "author", None),
                            positive_text=getattr(r, "positive_txt", None),
                            negative_text=getattr(r, "negative_txt", None),
                            review_date=getattr(r, "posted_date", None),
                            stay_date=getattr(r, "reviewer_stay_date", None),
                            num_of_nights=getattr(r, "num_of_nights", None),
                            traveler_type=getattr(r, "traveler_type", None),
                            room_type=getattr(r, "room_name", None),
                            reviewer_nationality=getattr(
                                r, "reviewer_nationality", None
                            ),
                            reply=getattr(r, "reply", None),
                        )
                        session.add(detail)

                        # Attach media (photos)
                        if hasattr(r, "photo") and r.photo:
                            for img in r.photo:
                                session.add(
                                    ReviewMedia(
                                        review_id=review_entry.review_id,
                                        media_url=getattr(img, "src", str(img)),
                                        media_type="image",
                                    )
                                )

                    saved_successfully = True
                    success_count += 1
                    break  # Success! Exit retry loop.
                except Exception as e:
                    if attempt < 3:
                        logger.warning(
                            f"Retry {attempt}/3 for Booking review {getattr(r, 'id', 'unknown')} due to: {e}"
                        )
                        time.sleep(1)  # Brief wait before retry
                    else:
                        logger.error(
                            f"Fatal failure for Booking review {getattr(r, 'id', 'unknown')} after 3 attempts: {e}"
                        )

        session.commit()
        logger.info(
            f"Verified and committed {success_count}/{len(reviews)} Booking reviews for source_id={source_id}."
        )
        return success_count
    except Exception as e:
        session.rollback()
        logger.error(f"Booking DB batch transaction failed: {e}", exc_info=True)
        return success_count
    finally:
        session.close()
