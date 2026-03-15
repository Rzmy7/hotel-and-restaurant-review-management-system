"""
Organizations API — Complete CRUD + Source Linking + Scraping + Reviews + Stats
===============================================================================
Designed as a microservice boundary: minimal org data (PK + name) here;
full org details live in a separate master-data service.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from core.database import get_session
from core.config import setup_logger
from core.job_manager import job_manager
from core.scrape_pool import scrape_pool
from core.models import (
    Organization, Source, OrganizationSource, Review,
    AgodaReviewDetail, BookingReviewDetail, GoogleReviewDetail, ReviewMedia
)
from sqlalchemy.orm import joinedload
from sqlalchemy import func as sa_func

logger = setup_logger("organizations_api")
router = APIRouter(prefix="/organizations", tags=["Organizations"])


# ──── Pydantic Schemas ────

class SourceLink(BaseModel):
    platform: str         # "Agoda", "Booking", or "Google"
    url: str              # Platform-specific URL

class OrganizationCreate(BaseModel):
    """Create an organization with all its source URLs in a single call."""
    organization_name: str
    sources: Optional[List[SourceLink]] = []

class OrganizationUpdate(BaseModel):
    organization_name: Optional[str] = None

class AddSourceRequest(BaseModel):
    platform: str
    url: str

class ScrapeRequest(BaseModel):
    headless: bool = True
    pages: str = "*"


# ──── Helper: serialize a review ────

def _serialize_review(r):
    entry = {
        "review_id": r.review_id,
        "platform": r.organization_source.source.platform_name if r.organization_source and r.organization_source.source else None,
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


# ──── CRUD ────

@router.post("")
def create_organization(body: OrganizationCreate):
    """
    Create an organization and optionally link platform sources — all in one call.
    Example body:
    {
        "organization_name": "Hilton Colombo",
        "sources": [
            {"platform": "Booking", "url": "https://www.booking.com/hotel/..."},
            {"platform": "Agoda",   "url": "https://www.agoda.com/..."},
            {"platform": "Google",  "url": "https://maps.app.goo.gl/..."}
        ]
    }
    """
    session = get_session()
    try:
        org = Organization(organization_name=body.organization_name)
        session.add(org)
        session.flush()

        linked = []
        for src in body.sources:
            source = session.query(Source).filter_by(platform_name=src.platform).first()
            if not source:
                session.rollback()
                raise HTTPException(status_code=400, detail=f"Unknown platform: {src.platform}. Use 'Agoda', 'Booking', or 'Google'.")

            os_link = OrganizationSource(
                organization_id=org.organization_id,
                source_id=source.source_id,
                external_url=src.url
            )
            session.add(os_link)
            session.flush()
            linked.append({
                "organization_source_id": os_link.organization_source_id,
                "platform": src.platform,
                "url": src.url
            })

        session.commit()
        return {
            "status": "created",
            "organization_id": org.organization_id,
            "organization_name": org.organization_name,
            "linked_sources": linked
        }
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@router.get("")
def list_organizations(limit: int = 100, skip: int = 0):
    """List all organizations with source count and total reviews."""
    session = get_session()
    try:
        orgs = session.query(Organization).order_by(Organization.organization_id).offset(skip).limit(limit).all()
        total = session.query(Organization).count()

        results = []
        for org in orgs:
            source_count = session.query(OrganizationSource).filter_by(
                organization_id=org.organization_id
            ).count()
            review_count = session.query(Review).join(OrganizationSource).filter(
                OrganizationSource.organization_id == org.organization_id
            ).count()
            results.append({
                "organization_id": org.organization_id,
                "organization_name": org.organization_name,
                "linked_sources": source_count,
                "total_reviews": review_count,
                "created_at": str(org.created_at) if org.created_at else None
            })

        return {"total": total, "returned": len(results), "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@router.get("/{organization_id}")
def get_organization(organization_id: int):
    """Get organization details with all linked sources and per-platform review counts."""
    session = get_session()
    try:
        org = session.query(Organization).filter_by(organization_id=organization_id).first()
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")

        linked = session.query(OrganizationSource).options(
            joinedload(OrganizationSource.source)
        ).filter_by(organization_id=organization_id).all()

        sources_data = []
        for os_link in linked:
            review_count = session.query(Review).filter_by(
                organization_source_id=os_link.organization_source_id
            ).count()
            sources_data.append({
                "organization_source_id": os_link.organization_source_id,
                "platform": os_link.source.platform_name,
                "external_url": os_link.external_url,
                "review_count": review_count,
                "last_synced_at": str(os_link.last_synced_at) if os_link.last_synced_at else None
            })

        total_reviews = sum(s["review_count"] for s in sources_data)

        return {
            "organization_id": org.organization_id,
            "organization_name": org.organization_name,
            "total_reviews": total_reviews,
            "sources": sources_data,
            "created_at": str(org.created_at) if org.created_at else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@router.put("/{organization_id}")
def update_organization(organization_id: int, body: OrganizationUpdate):
    """Update organization name."""
    session = get_session()
    try:
        org = session.query(Organization).filter_by(organization_id=organization_id).first()
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
        if body.organization_name is not None:
            org.organization_name = body.organization_name
        session.commit()
        return {"status": "updated", "organization_id": organization_id, "organization_name": org.organization_name}
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@router.delete("/{organization_id}")
def delete_organization(organization_id: int):
    """Delete organization + cascade all sources and reviews."""
    session = get_session()
    try:
        org = session.query(Organization).filter_by(organization_id=organization_id).first()
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
        name = org.organization_name
        session.delete(org)
        session.commit()
        return {"status": "deleted", "organization_name": name}
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


# ──── Source Linking ────

@router.get("/{organization_id}/sources")
def list_org_sources(organization_id: int):
    """List all linked sources for an organization."""
    session = get_session()
    try:
        org = session.query(Organization).filter_by(organization_id=organization_id).first()
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")

        linked = session.query(OrganizationSource).options(
            joinedload(OrganizationSource.source)
        ).filter_by(organization_id=organization_id).all()

        results = []
        for os_link in linked:
            review_count = session.query(Review).filter_by(
                organization_source_id=os_link.organization_source_id
            ).count()
            results.append({
                "organization_source_id": os_link.organization_source_id,
                "platform": os_link.source.platform_name,
                "external_url": os_link.external_url,
                "review_count": review_count,
                "last_synced_at": str(os_link.last_synced_at) if os_link.last_synced_at else None
            })

        return {"organization_id": organization_id, "sources": results}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@router.post("/{organization_id}/sources")
def add_source_to_org(organization_id: int, body: AddSourceRequest):
    """Link a platform source URL to an organization. Updates URL if platform already linked."""
    session = get_session()
    try:
        org = session.query(Organization).filter_by(organization_id=organization_id).first()
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")

        source = session.query(Source).filter_by(platform_name=body.platform).first()
        if not source:
            raise HTTPException(status_code=400, detail=f"Unknown platform: {body.platform}")

        existing = session.query(OrganizationSource).filter_by(
            organization_id=organization_id,
            source_id=source.source_id
        ).first()
        if existing:
            existing.external_url = body.url
            session.commit()
            return {"status": "updated", "organization_source_id": existing.organization_source_id, "platform": body.platform}

        os_link = OrganizationSource(
            organization_id=organization_id,
            source_id=source.source_id,
            external_url=body.url
        )
        session.add(os_link)
        session.commit()
        session.refresh(os_link)
        return {"status": "linked", "organization_source_id": os_link.organization_source_id, "platform": body.platform}
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@router.delete("/{organization_id}/sources/{platform}")
def remove_source_from_org(organization_id: int, platform: str):
    """Unlink a platform from an organization and cascade-delete its reviews."""
    session = get_session()
    try:
        source = session.query(Source).filter(Source.platform_name.ilike(platform)).first()
        if not source:
            raise HTTPException(status_code=400, detail=f"Unknown platform: {platform}")

        os_link = session.query(OrganizationSource).filter_by(
            organization_id=organization_id,
            source_id=source.source_id
        ).first()
        if not os_link:
            raise HTTPException(status_code=404, detail=f"No {platform} source linked to this organization")

        session.delete(os_link)
        session.commit()
        return {"status": "unlinked", "platform": platform, "organization_id": organization_id}
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


# ──── Reviews ────

@router.get("/{organization_id}/reviews")
def get_org_reviews(organization_id: int, platform: Optional[str] = None, limit: int = 100, skip: int = 0):
    """
    Get all reviews for an organization. Optionally filter by platform.
    Returns cross-platform data with platform-specific subtype details.
    """
    session = get_session()
    try:
        query = session.query(Review).join(OrganizationSource).join(Source).filter(
            OrganizationSource.organization_id == organization_id
        )
        if platform:
            query = query.filter(Source.platform_name.ilike(platform))

        query = query.options(
            joinedload(Review.media),
            joinedload(Review.agoda_detail),
            joinedload(Review.booking_detail),
            joinedload(Review.google_detail),
            joinedload(Review.organization_source).joinedload(OrganizationSource.source)
        )

        total = session.query(Review).join(OrganizationSource).filter(
            OrganizationSource.organization_id == organization_id
        ).count()

        reviews = query.order_by(Review.review_id.desc()).offset(skip).limit(limit).all()
        results = [_serialize_review(r) for r in reviews]
        return {"total": total, "returned": len(results), "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


# ──── Stats ────

@router.get("/{organization_id}/stats")
def get_org_stats(organization_id: int):
    """Per-organization statistics: review count, average rating, per-platform breakdown."""
    session = get_session()
    try:
        org = session.query(Organization).filter_by(organization_id=organization_id).first()
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")

        linked = session.query(OrganizationSource).options(
            joinedload(OrganizationSource.source)
        ).filter_by(organization_id=organization_id).all()

        platforms = {}
        total_reviews = 0
        all_ratings = []

        for os_link in linked:
            count = session.query(Review).filter_by(
                organization_source_id=os_link.organization_source_id
            ).count()
            avg = session.query(sa_func.avg(Review.rating)).filter_by(
                organization_source_id=os_link.organization_source_id
            ).scalar()

            platforms[os_link.source.platform_name.lower()] = {
                "reviews": count,
                "average_rating": round(float(avg), 2) if avg else None,
                "last_synced": str(os_link.last_synced_at) if os_link.last_synced_at else None
            }
            total_reviews += count
            if avg:
                all_ratings.extend([float(avg)] * count)

        overall_avg = round(sum(all_ratings) / len(all_ratings), 2) if all_ratings else None

        return {
            "organization_id": org.organization_id,
            "organization_name": org.organization_name,
            "total_reviews": total_reviews,
            "overall_average_rating": overall_avg,
            "platforms": platforms
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


# ──── Scraping ────

@router.post("/{organization_id}/scrape")
def scrape_all_sources(organization_id: int, body: ScrapeRequest):
    """Scrape ALL linked sources via the thread pool. Jobs are queued if pool is full."""
    session = get_session()
    try:
        org = session.query(Organization).filter_by(organization_id=organization_id).first()
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")

        linked = session.query(OrganizationSource).options(
            joinedload(OrganizationSource.source)
        ).filter_by(organization_id=organization_id).all()

        if not linked:
            raise HTTPException(status_code=400, detail="No sources linked. Link sources first.")

        jobs = []
        for os_link in linked:
            platform = os_link.source.platform_name.lower()
            url = os_link.external_url
            if not url:
                continue

            job_id = job_manager.create_job(platform=platform, url=url)

            if platform == "agoda":
                from platforms.agoda.logic import scrape_agoda
                scrape_pool.submit(job_id, scrape_agoda, url, body.headless, body.pages, job_id)
            elif platform == "booking":
                from platforms.booking.logic import scrape_booking
                scrape_pool.submit(job_id, scrape_booking, url, body.headless, body.pages, job_id)
            elif platform == "google":
                from platforms.google.logic import scrape_google
                scrape_pool.submit(job_id, scrape_google, url, body.headless, body.pages, job_id)

            jobs.append({"platform": platform, "url": url, "job_id": job_id})

        pool = scrape_pool.get_pool_status()
        return {"status": "submitted", "organization": org.organization_name, "jobs": jobs, "pool": pool}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@router.post("/{organization_id}/scrape/{platform}")
def scrape_single_source(organization_id: int, platform: str, body: ScrapeRequest):
    """Scrape a specific platform via the thread pool."""
    session = get_session()
    try:
        source = session.query(Source).filter(Source.platform_name.ilike(platform)).first()
        if not source:
            raise HTTPException(status_code=400, detail=f"Unknown platform: {platform}")

        os_link = session.query(OrganizationSource).filter_by(
            organization_id=organization_id,
            source_id=source.source_id
        ).first()
        if not os_link or not os_link.external_url:
            raise HTTPException(status_code=404, detail=f"No {platform} URL linked to this organization")

        url = os_link.external_url
        job_id = job_manager.create_job(platform=platform.lower(), url=url)

        if platform.lower() == "agoda":
            from platforms.agoda.logic import scrape_agoda
            scrape_pool.submit(job_id, scrape_agoda, url, body.headless, body.pages, job_id)
        elif platform.lower() == "booking":
            from platforms.booking.logic import scrape_booking
            scrape_pool.submit(job_id, scrape_booking, url, body.headless, body.pages, job_id)
        elif platform.lower() == "google":
            from platforms.google.logic import scrape_google
            scrape_pool.submit(job_id, scrape_google, url, body.headless, body.pages, job_id)

        pool = scrape_pool.get_pool_status()
        return {"status": "submitted", "platform": platform, "url": url, "job_id": job_id, "pool": pool}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()
