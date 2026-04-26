import re
from fastapi import HTTPException


def validate_password_strength(password: str) -> None:
    """
    Validates that a password meets minimum strength requirements:
    - At least 8 characters
    - Includes at least one uppercase letter
    - Includes at least one number
    - Includes at least one special character/symbol
    """
    if len(password) < 8:
        raise HTTPException(
            status_code=400, detail="Password must be at least 8 characters long."
        )

    if not re.search(r"[A-Z]", password):
        raise HTTPException(
            status_code=400,
            detail="Password must include at least one uppercase letter.",
        )

    if not re.search(r"\d", password):
        raise HTTPException(
            status_code=400, detail="Password must include at least one number."
        )

    if not re.search(r"[!@#$%^&*(),.?\":{}|<>\-_]", password):
        raise HTTPException(
            status_code=400, detail="Password must include at least one symbol."
        )
