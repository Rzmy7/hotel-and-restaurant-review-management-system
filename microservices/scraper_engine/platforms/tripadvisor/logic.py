"""
TripAdvisor Main Scraping Orchestrator.
==========================================
Handles navigation, pagination (URL-offset pattern: -or10-, -or20-),
review extraction, progress tracking, and DB saving.
"""
import re
import random
import time
from platforms.tripadvisor.browser import TripAdvisorBrowser
from platforms.tripadvisor.extractor import TripAdvisorExtractor
from platforms.tripadvisor.storage import save_to_json
from platforms.tripadvisor.models import save_reviews_to_db
from core.database import init_db
from core.config import setup_logger, config
from core.job_manager import job_manager, JobStatus
from core.audit import audit_logger

logger = setup_logger("tripadvisor_logic")

def human_delay(min_s=2, max_s=5):
    """Wait for a random duration to mimic human behavior."""
    time.sleep(random.uniform(min_s, max_s))

def jittery_scroll(page):
    """Perform a series of small, randomized scrolls."""
    try:
        for _ in range(random.randint(2, 4)):
            # Scroll down by a random amount
            page.mouse.wheel(0, random.randint(300, 600))
            time.sleep(random.uniform(0.5, 1.5))
    except Exception:
        pass

REVIEWS_PER_PAGE = 10  # TripAdvisor shows 10 reviews per page


def build_page_url(base_url: str, offset: int) -> str:
    """Inject -orN- offset into the TripAdvisor URL for pagination."""
    # Remove existing -orN- if present
    clean_url = re.sub(r"-or\d+-", "-", base_url)
    # Insert before the hotel/place name slug (last path segment)
    # Pattern: ...-Reviews-HotelName... → ...-Reviews-or10-HotelName...
    if offset == 0:
        return clean_url
    return re.sub(r"(-Reviews-)", rf"\1or{offset}-", clean_url)


def dismiss_cookie_banner(page):
    """Dismiss consent / cookie banners if present."""
    try:
        selectors = [
            'button#onetrust-accept-btn-handler',
            'button[aria-label="Accept"]',
            'button.evidon-banner-acceptbutton',
            'button:has-text("Accept")',
        ]
        for sel in selectors:
            btn = page.query_selector(sel)
            if btn:
                btn.click()
                page.wait_for_timeout(800)
                logger.info(f"Dismissed consent banner via: {sel}")
                return
    except Exception:
        pass


def parse_pages(pages_str: str) -> tuple[int, int | None]:
    """
    Parse the 'pages' parameter.
    - "*"    → all pages  (returns 0, None)
    - "5"    → pages 1-5  (returns 0, 5)
    - "3-7"  → pages 3-7  (returns 2, 7)
    """
    pages_str = str(pages_str).strip()
    if pages_str == "*":
        return 0, None
    if "-" in pages_str:
        parts = pages_str.split("-")
        return (int(parts[0]) - 1) * REVIEWS_PER_PAGE, int(parts[1])
    # single number → first N pages
    return 0, int(pages_str)


