"""
Security utilities — password hashing and JWT token management.

Merged from services/password_service.py + services/jwt_service.py.
These are shared infrastructure, not domain-specific.
"""

from datetime import datetime, timedelta

from jose import jwt
from passlib.context import CryptContext  # type: ignore

from app.core.config import JWT_SECRET_KEY, JWT_ALGORITHM, JWT_ACCESS_TOKEN_EXPIRE_MINUTES

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

def create_access_token(user_id: str, role: str) -> str:
    """Create a signed JWT access token."""
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and verify a JWT access token."""
    return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])


def create_invite_token(group_id: str, role: str, hotel_name: str, location: str) -> str:
    """Create a signed JWT token for group/hotel invitations."""
    payload = {
        "group_id": str(group_id),
        "role": role,
        "hotel_name": hotel_name,
        "location": location,
        "type": "invite",
        "exp": datetime.utcnow() + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_invite_token(token: str) -> dict:
    """Decode and verify a group invite token."""
    payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    if payload.get("type") != "invite":
        from jose import JWTError
        raise JWTError("Invalid token type")
    return payload
