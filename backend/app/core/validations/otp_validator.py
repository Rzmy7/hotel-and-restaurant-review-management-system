import re
from fastapi import HTTPException

def validate_otp_format(code: str) -> None:
    """
    Validates that the provided code is a 6-digit number.
    """
    if not re.fullmatch(r"^\d{6}$", code):
        raise HTTPException(
            status_code=400,
            detail="Invalid Verification Code. OTP must be exactly 6 digits."
        )
