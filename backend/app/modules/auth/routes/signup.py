"""
Signup route — POST /signup
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password
from app.modules.auth.schemas import SignupModel
from app.modules.auth.repository import get_user_by_email, create_user, assign_role_to_user, get_user_role_names

router = APIRouter()


@router.post("/signup")
def signup(payload: SignupModel, db: Session = Depends(get_db)):
    existing_user = get_user_by_email(db, payload.email.lower())
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already exists in database")

    user = create_user(
        db=db,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        full_name=payload.name,
        is_email_verified=False,
    )

    assigned = assign_role_to_user(db, user.user_id, "TENANT")
    if not assigned:
        raise HTTPException(
            status_code=500,
            detail="User created, but TENANT role not found in roles table",
        )

    roles = get_user_role_names(db, user.user_id)

    return {
        "message": "User registered successfully in database",
        "user": {
            "id": str(user.user_id),
            "name": user.full_name,
            "email": user.email,
            "roles": roles,
        },
    }
