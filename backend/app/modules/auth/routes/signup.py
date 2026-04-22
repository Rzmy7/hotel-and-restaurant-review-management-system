"""
Signup route — POST /signup
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import hash_password
from app.modules.auth.schemas import SignupModel
from app.modules.auth.repository import get_user_by_email, create_user, get_user_role_names
from app.core.validations.signup_validator import validate_signup_payload

router = APIRouter()


@router.post("/signup")
def signup(payload: SignupModel, db: Session = Depends(get_db)):
    validated = validate_signup_payload(payload.name, payload.email, payload.password)

    existing_user = get_user_by_email(db, validated["email"])
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already exists in database")

    user = create_user(
        db=db,
        email=validated["email"],
        password_hash=hash_password(validated["password"]),
        full_name=validated["name"],
        is_email_verified=False,
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
