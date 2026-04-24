import re

from fastapi import HTTPException

SRI_LANKAN_MOBILE_PATTERN = re.compile(r"^(70|71|72|74|75|76|77|78)[0-9]{7}$")


def normalize_profile_phone(phone: str | None) -> str | None:
    normalized = (phone or "").strip()

    if not normalized:
        return None

    compact = re.sub(r"\s+", "", normalized)

    if compact.startswith("+94"):
        local_number = compact[3:]
    elif compact.startswith("94"):
        local_number = compact[2:]
    else:
        local_number = compact

    if not SRI_LANKAN_MOBILE_PATTERN.match(local_number):
        raise HTTPException(status_code=400, detail="Invalid Sri Lankan mobile number")

    return f"+94{local_number}"
