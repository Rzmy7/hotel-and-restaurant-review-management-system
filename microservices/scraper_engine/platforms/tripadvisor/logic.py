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
from platforms.tripadvisor.models import save_reviews_to_db
from core.database import init_db
from core.config import setup_logger, config
from core.job_manager import job_manager, JobStatus
from core.audit import audit_logger
from services.source_service import SourceService
from core.deduplication.tripadvisor_deduplicator import clean_tripadvisor_duplicates

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
            "button#onetrust-accept-btn-handler",
            'button[aria-label="Accept"]',
            "button.evidon-banner-acceptbutton",
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


def scrape_tripadvisor(
    url: str,
    headless: bool = True,
    pages: str = "1",
    job_id: str = None,
    source_id: str = None,
):
    """
    Main entry point for TripAdvisor scraping.

    Args:
        url: TripAdvisor hotel/place review page URL
        headless: Run browser headless
        pages: "*" for all, "5" for first 5 pages, "2-7" for pages 2 to 7
        job_id: Job tracking ID from job_manager
        source_id: Source ID provided by the main backend
    """
    config.headless = headless
    logger.info(
        f"Starting TripAdvisor scraper: {url} (headless={headless}, pages={pages}, source_id={source_id})"
    )

    if job_id:
        job_manager.update_job(
            job_id,
            status=JobStatus.RUNNING,
            progress="Initializing database and browser...",
        )

    # Broadcast RUNNING status for all sources sharing this URL
    SourceService.broadcast_running(url)

    logger.info("Initializing TripAdvisor browser...")
    browser_ctrl = TripAdvisorBrowser()
    page = browser_ctrl.start()

    logger.info("Initializing TripAdvisor extractor...")
    extractor = TripAdvisorExtractor(page)

    audit_logger.info(
        category="SCRAPE",
        action="SCRAPE_START",
        target_type="SOURCE",
        target_id=str(source_id),
        details={
            "platform": "tripadvisor",
            "pages": pages,
            "headless": headless,
            "job_id": job_id,
            "url": url,
        },
    )

    all_reviews = []
    seen_ids = set()

    try:
        logger.info(f"Navigating to {url}")
        page.goto(url, wait_until="domcontentloaded", timeout=90000)
        human_delay(5, 10)  # Wait for basic content
        jittery_scroll(page)

        dismiss_cookie_banner(page)
        human_delay(1, 2)

        # Ensure we are in the reviews section
        try:
            from platforms.tripadvisor.config import tripadvisor_selectors as ts

            # 1. Try to find and click the 'Reviews' tab/anchor to scroll into view
            reviews_link = page.locator(
                'a[href*="#REVIEWS"], span:has-text("Reviews")'
            ).first
            if reviews_link.is_visible():
                reviews_link.click()
                logger.info("Clicked 'Reviews' link.")
                page.wait_for_timeout(2000)

            # 2. Aggressive search for reviews button (opens modal or expands list)
            all_reviews_selectors = [
                ts.ALL_REVIEWS_BTN,
                'button:has-text("All reviews")',
                'button:has-text("Jump to all reviews")',
                'span:has-text("All reviews")',
            ]

            for sel in all_reviews_selectors:
                btn = page.query_selector(sel)
                if btn and btn.is_visible():
                    try:
                        btn.click()
                        logger.info(f"Clicked reviews expansion button via: {sel}")
                        page.wait_for_timeout(3000)
                        break
                    except Exception:
                        continue
        except Exception as e:
            logger.warning(f"Could not refine reviews view: {e}")

        extractor = TripAdvisorExtractor(page)

        # Total review count & page count
        total_reviews_count = extractor.extract_total_reviews()
        import math

        total_pages_count = (
            math.ceil(total_reviews_count / REVIEWS_PER_PAGE)
            if total_reviews_count
            else 1
        )
        logger.info(
            f"Detected {total_reviews_count} total reviews (~{total_pages_count} pages)."
        )

        if job_id:
            job_manager.update_job(
                job_id,
                status=JobStatus.RUNNING,
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
            logger.info(
                f"Extracting page {page_num} (offset={current_offset}) — {current_page_url}"
            )

            if job_id:
                job_manager.update_job(
                    job_id,
                    status=JobStatus.RUNNING,
                    progress=f"Extracting page {page_num}...",
                    current_page=page_num - 1,
                    total_pages=total_pages_count,
                    reviews=len(all_reviews),
                    total_reviews=total_reviews_count,
                )

            # Aggressive scroll to ensure review section is loaded
            from platforms.tripadvisor.config import tripadvisor_selectors

            for _ in range(5):
                page.mouse.wheel(0, 1000)
                page.wait_for_timeout(1500)
                try:
                    if page.query_selector(tripadvisor_selectors.REVIEW_CARD):
                        break
                except Exception:
                    pass

            try:
                page.wait_for_selector(
                    tripadvisor_selectors.REVIEW_CARD, state="visible", timeout=15000
                )
                human_delay(3, 5)
            except Exception:
                logger.warning(
                    f"Timeout waiting for reviews on page {page_num}. Page content length: {len(page.content())}"
                )

            page_reviews = extractor.extract_all_on_page()

            if not page_reviews and page_num == 1:
                # Capture diagnostic screenshot if page 1 extraction fails
                diag_path = "tripadvisor_extraction_failure.png"
                logger.warning(
                    f"No reviews found on page 1. Capturing screenshot for diagnosis: {diag_path}"
                )
                page.screenshot(path=diag_path)

                # Check for bot challenge
                content = page.content().lower()
                if (
                    "verification required" in content
                    or "access denied" in content
                    or "enable javascript" in content
                ):
                    logger.error("Hit TripAdvisor bot challenge or blocked access!")
                    raise Exception(
                        "Bot challenge detected or access blocked by TripAdvisor."
                    )

            # Dedup by external_review_id
            new_reviews = []
            for r in page_reviews:
                rid = (
                    r.get("external_review_id")
                    or f"{r.get('author')}-{r.get('review_date')}"
                )
                if rid not in seen_ids:
                    seen_ids.add(rid)
                    new_reviews.append(r)

            all_reviews.extend(new_reviews)
            logger.info(
                f"Page {page_num}: {len(new_reviews)} new reviews (total so far: {len(all_reviews)})"
            )

            # Save batch immediately per extraction
            if new_reviews:
                logger.info(
                    f"Saving batch of {len(new_reviews)} reviews to database..."
                )
                verified_count = save_reviews_to_db(new_reviews, source_id)
                logger.info(
                    f"Verified {verified_count}/{len(new_reviews)} TripAdvisor reviews successfully persisted."
                )

            # Pagination check
            if effective_end and current_offset + REVIEWS_PER_PAGE >= effective_end:
                logger.info(f"Reached requested page limit ({max_pages}).")
                break

            # Click Next Page button or build next URL
            next_btn = page.query_selector(tripadvisor_selectors.NEXT_PAGE_BTN)
            if not next_btn:
                logger.info("No 'Next page' button found — scraping complete.")
                break

            current_offset += REVIEWS_PER_PAGE
            page_num += 1

            # TripAdvisor often works better if we navigate to the next offset URL directly
            # rather than clicking 'Next' which might trigger AJAX that's harder to track.
            next_url = build_page_url(url, current_offset)
            logger.info(f"Navigating to next page URL: {next_url}")
            page.goto(next_url, wait_until="networkidle", timeout=90000)
            human_delay(4, 8)
            jittery_scroll(page)

        # Centralized Finalization & Replication
        SourceService.finalize_and_replicate(
            url=url,
            primary_source_id=str(source_id),
            reviews=all_reviews,
            save_db_func=save_reviews_to_db,
            deduplicator_func=clean_tripadvisor_duplicates,
            leftover_reviews=[],
        )

        if job_id:
            job_manager.update_job(
                job_id,
                status=JobStatus.COMPLETED,
                progress="Sync completed for all associated sources.",
                reviews=len(all_reviews),
                current_page=page_num,
                total_pages=page_num,
            )

        return {"status": "success", "count": len(all_reviews), "source_id": source_id}

    except Exception as e:
        logger.error(f"TripAdvisor scraper error: {e}", exc_info=True)
        if job_id:
            job_manager.update_job(
                job_id, status=JobStatus.FAILED, progress=f"Error: {str(e)}"
            )
        audit_logger.error(
            category="SCRAPE",
            action="SCRAPE_FAILED",
            target_type="SOURCE",
            target_id=str(source_id),
            details={"error": str(e), "job_id": job_id, "url": url},
            error=e,
        )
        # Notify primary and all companions of failure
        SourceService.broadcast_failed(url, error_message=str(e))

        return {"status": "error", "message": str(e), "count": 0}
    finally:
        browser_ctrl.stop()
        logger.info(f"TripAdvisor scraper finished for {url}")
