"""
Profile Service Module
Provides business logic for managing user profiles, avatars, and security settings.
"""

import os
import random
from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Dict
from uuid import UUID, uuid4

from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session

from app.core.exceptions.custom_exceptions import FileValidationException
from app.core.superbase_client import supabase
from app.core.validations.file_validator import validate_image
from app.core.validations.otp_validator import validate_otp_format
from app.core.validations.password_validator import validate_password_strength
from app.core.validations.phone_validator import normalize_profile_phone
from app.modules.auth.models.auth_models import TwoFactorToken
from app.modules.auth.services.email_service import send_2fa_email
from app.core.validations.otp_validator import validate_otp_format
from app.modules.user.schemas.profile_schema import (
    TwoFactorVerifyRequest,
    PasswordChangeRequest,
)
from app.modules.user.repositories.users_repo import (
    get_user_profile,
    update_user_profile,
    update_user_password,
)
from app.core.security import verify_password, hash_password
import pyodbc
from app.core.db_utils import get_connection_string
# Get bucket name from .env
BUCKET_NAME = os.getenv("SUPABASE_BUCKET")


def _is_2fa_feature_enabled() -> bool:
    """Check whether the admin 2FA feature flag is enabled."""
    try:
        from app.modules.admin.services.system_settings_service import (
            ensure_system_settings_table,
            get_setting,
        )
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            ensure_system_settings_table(cursor)
            raw = (get_setting(cursor, "feature_flag_two_factor_auth") or "").strip().lower()
            if raw in {"disabled", "false", "0", "off"}:
                return False
    except Exception:
        pass
    # Default to enabled (flag not yet set = feature available)
    return True

def get_profile(db: Session, user_id):

    # Fetch user from DB
    user = get_user_profile(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found")

    return {
        "firstName": user.first_name,
        "lastName": user.last_name,
        "email": user.email,
        "phone": user.phone,
        "jobTitle": user.job_title,
        "bio": user.bio,
        "location": user.location,
        "avatar": user.profile_image_url,
        "is_2fa_enabled": bool(user.is_2fa_enabled),
        "is_2fa_feature_enabled": _is_2fa_feature_enabled(),
        "joinedDate": str(user.created_at),
    }


def update_profile(db: Session, user_id: UUID | str, data: Any) -> Any:
    """
    Updates basic profile information for a user.
    """
    user = get_user_profile(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    normalized_phone = normalize_profile_phone(data.phone)

    return update_user_profile(
        db,
        user,
        first_name=data.firstName,
        last_name=data.lastName,
        phone=normalized_phone,
        job_title=data.jobTitle,
        bio=data.bio,
        location=data.location,
    )


async def upload_profile_image(
    db: Session, user_id: UUID | str, file: UploadFile
) -> Dict[str, str]:
    """
    Validates and uploads a new profile image to Supabase storage.
    """
    try:
        file_bytes = await validate_image(file)
    except ValueError as e:
        raise FileValidationException(str(e))

    # Generate unique filename for storage
    file_ext = file.filename.split(".")[-1] if file.filename else "png"
    file_name = f"profile/{uuid4()}.{file_ext}"

    # Upload to Supabase storage bucket
    response = supabase.storage.from_(BUCKET_NAME).upload(
        path=file_name,
        file=file_bytes,
        file_options={
            "content-type": file.content_type or "image/png",
            "upsert": "true",
        },
    )

    # Handle storage errors
    if hasattr(response, "error") and response.error:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {response.error}")

    # Obtain the public URL
    public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(file_name)

    # Persist the new URL in the database
    user = get_user_profile(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found after upload")

    update_user_profile(db, user, profile_image_url=public_url)
    db.commit()

    return {
        "message": "Profile image updated successfully",
        "profile_image_url": public_url,
    }


def change_password(
    db: Session, user_id: UUID | str, data: PasswordChangeRequest
) -> Dict[str, str]:
    """
    Handles password changes after verifying the current password.
    """
    user = get_user_profile(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.password_hash:
        raise HTTPException(
            status_code=400, detail="Password login is not enabled for this account"
        )

    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if data.confirm_password is not None and data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="New passwords do not match")

    validate_password_strength(data.new_password)

    new_hashed_password = hash_password(data.new_password)
    update_user_password(db, user, new_hashed_password)

    return {"message": "Password updated successfully"}


def request_2fa(db: Session, user_id: str) -> dict[str, str]:
    if not _is_2fa_feature_enabled():
        raise HTTPException(status_code=403, detail="Two-factor authentication is currently disabled by the administrator")
    user = get_user_profile(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    # Invalidate existing active tokens for this user
    db.query(TwoFactorToken).filter(TwoFactorToken.user_id == user.user_id).delete()

    token = TwoFactorToken(user_id=user.user_id, code=code, expires_at=expires_at)
    db.add(token)
    db.commit()

    send_2fa_email(user.email, code)

    return {"message": "Verification code sent to your email"}

def enable_2fa(db: Session, user_id: str, data: TwoFactorVerifyRequest) -> dict[str, str]:
    if not _is_2fa_feature_enabled():
        raise HTTPException(status_code=403, detail="Two-factor authentication is currently disabled by the administrator")
    validate_otp_format(data.code)

    user = get_user_profile(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    now = datetime.now(timezone.utc)
    token = (
        db.query(TwoFactorToken)
        .filter(
            TwoFactorToken.user_id == user.user_id,
            TwoFactorToken.code == data.code,
            TwoFactorToken.used_at == None,
            TwoFactorToken.expires_at > now,
        )
        .first()
    )

    if not token:
        raise HTTPException(
            status_code=400, detail="Invalid or expired verification code"
        )

    token.used_at = now
    user.is_2fa_enabled = True
    db.commit()

    return {"message": "Two-factor authentication enabled successfully"}


def disable_2fa(db: Session, user_id: UUID | str) -> Dict[str, str]:
    """
    Disables 2FA for the user account and revokes pending tokens.
    """
    user = get_user_profile(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.query(TwoFactorToken).filter(TwoFactorToken.user_id == user.user_id).delete()
    user.is_2fa_enabled = False
    db.commit()

    return {"message": "Two-factor authentication disabled successfully"}
