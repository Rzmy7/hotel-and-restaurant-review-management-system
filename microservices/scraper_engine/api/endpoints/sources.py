"""
Sources API — Platform Registry Endpoints
"""
from fastapi import APIRouter, HTTPException
from core.database import get_session
from core.config import setup_logger
from core.models import Source, OrganizationSource, Review
from sqlalchemy.orm import joinedload

logger = setup_logger("sources_api")
router = APIRouter(prefix="/sources", tags=["Sources / Platforms"])


@router.get("")
def list_sources():
    """List all registered platforms with review counts."""
    session = get_session()
    try:
        sources = session.query(Source).order_by(Source.source_id).all()

        results = []
        for s in sources:
            review_count = session.query(Review).join(OrganizationSource).filter(
                OrganizationSource.source_id == s.source_id
            ).count()
            org_count = session.query(OrganizationSource).filter_by(
                source_id=s.source_id
            ).count()

            results.append({
                "source_id": s.source_id,
                "platform_name": s.platform_name,
                "base_url": s.base_url,
                "linked_organizations": org_count,
                "total_reviews": review_count,
                "created_at": str(s.created_at) if s.created_at else None
            })

        return {"total": len(results), "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


@router.get("/{source_id}")
def get_source(source_id: int):
    """Get source details with linked organizations."""
    session = get_session()
    try:
        source = session.query(Source).filter_by(source_id=source_id).first()
        if not source:
            raise HTTPException(status_code=404, detail="Source not found")

        linked = session.query(OrganizationSource).options(
            joinedload(OrganizationSource.organization)
        ).filter_by(source_id=source_id).all()

        orgs_data = []
        for os_link in linked:
            review_count = session.query(Review).filter_by(
                organization_source_id=os_link.organization_source_id
            ).count()
            orgs_data.append({
                "organization_id": os_link.organization.organization_id,
                "organization_name": os_link.organization.organization_name,
                "external_url": os_link.external_url,
                "review_count": review_count,
                "last_synced_at": str(os_link.last_synced_at) if os_link.last_synced_at else None
            })

        total_reviews = session.query(Review).join(OrganizationSource).filter(
            OrganizationSource.source_id == source_id
        ).count()

        return {
            "source_id": source.source_id,
            "platform_name": source.platform_name,
            "base_url": source.base_url,
            "total_reviews": total_reviews,
            "organizations": orgs_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()
