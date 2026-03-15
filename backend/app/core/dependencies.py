"""
Shared FastAPI dependencies.

get_db is re-exported from database.py for convenience.
get_current_user extracts the authenticated user from a Bearer JWT.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from jose import JWTError

from app.core.database import get_db  # noqa: F401 — re-exported
from app.core.security import decode_access_token

security = HTTPBearer()


def get_current_user(credentials=Depends(security)):
    """Extract and validate the current user from a Bearer token."""
    token = credentials.credentials

    try:
        payload = decode_access_token(token)
        return {
            "user_id": payload.get("user_id"),
            "role": payload.get("role"),
        }
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )
