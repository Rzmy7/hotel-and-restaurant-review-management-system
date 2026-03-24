from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db import get_db
from app.auth_utils import get_current_user
from app.schemas.organization_schema import OrganizationCreate

router = APIRouter(prefix="/api", tags=["organization"])


@router.post("/organizations")
def create_organization(
    data: OrganizationCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    organization_name = data.organization_name

    # validate name
    if not organization_name or organization_name.strip() == "":
        raise HTTPException(status_code=400, detail="Organization name required")

    # get tenant_id from tenants table
    tenant_result = db.execute(
        text("""
            SELECT TOP 1 tenant_id
            FROM dbo.tenants_source
        """)
    ).fetchone()

    if not tenant_result:
        raise HTTPException(status_code=400, detail="No tenant found")

    tenant_id = tenant_result[0]

    # insert organization
    result = db.execute(
        text("""
            INSERT INTO dbo.organizations_source 
            (organization_id, organization_name, tenant_id, created_at, updated_at)
            OUTPUT INSERTED.organization_id
            VALUES (NEWID(), :name, :tenant_id, GETDATE(), GETDATE())
        """),
        {
            "name": organization_name,
            "tenant_id": tenant_id
        }
    )

    org_id = result.fetchone()[0]

    # link user to organization
    db.execute(
        text("""
            INSERT INTO dbo.user_organizations (user_id, organization_id)
            VALUES (:user_id, :org_id)
        """),
        {
            "user_id": user.user_id,
            "org_id": org_id
        }
    )

    db.commit()

    return {
        "message": "Organization created successfully",
        "organization_id": str(org_id)
    }