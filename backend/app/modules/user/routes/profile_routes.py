from fastapi import APIRouter, Depends , UploadFile, File
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.modules.user.schemas.profile_schema import ProfileUpdate, PasswordChangeRequest
from app.modules.user.services.profile_service import (
    get_profile,
    update_profile,
    upload_profile_image,
    change_password,
)
from app.modules.auth.utils.auth_utils import get_current_user
from app.modules.auth.models import User

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

@router.post("/me/password")
def change_my_password(
    data: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Change user password
    """
    return change_password(db, current_user.user_id, data)
