"""
Phone Validation Module
Provides utilities for normalizing and validating Sri Lankan mobile numbers.
"""

import re
from typing import Optional
from fastapi import HTTPException

# Sri Lankan mobile prefixes (70, 71, 72, 74, 75, 76, 77, 78)
SRI_LANKAN_MOBILE_PATTERN = re.compile(r"^(70|71|72|74|75|76|77|78)[0-9]{7}$")


def normalize_profile_phone(phone: Optional[str]) -> Optional[str]:
    """
    Normalizes a phone number to E.164 format (+94XXXXXXXXX) for Sri Lanka.
    
    Args:
        phone: The raw phone number string from user input.
        
    Returns:
        The normalized E.164 string or None if input is empty.
        
    Raises:
        HTTPException: If the phone number format is invalid for Sri Lanka.
    """
    normalized = (phone or "").strip()

    if not normalized:
        return None
    
    # Remove all whitespace characters
    compact = re.sub(r"\s+", "", normalized)

    # Extract local part by removing country code if present
    if compact.startswith("+94"):
        local_number = compact[3:]
    elif compact.startswith("94"):
        local_number = compact[2:]
    else:
        local_number = compact

    # Validate against Sri Lankan mobile patterns
    if not SRI_LANKAN_MOBILE_PATTERN.match(local_number):
        raise HTTPException(
            status_code=400, 
            detail="Invalid Sri Lankan mobile number format. Expected 9 digits starting with 7X."
        )

    return f"+94{local_number}"
