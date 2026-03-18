from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.profile_schema import ProfileUpdate
from app.services.profile_service import get_profile, update_profile
from app.auth_utils import get_current_user
from app.models import User

router = APIRouter(prefix="/users", tags=["Profile"])


@router.get("/me")
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_profile(db, current_user.user_id)


@router.put("/me")
def update_my_profile(
    data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_profile(db, current_user.user_id, data)