"""
Competitor analytics routes — compare, insights, rankings.
All endpoints now require authentication to resolve the user's own organization_id.
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.dependencies import get_current_user
from app.modules.competitors.services.analytics_service import (
    get_comparison_data,
    get_rankings_data,
    get_ai_comparison_insights,
)

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


@router.get("/rankings")
def competitor_rankings(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        my_org_id = _get_user_org_id(current_user, db)
        if not my_org_id:
            raise HTTPException(status_code=400, detail="No organization found for this user")
        return get_rankings_data(my_org_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{competitor_id}/compare")
def compare_with_competitor(
    competitor_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        my_org_id = _get_user_org_id(current_user, db)
        if not my_org_id:
            raise HTTPException(status_code=400, detail="No organization found for this user")
        data = get_comparison_data(competitor_id, my_org_id)
        if not data:
            raise HTTPException(status_code=404, detail="Competitor not found")
        return data
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{competitor_id}/insights")
def ai_competitor_insights(
    competitor_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        my_org_id = _get_user_org_id(current_user, db)
        if not my_org_id:
            raise HTTPException(status_code=400, detail="No organization found for this user")
        return get_ai_comparison_insights(competitor_id, my_org_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
