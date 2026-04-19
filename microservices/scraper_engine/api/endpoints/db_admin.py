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
        source_counts = dict(
            session.query(Source.platform_name, sa_func.count(Source.source_id))
            .group_by(Source.platform_name)
            .all()
        )
        review_counts = dict(
            session.query(Source.platform_name, sa_func.count(Review.review_id))
            .join(Review, Source.source_id == Review.source_id)
            .group_by(Source.platform_name)
            .all()
        )

        platform_breakdown = {}
        for platform, s_count in source_counts.items():
            platform_breakdown[platform] = {
                "sources": s_count,
                "reviews": review_counts.get(platform, 0)
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


@router.post("/migrate/add-is-embedded")
def migrate_add_is_embedded():
    """
    Schema migration: adds the `is_embedded` BIT column to the `reviews` table
    if it does not already exist. Safe to call multiple times (idempotent).

    Run this once after deploying the new code so existing review rows
    get the column defaulting to 0 (not embedded).
    """
    session = get_session()
    try:
        from sqlalchemy import text

        # Check whether the column already exists
        check_sql = text("""
            SELECT COUNT(*) AS cnt
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'reviews'
              AND COLUMN_NAME = 'is_embedded'
        """)
        row = session.execute(check_sql).fetchone()
        if row and row[0] > 0:
            return {"status": "skipped", "message": "Column 'is_embedded' already exists on 'reviews'."}

        # Add the column with a default of 0
        alter_sql = text("""
            ALTER TABLE reviews
            ADD is_embedded BIT NOT NULL DEFAULT 0
        """)
        session.execute(alter_sql)
        session.commit()

        logger.info("Migration successful: added 'is_embedded' column to 'reviews' table.")
        return {"status": "success", "message": "Added 'is_embedded' column to 'reviews' table with default 0."}
    except Exception as e:
        session.rollback()
        logger.error(f"Migration failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()
