"""
Login service — authenticate a user and issue a JWT.
"""

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

<<<<<<<< HEAD:backend/app/modules/auth/services/login_service.py
from app.core.security import verify_password, create_access_token
from app.modules.auth.repository import get_user_by_email
from app.modules.auth.repository import get_user_primary_role
========
from app.models import User
from app.modules.auth.repositories.roles_repo import get_user_primary_role
from app.modules.auth.utils.password_utils import verify_password
from app.modules.auth.services.jwt_service import create_access_token
>>>>>>>> hansi-UserManagement:backend/app/modules/auth/services/auth_service.py


def login_user(db: Session, email: str, password: str) -> dict:
    """Authenticate a user by email/password and return a JWT token."""
    user = get_user_by_email(db, email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

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

    role = get_user_primary_role(db, user.user_id)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no assigned role",
        )

    user.last_login_at = datetime.utcnow()
    db.commit()

    access_token = create_access_token(
        user_id=str(user.user_id),
        role=role,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": str(user.user_id),
            "email": user.email,
<<<<<<<< HEAD:backend/app/modules/auth/services/login_service.py
            "full_name": user.full_name,
            "role": role,
        },
    }
========
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": role
        }
    }
>>>>>>>> hansi-UserManagement:backend/app/modules/auth/services/auth_service.py
