from fastapi import APIRouter, Depends , UploadFile, File
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.profile_schema import ProfileUpdate
from app.services.profile_service import (
    get_profile,
    update_profile,
    upload_profile_image,   
)
from app.auth_utils import get_current_user
from app.models import User

# Create router with base path /users
router = APIRouter(prefix="/users", tags=["Profile"])


@router.get("/me")
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Get logged-in user's profile details
    return get_profile(db, current_user.user_id)


@router.put("/me")
def update_my_profile(
    data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Update user profile
    return update_profile(db, current_user.user_id, data)


@router.post("/me/upload-image")
async def upload_my_profile_image(
    file: UploadFile = File(...),  # file from frontend
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload profile image to Supabase and save URL in DB
    """
    return await upload_profile_image(db, current_user.user_id, file)