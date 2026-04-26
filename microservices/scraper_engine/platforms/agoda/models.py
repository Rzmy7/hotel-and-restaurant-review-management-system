"""
Agoda — saves scraped reviews into the new source-centric schema.
=================================================================
Receives reviews from the scraper logic and persists them into:
  sources → reviews → agoda_reviews + review_media
"""

from core.database import get_session
from core.config import setup_logger
from core.models import Source, Review, AgodaReviewDetail, ReviewMedia

logger = setup_logger("agoda_database")


import time


def save_reviews_to_db(reviews, source_id: str) -> int:
    """
    Persist a batch of extracted Agoda reviews to the database with retries and verification.

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

        # Fetch existing platform_review_id's for this source_id (Idempotency layer)
        incoming_ids = [
            getattr(r, "id", None)
            for r in reviews
            if getattr(r, "id", None) is not None
        ]
        existing_rows = (
            session.query(Review.platform_review_id)
            .filter(
                Review.source_id == source_id,
                Review.platform_review_id.in_(incoming_ids),
            )
            .all()
        )
        existing_ids = {row[0] for row in existing_rows if row[0]}

        # Filter down the payload to strictly unique reviews
        unique_reviews = [
            r for r in reviews if getattr(r, "id", None) not in existing_ids
        ]

        if not unique_reviews:
            logger.info(
                "All reviews in batch already exist in database. Skipping DB writes."
            )
            return 0

        logger.info(
            f"Writing {len(unique_reviews)} new Agoda reviews for source_id={source_id} (Discarded {len(reviews) - len(unique_reviews)} duplicates)"
        )

        for r in unique_reviews:
            saved_successfully = False
            for attempt in range(1, 4):  # 3 attempts
                try:
                    # Use a sub-transaction (savepoint) for each review
                    with session.begin_nested():
                        # Create a new review entry in the central reviews table
                        platform_id = r.get("external_review_id")
                        review_entry = Review(
                            source_id=source_id, platform_review_id=platform_id
                        )
                        session.add(review_entry)
                        session.flush()  # Get the auto-generated review_id

                        # Create the Agoda-specific detail row
                        detail = AgodaReviewDetail(
                            review_id=review_entry.review_id,
                            rating=r.get("rating"),
                            review_heading=r.get("review_title"),
                            author=r.get("author"),
                            review_text=r.get("review_text"),
                            review_date=r.get("review_date"),
                            reviewer_nationality=r.get("reviewer_nationality"),
                            stay_date=r.get("stay_date"),
                            num_of_nights=r.get("num_of_nights"),
                            traveler_type=r.get("traveler_type"),
                            room_type=r.get("room_type"),
                            reply=r.get("reply_text"),
                        )
                        session.add(detail)

                        # Attach media (images)
                        images = r.get("images", [])
                        if images:
                            for img_url in images:
                                session.add(
                                    ReviewMedia(
                                        review_id=review_entry.review_id,
                                        media_url=img_url,
                                        media_type="image",
                                    )
                                )

                    saved_successfully = True
                    success_count += 1
                    break  # Success! Exit retry loop.
                except Exception as e:
                    if attempt < 3:
                        logger.warning(
                            f"Retry {attempt}/3 for Agoda review {getattr(r, 'id', 'unknown')} due to: {e}"
                        )
                        time.sleep(1)
                    else:
                        logger.error(
                            f"Fatal failure for Agoda review {getattr(r, 'id', 'unknown')} after 3 attempts: {e}"
                        )

        session.commit()
        logger.info(
            f"Verified and committed {success_count}/{len(unique_reviews)} Agoda reviews for source_id={source_id}."
        )
        return success_count
    except Exception as e:
        session.rollback()
        logger.error(f"Agoda DB batch transaction failed: {e}", exc_info=True)
        return success_count
    finally:
        session.close()
