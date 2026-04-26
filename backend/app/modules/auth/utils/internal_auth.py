import os
from fastapi import Header, HTTPException, status

def verify_internal_api_key(x_internal_api_key: str = Header(None)):
    """
    Simple dependency to verify service-to-service communication via a shared secret.
    Expected header: X-Internal-API-Key
    """
    expected_key = os.getenv("INTERNAL_API_KEY", "dev-internal-secret")
    
    if not x_internal_api_key or x_internal_api_key != expected_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing Internal API Key"
        )
    return True
