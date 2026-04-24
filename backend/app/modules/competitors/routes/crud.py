"""
Competitor CRUD + track/untrack routes.
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.modules.competitors.schemas import (
    AddCompetitorRequest,
    AddFromOrganizationRequest,
    TrackCompetitorRequest,
)
from app.modules.competitors.services.competitor_service import (
    get_tracked_competitors, get_available_competitors,
    get_competitor_by_id, register_competitor,
    register_competitor_from_organization,
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
            GROUP BY o.organization_id, o.created_at
            ORDER BY COUNT(pr.id) DESC, o.created_at ASC
        """),
        {"tenant_id": user_id},
    ).fetchone()
    return str(row[0]) if row else None


@router.get("/")
def list_competitors(current_user=Depends(get_current_user)):
    try:
        return {"tracked": get_tracked_competitors(), "available": get_available_competitors()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suggestions")
def suggested_competitors(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Top 6 organizations with the same city+country+type as the user's own org,
    excluding the user's org and orgs already in dbo.Competitors. Ordered by review count desc."""
    try:
        my_org_id = _get_user_org_id(current_user, db)
        if not my_org_id:
            return {"status": "no_organization", "suggestions": []}

        loc = db.execute(
            text("""
                SELECT city, country, organization_type_id
                FROM dbo.organization
                WHERE organization_id = :org_id
            """),
            {"org_id": my_org_id},
        ).fetchone()

        if not loc:
            return {"status": "no_organization", "suggestions": []}

        city = (loc[0] or "").strip()
        country = (loc[1] or "").strip()
        type_id = loc[2]

        if not city or not country:
            return {"status": "missing_location", "suggestions": []}

        rows = db.execute(
            text("""
                SELECT TOP 6
                    o.organization_id,
                    o.organization_name,
                    o.city,
                    o.country,
                    o.organization_type_id,
                    COUNT(pr.id) AS review_count,
                    AVG(CAST(pr.rating AS FLOAT)) AS avg_rating
                FROM dbo.organization o
                LEFT JOIN dbo.source s ON s.organization_id = o.organization_id
                LEFT JOIN dbo.processed_review pr ON pr.source_id = s.source_id
                WHERE o.organization_id <> :my_org
                  AND LOWER(LTRIM(RTRIM(ISNULL(o.city, '')))) = LOWER(:city)
                  AND LOWER(LTRIM(RTRIM(ISNULL(o.country, '')))) = LOWER(:country)
                  AND o.organization_type_id = :type_id
                  AND NOT EXISTS (
                        SELECT 1 FROM dbo.Competitors c WHERE c.organization_id = o.organization_id
                  )
                GROUP BY o.organization_id, o.organization_name, o.city, o.country, o.organization_type_id
                ORDER BY review_count DESC, o.organization_name ASC
            """),
            {"my_org": my_org_id, "city": city.lower(), "country": country.lower(), "type_id": type_id},
        ).fetchall()

        suggestions = [
            {
                "organization_id": str(r[0]),
                "organization_name": r[1],
                "city": r[2],
                "country": r[3],
                "organization_type_id": r[4],
                "reviewCount": int(r[5] or 0),
                "avgRating": round(float(r[6] or 0), 2),
            }
            for r in rows
        ]
        return {"status": "ok", "suggestions": suggestions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/")
def create_competitor(
    payload: AddCompetitorRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        # ── Check competitors limit ──
        user_id = current_user["user_id"] if isinstance(current_user, dict) else str(current_user.user_id)
        try:
            import pyodbc
            from app.core.db_utils import get_connection_string
            from app.modules.admin.services.subscription_service import (
                check_feature_limit,
                send_limit_reached_notification,
            )
            with pyodbc.connect(get_connection_string()) as conn:
                cursor = conn.cursor()
                limit_info = check_feature_limit(cursor, user_id, "competitors")
                if not limit_info["allowed"]:
                    send_limit_reached_notification(user_id, limit_info["feature_name"])
                    raise HTTPException(
                        status_code=403,
                        detail=f"Competitor tracking limit reached for your current plan. "
                               f"You have used {limit_info['used']}/{limit_info['limit']}. "
                               f"Please upgrade your subscription plan to track more competitors.",
                    )
        except HTTPException:
            raise
        except Exception as limit_err:
            print(f"LIMIT CHECK WARNING (competitors): {limit_err}")

        if not payload.city.strip() or not payload.country.strip():
            raise HTTPException(status_code=400, detail="City and country are required")
        if not payload.sources:
            raise HTTPException(status_code=400, detail="At least one source URL is required")

        competitor = register_competitor(
            name=payload.name,
            organization_type_id=payload.organization_type_id,
            city=payload.city,
            country=payload.country,
            sources=[s.model_dump() for s in payload.sources],
        )
        return {"message": "Competitor registered", "competitor": competitor}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/from-organization")
def add_from_organization(
    payload: AddFromOrganizationRequest,
    current_user=Depends(get_current_user),
):
    try:
        competitor = register_competitor_from_organization(payload.organization_id)
        if not competitor:
            raise HTTPException(status_code=404, detail="Organization not found")
        return {"message": "Competitor added", "competitor": competitor}
    except HTTPException:
        raise
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
