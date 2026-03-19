"""
Database Admin Endpoints
========================
Utility endpoints for DB inspection and maintenance.
GET  /api/db/stats     — table row counts
DELETE /api/db/reviews/{platform}  — purge all reviews for a platform
"""
from fastapi import APIRouter, HTTPException
from core.database import get_session
from core.models import Source, Review, ReviewMedia
from core.config import setup_logger
from sqlalchemy import func as sa_func

logger = setup_logger("db_admin_api")
router = APIRouter(prefix="/db", tags=["Database Admin"])


@router.get("/stats")
def get_db_stats():
    """Returns row counts for all major tables."""
    session = get_session()
    try:
        total_sources = session.query(Source).count()
        total_reviews = session.query(Review).count()
        total_media = session.query(ReviewMedia).count()

        # Per-platform breakdown
        platforms = (
            session.query(Source.platform_name, sa_func.count(Source.source_id))
            .group_by(Source.platform_name)
            .all()
        )
        platform_breakdown = {}
        for platform, source_count in platforms:
            review_count = (
                session.query(Review)
                .join(Source, Review.source_id == Source.source_id)
                .filter(Source.platform_name == platform)
                .count()
            )
            platform_breakdown[platform] = {
                "sources": source_count,
                "reviews": review_count
            }

        return {
            "total_sources": total_sources,
            "total_reviews": total_reviews,
            "total_media": total_media,
            "by_platform": platform_breakdown
        }
    except Exception as e:
        logger.error(f"Stats query failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@router.delete("/reviews/{platform}")
def purge_reviews_by_platform(platform: str):
    """
    Purge all reviews for a given platform name.
    This cascades through review_media and platform detail tables.
    """
    session = get_session()
    try:
        sources = session.query(Source).filter_by(platform_name=platform.lower()).all()
        if not sources:
            raise HTTPException(status_code=404, detail=f"No sources found for platform: {platform}")

        total_deleted = 0
        for source in sources:
            count = session.query(Review).filter_by(source_id=source.source_id).delete()
            total_deleted += count

        session.commit()
        logger.info(f"Purged {total_deleted} reviews for platform '{platform}'")
        return {"status": "purged", "platform": platform, "reviews_deleted": total_deleted}
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        logger.error(f"Purge failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()
