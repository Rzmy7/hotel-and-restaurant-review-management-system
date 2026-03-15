"""TripAdvisor — saves scraped reviews into the unified schema."""
from core.database import get_session
from core.config import setup_logger
from core.models import (
    Organization, Source, OrganizationSource,
    Review, TripAdvisorReviewDetail, ReviewMedia
)
from sqlalchemy.sql import func

logger = setup_logger("tripadvisor_database")


def _resolve_org_source(session, org_name: str, place_url: str) -> OrganizationSource:
    """Find or create Organization + OrganizationSource for a TripAdvisor listing."""
    source = session.query(Source).filter_by(platform_name="TripAdvisor").first()
    if not source:
        source = Source(platform_name="TripAdvisor", base_url="https://www.tripadvisor.com")
        session.add(source)
        session.flush()

    org_source = session.query(OrganizationSource).filter_by(
        source_id=source.source_id, external_url=place_url
    ).first()
    if org_source:
        org_source.last_synced_at = func.now()
        return org_source

    org = session.query(Organization).filter_by(organization_name=org_name).first()
    if not org:
        org = Organization(organization_name=org_name)
        session.add(org)
        session.flush()

    org_source = OrganizationSource(
        organization_id=org.organization_id,
        source_id=source.source_id,
        external_url=place_url,
        last_synced_at=func.now()
    )
    session.add(org_source)
    session.flush()
    return org_source


def save_reviews_to_db(reviews: list, org_name: str, place_url: str):
    """Upsert TripAdvisor reviews into the unified schema (supertype + subtype)."""
    if not reviews:
        return
    session = get_session()
    try:
        org_source = _resolve_org_source(session, org_name, place_url)
        os_id = org_source.organization_source_id
        logger.info(f"Writing {len(reviews)} TripAdvisor reviews for '{org_name}' (os_id={os_id})")

        for r in reviews:
            ext_id = r.get("external_review_id")

            # Look up by external ID or insert new
            review_entry = None
            if ext_id:
                review_entry = session.query(Review).filter_by(
                    organization_source_id=os_id,
                    external_review_id=str(ext_id)
                ).first()
            if not review_entry:
                review_entry = Review(
                    organization_source_id=os_id,
                    external_review_id=str(ext_id) if ext_id else None
                )
                session.add(review_entry)
                session.flush()

            review_entry.rating = r.get("rating")
            review_entry.author = r.get("author")
            review_entry.review_text = r.get("review_text")
            review_entry.review_title = r.get("review_title")
            review_entry.review_date = r.get("review_date")
            review_entry.reply_text = r.get("reply_text")

            # TripAdvisor subtype
            detail = session.query(TripAdvisorReviewDetail).filter_by(
                review_id=review_entry.review_id
            ).first()
            if not detail:
                detail = TripAdvisorReviewDetail(review_id=review_entry.review_id)
                session.add(detail)
            detail.reviewer_origin = r.get("reviewer_origin")
            detail.traveler_type = r.get("traveler_type")
            detail.trip_date = r.get("trip_date")
            detail.place_url = place_url
            
            detail.contribution_count = r.get("contribution_count")
            detail.rating_value = r.get("rating_value")
            detail.rating_service = r.get("rating_service")
            detail.rating_location = r.get("rating_location")
            detail.rating_cleanliness = r.get("rating_cleanliness")
            detail.rating_rooms = r.get("rating_rooms")
            detail.rating_sleep_quality = r.get("rating_sleep_quality")
            detail.rating_food = r.get("rating_food")
            detail.rating_atmosphere = r.get("rating_atmosphere")

            # Media
            session.query(ReviewMedia).filter_by(review_id=review_entry.review_id).delete()
            for img_url in (r.get("images") or []):
                session.add(ReviewMedia(
                    review_id=review_entry.review_id,
                    media_url=img_url,
                    media_type="image"
                ))

        session.commit()
        logger.info(f"Committed {len(reviews)} TripAdvisor reviews.")
    except Exception as e:
        session.rollback()
        logger.error(f"TripAdvisor DB write failed: {e}", exc_info=True)
        raise
    finally:
        session.close()
