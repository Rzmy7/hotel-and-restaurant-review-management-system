"""
TripAdvisor — saves scraped reviews into the new source-centric schema.
=======================================================================
Receives reviews from the scraper logic and persists them into:
  sources → reviews → tripadvisor_reviews + review_media
"""
from core.database import get_session
from core.config import setup_logger
from core.models import Source, Review, TripAdvisorReviewDetail, ReviewMedia

logger = setup_logger("tripadvisor_database")


def save_reviews_to_db(reviews: list, source_id: str):
    """
    Persist a batch of extracted TripAdvisor reviews to the database.

    Args:
        reviews:   List of review dicts from the extractor.
        source_id: The source_id this batch belongs to (provided by API).
    """
    if not reviews:
        return

    session = get_session()
    try:
        # Verify the source exists
        source = session.query(Source).filter_by(source_id=source_id).first()
        if not source:
            logger.error(f"Source {source_id} not found — cannot save reviews.")
            return

        logger.info(f"Writing {len(reviews)} TripAdvisor reviews for source_id={source_id}")

        for r in reviews:
            # Create a new review entry in the central reviews table
            platform_id = r.get("external_review_id")
            review_entry = Review(source_id=source_id, platform_review_id=platform_id)
            session.add(review_entry)
            session.flush()

            # Create the TripAdvisor-specific detail row
            detail = TripAdvisorReviewDetail(
                review_id=review_entry.review_id,
                rating=r.get("rating"),
                review_heading=r.get("review_title"),
                author=r.get("author"),
                review_text=r.get("review_text"),
                review_date=r.get("review_date"),
                reviewer_nationality=r.get("reviewer_origin"),
                stay_date=r.get("trip_date"),
                traveler_type=r.get("traveler_type"),
                likes_count=r.get("likes_count"),
                reply=r.get("reply_text"),
                # Granular sub-ratings
                rating_value=r.get("rating_value"),
                rating_rooms=r.get("rating_rooms"),
                rating_location=r.get("rating_location"),
                rating_cleanliness=r.get("rating_cleanliness"),
                rating_service=r.get("rating_service"),
                rating_sleep_quality=r.get("rating_sleep_quality"),
            )
            session.add(detail)

            # Attach media (images)
            for img_url in (r.get("images") or []):
                session.add(ReviewMedia(
                    review_id=review_entry.review_id,
                    media_url=img_url,
                    media_type="image"
                ))

        session.commit()
        logger.info(f"Committed {len(reviews)} TripAdvisor reviews for source_id={source_id}.")
    except Exception as e:
        session.rollback()
        logger.error(f"TripAdvisor DB write failed: {e}", exc_info=True)
        raise
    finally:
        session.close()
