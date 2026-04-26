"""
Security utilities — password hashing and JWT token management.

Merged from services/password_service.py + services/jwt_service.py.
These are shared infrastructure, not domain-specific.
"""

from datetime import datetime, timedelta

from jose import jwt
from passlib.context import CryptContext  # type: ignore

from app.core.config import (
    JWT_SECRET_KEY,
    JWT_ALGORITHM,
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES,
)

# ── Password hashing ───────────────────────────────────────────────

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a stored hash.

    The bcrypt backend raises ValueError for passwords longer than 72 bytes —
    catch that and return False so the API returns 401 instead of 500.
    """
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except ValueError:
        return False


# ── JWT tokens ──────────────────────────────────────────────────────


def create_access_token(
    user_id: str, role: str, organization_id: str | None = None
) -> str:
    """Create a signed JWT access token."""
    payload = {
        "user_id": user_id,
        "role": role,
        "organization_id": organization_id,
        "exp": datetime.utcnow() + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES),
    }

    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and verify a JWT access token."""
    return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
