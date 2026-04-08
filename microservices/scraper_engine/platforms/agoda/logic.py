import time
import math
from platforms.agoda.browser import PlaywrightBrowser
from platforms.agoda.extractor import AgodaExtractor
from core.database import init_db
from platforms.agoda.models import save_reviews_to_db
from core.config import setup_logger, config
from core.job_manager import job_manager, JobStatus
from core.audit import audit_logger
from services.source_service import SourceService
from core.database import get_session
from core.models import Review
from core.deduplication.agoda_deduplicator import clean_agoda_duplicates

logger = setup_logger("agoda_logic")

def dismiss_popups(page):
    try:
        logger.info("Sending Escape sequence and ambient click to softly clear passive overlays.")
        page.keyboard.press("Escape")
        time.sleep(1)
        
        # Click a safe ambient top-left pixel to dismiss modals without triggering navigation
        page.mouse.click(1, 1)
        time.sleep(1)
            
        footers = page.locator("button:has-text('Dismiss')")
        if footers.count() > 0:
            footers.first.click(timeout=3000, force=True)
    except Exception:
        pass

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

def force_hydrate_review_section(page):
    """Aggressively scroll to force the inline #reviewSection to load."""
    logger.info("Scrolling down to force #reviewSection hydration...")
    try:
        page.evaluate("window.scrollTo(0, document.body.scrollHeight/2)")
        time.sleep(2)
        root = page.locator('#reviewSection')
        if root.count() > 0:
            logger.info("Aligning #reviewSection to view.")
            root.first.evaluate("element => element.scrollIntoView({behavior: 'smooth', block: 'start'})")
            time.sleep(3)
    except Exception as e:
        logger.warning(f"Could not strictly scroll to #reviewSection: {e}")


