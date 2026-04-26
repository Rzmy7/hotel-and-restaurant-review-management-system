"""
Sources Management Endpoints
=============================
GET  /api/sources           — list all scraped sources with review counts
GET  /api/sources/{id}      — single source detail
DELETE /api/sources/{id}    — delete source and cascade all reviews
"""

from fastapi import APIRouter, HTTPException
from core.database import get_session
from core.models import (
    Source,
    Review,
    AgodaReviewDetail,
    BookingReviewDetail,
    GoogleReviewDetail,
    TripAdvisorReviewDetail,
)
from core.deduplication.base import find_duplicate_review_ids, remove_duplicate_reviews
from core.config import setup_logger
from sqlalchemy import func as sa_func

logger = setup_logger("sources_api")
router = APIRouter(prefix="/sources", tags=["Sources"])


@router.get("")
def list_sources(limit: int = 100, skip: int = 0):
    """List all known sources with their review counts."""
    session = get_session()
    try:
        # Query sources with aggregated review counts
        query = (
            session.query(Source, sa_func.count(Review.review_id).label("review_count"))
            .outerjoin(Review, Source.source_id == Review.source_id)
            .group_by(
                Source.source_id,
                Source.source_url,
                Source.platform_name,
                Source.created_at,
            )
            .order_by(Source.source_id)
            .offset(skip)
            .limit(limit)
        )
        total = session.query(Source).count()
        results = []
        for source, review_count in query.all():
            results.append(
                {
                    "source_id": source.source_id,
                    "platform_name": source.platform_name,
                    "source_url": source.source_url,
                    "review_count": review_count,
                    "created_at": str(source.created_at) if source.created_at else None,
                }
            )

        return {"total": total, "returned": len(results), "data": results}
    except Exception as e:
        logger.error(f"Failed to list sources: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@router.get("/{source_id}")
def get_source(source_id: str):
    """Get details for a single source."""
    session = get_session()
    try:
        source = session.query(Source).filter_by(source_id=source_id).first()
        if not source:
            raise HTTPException(status_code=404, detail="Source not found")

        review_count = session.query(Review).filter_by(source_id=source_id).count()

        return {
            "source_id": source.source_id,
            "platform_name": source.platform_name,
            "source_url": source.source_url,
            "review_count": review_count,
            "created_at": str(source.created_at) if source.created_at else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get source {source_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@router.delete("/{source_id}")
def delete_source(source_id: str):
    """
    Delete a source and cascade-delete all associated reviews,
    platform details, and media.
    """
    session = get_session()
    try:
        source = session.query(Source).filter_by(source_id=source_id).first()
        if not source:
            raise HTTPException(status_code=404, detail="Source not found")

        platform = source.platform_name
        url = source.source_url
        session.delete(source)
        session.commit()

        return {
            "status": "deleted",
            "source_id": source_id,
            "platform_name": platform,
            "source_url": url,
        }
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        logger.error(f"Failed to delete source {source_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@router.get("/{source_id}/duplicates")
def test_duplicates(source_id: str):
    """
    Test deduplication for a specific source and return the count and IDs of duplicate reviews.
    """
    session = get_session()
    try:
        source = session.query(Source).filter_by(source_id=source_id).first()
        if not source:
            raise HTTPException(status_code=404, detail="Source not found")

        platform = source.platform_name.lower()
        if platform == "agoda":
            detail_model = AgodaReviewDetail
            columns = [
                AgodaReviewDetail.author,
                AgodaReviewDetail.review_date,
                AgodaReviewDetail.review_text,
            ]
        elif platform == "booking":
            detail_model = BookingReviewDetail
            columns = [
                BookingReviewDetail.author,
                BookingReviewDetail.review_date,
                BookingReviewDetail.positive_text,
                BookingReviewDetail.negative_text,
            ]
        elif platform == "google":
            detail_model = GoogleReviewDetail
            columns = [
                GoogleReviewDetail.author,
                GoogleReviewDetail.review_date,
                GoogleReviewDetail.review_text,
            ]
        elif platform == "tripadvisor":
            detail_model = TripAdvisorReviewDetail
            columns = [
                TripAdvisorReviewDetail.author,
                TripAdvisorReviewDetail.review_date,
                TripAdvisorReviewDetail.review_text,
            ]
        else:
            raise HTTPException(
                status_code=400, detail=f"Unsupported platform: {platform}"
            )

        duplicate_ids = find_duplicate_review_ids(
            session, detail_model, source_id, columns
        )

        return {
            "source_id": source_id,
            "platform_name": platform,
            "duplicate_count": len(duplicate_ids),
            "duplicate_ids": duplicate_ids,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Failed to test duplicates for source {source_id}: {e}", exc_info=True
        )
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@router.delete("/{source_id}/duplicates")
def delete_duplicates(source_id: str):
    """
    Remove duplicate reviews for a specific source and return the count of deleted items.
    """
    session = get_session()
    try:
        source = session.query(Source).filter_by(source_id=source_id).first()
        if not source:
            raise HTTPException(status_code=404, detail="Source not found")

        platform = source.platform_name.lower()
        if platform == "agoda":
            detail_model = AgodaReviewDetail
            columns = [
                AgodaReviewDetail.author,
                AgodaReviewDetail.review_date,
                AgodaReviewDetail.review_text,
            ]
        elif platform == "booking":
            detail_model = BookingReviewDetail
            columns = [
                BookingReviewDetail.author,
                BookingReviewDetail.review_date,
                BookingReviewDetail.positive_text,
                BookingReviewDetail.negative_text,
            ]
        elif platform == "google":
            detail_model = GoogleReviewDetail
            columns = [
                GoogleReviewDetail.author,
                GoogleReviewDetail.review_date,
                GoogleReviewDetail.review_text,
            ]
        elif platform == "tripadvisor":
            detail_model = TripAdvisorReviewDetail
            columns = [
                TripAdvisorReviewDetail.author,
                TripAdvisorReviewDetail.review_date,
                TripAdvisorReviewDetail.review_text,
            ]
        else:
            raise HTTPException(
                status_code=400, detail=f"Unsupported platform: {platform}"
            )

        duplicate_ids = find_duplicate_review_ids(
            session, detail_model, source_id, columns
        )

        deleted_count = 0
        if duplicate_ids:
            deleted_count = remove_duplicate_reviews(session, duplicate_ids)
            session.commit()

        return {
            "source_id": source_id,
            "platform_name": platform,
            "status": "success",
            "deleted_count": deleted_count,
            "duplicate_ids_removed": duplicate_ids,
        }
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        logger.error(
            f"Failed to delete duplicates for source {source_id}: {e}", exc_info=True
        )
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@router.post("/{source_id}/cleanup")
def cleanup_source(source_id: str):
    """
    Perform a deep, trait-based deduplication sweep for a source.
    This is an alias for DELETE /duplicates but follows a POST 'action' pattern.
    """
    return delete_duplicates(source_id)


@router.get("/{source_id}/integrity")
def check_source_integrity(source_id: str):
    """
    Detailed database integrity report for a source.
    Compares the hub 'reviews' table with platform-specific detail tables.
    """
    session = get_session()
    try:
        source = session.query(Source).filter_by(source_id=source_id).first()
        if not source:
            raise HTTPException(status_code=404, detail="Source not found")

        platform = source.platform_name.lower()

        # 1. Total Hub Reviews
        hub_count = session.query(Review).filter_by(source_id=source_id).count()

        # 2. Detail Table Counts
        detail_model = {
            "agoda": AgodaReviewDetail,
            "booking": BookingReviewDetail,
            "google": GoogleReviewDetail,
            "tripadvisor": TripAdvisorReviewDetail,
        }.get(platform)

        detail_count = 0
        if detail_model:
            detail_count = (
                session.query(detail_model)
                .join(Review, detail_model.review_id == Review.review_id)
                .filter(Review.source_id == source_id)
                .count()
            )

        # 3. Media Counts
        from core.models import ReviewMedia

        media_count = (
            session.query(ReviewMedia)
            .join(Review, ReviewMedia.review_id == Review.review_id)
            .filter(Review.source_id == source_id)
            .count()
        )

        # 4. Check for Orphans (Hub record exists but Detail record is missing)
        # This shouldn't happen with CASCADE but good for verification.
        orphans = hub_count - detail_count

        return {
            "source_id": source_id,
            "platform": platform,
            "counts": {
                "total_reviews": hub_count,
                "detail_records": detail_count,
                "media_files": media_count,
                "orphaned_hub_records": orphans,
            },
            "status": "healthy" if orphans == 0 else "degraded",
            "message": (
                "Data integrity check passed."
                if orphans == 0
                else f"Detected {orphans} orphaned hub records."
            ),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Integrity check failed for source {source_id}: {e}", exc_info=True
        )
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()
