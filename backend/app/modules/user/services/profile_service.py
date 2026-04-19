from sqlalchemy.orm import Session
from typing import Any
from fastapi import UploadFile, HTTPException
import os
from uuid import uuid4

from app.core.superbase_client import supabase
from app.modules.user.repositories.users_repo import get_user_profile, update_user_profile, update_user_password
from app.core.validators.file_validator import validate_image
from app.core.exceptions.custom_exceptions import FileValidationException
from app.modules.user.schemas.profile_schema import PasswordChangeRequest
from app.modules.auth.utils.auth_utils import verify_password, hash_password
from app.core.validations.password_validator import validate_password_strength
import random
from datetime import datetime, timedelta
from app.modules.auth.models.auth_models import TwoFactorToken
from app.modules.auth.services.email_service import send_2fa_email
from app.core.validations.otp_validator import validate_otp_format
from app.modules.user.schemas.profile_schema import TwoFactorVerifyRequest
# Get bucket name from .env
BUCKET_NAME = os.getenv("SUPABASE_BUCKET")

def get_profile(db: Session, user_id):

    # Fetch user from DB
    user = get_user_profile(db, user_id)

    # Return formatted response
    return {
        "firstName": user.first_name,
        "lastName": user.last_name,
        "email": user.email,
        "phone": user.phone,
        "jobTitle": user.job_title,
        "bio": user.bio,
        "location": user.location,
        "avatar": user.profile_image_url,
        "joinedDate": str(user.created_at),
    }


def update_profile(db: Session, user_id, data):

    #Update basic profile details
    user = get_user_profile(db, user_id)

    return update_user_profile(
        db,
        user,
        first_name=data.firstName,
        last_name=data.lastName,
        phone=data.phone,
        job_title=data.jobTitle,
        bio=data.bio,
        location=data.location,
    )

# upload profile image
async def upload_profile_image(db: Session, user_id, file: UploadFile):

    #  Validate image (FIXED)
    try:
        file_bytes = await validate_image(file)
    except ValueError as e:
        raise FileValidationException(str(e))

    # Generate unique filename
    file_ext = file.filename.split(".")[-1]
    file_name = f"profile/{uuid4()}.{file_ext}"

    #  Upload to Supabase (FINAL FIXED)
    response = supabase.storage.from_(BUCKET_NAME).upload(
        path=file_name,
        file=file_bytes,
        file_options={
            "content-type": file.content_type,
            "upsert": "true",
        },
    )

    # Handle error
    if hasattr(response, "error") and response.error:
        raise Exception(str(response.error))

    # Get public URL
    public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(file_name)

    # Save URL in DB
    user = get_user_profile(db, user_id)
    update_user_profile(db, user, profile_image_url=public_url)

    db.commit()
    db.refresh(user)

    return {
        "message": "Profile image uploaded successfully",
        "profile_image_url": public_url,
    }


def change_password(db: Session, user_id: str, data: PasswordChangeRequest) -> dict[str, str]:
    # 1. Fetch user to verify current password
    user = get_user_profile(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.password_hash:
        raise HTTPException(status_code=400, detail="Password login is not enabled for this account")

    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    # 2. Check confirm password if provided
    if data.confirm_password is not None and data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="New passwords do not match")

    # 3. Validate new password strength
    validate_password_strength(data.new_password)

    # 4. Hash and save the new password
    new_hashed_password = hash_password(data.new_password)
    update_user_password(db, user, new_hashed_password)

    return {"message": "Password updated successfully"}


def request_2fa(db: Session, user_id: str) -> dict[str, str]:
    user = get_user_profile(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    # Invalidate previous tokens
    db.query(TwoFactorToken).filter(TwoFactorToken.user_id == user.user_id).delete()
    
    token = TwoFactorToken(
        user_id=user.user_id,
        code=code,
        expires_at=expires_at
    )
    db.add(token)
    db.commit()
    
    send_2fa_email(user.email, code)
    
    return {"message": "Verification code sent to your email"}

def enable_2fa(db: Session, user_id: str, data: TwoFactorVerifyRequest) -> dict[str, str]:
    validate_otp_format(data.code)
    
    user = get_user_profile(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    token = db.query(TwoFactorToken).filter(
        TwoFactorToken.user_id == user.user_id,
        TwoFactorToken.code == data.code,
        TwoFactorToken.used_at == None,
        TwoFactorToken.expires_at > datetime.utcnow()
    ).first()
    
    if not token:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")
        
    token.used_at = datetime.utcnow()
    user.is_2fa_enabled = True
    db.commit()
    
    return {"message": "2FA has been successfully enabled"}
    
def disable_2fa(db: Session, user_id: str) -> dict[str, str]:
    user = get_user_profile(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_2fa_enabled = False
    db.commit()
    return {"message": "2FA has been successfully disabled"}
