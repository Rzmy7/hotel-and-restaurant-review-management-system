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
        # Verify the source exists; if missing, auto-create it (e.g. direct API triggers)
        source = session.query(Source).filter_by(source_id=source_id).first()
        if not source:
            logger.info(f"Source {source_id} not found in DB. Auto-creating Source record...")
            source = Source(
                source_id=source_id,
                platform_name="agoda",
                source_url=getattr(reviews[0], 'url', 'https://www.agoda.com') if reviews else 'https://www.agoda.com',
                status="RUNNING"
            )
            session.add(source)
            session.commit()

        # Fetch existing platform_review_id's for this source_id (Idempotency layer)
        incoming_ids = [getattr(r, 'id', None) for r in reviews if getattr(r, 'id', None) is not None]
        existing_rows = session.query(Review.platform_review_id).filter(
            Review.source_id == source_id,
            Review.platform_review_id.in_(incoming_ids)
        ).all()
        existing_ids = {row[0] for row in existing_rows if row[0]}
        
        # Filter down the payload to strictly unique reviews
        unique_reviews = [r for r in reviews if getattr(r, 'id', None) not in existing_ids]

        if not unique_reviews:
            logger.info("All reviews in batch already exist in database. Skipping DB writes.")
            return 0

        logger.info(f"Writing {len(unique_reviews)} new Agoda reviews for source_id={source_id} (Discarded {len(reviews) - len(unique_reviews)} duplicates)")

        for r in unique_reviews:
            saved_successfully = False
            for attempt in range(1, 4):  # 3 attempts
                try:
                    # Use a sub-transaction (savepoint) for each review
                    with session.begin_nested():
                        # Create a new review entry in the central reviews table
                        platform_id = getattr(r, 'id', None)
                        review_entry = Review(source_id=source_id, platform_review_id=platform_id)
                        session.add(review_entry)
                        session.flush()  # Get the auto-generated review_id

                        # Create the Agoda-specific detail row
                        detail = AgodaReviewDetail(
                            review_id=review_entry.review_id,
                            rating=getattr(r, 'rating', None),
                            review_heading=getattr(r, 'heading', None),
                            author=getattr(r, 'author', None),
                            review_text=getattr(r, 'text', None),
                            review_date=getattr(r, 'date', None),
                            reviewer_nationality=getattr(r, 'reviewer_nationality', None),
                            stay_date=getattr(r, 'stayed_dates', None),
                            num_of_nights=getattr(r, 'num_of_nights', None),
                            traveler_type=getattr(r, 'traveler_type', None),
                            room_type=getattr(r, 'room_type', None),
                            reply=getattr(r, 'reply', None),
                        )
                        session.add(detail)

                        # Attach media (images)
                        if hasattr(r, 'images') and r.images:
                            for img_url in r.images:
                                session.add(ReviewMedia(
                                    review_id=review_entry.review_id,
                                    media_url=img_url,
                                    media_type='image'
                                ))
                    
                    saved_successfully = True
                    success_count += 1
                    break  # Success! Exit retry loop.
                except Exception as e:
                    if attempt < 3:
                        logger.warning(f"Retry {attempt}/3 for Agoda review {getattr(r, 'id', 'unknown')} due to: {e}")
                        time.sleep(1)
                    else:
                        logger.error(f"Fatal failure for Agoda review {getattr(r, 'id', 'unknown')} after 3 attempts: {e}")

        session.commit()
        logger.info(f"Verified and committed {success_count}/{len(unique_reviews)} Agoda reviews for source_id={source_id}.")
        return success_count
    except Exception as e:
        session.rollback()
        logger.error(f"Agoda DB batch transaction failed: {e}", exc_info=True)
        return success_count
    finally:
        session.close()
