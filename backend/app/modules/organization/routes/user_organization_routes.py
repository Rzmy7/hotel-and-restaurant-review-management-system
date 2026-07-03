from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database.session import get_db
from app.modules.auth.utils.auth_utils import get_current_user

router = APIRouter(prefix="/api", tags=["Organizations"])


@router.get("/user/organizations", summary="List all organizations for the authenticated user")
def get_user_organizations(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    # In the new schema, user_id == tenant_id
    tenant_id = user.user_id

    result = db.execute(
        text("""
            SELECT
                o.organization_id,
                o.organization_name,
                ot.type_name as organization_type,
                o.organization_type_id,
                o.website_url,
                o.primary_email,
                o.phone_number,
                o.logo_url,
                o.location_url,
                o.latitude,
                o.longitude
            FROM dbo.organization o
            LEFT JOIN dbo.organization_type ot
                ON o.organization_type_id = ot.type_code
            WHERE o.tenant_id = :tenant_id
        """),
        {"tenant_id": tenant_id}
    )

    rows = result.fetchall()

    organizations = [
        {
            "organization_id": str(row[0]),
            "organization_name": row[1],
            "organization_type": row[2],
            "organization_type_id": row[3],
            "website_url": row[4],
            "primary_email": row[5],
            "phone_number": row[6],
            "logo_url": row[7],
            "location_url": row[8],
            "latitude": row[9],
            "longitude": row[10],
            "role": "owner"
        }
        for row in rows
    ]

    return organizations
