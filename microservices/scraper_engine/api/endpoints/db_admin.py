"""
Database Administration Endpoints — operates on the unified schema.
"""
from fastapi import APIRouter, HTTPException
from core.database import get_session
from sqlalchemy import text
from core.config import setup_logger
from core.models import (
    Organization, Source, OrganizationSource,
    Review, AgodaReviewDetail, BookingReviewDetail, GoogleReviewDetail,
    ReviewMedia
)

logger = setup_logger("db_admin")
router = APIRouter(prefix="/db", tags=["Database Administration"])


@router.get("/stats")
def get_db_stats():
    """Aggregates row counts across the unified schema."""
    session = get_session()
    try:
        total_orgs = session.query(Organization).count()
        total_reviews = session.query(Review).count()
        total_media = session.query(ReviewMedia).count()

        # Per-platform breakdown
        platforms = session.query(Source).all()
        platform_stats = {}
        for src in platforms:
            review_count = session.query(Review).join(OrganizationSource).filter(
                OrganizationSource.source_id == src.source_id
            ).count()
            org_count = session.query(OrganizationSource).filter_by(
                source_id=src.source_id
            ).count()
            platform_stats[src.platform_name.lower()] = {
                "organizations": org_count,
                "reviews": review_count
            }

        return {
            "total_organizations": total_orgs,
            "total_reviews": total_reviews,
            "total_media": total_media,
            "platforms": platform_stats
        }
    except Exception as e:
        logger.error(f"Error fetching DB stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@router.delete("/reviews/{platform}")
def delete_reviews(platform: str):
    """Purges all reviews for a given platform."""
    session = get_session()
    try:
        source = session.query(Source).filter(
            Source.platform_name.ilike(platform)
        ).first()
        if not source:
            raise HTTPException(status_code=400, detail=f"Invalid platform: {platform}. Use 'Agoda', 'Booking', or 'Google'.")

        # Get all org_source_ids for this platform
        os_ids = [os.organization_source_id for os in
                  session.query(OrganizationSource).filter_by(source_id=source.source_id).all()]

        if not os_ids:
            return {"status": "success", "deleted_reviews": 0, "platform": platform}

        count = session.query(Review).filter(
            Review.organization_source_id.in_(os_ids)
        ).delete(synchronize_session='fetch')

        session.commit()
        logger.info(f"Purged {count} reviews from {platform}")
        return {"status": "success", "deleted_reviews": count, "platform": platform}
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        logger.error(f"Review Deletion Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@router.delete("/organizations/{platform}")
def delete_organizations_by_platform(platform: str):
    """Deletes all organizations linked to a given platform (and cascade reviews)."""
    session = get_session()
    try:
        source = session.query(Source).filter(
            Source.platform_name.ilike(platform)
        ).first()
        if not source:
            raise HTTPException(status_code=400, detail=f"Invalid platform: {platform}")

        # Delete OrganizationSource links for this platform
        count = session.query(OrganizationSource).filter_by(
            source_id=source.source_id
        ).delete(synchronize_session='fetch')

        session.commit()
        logger.info(f"Purged {count} organization-source links from {platform}")
        return {"status": "success", "deleted_links": count, "platform": platform}
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@router.post("/vacuum")
def vacuum_database():
    """Performs manual storage maintenance via DBCC SHRINKDATABASE."""
    session = get_session()
    try:
        session.execute(text("DBCC SHRINKDATABASE(0)"))
        session.commit()
        return {"status": "success", "message": "Database optimized and shrunk."}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()
