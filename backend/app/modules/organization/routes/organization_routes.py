from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from app.database.session import get_db
from app.modules.auth.utils.auth_utils import get_current_user
from app.modules.organization.schemas.organization_schema import OrganizationCreate, OrganizationUpdate, OrganizationTypeRead
from app.modules.organization.services import organization_service
from app.modules.source.services.source_service import calculate_next_sync_time

router = APIRouter(prefix="/api", tags=["organization"])


@router.post("/organizations/{tenant_id}")
def upsert_organization(
    tenant_id: str,
    data: OrganizationCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    # Security Check: Ensure the user is only managing their own tenant
    if str(user.user_id) != tenant_id:
        raise HTTPException(
            status_code=403, 
            detail="Unauthorized: You can only manage your own organization"
        )

    organization_name = data.organization_name
    type_id = data.organization_type_id

    # validate name
    if not organization_name or organization_name.strip() == "":
        raise HTTPException(status_code=400, detail="Organization name required")

    # check if an organization with the same name exists for this tenant
    existing_org = db.execute(
        text("""
            SELECT organization_id
            FROM dbo.organization
            WHERE tenant_id = :tenant_id AND organization_name = :name
        """),
        {"tenant_id": tenant_id, "name": organization_name}
    ).fetchone()

    if existing_org:
        org_id = existing_org[0]
        # Update existing organization (e.g. type_id)
        db.execute(
            text("""
                UPDATE dbo.organization 
                SET organization_type_id = :type_id, 
                    updated_at = GETDATE()
                WHERE organization_id = :org_id
            """),
            {
                "type_id": type_id,
                "org_id": org_id
            }
        )
        organization_created = False
        message = "Organization updated successfully"
    else:
        # insert new organization
        new_org_id = uuid.uuid4()
        db.execute(
            text("""
                INSERT INTO dbo.organization 
                (organization_id, organization_name, tenant_id, organization_type_id, created_at, updated_at)
                VALUES (:org_id, :name, :tenant_id, :type_id, GETDATE(), GETDATE())
            """),
            {
                "org_id": new_org_id,
                "name": organization_name,
                "tenant_id": tenant_id,
                "type_id": type_id
            }
        )
        org_id = new_org_id
        organization_created = True
        message = "Organization created successfully"

    # Handle nested sources if provided
    if data.sources:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        for source in data.sources:
            # Check if source already exists for this org/platform
            existing_source = db.execute(
                text("""
                    SELECT 1 FROM dbo.source 
                    WHERE organization_id = :org_id AND platform_id = :platform_id
                """),
                {"org_id": org_id, "platform_id": source.platform_id}
            ).fetchone()

            if not existing_source:
                new_source_id = uuid.uuid4()
                next_sync = calculate_next_sync_time(now, source.fetching_frequency)
                db.execute(
                    text("""
                        INSERT INTO dbo.source 
                        (source_id, organization_id, platform_id, source_url, source_status, fetching_frequency, next_synced_at, created_at, num_of_syncs, success_sync_count, success_rate)
                        VALUES (:source_id, :org_id, :platform_id, :url, 'active', :freq, :next_sync, GETDATE(), 0, 0, 0.0)
                    """),
                    {
                        "source_id": new_source_id,
                        "org_id": org_id,
                        "platform_id": source.platform_id,
                        "url": source.source_url,
                        "freq": source.fetching_frequency,
                        "next_sync": next_sync
                    }
                )

    db.commit()

    return {
        "message": message,
        "organization_id": str(org_id),
        "organization_created": organization_created,
    }


@router.patch("/organizations/{org_id}")
@router.post("/organizations/{org_id}")  # support both for convenience
def update_organization(
    org_id: str,
    data: OrganizationUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    # Verify ownership: Organization must belong to user's tenant
    org = db.execute(
        text("SELECT organization_id FROM dbo.organization WHERE organization_id = :org_id AND tenant_id = :tenant_id"),
        {"org_id": org_id, "tenant_id": user.user_id}
    ).fetchone()

    if not org:
        raise HTTPException(status_code=404, detail="Organization not found or not owned by you")

    updates = []
    params = {"org_id": org_id, "tenant_id": user.user_id}

    if data.organization_name is not None:
        updates.append("organization_name = :name")
        params["name"] = data.organization_name
    
    if data.organization_type_id is not None:
        updates.append("organization_type_id = :type_id")
        params["type_id"] = data.organization_type_id

    if not updates:
        return {"message": "No updates provided", "organization_id": org_id}

    query = f"UPDATE dbo.organization SET {', '.join(updates)}, updated_at = GETDATE() WHERE organization_id = :org_id AND tenant_id = :tenant_id"
    
    db.execute(text(query), params)
    db.commit()

    return {
        "message": "Organization updated successfully",
        "organization_id": org_id
    }

@router.delete("/organizations/{org_id}")
def delete_organization(
    org_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    # check if organization belongs to the user's tenant
    existing_org = db.execute(
        text("SELECT 1 FROM dbo.organization WHERE user_id = :user_id AND organization_id = :org_id"),
        {"user_id": user.user_id, "org_id": org_id}
    ).fetchone()
    # Wait, the user_id is tenant_id. The column in organization is tenant_id.
    existing_org = db.execute(
        text("SELECT 1 FROM dbo.organization WHERE tenant_id = :tenant_id AND organization_id = :org_id"),
        {"tenant_id": user.user_id, "org_id": org_id}
    ).fetchone()

    if not existing_org:
        raise HTTPException(status_code=403, detail="Not authorized to delete this organization")

    # delete sources mapping if any
    db.execute(
        text("DELETE FROM dbo.source WHERE organization_id = :org_id"),
        {"org_id": org_id}
    )

    # delete org
    db.execute(
        text("DELETE FROM dbo.organization WHERE organization_id = :org_id AND tenant_id = :tenant_id"),
        {"org_id": org_id, "tenant_id": user.user_id}
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
        # Check ownership: Organization must belong to user's tenant
        existing_org = db.execute(
            text(
                "SELECT 1 FROM dbo.organization WHERE tenant_id = :tenant_id AND organization_id = :org_id"
            ),
            {"tenant_id": user.user_id, "org_id": org_id}
        ).fetchone()

        if not existing_org:
            return {
                "message": "Organization already cleared or not yours",
                "organization_id": org_id,
                "discarded": False,
            }

        # Actually delete the organization (since setup organizations are often temporary)
        db.execute(
            text(
                "DELETE FROM dbo.organization WHERE tenant_id = :tenant_id AND organization_id = :org_id"
            ),
            {"tenant_id": user.user_id, "org_id": org_id}
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

@router.get("/organization-types", response_model=List[OrganizationTypeRead])
def get_organization_types(db: Session = Depends(get_db)):
    """Fetch all organization types (e.g., Hotel, Restaurant) from the database."""
    return organization_service.get_organization_types(db)
