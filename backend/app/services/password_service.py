"""
Password hashing and verification.

Consolidates the identical implementations that were in
auth_utils.py and auth/password_utils.py into a single module.
Uses the version from auth_utils.py which has ValueError handling
for bcrypt's 72-byte limit.
"""

from passlib.context import CryptContext  # type: ignore

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
