"""
Google — saves scraped reviews into the new source-centric schema.
==================================================================
Receives reviews from the scraper logic and persists them into:
  sources → reviews → google_reviews + review_media
"""
from core.database import get_session
from core.config import setup_logger
from core.models import Source, Review, GoogleReviewDetail, ReviewMedia

logger = setup_logger("google_database")


def save_reviews_to_db(reviews, source_id: str):
    """
    Persist a batch of extracted Google reviews to the database.

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

        logger.info(f"Writing {len(reviews)} Google reviews for source_id={source_id}")

        for r in reviews:
            # Create a new review entry in the central reviews table
            review_entry = Review(source_id=source_id)
            session.add(review_entry)
            session.flush()

            # Create the Google-specific detail row
            detail = GoogleReviewDetail(
                review_id=review_entry.review_id,
                rating=getattr(r, 'rating', None),
                author=getattr(r, 'author', None),
                review_text=getattr(r, 'text', None),
                review_date=getattr(r, 'date', None),
                author_badge=getattr(r, 'author_badge', None),
                reply=getattr(r, 'reply', None),
            )
            session.add(detail)

            # Attach media (photos)
            if hasattr(r, 'photos') and r.photos:
                for photo_url in r.photos:
                    session.add(ReviewMedia(
                        review_id=review_entry.review_id,
                        media_url=photo_url,
                        media_type='image'
                    ))

        session.commit()
        logger.info(f"Committed {len(reviews)} Google reviews for source_id={source_id}.")
    except Exception as e:
        session.rollback()
        logger.error(f"Google DB write failed: {e}", exc_info=True)
        raise e
    finally:
        session.close()
