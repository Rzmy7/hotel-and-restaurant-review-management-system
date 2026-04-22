"""
Competitor CRUD + track/untrack routes.
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.modules.competitors.schemas import AddCompetitorRequest, TrackCompetitorRequest
from app.modules.competitors.services.competitor_service import (
    get_tracked_competitors, get_available_competitors,
    get_competitor_by_id, register_competitor,
    track_competitor, untrack_competitor, delete_competitor,
    get_competitor_reviews,
)
from app.core.dependencies import get_current_user

router = APIRouter()


def _get_user_org_id(user, db: Session) -> str | None:
    """Resolve the current user's primary organization_id — prefers org with most reviews."""
    user_id = user["user_id"] if isinstance(user, dict) else str(user.user_id)
    row = db.execute(
        text("""
            SELECT TOP 1 o.organization_id
            FROM dbo.organization o
            LEFT JOIN dbo.source s ON s.organization_id = o.organization_id
            LEFT JOIN dbo.processed_review pr ON pr.source_id = s.source_id
            WHERE o.tenant_id = :tenant_id
              AND (o.is_competitor = 0 OR o.is_competitor IS NULL)
            GROUP BY o.organization_id, o.created_at
            ORDER BY COUNT(pr.id) DESC, o.created_at ASC
        """),
        {"tenant_id": user_id},
    ).fetchone()
    return str(row[0]) if row else None


@router.get("/")
def list_competitors():
    try:
        return {"tracked": get_tracked_competitors(), "available": get_available_competitors()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/")
def create_competitor(
    payload: AddCompetitorRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        competitor = register_competitor(
            name=payload.name,
            source_url=payload.source_url,
            platform_id=payload.platform_id,
            organization_type_id=payload.organization_type_id,
        )
        return {"message": "Competitor registered", "competitor": competitor}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/track")
def track_a_competitor(
    payload: TrackCompetitorRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        user_id = current_user["user_id"] if isinstance(current_user, dict) else str(current_user.user_id)
        result = track_competitor(payload.competitorId, user_id=user_id)
        if not result:
            raise HTTPException(status_code=404, detail="Competitor not found")
        return {"message": "Competitor now tracked", "competitor": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/untrack")
def untrack_a_competitor(
    payload: TrackCompetitorRequest,
    current_user=Depends(get_current_user),
):
    try:
        untrack_competitor(payload.competitorId)
        return {"message": "Competitor untracked"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{competitor_id}")
def remove_competitor(competitor_id: str, current_user=Depends(get_current_user)):
    try:
        delete_competitor(competitor_id)
        return {"message": "Competitor deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{competitor_id}/reviews")
def get_reviews_for_competitor(
    competitor_id: str,
    current_user=Depends(get_current_user),
):
    try:
        reviews = get_competitor_reviews(competitor_id)
        return {"reviews": reviews, "total": len(reviews)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