def scrape_tripadvisor(url: str, headless: bool = True, pages: str = "1", job_id: str = None):
    """
    Main entry point for TripAdvisor scraping.

    Args:
        url: TripAdvisor hotel/place review page URL
        headless: Run browser headless
        pages: "*" for all, "5" for first 5 pages, "2-7" for pages 2 to 7
        job_id: Job tracking ID from job_manager
    """
    config.headless = headless
    logger.info(f"Starting TripAdvisor scraper: {url} (headless={headless}, pages={pages})")

    if job_id:
        job_manager.update_job(job_id, status=JobStatus.RUNNING, progress="Initializing...")

    init_db()

    browser_ctrl = TripAdvisorBrowser()
    page = browser_ctrl.start()

    audit_logger.info(
        category="SCRAPE",
        action="SCRAPE_START",
        target_type="ORGANIZATION_SOURCE",
        target_id=url,
        details={"platform": "tripadvisor", "pages": pages, "headless": headless, "job_id": job_id}
    )

    all_reviews = []
    seen_ids = set()
    org_name = "tripadvisor_place"

    try:
        logger.info(f"Navigating to {url}")
        page.goto(url, wait_until="domcontentloaded", timeout=90000)
        human_delay(15, 20) # Extensive wait for heavy TA content
        jittery_scroll(page)

        dismiss_cookie_banner(page)
        human_delay(1, 2)

        # Extract org name from page title
        try:
            title = page.title()
            org_name = title.split(" - ")[0].strip() if title else "tripadvisor_place"
        except Exception:
            pass

        extractor = TripAdvisorExtractor(page)

        # Total review count & page count
        total_reviews_count = extractor.extract_total_reviews()
        import math
        total_pages_count = math.ceil(total_reviews_count / REVIEWS_PER_PAGE) if total_reviews_count else 1
        logger.info(f"Detected {total_reviews_count} total reviews (~{total_pages_count} pages).")

        if job_id:
            job_manager.update_job(
                job_id, status=JobStatus.RUNNING,
                progress=f"Found ~{total_reviews_count} reviews across ~{total_pages_count} pages.",
                total_pages=total_pages_count,
                total_reviews=total_reviews_count,
            )

        # Determine page range
        start_offset, max_pages = parse_pages(str(pages))
        effective_end = (max_pages * REVIEWS_PER_PAGE) if max_pages else None
        current_offset = start_offset
        page_num = (start_offset // REVIEWS_PER_PAGE) + 1

        # Navigate to start page if not page 1
        if current_offset > 0:
            start_url = build_page_url(url, current_offset)
            page.goto(start_url, wait_until="networkidle", timeout=90000)
            human_delay(3, 6)
            jittery_scroll(page)

        while True:
            current_page_url = page.url
            logger.info(f"Extracting page {page_num} (offset={current_offset}) — {current_page_url}")

            if job_id:
                job_manager.update_job(
                    job_id,
                    status=JobStatus.RUNNING,
                    progress=f"Extracting page {page_num}...",
                    current_page=page_num,
                    total_pages=total_pages_count,
                    reviews=len(all_reviews),
                    total_reviews=total_reviews_count,
                )

            # Aggressive scroll to ensure review section is loaded
            from platforms.tripadvisor.config import tripadvisor_selectors
            for _ in range(10):
                page.mouse.wheel(0, 800)
                page.wait_for_timeout(1000)
                try:
                    if page.query_selector(tripadvisor_selectors.REVIEW_CARD):
                        break
                except Exception:
                    pass
            
            try:
                page.wait_for_selector(tripadvisor_selectors.REVIEW_CARD, state="visible", timeout=10000)
                human_delay(1, 2)
            except Exception:
                logger.warning(f"Timeout waiting for reviews on page {page_num}.")

            page_reviews = extractor.extract_all_on_page()
            
            if not page_reviews and page_num == 1:
                # Capture diagnostic screenshot if page 1 extraction fails
                logger.warning(f"No reviews found on page 1. Capturing screenshot for diagnosis.")
                page.screenshot(path=r"C:\Users\keshaka\.gemini\antigravity\brain\e3ecdacf-967a-4231-b073-12f72d4c853a\tripadvisor_extraction_failure.png")
                # Also check for "Verification Required" in content
                content = page.content().lower()
                if "verification required" in content or "access denied" in content:
                    logger.error("Still hitting TripAdvisor bot challenge!")

            # Dedup by external_review_id
            new_reviews = []
            for r in page_reviews:
                rid = r.get("external_review_id") or f"{r.get('author')}-{r.get('review_date')}"
                if rid not in seen_ids:
                    seen_ids.add(rid)
                    new_reviews.append(r)

            all_reviews.extend(new_reviews)
            logger.info(f"Page {page_num}: {len(new_reviews)} new reviews (total so far: {len(all_reviews)})")

            # Save in batches of 50
            if len(all_reviews) > 0 and len(all_reviews) % 50 == 0:
                logger.info(f"Saving batch of {len(all_reviews)} reviews...")
                save_reviews_to_db(all_reviews[-50:], org_name, url)

            # Pagination check
            if effective_end and current_offset + REVIEWS_PER_PAGE >= effective_end:
                logger.info(f"Reached requested page limit ({max_pages}).")
                break

            # Click Next Page button or build next URL
            next_btn = page.query_selector('a[aria-label="Next page"]')
            if not next_btn:
                logger.info("No 'Next page' button found — scraping complete.")
                break

            current_offset += REVIEWS_PER_PAGE
            page_num += 1
            next_url = build_page_url(url, current_offset)
            page.goto(next_url, wait_until="networkidle", timeout=90000)
            human_delay(3, 7)
            jittery_scroll(page)

        # Final save
        if all_reviews:
            logger.info(f"Saving {len(all_reviews)} total reviews to database.")
            save_reviews_to_db(all_reviews, org_name, url)
            save_to_json(all_reviews, org_name.replace(" ", "_").lower())

            if job_id:
                job_manager.update_job(
                    job_id,
                    status=JobStatus.COMPLETED,
                    progress=f"Done! {len(all_reviews)} reviews saved.",
                    reviews=len(all_reviews),
                    current_page=page_num,
                    total_pages=page_num,
                )

            audit_logger.info(
                category="SCRAPE",
                action="SCRAPE_COMPLETE",
                target_type="ORGANIZATION_SOURCE",
                target_id=url,
                details={"reviews_saved": len(all_reviews), "job_id": job_id}
            )
            return {"status": "success", "count": len(all_reviews), "hotel": org_name}
        else:
            logger.warning("No reviews found.")
            if job_id:
                job_manager.update_job(job_id, status=JobStatus.COMPLETED, progress="No reviews found.", reviews=0)
            return {"status": "warning", "message": "No reviews found.", "count": 0}

    except Exception as e:
        logger.error(f"TripAdvisor scraper error: {e}", exc_info=True)
        if job_id:
            job_manager.update_job(job_id, status=JobStatus.FAILED, progress=f"Error: {str(e)}")
        audit_logger.error(
            category="SCRAPE",
            action="SCRAPE_FAILED",
            target_type="ORGANIZATION_SOURCE",
            target_id=url,
            details={"error": str(e), "job_id": job_id},
            error=e
        )
        return {"status": "error", "message": str(e), "count": 0}
    finally:
        browser_ctrl.stop()
        logger.info(f"TripAdvisor scraper finished for {url}")
