"""Google — saves scraped reviews into the unified schema."""
from core.database import get_session
from core.config import setup_logger
from core.models import Organization, Source, OrganizationSource, Review, GoogleReviewDetail, ReviewMedia
from sqlalchemy.sql import func

logger = setup_logger("google_database")


def _resolve_org_source(session, place_name: str, place_url: str) -> OrganizationSource:
    source = session.query(Source).filter_by(platform_name="Google").first()
    if not source:
        source = Source(platform_name="Google", base_url="https://maps.google.com")
        session.add(source)
        session.flush()

    org_source = session.query(OrganizationSource).filter_by(
        source_id=source.source_id, external_url=place_url
    ).first()
    if org_source:
        org_source.last_synced_at = func.now()
        return org_source

    org = session.query(Organization).filter_by(organization_name=place_name).first()
    if not org:
        org = Organization(organization_name=place_name)
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


def save_reviews_to_db(reviews, place_name: str, place_url: str):
    if not reviews:
        return
    session = get_session()
    try:
        org_source = _resolve_org_source(session, place_name, place_url)
        os_id = org_source.organization_source_id
        logger.info(f"Writing {len(reviews)} Google reviews for '{place_name}' (os_id={os_id})")

        for r in reviews:
            review_entry = session.query(Review).filter_by(
                organization_source_id=os_id, external_review_id=r.id
            ).first()
            if not review_entry:
                review_entry = Review(organization_source_id=os_id, external_review_id=r.id)
                session.add(review_entry)
                session.flush()

            review_entry.rating = r.rating
            review_entry.author = r.author
            review_entry.review_text = r.text
            review_entry.review_date = getattr(r, 'date', None)
            review_entry.reply_text = getattr(r, 'reply', None)

            detail = session.query(GoogleReviewDetail).filter_by(review_id=review_entry.review_id).first()
            if not detail:
                detail = GoogleReviewDetail(review_id=review_entry.review_id)
                session.add(detail)
            detail.author_badge = getattr(r, 'author_badge', None)
            detail.place_url = place_url

            session.query(ReviewMedia).filter_by(review_id=review_entry.review_id).delete()
            if hasattr(r, 'photos') and r.photos:
                for photo_url in r.photos:
                    session.add(ReviewMedia(review_id=review_entry.review_id, media_url=photo_url, media_type='image'))

        session.commit()
        logger.info(f"Committed {len(reviews)} Google reviews.")
    except Exception as e:
        session.rollback()
        logger.error(f"Google DB write failed: {e}", exc_info=True)
        raise e
    finally:
        session.close()
