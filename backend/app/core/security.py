"""
Security utilities — password hashing and JWT token management.

Merged from services/password_service.py + services/jwt_service.py.
These are shared infrastructure, not domain-specific.
"""

from datetime import datetime, timedelta

from jose import jwt
import bcrypt

from app.core.config import JWT_SECRET_KEY, JWT_ALGORITHM, JWT_ACCESS_TOKEN_EXPIRE_MINUTES

# ── Password hashing ───────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_bytes = bcrypt.hashpw(pwd_bytes, salt)
    return hashed_bytes.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a stored hash.

    The bcrypt backend requires bytes and raises exceptions for bad input —
    catch that and return False so the API returns 401 instead of 500.
    """
    try:
        pwd_bytes = plain_password.encode('utf-8')
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except (ValueError, TypeError):
        return False


# ── JWT tokens ──────────────────────────────────────────────────────

def _resolve_token_expiry_minutes(role: str) -> int:
    """Look up the admin-configured session timeout for *role*.

    Falls back to the static ``JWT_ACCESS_TOKEN_EXPIRE_MINUTES`` config
    constant when the database is unreachable (cold-start, migration, etc.).
    """
    try:
        import pyodbc
        from app.core.db_utils import get_connection_string
        from app.modules.admin.services.system_settings_service import (
            get_session_timeout_minutes,
            ensure_system_settings_table,
        )

        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            ensure_system_settings_table(cursor)
            return get_session_timeout_minutes(cursor, role)
    except Exception:
        return JWT_ACCESS_TOKEN_EXPIRE_MINUTES


def create_access_token(user_id: str, role: str, organization_id: str | None = None) -> str:
    """Create a signed JWT access token.

    The token lifetime is determined by the admin-configured session
    timeout for the given *role* (``Admin`` vs regular user).
    """
    expire_minutes = _resolve_token_expiry_minutes(role)

    payload = {
        "user_id": user_id,
        "role": role,
        "organization_id": organization_id,
        "exp": datetime.utcnow() + timedelta(minutes=expire_minutes),
    }
    
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and verify a JWT access token."""
    return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
