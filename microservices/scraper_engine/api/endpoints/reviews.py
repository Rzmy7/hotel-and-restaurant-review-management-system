"""
Centralized Reviews Retrieval Endpoint
=======================================
GET /api/reviews/{source_id} — returns all reviews for a source,
including full platform-specific detail columns and attached media.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from core.database import get_session
from core.models import (
    Source,
    Review,
    AgodaReviewDetail,
    BookingReviewDetail,
    GoogleReviewDetail,
    TripAdvisorReviewDetail,
    ReviewMedia,
)
from core.config import setup_logger
from sqlalchemy.orm import joinedload

logger = setup_logger("reviews_api")
router = APIRouter(prefix="/reviews", tags=["Reviews"])


def _serialize_agoda(detail: AgodaReviewDetail) -> dict:
    """Convert an Agoda detail row into a JSON-friendly dict."""
    return {
        "rating": float(detail.rating) if detail.rating else None,
        "review_heading": detail.review_heading,
        "author": detail.author,
        "review_text": detail.review_text,
        "review_date": detail.review_date,
        "reviewer_nationality": detail.reviewer_nationality,
        "stay_date": detail.stay_date,
        "num_of_nights": detail.num_of_nights,
        "traveler_type": detail.traveler_type,
        "room_type": detail.room_type,
        "reply": detail.reply,
    }


def _serialize_booking(detail: BookingReviewDetail) -> dict:
    """Convert a Booking detail row into a JSON-friendly dict."""
    return {
        "rating": float(detail.rating) if detail.rating else None,
        "review_heading": detail.review_heading,
        "author": detail.author,
        "positive_text": detail.positive_text,
        "negative_text": detail.negative_text,
        "review_date": detail.review_date,
        "stay_date": detail.stay_date,
        "num_of_nights": detail.num_of_nights,
        "traveler_type": detail.traveler_type,
        "room_type": detail.room_type,
        "reviewer_nationality": detail.reviewer_nationality,
        "reply": detail.reply,
    }


def _serialize_google(detail: GoogleReviewDetail) -> dict:
    """Convert a Google detail row into a JSON-friendly dict."""
    return {
        "rating": float(detail.rating) if detail.rating else None,
        "author": detail.author,
        "review_text": detail.review_text,
        "review_date": detail.review_date,
        "author_badge": detail.author_badge,
        "reply": detail.reply,
    }


def _serialize_tripadvisor(detail: TripAdvisorReviewDetail) -> dict:
    """Convert a TripAdvisor detail row into a JSON-friendly dict."""
    return {
        "rating": float(detail.rating) if detail.rating else None,
        "review_heading": detail.review_heading,
        "author": detail.author,
        "review_text": detail.review_text,
        "review_date": detail.review_date,
        "reviewer_nationality": detail.reviewer_nationality,
        "stay_date": detail.stay_date,
        "traveler_type": detail.traveler_type,
        "rating_value": float(detail.rating_value) if detail.rating_value else None,
        "rating_rooms": float(detail.rating_rooms) if detail.rating_rooms else None,
        "rating_location": float(detail.rating_location)
        if detail.rating_location
        else None,
        "rating_cleanliness": float(detail.rating_cleanliness)
        if detail.rating_cleanliness
        else None,
        "rating_service": float(detail.rating_service)
        if detail.rating_service
        else None,
        "rating_sleep_quality": float(detail.rating_sleep_quality)
        if detail.rating_sleep_quality
        else None,
    }


# Map platform names to their serializer + relationship attribute
_PLATFORM_SERIALIZERS = {
    "agoda": ("agoda_detail", _serialize_agoda),
    "booking": ("booking_detail", _serialize_booking),
    "google": ("google_detail", _serialize_google),
    "tripadvisor": ("tripadvisor_detail", _serialize_tripadvisor),
}


@router.get("/{source_id}")
def get_reviews_by_source(source_id: str, limit: int = 100, skip: int = 0):
    """
    Retrieve all reviews for a given source_id.
    Returns platform-specific details and attached media for each review.
    """
    session = get_session()
    try:
        # Verify the source exists and determine platform
        source = session.query(Source).filter_by(source_id=source_id).first()
        if not source:
            raise HTTPException(status_code=404, detail="Source not found")

        platform = source.platform_name.lower()
        detail_attr, serializer = _PLATFORM_SERIALIZERS.get(platform, (None, None))

        # Build the query with eager loading
        query = (
            session.query(Review)
            .filter(Review.source_id == source_id)
            .options(joinedload(Review.media))
        )

        # Eagerly load the correct platform detail relationship
        if detail_attr:
            query = query.options(joinedload(getattr(Review, detail_attr)))

        total = session.query(Review).filter(Review.source_id == source_id).count()
        reviews = (
            query.order_by(Review.review_id.desc()).offset(skip).limit(limit).all()
        )

        results = []
        for r in reviews:
            # Get the platform detail object from the review
            detail_obj = getattr(r, detail_attr, None) if detail_attr else None

            entry = {
                "review_id": r.review_id,
                "source_id": r.source_id,
                "platform": platform,
                "created_at": str(r.created_at) if r.created_at else None,
                # Platform-specific detail fields
                "detail": serializer(detail_obj) if detail_obj and serializer else None,
                # Attached media
                "media": [
                    {
                        "media_id": m.media_id,
                        "url": m.media_url,
                        "thumbnail": m.thumbnail_url,
                        "type": m.media_type,
                    }
                    for m in r.media
                ]
                if r.media
                else [],
            }
            results.append(entry)

        return {
            "source_id": source_id,
            "platform": platform,
            "source_url": source.source_url,
            "total": total,
            "returned": len(results),
            "data": results,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Failed to fetch reviews for source {source_id}: {e}", exc_info=True
        )
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@router.delete("/{review_id}", status_code=204)
def delete_review(review_id: int):
    """
    Deletes a specific review by its review_id.
    Cascades automatically to delete platform-specific detail rows and media.
    """
    session = get_session()
    try:
        review = session.query(Review).filter(Review.review_id == review_id).first()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")

        session.delete(review)
        session.commit()
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        logger.error(f"Failed to delete review {review_id}: {e}", exc_info=True)


# ── Mark-Embedded Request Schema ──
class MarkEmbeddedRequest(BaseModel):
    """Payload to mark a list of review IDs as embedded."""

    review_ids: List[int]


@router.patch("/mark-embedded")
def mark_reviews_as_embedded(body: MarkEmbeddedRequest):
    """
    Mark a batch of reviews as embedded (is_embedded = True).
    Called by the main backend after the embedding service successfully
    processes them.
    """
    if not body.review_ids:
        return {"updated_count": 0, "message": "No review IDs provided."}

    session = get_session()
    try:
        updated = (
            session.query(Review)
            .filter(Review.review_id.in_(body.review_ids))
            .update({"is_embedded": True}, synchronize_session=False)
        )
        session.commit()
        logger.info(f"Marked {updated} reviews as embedded: {body.review_ids[:10]}...")
        return {
            "updated_count": updated,
            "message": f"Marked {updated} reviews as embedded.",
        }
    except Exception as e:
        session.rollback()
        logger.error(f"Failed to mark reviews as embedded: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@router.get("/unembedded/{source_id}")
def get_unembedded_reviews(source_id: str, limit: int = 500):
    """
    Returns reviews for a source that have NOT yet been embedded (is_embedded=False).
    Used by the main backend to know which reviews to send to the embedding service.
    """
    session = get_session()
    try:
        source = session.query(Source).filter_by(source_id=source_id).first()
        if not source:
            raise HTTPException(status_code=404, detail="Source not found")

        platform = source.platform_name.lower()
        detail_attr, serializer = _PLATFORM_SERIALIZERS.get(platform, (None, None))

        query = (
            session.query(Review)
            .filter(Review.source_id == source_id)
            .filter(Review.is_embedded == False)  # noqa: E712
        )

        if detail_attr:
            query = query.options(joinedload(getattr(Review, detail_attr)))

        reviews = query.order_by(Review.review_id.asc()).limit(limit).all()

        results = []
        for r in reviews:
            detail_obj = getattr(r, detail_attr, None) if detail_attr else None
            # Build the review_text field for embedding
            review_text = None
            if detail_obj:
                if platform == "booking":
                    pos = getattr(detail_obj, "positive_text", "") or ""
                    neg = getattr(detail_obj, "negative_text", "") or ""
                    review_text = f"{pos} {neg}".strip() or None
                else:
                    review_text = getattr(detail_obj, "review_text", None)

            if review_text:  # Only include reviews that have text to embed
                results.append(
                    {
                        "review_id": r.review_id,
                        "review_text": review_text,
                    }
                )

        return {
            "source_id": source_id,
            "platform": platform,
            "unembedded_count": len(results),
            "data": results,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Failed to fetch unembedded reviews for source {source_id}: {e}",
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()
