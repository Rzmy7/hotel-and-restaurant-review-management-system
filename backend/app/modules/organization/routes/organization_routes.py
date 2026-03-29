from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db
from app.modules.auth.utils.auth_utils import get_current_user
from app.modules.organization.schemas.organization_schema import OrganizationCreate

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

    # check if organization already exists
    existing_org = db.execute(
        text("""
            SELECT organization_id
            FROM dbo.organizations_source
            WHERE organization_name = :name
        """),
        {"name": organization_name}
    ).fetchone()

    if existing_org:
        org_id = existing_org[0]
        organization_created = False
    else:
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
        organization_created = True

    # link user to organization
    existing_user_org = db.execute(
        text("""
            SELECT 1
            FROM dbo.user_organizations
            WHERE user_id = :user_id AND organization_id = :org_id
        """),
        {
            "user_id": user.user_id,
            "org_id": org_id
        }
    ).fetchone()

    if not existing_user_org:
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
        membership_created = True
    else:
        membership_created = False

    db.commit()

    return {
        "message": "Organization created successfully",
        "organization_id": str(org_id),
        "organization_created": organization_created,
        "membership_created": membership_created,
    }

@router.delete("/organizations/{org_id}")
def delete_organization(
    org_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    # check if user is linked to org
    existing_link = db.execute(
        text("""
            SELECT 1 FROM dbo.user_organizations
            WHERE user_id = :user_id AND organization_id = :org_id
        """),
        {"user_id": user.user_id, "org_id": org_id}
    ).fetchone()

    if not existing_link:
        raise HTTPException(status_code=403, detail="Not authorized to delete this organization")

    # delete link
    db.execute(
        text("""
            DELETE FROM dbo.user_organizations
            WHERE user_id = :user_id AND organization_id = :org_id
        """),
        {"user_id": user.user_id, "org_id": org_id}
    )

    # delete sources mapping if any
    db.execute(
        text("""
            DELETE FROM dbo.sources_source
            WHERE organization_id = :org_id
        """),
        {"org_id": org_id}
    )

    # delete org
    db.execute(
        text("""
            DELETE FROM dbo.organizations_source
            WHERE organization_id = :org_id
        """),
        {"org_id": org_id}
    )

    db.commit()

    return {"message": "Organization deleted successfully"}


@router.delete("/setup/organizations/{org_id}/discard")
def discard_setup_organization(
    org_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    try:
        existing_link = db.execute(
            text(
                """
                SELECT 1
                FROM dbo.user_organizations
                WHERE user_id = :user_id AND organization_id = :org_id
                """
            ),
            {"user_id": user.user_id, "org_id": org_id}
        ).fetchone()

        if not existing_link:
            return {
                "message": "Organization membership already cleared",
                "organization_id": org_id,
                "discarded": False,
            }

        db.execute(
            text(
                """
                DELETE FROM dbo.user_organizations
                WHERE user_id = :user_id AND organization_id = :org_id
                """
            ),
            {"user_id": user.user_id, "org_id": org_id}
        )

        db.commit()

        return {
            "message": "Setup organization discarded",
            "organization_id": org_id,
            "discarded": True,
        }
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to discard setup organization")
