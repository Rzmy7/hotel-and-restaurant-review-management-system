import re

from fastapi import HTTPException

from app.core.validations.password_validator import validate_password_strength

NAME_PATTERN = re.compile(r"^[A-Za-z][A-Za-z\s'-]*$")
EMAIL_PATTERN = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")

def is_realistic_domain(domain: str) -> bool:
    """Validate the domain skeleton structure (allows any valid domain/TLD)."""
    if not domain or len(domain) > 255:
        return False

    parts = domain.lower().split('.')
    
    # Must have at least 2 parts (domain + TLD)
    if len(parts) < 2:
        return False
    
    tld = parts[-1]
    
    # TLD must consist of alphabetic characters only and be at least 2 chars
    if not re.match(r"^[a-z]{2,}$", tld, re.IGNORECASE):
        return False
    
    # Each label must be 1-63 chars, start/end with alphanumeric
    for label in parts[:-1]:
        if not label or len(label) > 63:
            return False
        if not re.match(r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$", label, re.IGNORECASE):
            return False
    
    return True


is_valid_domain_skeleton = is_realistic_domain


def normalize_signup_email(email: str) -> str:
    normalized = (email or "").strip().lower()
    if not normalized:
        raise HTTPException(status_code=400, detail="Email is required.")
    
    # Basic pattern check
    if not EMAIL_PATTERN.match(normalized):
        raise HTTPException(status_code=400, detail="Invalid email format.")
    
    local_part, domain = normalized.split('@')
    
    # Local part checks
    if not local_part or len(local_part) > 64:
        raise HTTPException(status_code=400, detail="Invalid email format.")
    if local_part.startswith('.') or local_part.endswith('.'):
        raise HTTPException(status_code=400, detail="Invalid email format.")
    if '..' in local_part:
        raise HTTPException(status_code=400, detail="Invalid email format.")
    
    # Domain checks
    if not domain or not is_realistic_domain(domain):
        raise HTTPException(status_code=400, detail="Invalid email format.")
    
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
