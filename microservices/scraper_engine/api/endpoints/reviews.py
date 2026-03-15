"""
Reviews API — Global review queries across all organizations and platforms.
"""
from fastapi import APIRouter, HTTPException
from typing import Optional
from core.database import get_session
from core.config import setup_logger
from core.models import (
    Review, OrganizationSource, Source, Organization,
    AgodaReviewDetail, BookingReviewDetail, GoogleReviewDetail, ReviewMedia
)
from sqlalchemy.orm import joinedload

logger = setup_logger("reviews_api")
router = APIRouter(prefix="/reviews", tags=["Reviews"])


def _serialize_review(r):
    """Serialize a Review ORM object to dict with subtype details."""
    entry = {
        "review_id": r.review_id,
        "organization_source_id": r.organization_source_id,
        "platform": r.organization_source.source.platform_name if r.organization_source and r.organization_source.source else None,
        "organization": r.organization_source.organization.organization_name if r.organization_source and r.organization_source.organization else None,
        "external_review_id": r.external_review_id,
        "rating": float(r.rating) if r.rating else None,
        "author": r.author,
        "review_text": r.review_text,
        "review_title": r.review_title,
        "review_date": r.review_date,
        "reply_text": r.reply_text,
        "sentiment_score": r.sentiment_score,
        "sentiment_label": r.sentiment_label,
        "media": [{"url": m.media_url, "type": m.media_type} for m in r.media] if r.media else [],
        "created_at": str(r.created_at) if r.created_at else None
    }
    if r.agoda_detail:
        entry["agoda"] = {
            "nationality": r.agoda_detail.reviewer_nationality,
            "stayed_dates": r.agoda_detail.stayed_dates,
            "traveler_type": r.agoda_detail.traveler_type,
            "room_type": r.agoda_detail.room_type,
        }
    if r.booking_detail:
        entry["booking"] = {
            "nationality": r.booking_detail.reviewer_nationality,
            "positive_txt": r.booking_detail.positive_txt,
            "negative_txt": r.booking_detail.negative_txt,
            "stay_date": r.booking_detail.reviewer_stay_date,
            "num_of_nights": r.booking_detail.num_of_nights,
            "traveler_type": r.booking_detail.traveler_type,
            "room_name": r.booking_detail.room_name,
            "posted_date": r.booking_detail.posted_date,
        }
    if r.google_detail:
        entry["google"] = {
            "author_badge": r.google_detail.author_badge,
            "place_url": r.google_detail.place_url,
        }
    return entry


@router.get("")
def list_reviews(
    platform: Optional[str] = None,
    organization_id: Optional[int] = None,
    min_rating: Optional[float] = None,
    max_rating: Optional[float] = None,
    author: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    """
    Query reviews globally with optional filters.
    - platform: 'Agoda', 'Booking', 'Google'
    - organization_id: filter by specific organization
    - min_rating / max_rating: rating range
    - author: partial match on author name
    """
    session = get_session()
    try:
        query = session.query(Review).join(OrganizationSource).join(Source).join(Organization)

        if platform:
            query = query.filter(Source.platform_name.ilike(platform))
        if organization_id:
            query = query.filter(OrganizationSource.organization_id == organization_id)
        if min_rating is not None:
            query = query.filter(Review.rating >= min_rating)
        if max_rating is not None:
            query = query.filter(Review.rating <= max_rating)
        if author:
            query = query.filter(Review.author.ilike(f"%{author}%"))

        total = query.count()

        query = query.options(
            joinedload(Review.media),
            joinedload(Review.agoda_detail),
            joinedload(Review.booking_detail),
            joinedload(Review.google_detail),
            joinedload(Review.organization_source).joinedload(OrganizationSource.source),
            joinedload(Review.organization_source).joinedload(OrganizationSource.organization)
        )

        reviews = query.order_by(Review.review_id.desc()).offset(skip).limit(limit).all()
        results = [_serialize_review(r) for r in reviews]

        return {"total": total, "returned": len(results), "data": results}
    except Exception as e:
        logger.error(f"Review query failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@router.get("/{review_id}")
def get_review(review_id: int):
    """Get a single review by ID with full detail."""
    session = get_session()
    try:
        review = session.query(Review).options(
            joinedload(Review.media),
            joinedload(Review.agoda_detail),
            joinedload(Review.booking_detail),
            joinedload(Review.google_detail),
            joinedload(Review.organization_source).joinedload(OrganizationSource.source),
            joinedload(Review.organization_source).joinedload(OrganizationSource.organization)
        ).filter_by(review_id=review_id).first()

        if not review:
            raise HTTPException(status_code=404, detail="Review not found")

        return _serialize_review(review)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@router.delete("/{review_id}")
def delete_review(review_id: int):
    """Delete a single review by ID (cascade deletes media and subtypes)."""
    session = get_session()
    try:
        review = session.query(Review).filter_by(review_id=review_id).first()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        session.delete(review)
        session.commit()
        return {"status": "deleted", "review_id": review_id}
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()
