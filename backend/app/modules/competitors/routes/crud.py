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
    EditCompetitorRequest,
)
from app.modules.competitors.services.competitor_service import (
    get_tracked_competitors,
    get_available_competitors,
    get_competitor_by_id,
    register_competitor,
    register_competitor_from_organization,
    track_competitor,
    untrack_competitor,
    delete_competitor,
    edit_competitor,
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
def list_competitors(organization_id: str, current_user=Depends(get_current_user)):
    try:
        return {
            "tracked": get_tracked_competitors(organization_id),
            "available": get_available_competitors(organization_id),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suggestions")
def suggested_competitors(
    organization_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Top 6 organizations within 50km of the user's own org,
    excluding the user's org and orgs already in dbo.Competitors. Ordered by review count desc.
    """
    try:
        my_org_id = organization_id
        if not my_org_id:
            return {"status": "no_organization", "suggestions": []}

        loc = db.execute(
            text("""
                SELECT latitude, longitude, organization_type_id
                FROM dbo.organization
                WHERE organization_id = :org_id
            """),
            {"org_id": my_org_id},
        ).fetchone()

        if not loc:
            return {"status": "no_organization", "suggestions": []}

        lat = loc[0]
        lng = loc[1]
        type_id = loc[2]

        if lat is None or lng is None:
            return {"status": "missing_location", "suggestions": []}

        rows = db.execute(
            text("""
                SELECT TOP 6
                    o.organization_id,
                    o.organization_name,
                    o.location_url,
                    o.latitude,
                    o.longitude,
                    o.organization_type_id,
                    COUNT(pr.id) AS review_count,
                    AVG(CAST(pr.rating AS FLOAT)) AS avg_rating
                FROM dbo.organization o
                LEFT JOIN dbo.source s ON s.organization_id = o.organization_id
                LEFT JOIN dbo.processed_review pr ON pr.source_id = s.source_id
                WHERE o.organization_id <> :my_org
                  AND o.latitude IS NOT NULL AND o.longitude IS NOT NULL
                  AND (6371 * ACOS(
                        COS(RADIANS(:lat)) * COS(RADIANS(o.latitude)) *
                        COS(RADIANS(o.longitude) - RADIANS(:lng)) +
                        SIN(RADIANS(:lat)) * SIN(RADIANS(o.latitude))
                      )) <= 50
                  AND o.organization_type_id = :type_id
                  AND NOT EXISTS (
                        SELECT 1 FROM dbo.Competitors c WHERE c.competitor_organization_id = o.organization_id AND c.tracking_organization_id = :my_org
                  )
                GROUP BY o.organization_id, o.organization_name, o.location_url, o.latitude, o.longitude, o.organization_type_id
                ORDER BY review_count DESC, o.organization_name ASC
            """),
            {"my_org": my_org_id, "lat": lat, "lng": lng, "type_id": type_id},
        ).fetchall()

        suggestions = [
            {
                "organization_id": str(r[0]),
                "organization_name": r[1],
                "location_url": r[2],
                "latitude": r[3],
                "longitude": r[4],
                "organization_type_id": r[5],
                "reviewCount": int(r[6] or 0),
                "avgRating": round(float(r[7] or 0), 2),
            }
            for r in rows
        ]
        return {"status": "ok", "suggestions": suggestions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/")
def create_competitor(
    payload: AddCompetitorRequest,
    organization_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        # ── Check competitors limit ──
        user_id = (
            current_user["user_id"]
            if isinstance(current_user, dict)
            else str(current_user.user_id)
        )
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

        if not payload.location_url.strip():
            raise HTTPException(status_code=400, detail="Location URL is required")
        if not payload.sources:
            raise HTTPException(
                status_code=400, detail="At least one source URL is required"
            )

        competitor = register_competitor(
            name=payload.name,
            organization_type_id=payload.organization_type_id,
            location_url=payload.location_url,
            sources=[s.model_dump() for s in payload.sources],
            tracking_organization_id=organization_id,
        )
        return {"message": "Competitor registered", "competitor": competitor}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/from-organization")
def add_from_organization(
    payload: AddFromOrganizationRequest,
    organization_id: str,
    current_user=Depends(get_current_user),
):
    try:
        competitor = register_competitor_from_organization(
            payload.organization_id, organization_id
        )
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
    organization_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        user_id = (
            current_user["user_id"]
            if isinstance(current_user, dict)
            else str(current_user.user_id)
        )
        result = track_competitor(
            payload.competitorId,
            tracking_organization_id=organization_id,
            user_id=user_id,
        )
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
    organization_id: str,
    current_user=Depends(get_current_user),
):
    try:
        untrack_competitor(
            payload.competitorId, tracking_organization_id=organization_id
        )
        return {"message": "Competitor untracked"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{competitor_id}")
def remove_competitor(
    competitor_id: str, organization_id: str, current_user=Depends(get_current_user)
):
    try:
        delete_competitor(competitor_id, tracking_organization_id=organization_id)
        return {"message": "Competitor deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{competitor_id}")
def update_competitor(
    competitor_id: str,
    payload: EditCompetitorRequest,
    organization_id: str,
    current_user=Depends(get_current_user),
):
    try:
        result = edit_competitor(
            competitor_id, organization_id, payload.name, payload.location_url
        )
        if not result:
            raise HTTPException(status_code=404, detail="Competitor not found")
        return {"message": "Competitor updated", "competitor": result}
    except HTTPException:
        raise
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
