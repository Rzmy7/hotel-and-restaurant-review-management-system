"""
Centralized Scrape Endpoint
===========================
POST /api/{platform_name}/scrape — triggers playwright scraper via the thread pool.
Body: { source_id, source_url, headless?, pages? }
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional
import httpx
from urllib.parse import urlparse

from core.database import get_session
from core.models import Source
from core.job_manager import job_manager
from core.scrape_pool import scrape_pool
from services.source_service import SourceService
from core.limiter import limiter
from core.config import config, setup_logger
from core.utils import normalize_url
from core.security import verify_scraper_api_key

# Import scraper modules
from platforms.agoda.scraping.logic import scrape_agoda
from platforms.booking.logic import scrape_booking
from platforms.google.logic import scrape_google
from platforms.tripadvisor.logic import scrape_tripadvisor

logger = setup_logger("scrape_api")
router = APIRouter(tags=["Scrape"])

# Map platform keys to logic functions
PLATFORM_SCRAPE_FUNCTIONS = {
    "agoda": scrape_agoda,
    "booking": scrape_booking,
    "google": scrape_google,
    "tripadvisor": scrape_tripadvisor
}

# ── Request Schema ──
class ScrapeRequest(BaseModel):
    """Payload for triggering a platform scrape job."""
    source_id: str
    source_url: str
    headless: Optional[bool] = True
    pages: Optional[str] = "1"


def validate_source_url(platform: str, url: str) -> tuple[bool, str]:
    """
    ponytail: simple pre-scrape validation to avoid spawning Playwright for wrong/dead URLs
    Checks:
      1. Basic URL parsing
      2. Domain matching expected platform
      3. Quick DNS / HTTP 404 reachability check
    """
    try:
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            return False, f"Invalid URL format: '{url}'"
    except Exception:
        return False, f"Malformed URL: '{url}'"

    # Domain mismatch check
    netloc = parsed.netloc.lower()
    platform_domains = {
        "agoda": ["agoda.com"],
        "booking": ["booking.com"],
        "google": ["google.com", "google.co", "goo.gl", "maps.app.goo.gl"],
        "tripadvisor": ["tripadvisor.com", "tripadvisor.co", "tripadvisor.in"]
    }

    domains = platform_domains.get(platform)
    if domains:
        if not any(d in netloc for d in domains):
            # Broader substring fallback
            if platform not in netloc:
                return False, f"URL domain '{netloc}' does not match expected platform '{platform}'"

    # Quick HEAD/GET reachability check to catch 404 or dead DNS
    try:
        # ponytail: 3s timeout so it never hangs the API
        with httpx.Client(timeout=3.0, follow_redirects=True) as client:
            resp = client.head(url)
            if resp.status_code == 405:
                resp = client.get(url)
            
            if resp.status_code == 404:
                return False, f"URL does not exist (HTTP 404 Not Found): '{url}'"
    except httpx.ConnectError:
        return False, f"Unreachable domain or DNS failure: '{parsed.netloc}'"
    except Exception:
        # Ignore other response errors (e.g. 403 blocks) as the page might still be visible in Playwright
        pass

    return True, ""


@router.post("/{platform_name}/scrape")
@limiter.limit(config.rate_limit_scrape)
def trigger_scrape(
    platform_name: str,
    request: Request,
    body: ScrapeRequest,
    internal: bool = Depends(verify_scraper_api_key)
):
    """
    Upserts the source in the database and submits a scrape job for the specified
    platform (agoda, booking, google, tripadvisor) to the thread pool.
    """
    platform = platform_name.lower()
    if platform not in PLATFORM_SCRAPE_FUNCTIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported platform: '{platform_name}'. Supported platforms: {list(PLATFORM_SCRAPE_FUNCTIONS.keys())}"
        )

    # Pre-scrape URL verification
    is_valid, error_msg = validate_source_url(platform, body.source_url)
    if not is_valid:
        # Immediately notify backend of failure so it propagates to UI
        SourceService.notify_single(body.source_id, "FAILED", error_message=error_msg)
        raise HTTPException(status_code=400, detail=error_msg)

    if scrape_pool.total_pending >= config.max_queue_size:
        raise HTTPException(
            status_code=429, 
            detail=f"Scraper queue depth limit reached ({config.max_queue_size}). Please try again later."
        )

    logger.info(f"Scrape request for {platform}: source_id={body.source_id}, url={body.source_url}")
    
    # Normalize URL to base URL
    normalized_url = normalize_url(body.source_url)
    logger.info(f"Normalized URL: {normalized_url}")

    # Upsert the source record
    session = get_session()
    try:
        source = session.query(Source).filter_by(source_id=body.source_id).first()
        if not source:
            source = Source(
                source_id=body.source_id,
                source_url=normalized_url,
                platform_name=platform
            )
            session.add(source)
        else:
            source.source_url = normalized_url
            source.platform_name = platform
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error(f"Source upsert failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Source upsert failed: {str(e)}")
    finally:
        session.close()

    # Submit the scrape job
    try:
        active_job = job_manager.get_active_job_by_url(normalized_url)
        if active_job:
            logger.info(f"Existing job {active_job['id']} found for {normalized_url}. Attaching source {body.source_id}.")
            SourceService.notify_single(body.source_id, "RUNNING")
            return {
                "status": "attached",
                "job_id": active_job["id"],
                "source_id": body.source_id,
                "pool": scrape_pool.get_pool_status(),
                "message": "Attached to existing active scrape job for identical URL (normalized)."
            }

        scrape_func = PLATFORM_SCRAPE_FUNCTIONS[platform]
        job_id = job_manager.create_job(platform=platform, url=normalized_url)
        scrape_pool.submit(
            job_id, scrape_func,
            url=normalized_url, headless=body.headless, pages=body.pages, 
            job_id=job_id, source_id=body.source_id, platform=platform
        )
        pool = scrape_pool.get_pool_status()
        return {
            "status": "submitted",
            "job_id": job_id,
            "source_id": body.source_id,
            "pool": pool,
            "message": f"{platform_name.capitalize()} scrape job submitted to pool (normalized)."
        }
    except Exception as e:
        logger.error(f"Job submission failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
