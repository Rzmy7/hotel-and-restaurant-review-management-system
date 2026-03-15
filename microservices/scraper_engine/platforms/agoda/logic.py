import time
import math
import re
from platforms.agoda.browser import PlaywrightBrowser
from platforms.agoda.extractor import AgodaExtractor
from platforms.agoda.storage import save_to_json
from core.database import init_db
from platforms.agoda.models import save_reviews_to_db
from core.config import setup_logger, config
from core.job_manager import job_manager, JobStatus
from platforms.agoda.config import agoda_selectors
from core.audit import audit_logger

logger = setup_logger("agoda_logic")

def dismiss_popups(page):
    try:
        # First, press escape to reliably clear transparent overlay date pickers
        logger.info("Sending Escape sequence to clear passive overlays.")
        page.keyboard.press("Escape")
        time.sleep(1)
        
        # Attempt to dismiss date picker if it explicitly shows up
        if page.locator(agoda_selectors.dismiss_datepicker_selector).count() > 0:
            logger.info("Dismissing datepicker popup button.")
            page.locator(agoda_selectors.dismiss_datepicker_selector).first.click(timeout=3000, force=True)
            time.sleep(1)
            
        # Try finding a sticky footer banner dismiss 
        footers = page.locator("button:has-text('Dismiss')")
        if footers.count() > 0:
            footers.first.click(timeout=3000, force=True)
    except Exception:
        pass

def open_reviews(page):
    try:
        # Sometimes reviews are hidden behind a button. Check both selectors.
        btn = page.locator(agoda_selectors.open_reviews_selector).first
        btn_alt = page.locator(agoda_selectors.open_reviews_selector_alt).first
        
        target_btn = None
        if btn.count() > 0 and btn.is_visible():
            target_btn = btn
        elif btn_alt.count() > 0 and btn_alt.is_visible():
            target_btn = btn_alt
            
        if target_btn:
            logger.info("Clicking 'Read all reviews' button.")
            target_btn.evaluate("element => element.scrollIntoView({block: 'center'})")
            time.sleep(1)
            target_btn.click(timeout=3000, force=True)
            time.sleep(2)
    except Exception:
        pass

def select_agoda_reviews(page):
    try:
        # Sometimes there's a tab specifically for "AGODA REVIEWS" vs "BOOKING.COM REVIEWS"
        tabs = page.locator("text=/AGODA REVIEWS/i")
        if tabs.count() > 0:
            logger.info("Found 'AGODA REVIEWS' tab selector. Clicking it securely.")
            tabs.first.evaluate("element => element.scrollIntoView({block: 'center'})")
            time.sleep(1)
            tabs.first.evaluate("el => { let btn = el.closest('button') || el; btn.click(); }")
            time.sleep(2)
        else:
            logger.info("No explicit 'AGODA REVIEWS' tab found, might be the default or a different layout.")
    except Exception as e:
        logger.warning(f"Could not select Agoda reviews tab: {e}")

def parse_pages(pages_str: str):
    if pages_str == "*":
        return 1, float('inf')
    if "-" in pages_str:
        try:
            parts = pages_str.split("-")
            return int(parts[0]), int(parts[1])
        except ValueError:
            return 1, 1
    try:
        return 1, int(pages_str)
    except ValueError:
        return 1, 1

