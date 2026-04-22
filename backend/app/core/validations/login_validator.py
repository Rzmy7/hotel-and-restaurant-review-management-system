import re

from fastapi import HTTPException

from app.core.validations.password_validator import validate_password_strength
from app.core.validations.signup_validator import normalize_signup_email

LOGIN_OTP_PATTERN = re.compile(r"^\d{6}$")


def validate_login_email(email: str) -> str:
    return normalize_signup_email(email)


def validate_login_password(password: str) -> str:
    validate_password_strength(password)
    return password


def validate_login_payload(email: str, password: str) -> dict[str, str]:
    normalized_email = validate_login_email(email)
    normalized_password = validate_login_password(password)

    return {
        "email": normalized_email,
        "password": normalized_password,
    }


def validate_login_otp_code(code: str) -> str:
    normalized = (code or "").strip()

    if not normalized:
        raise HTTPException(status_code=400, detail="Verification code is required.")
    if not LOGIN_OTP_PATTERN.match(normalized):
        raise HTTPException(status_code=400, detail="Verification code must be a 6-digit number.")

    return normalized
