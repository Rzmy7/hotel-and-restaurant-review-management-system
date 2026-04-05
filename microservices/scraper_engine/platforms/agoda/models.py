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


def save_reviews_to_db(reviews, source_id: str):
    """
    Persist a batch of extracted Agoda reviews to the database.

    Args:
        reviews:   List of review dataclass objects from the extractor.
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

        # Fetch existing platform_review_id's for this source_id
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
            return

        logger.info(f"Writing {len(unique_reviews)} new Agoda reviews for source_id={source_id} (Discarded {len(reviews) - len(unique_reviews)} duplicates)")

        for r in unique_reviews:
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

        session.commit()
        logger.info(f"Committed {len(reviews)} Agoda reviews for source_id={source_id}.")
    except Exception as e:
        session.rollback()
        logger.error(f"Agoda DB write failed: {e}", exc_info=True)
        raise e
    finally:
        session.close()