def scrape_agoda(url: str, headless: bool = True, pages: str = "1", job_id: str = None):
    config.headless = headless
        
    logger.info(f"Starting API scraper for URL: {url} (Headless: {headless}, Pages: {pages})")

    if job_id:
        job_manager.update_job(job_id, status=JobStatus.RUNNING, progress="Initializing database and browser...")

    # Initialize database tables
    init_db()

    browser_controller = PlaywrightBrowser()
    page = browser_controller.start()
    
    audit_logger.info(
        category=u'SCRAPE',
        action=u'SCRAPE_START',
        target_type=u'ORGANIZATION_SOURCE',
        target_id=url,
        details={"platform": "agoda", "pages": pages, "headless": headless, "job_id": job_id}
    )
    
    all_reviews = []
    cumulative_reviews = []
    org_name = url.split("/")[-2] if "/" in url else "agoda_hotel"
    
    try:
        page.goto(url)
        page.wait_for_load_state("networkidle", timeout=config.timeout_ms)
        
        dismiss_popups(page)
        open_reviews(page)
        select_agoda_reviews(page)
        
        extractor = AgodaExtractor(page)
        
        # --- Detect total review count from the DOM ---
        total_reviews_count = 0
        total_pages_count = 0
        try:
            count_text = page.evaluate("""
                (() => {
                    const els = document.querySelectorAll('[data-testid], h3, .Review-comment-count, .ficon');
                    for (const el of els) {
                        const t = el.innerText || '';
                        const m = t.match(/(\\d[\\d,]*)\\s*(?:verified|reviews?)/i);
                        if (m) return m[1];
                    }
                    return '';
                })()
            """)
            if count_text:
                total_reviews_count = int(count_text.replace(',', ''))
                total_pages_count = math.ceil(total_reviews_count / 20)  # Agoda shows ~20 reviews per page
                logger.info(f"Detected {total_reviews_count} total reviews across ~{total_pages_count} pages.")
        except Exception as e:
            logger.warning(f"Could not detect total review count: {e}")
        
        start_page, end_page = parse_pages(str(pages))
        current_page = 1
        seen_ids = set()
        
        # Skip to the starting page if required
        while current_page < start_page:
            logger.info(f"Skipping page {current_page} to reach start page {start_page}...")
            time.sleep(2)
            next_btn = page.locator(agoda_selectors.next_page_button_selector).first
            if next_btn.count() > 0 and next_btn.is_enabled():
                logger.info("Evaluating native Javascript click on Next Page to skip.")
                next_btn.evaluate("element => { element.scrollIntoView({block: 'center'}); setTimeout(() => element.click(), 500); }")
                time.sleep(3)
                current_page += 1
            else:
                logger.warning(f"Could not reach start page {start_page}. Pagination ended at {current_page}.")
                break
                
        # Adjust total_pages_count based on requested page range
        effective_total_pages = total_pages_count
        if end_page != float('inf') and total_pages_count > 0:
            effective_total_pages = min(int(end_page) - start_page + 1, total_pages_count)
        elif end_page != float('inf'):
            effective_total_pages = int(end_page) - start_page + 1

        # Scrape target pages
        while current_page <= end_page:
            logger.info(f"--- Scraping Page {current_page} ---")
            if job_id:
                pages_done = current_page - start_page
                job_manager.update_job(
                    job_id,
                    progress=f"Extracting reviews on page {current_page}...",
                    reviews=len(cumulative_reviews),
                    current_page=pages_done,
                    total_pages=effective_total_pages,
                    total_reviews=total_reviews_count
                )
            
            # Wait for reviews to load
            time.sleep(2)
            
            # Extract
            page_reviews = extractor.extract_reviews()
            if not page_reviews:
                logger.info("No more reviews found on this page. Stopping.")
                break
                
            # Loop Prevention Mechanism
            new_reviews = [r for r in page_reviews if r.id not in seen_ids]
            if not new_reviews:
                logger.warning(f"All reviews on page {current_page} were already seen! Retrying extraction in 4 seconds to wait for React un-mount...")
                time.sleep(4)
                page_reviews = extractor.extract_reviews()
                new_reviews = [r for r in page_reviews if r.id not in seen_ids]
                if not new_reviews:
                    logger.warning(f"Still duplicating after wait. The scraper is blocked at page {current_page}. Stopping pagination safely.")
                    break
            
            for r in new_reviews:
                seen_ids.add(r.id)
                
            all_reviews.extend(new_reviews)
            cumulative_reviews.extend(new_reviews)
            logger.info(f"Extracted {len(new_reviews)} unique reviews from page {current_page}.")

            # Batch storage: every 20 reviews
            if len(all_reviews) >= 20:
                # Calculate how many full batches of 20 we have
                batch_count = len(all_reviews) // 20
                to_save = all_reviews[:batch_count * 20]
                all_reviews = all_reviews[batch_count * 20:]
                
                logger.info(f"Batch threshold reached. Saving {len(to_save)} reviews to database.")
                save_reviews_to_db(to_save, org_name, url)
            
            if current_page < end_page:
                # Try to click next
                next_btn = page.locator(agoda_selectors.next_page_button_selector).first
                if next_btn.count() > 0 and next_btn.is_enabled():
                    logger.info("Force clicking Next Page button for extraction iteration.")
                    logger.info("Evaluating native Javascript click on Next Page button.")
                    next_btn.evaluate("element => { element.scrollIntoView({block: 'center'}); setTimeout(() => element.click(), 500); }")
                    
                    logger.info("Waiting for Javascript API to fetch and render reviews...")
                    time.sleep(5) # Increase sleep to allow React state flush
                    current_page += 1
                else:
                    logger.info("Next page button not found or disabled. Reached end of reviews.")
                    break
            else:
                # Reached end page limit
                break
            
        # Final Storage logic
        if all_reviews:
            logger.info(f"Saving final batch of {len(all_reviews)} reviews to database.")
            save_reviews_to_db(all_reviews, org_name, url)
            
        if cumulative_reviews:
            logger.info(f"Total reviews extracted: {len(cumulative_reviews)}. Saving full backup to JSON.")
            save_to_json(cumulative_reviews, org_name)
            
            if job_id:
                job_manager.update_job(
                    job_id, status=JobStatus.COMPLETED,
                    progress="Finished scraping, JSON generated.",
                    reviews=len(cumulative_reviews),
                    current_page=effective_total_pages,
                    total_pages=effective_total_pages
                )

            audit_logger.info(
                category=u'SCRAPE',
                action=u'SCRAPE_COMPLETE',
                target_type=u'ORGANIZATION_SOURCE',
                target_id=url,
                details={"reviews_saved": len(cumulative_reviews), "job_id": job_id}
            )

            return {"status": "success", "count": f"Stored {len(cumulative_reviews)} reviews in DB & JSON", "hotel": org_name}
        else:
            logger.warning("No new reviews were extracted.")
            if job_id:
                job_manager.update_job(job_id, status=JobStatus.COMPLETED, progress="Scrape concluded without detecting new reviews.", reviews=0)
            return {"status": "warning", "message": "No new reviews found.", "count": 0, "data": []}
            
    except Exception as e:
        logger.error(f"Error during scraping: {e}", exc_info=True)
        if job_id:
            job_manager.update_job(job_id, status=JobStatus.FAILED, progress=f"Fatal Exception: {str(e)}")
            
        audit_logger.error(
            category=u'SCRAPE',
            action=u'SCRAPE_FAILED',
            target_type=u'ORGANIZATION_SOURCE',
            target_id=url,
            details={"error": str(e), "job_id": job_id},
            error=e
        )
        return {"status": "error", "message": str(e), "count": 0, "data": []}
    finally:
        browser_controller.stop()
