from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database.session import get_db
from app.modules.auth.utils.auth_utils import get_current_user

router = APIRouter(prefix="/api", tags=["user-organizations"])


@router.get("/user/organizations")
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
                o.organization_type_id
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
            "role": "owner" # In this unified model, the tenant owner is the owner of all its orgs
        }
        for row in rows
    ]

    return organizations
