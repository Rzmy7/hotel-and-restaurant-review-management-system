from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models import User
from app.modules.auth.repositories.roles_repo import get_user_primary_role
from app.modules.auth.utils.password_utils import verify_password
from app.modules.auth.services.jwt_service import create_access_token


def login_user(db: Session, email: str, password: str):

    # ------------------------------------------------
    # Find user by email
    # ------------------------------------------------
    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # ------------------------------------------------
    # Check if account is active
    # ------------------------------------------------
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    # ------------------------------------------------
    # Verify password
    # ------------------------------------------------
    if not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password login not available for this account",
        )

    if not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # ------------------------------------------------
    # Get user's primary role
    # ------------------------------------------------
    role = get_user_primary_role(db, user.user_id)

    if not role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no assigned role",
        )

    # ------------------------------------------------
    # Update last login timestamp
    # ------------------------------------------------
    user.last_login_at = datetime.utcnow()
    db.commit()

    # ------------------------------------------------
    # Create JWT token
    # ------------------------------------------------
    access_token = create_access_token(
        user_id=str(user.user_id),
        role=role
    )

    # ------------------------------------------------
    # Return login response
    # ------------------------------------------------
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": str(user.user_id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": role
        }
    }