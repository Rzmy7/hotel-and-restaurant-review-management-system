import re

from fastapi import HTTPException

from app.core.validations.password_validator import validate_password_strength

NAME_PATTERN = re.compile(r"^[A-Za-z][A-Za-z\s'-]*$")


def normalize_signup_email(email: str) -> str:
    normalized = (email or "").strip().lower()
    if not normalized:
        raise HTTPException(status_code=400, detail="Email is required.")
    return normalized


def validate_signup_name(name: str) -> str:
    normalized = (name or "").strip()

    if not normalized:
        raise HTTPException(status_code=400, detail="Full name is required.")
    if len(normalized) < 2:
        raise HTTPException(status_code=400, detail="Full name must be at least 2 characters.")
    if len(normalized) > 100:
        raise HTTPException(status_code=400, detail="Full name must be at most 100 characters.")
    if not NAME_PATTERN.match(normalized):
        raise HTTPException(
            status_code=400,
            detail="Full name can contain letters, spaces, apostrophes, and hyphens only.",
        )

    return normalized


def validate_signup_password(password: str) -> str:
    validate_password_strength(password)
    return password


def validate_signup_payload(name: str, email: str, password: str) -> dict[str, str]:
    normalized_name = validate_signup_name(name)
    normalized_email = normalize_signup_email(email)
    normalized_password = validate_signup_password(password)

    return {
        "name": normalized_name,
        "email": normalized_email,
        "password": normalized_password,
    }
