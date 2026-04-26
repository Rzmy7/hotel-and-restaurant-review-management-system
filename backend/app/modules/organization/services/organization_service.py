from sqlalchemy import text
from app.modules.admin.services.subscription_service import (
    increment_feature_usage,
    check_feature_limit,
    send_limit_reached_notification,
)
from app.core.db_utils import get_connection_string
import pyodbc
from fastapi import UploadFile
from uuid import uuid4
import os
from app.core.superbase_client import supabase
from app.core.validators.file_validator import validate_image
from app.core.exceptions.custom_exceptions import FileValidationException


def create_organization(db, user_id, data):
    try:
        name = data.get("name")

        # ── Check organization limit ──
        try:
            with pyodbc.connect(get_connection_string()) as conn:
                cursor = conn.cursor()
                limit_info = check_feature_limit(cursor, str(user_id), "organizations")
                if not limit_info["allowed"]:
                    send_limit_reached_notification(
                        str(user_id), limit_info["feature_name"]
                    )
                    from fastapi import HTTPException

                    raise HTTPException(
                        status_code=403,
                        detail=f"Organization limit reached for your current plan. "
                        f"You have used {limit_info['used']}/{limit_info['limit']}. "
                        f"Please upgrade your subscription plan to add more organizations.",
                    )
        except ImportError:
            pass  # HTTPException re-raised below
        except Exception as limit_err:
            if hasattr(limit_err, "status_code"):
                raise
            print(f"LIMIT CHECK WARNING (organizations): {limit_err}")

        # 1️⃣ Insert organization
        result = db.execute(
            text("""
            INSERT INTO dbo.organization (organization_name, tenant_id, created_at)
            OUTPUT INSERTED.organization_id
            VALUES (:name, :tenant_id, GETDATE())
        """),
            {"name": name, "tenant_id": str(user_id)},
        )

        organization_id = result.fetchone()[0]

        # 2️⃣ Insert user-organization mapping
        db.execute(
            text("""
            INSERT INTO dbo.user_organizations (user_id, organization_id, role, created_at)
            VALUES (:user_id, :org_id, 'owner', GETDATE())
        """),
            {"user_id": user_id, "org_id": organization_id},
        )

        db.commit()

        # ── Send organization created notification ──
        try:
            from app.services.notification_helpers import notify_organization_created

            notify_organization_created(str(user_id), name)
        except Exception:
            pass  # Best-effort

        # 3️⃣ Increment usage
        try:
            with pyodbc.connect(get_connection_string()) as conn:
                cursor = conn.cursor()
                increment_feature_usage(cursor, str(user_id), "organizations")
                conn.commit()
        except Exception as e:
            print(f"FAILED TO INCREMENT ORG USAGE: {e}")

        return {"organization_id": str(organization_id), "name": name}

    except Exception as e:
        db.rollback()
        print("ERROR:", str(e))
        raise


def get_organization_types(db):
    """Fetch all organization types from the database."""
    result = db.execute(
        text("SELECT type_code, type_name, description FROM dbo.organization_type")
    )
    return [
        {"type_code": row[0], "type_name": row[1], "description": row[2]}
        for row in result.fetchall()
    ]


async def upload_organization_logo(db, org_id: str, file: UploadFile):
    # Validate image
    try:
        file_bytes = await validate_image(file)
    except ValueError as e:
        raise FileValidationException(str(e))

    # Generate unique filename
    file_ext = file.filename.split(".")[-1]
    file_name = f"organization_logos/{uuid4()}.{file_ext}"

    bucket_name = (os.getenv("SUPABASE_BUCKET") or "hotel-logos").strip()
    if not bucket_name:
        raise RuntimeError("Storage bucket is not configured")

    try:
        # Upload to Supabase
        response = supabase.storage.from_(bucket_name).upload(
            path=file_name,
            file=file_bytes,
            file_options={
                "content-type": file.content_type,
                "upsert": "true",
            },
        )

        # Handle storage SDK error payloads
        if hasattr(response, "error") and response.error:
            raise RuntimeError(str(response.error))

        # Get public URL
        public_url = supabase.storage.from_(bucket_name).get_public_url(file_name)
    except Exception as e:
        raise RuntimeError(f"Logo upload failed: {str(e)}") from e

    # Save URL in DB
    db.execute(
        text(
            "UPDATE dbo.organization SET logo_url = :logo_url, updated_at = GETDATE() WHERE organization_id = :org_id"
        ),
        {"logo_url": public_url, "org_id": org_id},
    )
    db.commit()

    return {
        "message": "Logo uploaded successfully",
        "logo_url": public_url,
    }
