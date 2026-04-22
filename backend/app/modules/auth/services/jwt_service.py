"""Compatibility JWT module.

Use app.core.security for all new imports.
This module re-exports the canonical JWT settings and helpers so legacy
imports continue to work during migration.
"""

from app.core.config import (
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES as ACCESS_TOKEN_EXPIRE_MINUTES,
    JWT_ALGORITHM as ALGORITHM,
    JWT_SECRET_KEY as SECRET_KEY,
)
from app.core.security import create_access_token, decode_access_token

__all__ = [
    "SECRET_KEY",
    "ALGORITHM",
    "ACCESS_TOKEN_EXPIRE_MINUTES",
    "create_access_token",
    "decode_access_token",
]