def scrape_agoda(url: str, headless: bool = True, pages: str = "1", job_id: str = None, source_id: str = None):
    config.headless = headless
        
    logger.info(f"Starting API scraper for URL: {url} (Headless: {headless}, Pages: {pages}, source_id: {source_id})")

    if job_id:
        job_manager.update_job(job_id, status=JobStatus.RUNNING, progress="Initializing database and browser...")

    # Broadcast RUNNING status for all sources sharing this URL
    SourceService.broadcast_running(url)

    init_db()

    browser_controller = PlaywrightBrowser()
    page = browser_controller.start()
    
    audit_logger.info(
        category=u'SCRAPE',
        action=u'SCRAPE_START',
        target_type=u'SOURCE',
        target_id=str(source_id),
        details={"platform": "agoda", "pages": pages, "headless": headless, "job_id": job_id, "url": url}
    )
    
    all_reviews = []
    cumulative_reviews = []
    
    try:
        page.goto(url)
        page.wait_for_load_state("networkidle", timeout=config.timeout_ms)
        
        dismiss_popups(page)
        
        # Hydrate explicit inline section natively (zero modals)
        force_hydrate_review_section(page)
        
        extractor = AgodaExtractor(page)
        
        # --- Detect total review and page counts ---
        total_reviews_count = 0
        total_pages_count = 0
        
        # 1. Detect total actual pages natively via pagination lists (User Discovery)
        try:
            pages_val = page.evaluate("""
                (() => {
                    const paginator = document.querySelector('ul[aria-label="Reviews pagination"]');
                    if (paginator) {
                        const items = paginator.querySelectorAll('li');
                        if (items.length >= 3) {
                            // First is Previous, Last is Next, so -2 is the highest visible number
                            const lastNum = items[items.length - 2].innerText.trim();
                            return parseInt(lastNum);
                        }
                    }
                    return null;
                })()
            """)
            if pages_val and not math.isnan(pages_val):
                total_pages_count = int(pages_val)
                logger.info(f"Dynamically detected {total_pages_count} maximum pages from internal ul tag.")
        except Exception as e:
            logger.warning(f"Failed to infer page count from exact UI markers: {e}")

        # 2. Detect global count for dashboard metrics
        try:
            count_text = page.evaluate("""
                (() => {
                    const block = document.getElementById('reviewSection');
                    if (!block) return '';
                    const els = block.querySelectorAll('[data-selenium="reviews-language-filter"], h3, .Review-comment-count, .ficon');
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
                if total_pages_count == 0:
                    total_pages_count = math.ceil(total_reviews_count / 20)
                logger.info(f"Detected {total_reviews_count} reviews total.")
        except Exception as e:
            logger.warning(f"Could not detect total review count matching regex: {e}")
        
        start_page, end_page = parse_pages(str(pages))
        current_page = 1
        
        # Populate seen_ids with historically stored DB reviews to instantly intercept duplicates 
        seen_ids = set()
        if source_id:
            try:
                from core.database import get_session
                from core.models import Review
                db_sess = get_session()
                rows = db_sess.query(Review.platform_review_id).filter(Review.source_id == str(source_id)).all()
                for row_data in rows:
                    if row_data[0]:
                        seen_ids.add(row_data[0])
                db_sess.close()
                logger.info(f"Pre-loaded {len(seen_ids)} existing review IDs into memory cache for deduplication.")
            except Exception as e:
                logger.warning(f"Could not load historical review IDs: {e}")
        
        effective_total_pages = total_pages_count
        
        # Cap end_page using detected total pages so we never loop forever
        if total_pages_count > 0 and end_page == float('inf'):
            end_page = total_pages_count
            logger.info(f"Capped end_page to {end_page} based on detected pagination.")
        elif end_page != float('inf') and total_pages_count > 0:
            effective_total_pages = min(int(end_page) - start_page + 1, total_pages_count)
        elif end_page != float('inf'):
            effective_total_pages = int(end_page) - start_page + 1

        consecutive_skips = 0  # Track pages with all-duplicate reviews to detect stuck pagination
        last_review_ids = set()  # Track the exact review IDs from the previous page

        # Execution loop matching native Page tabs
        while current_page <= end_page:
            
            # --- Skip to correct pagination tab if jumping ahead ---
            if current_page < start_page:
                logger.info(f"Skipping page {current_page} to reach start page {start_page}...")
                current_page += 1
                
                # Hit Next arrow to traverse forward
                next_btn = page.locator('#reviewSection [data-element-name="review-paginator-next"], #reviewSection [aria-label="Next reviews page"]').first
                if next_btn.count() > 0:
                    next_btn.evaluate("element => { element.scrollIntoView({block: 'center'}); setTimeout(() => element.click(), 500); }")
                    time.sleep(3)
                else:
                    logger.warning(f"Could not reach pagination tab {current_page}.")
                    break
                continue
                
            
            # --- Active Traversal ---
            logger.info(f"--- Scraping Page {current_page} ---")
            if job_id:
                pages_done = current_page - start_page
                job_manager.update_job(
                    job_id,
                    progress=f"Extracting inline reviews from page tab {current_page}...",
                    reviews=len(cumulative_reviews),
                    current_page=pages_done,
                    total_pages=effective_total_pages,
                    total_reviews=total_reviews_count
                )
            
            time.sleep(2)
            page_reviews = extractor.extract_reviews()
            
            if not page_reviews:
                logger.info("No reviews extracted on this sequence check.")
                time.sleep(3)
                page_reviews = extractor.extract_reviews()
                if not page_reviews:
                    logger.warning("Empty DOM. Breaking sequence.")
                    break
                    
            new_reviews = [r for r in page_reviews if r.id not in seen_ids]
            current_page_ids = {r.id for r in page_reviews}
            
            if not new_reviews:
                # Check if pagination is stuck (same reviews as previous page)
                if current_page_ids == last_review_ids:
                    consecutive_skips += 1
                else:
                    consecutive_skips = 0
                    
                if consecutive_skips >= 2:
                    logger.info(f"Pagination stuck: same reviews appearing for {consecutive_skips + 1} consecutive pages. Reached true end of reviews.")
                    break
                    
                logger.info(f"All {len(page_reviews)} reviews on page {current_page} are already in the database. Skipping to next page...")
                last_review_ids = current_page_ids
            else:
                for r in new_reviews:
                    seen_ids.add(r.id)
                    
                all_reviews.extend(new_reviews)
                cumulative_reviews.extend(new_reviews)
                logger.info(f"Extracted {len(new_reviews)} unique reviews from page tab {current_page}.")

                if len(all_reviews) >= 20:
                    batch_count = len(all_reviews) // 20
                    to_save = all_reviews[:batch_count * 20]
                    all_reviews = all_reviews[batch_count * 20:]
                    logger.info(f"Batch threshold reached. Saving {len(to_save)} reviews to database.")
                    save_reviews_to_db(to_save, source_id)
            
            if current_page < end_page:
                target_page = current_page + 1
                logger.info(f"Routing to page {target_page} using Next arrow...")
                
                next_btn = page.locator('#reviewSection [data-element-name="review-paginator-next"], #reviewSection [aria-label="Next reviews page"]').first
                
                if next_btn.count() > 0:
                    logger.info(f"Force clicking Page {target_page} button for extraction iteration.")
                    next_btn.evaluate("element => { element.scrollIntoView({block: 'center'}); setTimeout(() => element.click(), 500); }")
                    
                    logger.info("Waiting for Javascript API to fetch and render reviews inline natively...")
                    time.sleep(5)
                    
                    # Verify actual page by reading active pagination tab
                    try:
                        actual_page = page.evaluate("""
                            (() => {
                                const active = document.querySelector('#reviewSection [data-element-name="review-paginator-step"][aria-current="true"], #reviewSection [data-element-name="review-paginator-step"].active');
                                if (active) return parseInt(active.getAttribute('data-element-page-number'));
                                return null;
                            })()
                        """)
                        if actual_page and actual_page == current_page:
                            logger.info(f"Page verification: pagination did NOT advance (still on page {actual_page}). Reached true end of reviews.")
                            break
                        elif actual_page:
                            logger.info(f"Page verification: confirmed on page {actual_page}.")
                            current_page = actual_page
                        else:
                            current_page += 1
                    except Exception:
                        current_page += 1
                else:
                    logger.info(f"Page tab {target_page} not found natively. We might have exhausted review pages.")
                    break
            else:
                break
            
        # Centralized Finalization & Replication
        SourceService.finalize_and_replicate(
            url=url,
            primary_source_id=str(source_id),
            reviews=cumulative_reviews,
            save_db_func=save_reviews_to_db,
            deduplicator_func=clean_agoda_duplicates
        )

        if job_id:
            job_manager.update_job(
                job_id, status=JobStatus.COMPLETED,
                progress="Sync completed for all associated sources.",
                reviews=len(cumulative_reviews),
                current_page=effective_total_pages,
                total_pages=effective_total_pages
            )

        return {"status": "success", "count": f"Processed {len(cumulative_reviews)} reviews", "source_id": source_id}
            
    except Exception as e:
        logger.error(f"Error during scraping: {e}", exc_info=True)
        if job_id:
            job_manager.update_job(job_id, status=JobStatus.FAILED, progress=f"Fatal Exception: {str(e)}")
            
        audit_logger.error(
            category=u'SCRAPE',
            action=u'SCRAPE_FAILED',
            target_type=u'SOURCE',
            target_id=str(source_id),
            details={"error": str(e), "job_id": job_id, "url": url},
            error=e
        )
        # Notify primary and all companions of failure
        SourceService.broadcast_failed(url, error_message=str(e))
        
        return {"status": "error", "message": str(e), "count": 0, "data": []}
    finally:
        browser_controller.stop()
