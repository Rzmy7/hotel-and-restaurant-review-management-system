from sqlalchemy.orm import Session
from fastapi import UploadFile
from uuid import uuid4     # Every upload creates a new file + new URL
import os

from app.core.superbase_client import supabase
from app.modules.user.repositories.users_repo import get_user_profile, update_user_profile

from app.core.validators.file_validator import validate_image
from app.core.exceptions.custom_exceptions import FileValidationException

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
