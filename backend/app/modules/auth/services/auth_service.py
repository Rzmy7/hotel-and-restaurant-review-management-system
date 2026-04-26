"""
Login service — authenticate a user and issue a JWT.
"""

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.user.repositories.users_repo import get_user_by_email
from app.modules.auth.repositories.roles_repo import get_user_primary_role
from app.modules.auth.utils.auth_utils import verify_password
from app.core.security import create_access_token
from app.modules.admin.services.subscription_service import set_user_subscription_plan
from app.core.db_utils import get_connection_string
import pyodbc
from sqlalchemy import text
from app.modules.auth.models.auth_models import TwoFactorToken
from app.modules.auth.services.email_service import send_2fa_email
import random
from datetime import timedelta
from app.core.validations.otp_validator import validate_otp_format


def _assert_password_matches_email(password: str, password_hash: str) -> None:
    # Use a generic message so API responses do not reveal whether an email exists.
    if not verify_password(password, password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )


def login_user(db: Session, email: str, password: str) -> dict:
    """Authenticate a user by email/password and return a JWT token."""
    # The route/validator normalizes email before this lookup.
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

    # This is the account-specific credential check (email + password pair).
    _assert_password_matches_email(password, user.password_hash)

    role = get_user_primary_role(db, user.user_id)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no assigned role",
        )

    user.last_login_at = datetime.utcnow()
    db.commit()

    # ----------------------------------------------------
    # Intercept for 2FA
    # ----------------------------------------------------
    if getattr(user, "is_2fa_enabled", False):
        code = f"{random.randint(100000, 999999)}"
        expires_at = datetime.utcnow() + timedelta(minutes=10)

        db.query(TwoFactorToken).filter(TwoFactorToken.user_id == user.user_id).delete()
        token = TwoFactorToken(user_id=user.user_id, code=code, expires_at=expires_at)
        db.add(token)
        db.commit()

        send_2fa_email(user.email, code)

        return {
            "require_2fa": True,
            "message": "A verification code has been sent to your email.",
            "email": user.email,
        }

    return _generate_login_response(db, user, role)


def _generate_login_response(db: Session, user, role) -> dict:
    # ----------------------------------------------------
    # Initialize "Free" subscription if they are a Tenant
    # ----------------------------------------------------
    if role == "Tenant":
        try:
            with pyodbc.connect(get_connection_string()) as conn:
                cursor = conn.cursor()
                set_user_subscription_plan(cursor, str(user.user_id), "Free")
                conn.commit()
        except Exception as e:
            # Don't block login if subscription init fails, but log it
            print(f"FAILED TO INIT SUBSCRIPTION FOR {user.user_id}: {e}")

    # ----------------------------------------------------
    # Get user's default organization
    # ----------------------------------------------------
    org_query = db.execute(
        text(
            "SELECT TOP 1 organization_id FROM dbo.organization WHERE tenant_id = :tenant_id"
        ),
        {"tenant_id": str(user.user_id)},
    ).fetchone()

    org_id = str(org_query[0]) if org_query else None

    access_token = create_access_token(
        user_id=str(user.user_id), role=role, organization_id=org_id
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": str(user.user_id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": user.full_name,
            "role": role,
        },
    }


def verify_login_2fa(db: Session, email: str, code: str) -> dict:
    """Complete a 2FA login request."""
    validate_otp_format(code)

    user = get_user_by_email(db, email.lower())
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    token = (
        db.query(TwoFactorToken)
        .filter(
            TwoFactorToken.user_id == user.user_id,
            TwoFactorToken.code == code,
            TwoFactorToken.used_at == None,
            TwoFactorToken.expires_at > datetime.utcnow(),
        )
        .first()
    )

    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code",
        )

    token.used_at = datetime.utcnow()
    db.commit()

    role = get_user_primary_role(db, user.user_id)
    return _generate_login_response(db, user, role)
