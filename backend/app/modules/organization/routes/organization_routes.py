from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from app.database.session import get_db
from app.modules.auth.utils.auth_utils import get_current_user
from app.modules.organization.schemas.organization_schema import OrganizationCreate, OrganizationUpdate, OrganizationTypeRead, LogoUploadResponse
from app.modules.organization.services import organization_service
from app.modules.source.services.source_service import calculate_next_sync_time
from app.core.exceptions.custom_exceptions import FileValidationException
from app.core.security import create_access_token
from app.modules.auth.repositories.roles_repo import get_user_role_names
from app.core.geo_utils import parse_google_maps_url
from app.core.tenant_context import resolve_tenant_scope

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
    location_url = (data.location_url or "").strip()

    # validate name
    if not organization_name or organization_name.strip() == "":
        raise HTTPException(status_code=400, detail="Organization name required")

    if not location_url:
        raise HTTPException(status_code=400, detail="Location URL is required")

    coords = parse_google_maps_url(location_url)
    if not coords:
        raise HTTPException(status_code=400, detail="Invalid Google Maps URL. Could not extract coordinates.")
    lat, lng = coords

    # check if an organization with the same name exists for this tenant
    existing_org = db.execute(
        text("""
            SELECT organization_id
            FROM dbo.organization
            WHERE tenant_id = :tenant_id AND organization_name = :name
        """),
        {"tenant_id": tenant_id, "name": organization_name}
    ).fetchone()

    if not existing_org:
        organizations_limit_row = db.execute(
            text(
                """
                SELECT TOP 1 pf.feature_limit
                FROM dbo.tenant t
                INNER JOIN dbo.plan_feature pf
                    ON pf.plan_id = TRY_CAST(t.[plan] AS INT)
                INNER JOIN dbo.features f
                    ON f.feature_id = pf.feature_id
                WHERE t.tenant_id = :tenant_id
                  AND f.feature_key = 'organizations'
                  AND pf.is_enabled = 1
                """
            ),
            {"tenant_id": tenant_id},
        ).fetchone()

        if organizations_limit_row and organizations_limit_row[0] is not None:
            organizations_limit = int(organizations_limit_row[0])
            current_organization_count_row = db.execute(
                text(
                    """
                    SELECT COUNT(1)
                    FROM dbo.organization
                    WHERE tenant_id = :tenant_id
                    """
                ),
                {"tenant_id": tenant_id},
            ).fetchone()

            current_organization_count = int(current_organization_count_row[0]) if current_organization_count_row else 0
            if current_organization_count >= organizations_limit:
                raise HTTPException(
                    status_code=403,
                    detail="Organization limit reached for your current plan. Upgrade your plan to add more organizations",
                )

    if existing_org:
        org_id = existing_org[0]
        # Update existing organization (e.g. type_id, location)
        db.execute(
            text("""
                UPDATE dbo.organization
                SET organization_type_id = :type_id,
                    location_url = :location_url,
                    latitude = :lat,
                    longitude = :lng,
                    updated_at = GETDATE()
                WHERE organization_id = :org_id
            """),
            {
                "type_id": type_id,
                "location_url": location_url,
                "lat": lat,
                "lng": lng,
                "org_id": org_id,
            }
        )
        organization_created = False
        message = "Organization updated successfully"
    else:
        # ensure tenant exists
        db.execute(
            text("""
                IF NOT EXISTS (SELECT 1 FROM dbo.tenant WHERE tenant_id = :tenant_id)
                BEGIN
                    INSERT INTO dbo.tenant (tenant_id, [plan], created_at)
                    VALUES (:tenant_id, '1', GETDATE())
                END
            """),
            {"tenant_id": tenant_id}
        )

        # insert new organization
        new_org_id = uuid.uuid4()
        db.execute(
            text("""
                INSERT INTO dbo.organization
                (organization_id, organization_name, tenant_id, organization_type_id, location_url, latitude, longitude, created_at, updated_at)
                VALUES (:org_id, :name, :tenant_id, :type_id, :location_url, :lat, :lng, GETDATE(), GETDATE())
            """),
            {
                "org_id": new_org_id,
                "name": organization_name,
                "tenant_id": tenant_id,
                "type_id": type_id,
                "location_url": location_url,
                "lat": lat,
                "lng": lng,
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

    # Generate fresh token with the new/updated organization_id
    roles = get_user_role_names(db, user.user_id)
    access_token = create_access_token(
        user_id=str(user.user_id),
        role=roles[0] if roles else "TENANT",
        organization_id=str(org_id)
    )

    return {
        "message": message,
        "organization_id": str(org_id),
        "organization_created": organization_created,
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.patch("/organizations/{org_id}")
@router.post("/organizations/{org_id}", include_in_schema=False)  # legacy alias kept for backward compatibility
def update_organization(
    org_id: str,
    data: OrganizationUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    # Verify ownership using resolve_tenant_scope
    resolve_tenant_scope(user, db, org_id)

    def normalize_optional_text(value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed if trimmed else None

    provided_fields = data.model_fields_set if hasattr(data, "model_fields_set") else set()

    updates = []
    params = {"org_id": org_id}

    if "organization_name" in provided_fields:
        updates.append("organization_name = :name")
        params["name"] = normalize_optional_text(data.organization_name)
    
    if "organization_type_id" in provided_fields:
        updates.append("organization_type_id = :type_id")
        params["type_id"] = data.organization_type_id

    if "website_url" in provided_fields:
        updates.append("website_url = :website_url")
        params["website_url"] = normalize_optional_text(data.website_url)

    if "primary_email" in provided_fields:
        updates.append("primary_email = :primary_email")
        params["primary_email"] = normalize_optional_text(data.primary_email)

    if "phone_number" in provided_fields:
        updates.append("phone_number = :phone_number")
        params["phone_number"] = normalize_optional_text(data.phone_number)

    if "logo_url" in provided_fields:
        updates.append("logo_url = :logo_url")
        params["logo_url"] = normalize_optional_text(data.logo_url)

    if "location_url" in provided_fields:
        loc_url = normalize_optional_text(data.location_url)
        if loc_url:
            coords = parse_google_maps_url(loc_url)
            if not coords:
                raise HTTPException(status_code=400, detail="Invalid Google Maps URL")
            lat, lng = coords
            updates.append("location_url = :location_url")
            updates.append("latitude = :lat")
            updates.append("longitude = :lng")
            params["location_url"] = loc_url
            params["lat"] = lat
            params["lng"] = lng

    if not updates:
        return {"message": "No updates provided", "organization_id": org_id}

    query = f"UPDATE dbo.organization SET {', '.join(updates)}, updated_at = GETDATE() WHERE organization_id = :org_id"
    
    db.execute(text(query), params)
    db.commit()

    return {
        "message": "Organization updated successfully",
        "organization_id": org_id
    }

@router.post("/organizations/{org_id}/upload-logo", response_model=LogoUploadResponse)
async def upload_organization_logo(
    org_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    # Verify ownership using resolve_tenant_scope
    resolve_tenant_scope(user, db, org_id)

    try:
        return await organization_service.upload_organization_logo(db, org_id, file)
    except FileValidationException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.delete("/organizations/{org_id}")
def delete_organization(
    org_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    # check ownership using resolve_tenant_scope
    resolve_tenant_scope(user, db, org_id)

    # delete rules & regulations if any
    db.execute(
        text("DELETE FROM dbo.organization_rule WHERE organization_id = :org_id"),
        {"org_id": org_id}
    )

    # delete sources mapping if any
    db.execute(
        text("DELETE FROM dbo.source WHERE organization_id = :org_id"),
        {"org_id": org_id}
    )

    # delete org
    db.execute(
        text("DELETE FROM dbo.organization WHERE organization_id = :org_id"),
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
        # Check ownership using resolve_tenant_scope
        resolve_tenant_scope(user, db, org_id)

        # Actually delete the organization (since setup organizations are often temporary)
        db.execute(
            text(
                "DELETE FROM dbo.organization WHERE organization_id = :org_id"
            ),
            {"org_id": org_id}
        )

        db.commit()

        return {
            "message": "Setup organization discarded",
            "organization_id": org_id,
            "discarded": True,
        }
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to discard setup organization")

@router.get("/organization-types", response_model=List[OrganizationTypeRead])
def get_organization_types(db: Session = Depends(get_db)):
    """Fetch all organization types (e.g., Hotel, Restaurant) from the database."""
    return organization_service.get_organization_types(db)


@router.post("/organizations/{org_id}/upload-rules")
async def upload_organization_rules(
    org_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Upload a rules & regulations file (.txt, .docx, .pdf) for an organization.
    
    The file is parsed, sent to Gemini to extract individual rules,
    stored in the database, and dispatched to the embedding service.
    """
    # Verify ownership using resolve_tenant_scope
    resolve_tenant_scope(user, db, org_id)

    try:
        from app.modules.organization.services.rules_service import process_rules_upload
        result = await process_rules_upload(db, org_id, file)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process rules file: {str(e)}")


@router.get("/organizations/{org_id}/rules")
def get_organization_rules(
    org_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Fetch all rules for an organization."""
    # Verify ownership using resolve_tenant_scope
    resolve_tenant_scope(user, db, org_id)

    from app.modules.organization.services.rules_service import get_organization_rules
    return get_organization_rules(db, org_id)
