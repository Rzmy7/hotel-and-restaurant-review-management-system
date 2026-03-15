"""Booking — saves scraped reviews into the unified schema."""
from core.database import get_session
from core.config import setup_logger
from core.models import Organization, Source, OrganizationSource, Review, BookingReviewDetail, ReviewMedia
from sqlalchemy.sql import func

logger = setup_logger("booking_database")


def _resolve_org_source(session, hotel_name: str, hotel_url: str) -> OrganizationSource:
    source = session.query(Source).filter_by(platform_name="Booking").first()
    if not source:
        source = Source(platform_name="Booking", base_url="https://www.booking.com")
        session.add(source)
        session.flush()

    org_source = session.query(OrganizationSource).filter_by(
        source_id=source.source_id, external_url=hotel_url
    ).first()
    if org_source:
        org_source.last_synced_at = func.now()
        return org_source

    org = session.query(Organization).filter_by(organization_name=hotel_name).first()
    if not org:
        org = Organization(organization_name=hotel_name)
        session.add(org)
        session.flush()

    org_source = OrganizationSource(
        organization_id=org.organization_id,
        source_id=source.source_id,
        external_url=hotel_url,
        last_synced_at=func.now()
    )
    session.add(org_source)
    session.flush()
    return org_source


def save_reviews_to_db(reviews, hotel_name: str, hotel_url: str):
    if not reviews:
        return
    session = get_session()
    try:
        org_source = _resolve_org_source(session, hotel_name, hotel_url)
        os_id = org_source.organization_source_id
        logger.info(f"Writing {len(reviews)} Booking reviews for '{hotel_name}' (os_id={os_id})")

        for r in reviews:
            review_entry = session.query(Review).filter_by(
                organization_source_id=os_id, external_review_id=r.id
            ).first()
            if not review_entry:
                review_entry = Review(organization_source_id=os_id, external_review_id=r.id)
                session.add(review_entry)
                session.flush()

            review_entry.rating = r.score
            review_entry.author = getattr(r, 'author', '')
            review_entry.review_title = r.title
            review_entry.review_date = getattr(r, 'posted_date', None)
            review_entry.reply_text = getattr(r, 'reply', None)
            parts = []
            if r.positive_txt:
                parts.append(f"[+] {r.positive_txt}")
            if r.negative_txt:
                parts.append(f"[-] {r.negative_txt}")
            review_entry.review_text = "\n".join(parts) if parts else None

            detail = session.query(BookingReviewDetail).filter_by(review_id=review_entry.review_id).first()
            if not detail:
                detail = BookingReviewDetail(review_id=review_entry.review_id)
                session.add(detail)
            detail.reviewer_nationality = getattr(r, 'reviewer_nationality', None)
            detail.positive_txt = r.positive_txt
            detail.negative_txt = r.negative_txt
            detail.reviewer_stay_date = r.reviewer_stay_date
            detail.num_of_nights = r.num_of_nights
            detail.traveler_type = r.traveler_type
            detail.room_name = r.room_name
            detail.posted_date = getattr(r, 'posted_date', None)

            session.query(ReviewMedia).filter_by(review_id=review_entry.review_id).delete()
            if hasattr(r, 'photo') and r.photo:
                for img in r.photo:
                    session.add(ReviewMedia(review_id=review_entry.review_id, media_url=img.src, media_type='image'))

        session.commit()
        logger.info(f"Committed {len(reviews)} Booking reviews.")
    except Exception as e:
        session.rollback()
        logger.error(f"Booking DB write failed: {e}", exc_info=True)
        raise e
    finally:
        session.close()
