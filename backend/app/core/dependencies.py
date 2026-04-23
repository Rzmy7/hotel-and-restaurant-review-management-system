"""
Shared FastAPI dependencies.

get_db is re-exported from database.py for convenience.
get_current_user extracts the authenticated user from a Bearer JWT.
get_optional_user returns the user if a JWT is present, or None (for dual-use endpoints).
"""

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer
from jose import JWTError
from app.database import get_db  # noqa: F401
from app.core.security import decode_access_token

security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)


def get_current_user(credentials=Depends(security)):
    """Extract and validate the current user from a Bearer token."""
    token = credentials.credentials.strip()

    # Allow accidental "Bearer <token>" paste in auth dialogs.
    if token.lower().startswith("bearer "):
        token = token[7:].strip()

    if token.count(".") != 2:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format. Use access_token from /api/auth/login (JWT), not user_id.",
        )

    try:
        payload = decode_access_token(token)
        return {
            "user_id": payload.get("user_id"),
            "role": payload.get("role"),
            "organization_id": payload.get("organization_id"),
        }
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token. Ensure you use the access_token JWT from /api/auth/login.",
        )


def get_optional_user(credentials=Depends(optional_security)):
    """Return current user dict if a valid JWT is present, otherwise None.

    Use this for endpoints that must work both for authenticated frontend
    users AND unauthenticated internal/scheduler callers.
    """
    if credentials is None:
        return None

    token = credentials.credentials.strip()
    if token.lower().startswith("bearer "):
        token = token[7:].strip()

    if token.count(".") != 2:
        return None

    try:
        payload = decode_access_token(token)
        return {
            "user_id": payload.get("user_id"),
            "role": payload.get("role"),
            "organization_id": payload.get("organization_id"),
        }
    except JWTError:
        return None
