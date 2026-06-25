import hmac
import logging
from fastapi import Header, HTTPException, status, Request
from core.config import config, setup_logger

logger = setup_logger("core_security")

def verify_scraper_api_key(request: Request, x_internal_api_key: str = Header(None)):
    """
    Dependency to verify service-to-service communication to the Scraper Engine.
    Expected header: X-Internal-API-Key
    Supports multiple valid keys for zero-downtime rotation.
    """
    if not x_internal_api_key:
        logger.warning(f"event=internal_auth_failure service=scraper-engine path={request.url.path} reason=missing_api_key remote_ip={request.client.host if request.client else 'unknown'} message=\"Internal API Key missing in request headers.\"")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Internal API Key"
        )
        
    for valid_key in config.scraper_api_keys:
        # Prevent timing attacks
        if hmac.compare_digest(x_internal_api_key.encode("utf-8"), valid_key.encode("utf-8")):
            return True

    # Auth failed
    key_suffix = f"***{x_internal_api_key[-4:]}" if len(x_internal_api_key) > 4 else "***"
    logger.warning(f"event=internal_auth_failure service=scraper-engine path={request.url.path} reason=invalid_api_key remote_ip={request.client.host if request.client else 'unknown'} key_suffix={key_suffix} message=\"Internal API Key rejected. Key mismatch.\"")
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid Internal API Key"
    )
