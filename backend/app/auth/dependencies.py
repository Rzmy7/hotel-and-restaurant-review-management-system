"""
FastAPI dependencies for extracting the current authenticated user.

Moved from auth/auth_dependencies.py.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from jose import JWTError

from app.services.jwt_service import decode_access_token

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
