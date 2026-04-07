import re
import time
import math
from platforms.booking.browser import BookingPlaywrightBrowser
from platforms.booking.extractor import BookingExtractor
from platforms.booking.storage import save_to_json
from core.database import init_db
from platforms.booking.models import save_reviews_to_db
from core.config import setup_logger, config
from core.job_manager import job_manager, JobStatus
from platforms.booking.config import booking_selectors
from core.audit import audit_logger
from core.utils import notify_backend_sync_status
from core.models import Source

logger = setup_logger("booking_logic")

def open_reviews_modal(page):
    try:
        btns = page.locator(booking_selectors.read_all_reviews)
        logger.info("Waiting up to 15s for 'Read all reviews' button visibility...")
        btns.first.wait_for(state="attached", timeout=15000)
        
        logger.info("Sleeping for 5 seconds to ensure React 'onClick' bindings hydrate...")
        time.sleep(5)
        
        modal_opened = False
        for i in range(btns.count()):
            btn = btns.nth(i)
            if btn.is_visible():
                logger.info(f"Targeting visible review button at index {i}.")
                btn.scroll_into_view_if_needed()
                time.sleep(1)
                
                try:
                    btn.click()
                except Exception:
                    btn.click(force=True)
                
                logger.info("Clicked explicitly into Review Modal overlay.")
                time.sleep(4)
                
                try:
                    page.locator(booking_selectors.review_card).first.wait_for(state="visible", timeout=5000)
                    modal_opened = True
                    break
                except Exception:
                    logger.warning("Modal didn't appear! Un-hydrated click? Retrying click...")
                    btn.click(force=True)
                    time.sleep(3)
                    try:
                        page.locator(booking_selectors.review_card).first.wait_for(state="visible", timeout=10000)
                        modal_opened = True
                        break
                    except Exception:
                        pass
        
        if not modal_opened:
            raise Exception("No visible 'Read all reviews' button opened the modal.")
            
    except Exception as e:
        logger.warning(f"Could not open review modal: {e}")
        try:
            page.screenshot(path="booking_modal_error.png")
        except:
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

def scrape_booking(url: str, headless: bool = True, pages: str = "1", job_id: str = None, source_id: str = None):
    config.headless = headless
        
    logger.info(f"Starting API scraper for Booking.com URL: {url} (Headless: {headless}, Pages: {pages}, source_id: {source_id})")

    if job_id:
        job_manager.update_job(job_id, status=JobStatus.RUNNING, progress="Initializing database and browser...")

    # Initialize database tables
    init_db()

    browser_controller = BookingPlaywrightBrowser()
    page = browser_controller.start()
    
    audit_logger.info(
        category=u'SCRAPE',
        action=u'SCRAPE_START',
        target_type=u'SOURCE',
        target_id=str(source_id),
        details={"platform": "booking", "pages": pages, "headless": headless, "job_id": job_id, "url": url}
    )
    
    all_reviews = []
    cumulative_reviews = []
    
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=60000)
        open_reviews_modal(page)
        
        # --- Detect total reviews from the modal header ---
        total_reviews_count = 0
        total_pages_count = 0
        try:
            header_text = page.evaluate("""
                (() => {
                    const els = document.querySelectorAll('h2, h3, [data-testid], .review_list_score_count, .db29ecfbe2');
                    for (const el of els) {
                        const t = el.innerText || '';
                        const m = t.match(/(\\d[\\d,]*)\\s*reviews?/i);
                        if (m) return m[1];
                    }
                    return '';
                })()
            """)
            if header_text:
                total_reviews_count = int(header_text.replace(',', ''))
                total_pages_count = math.ceil(total_reviews_count / 10)  # Booking shows 10 reviews per page
                logger.info(f"Detected {total_reviews_count} total reviews across ~{total_pages_count} pages.")
        except Exception as e:
            logger.warning(f"Could not detect total review count: {e}")
        
        extractor = BookingExtractor(page)
        
        start_page, end_page = parse_pages(str(pages))
        current_page = 1
        seen_ids = set()
        
        # Skip to the starting page if required
        while current_page < start_page:
            logger.info(f"Skipping page {current_page} to reach start page {start_page}...")
            time.sleep(1)
            next_btn = page.locator(booking_selectors.next_page_button).first
            if next_btn.count() > 0 and not next_btn.is_disabled():
                next_btn.hover()
                time.sleep(1)
                next_btn.click()
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
            time.sleep(1)
            page.locator(booking_selectors.review_card).last.wait_for(state="visible")
            
            # Expand truncated text buttons ("Read more", "Continue reading") before extraction
            try:
                page.evaluate("""
                    document.querySelectorAll('[data-testid="review-card"] button').forEach(b => {
                        const t = b.innerText.toLowerCase();
                        if (t.includes('read') || t.includes('more') || t.includes('continue')) {
                            b.click();
                        }
                    });
                """)
                time.sleep(1)
            except Exception as e:
                logger.warning(f"Could not auto-expand some review blocks: {e}")
            
            # Extract
            page_reviews = extractor.extract_reviews()
            if not page_reviews:
                logger.info("No more reviews found on this page. Stopping.")
                break
                
            # Loop Prevention Mechanism
            new_reviews = [r for r in page_reviews if r.id not in seen_ids]
            
            for r in new_reviews:
                seen_ids.add(r.id)
                
            all_reviews.extend(new_reviews)
            cumulative_reviews.extend(new_reviews)
            logger.info(f"Extracted {len(new_reviews)} unique reviews from page {current_page}.")

            # Batch storage: every 20 reviews
            if len(all_reviews) >= 20:
                batch_count = len(all_reviews) // 20
                to_save = all_reviews[:batch_count * 20]
                all_reviews = all_reviews[batch_count * 20:]
                
                logger.info(f"Batch threshold reached. Saving {len(to_save)} reviews to database.")
                save_reviews_to_db(to_save, source_id)
            
            if current_page < end_page:
                next_btn = page.locator(booking_selectors.next_page_button).first
                if next_btn.count() > 0 and not next_btn.is_disabled():
                    logger.info("Clicking next page array.")
                    next_btn.hover()
                    time.sleep(1)
                    next_btn.click()
                    time.sleep(2)
                    page.locator(booking_selectors.review_card).first.wait_for(state='visible', timeout=10000)
                    current_page += 1
                else:
                    logger.info("Next page button disabled. Reached end of reviews.")
                    break
            else:
                # Reached end page limit
                break
            
        # Final Storage logic
        if all_reviews:
            logger.info(f"Saving final batch of {len(all_reviews)} reviews to database.")
            save_reviews_to_db(all_reviews, source_id)
            
        if cumulative_reviews:
            logger.info(f"Total reviews extracted: {len(cumulative_reviews)}. Saving full backup to JSON.")
            save_to_json(cumulative_reviews, str(source_id))
            
            # Identify new reviews vs existing ones
            from core.database import get_session
            from core.utils import identify_new_reviews
            from core.deduplication.booking_deduplicator import clean_booking_duplicates
            
            # Notify backend that we are verifying duplication
            notify_backend_sync_status(str(source_id), "VERIFY_DUPLICATION")
            
            session = get_session()
            new_count = 0
            try:
                removed_count = clean_booking_duplicates(session, str(source_id))
                logger.info(f"Deduplication phase completed. Removed {removed_count} duplicates.")
                
                new_count, _ = identify_new_reviews(session, source_id, cumulative_reviews)
                logger.info(f"Deduplication results: {new_count} new reviews identified for source {source_id}.")
            except Exception as e:
                logger.warning(f"Could not identify new reviews: {e}")
            finally:
                session.close()

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
                target_type=u'SOURCE',
                target_id=str(source_id),
                details={"reviews_saved": len(cumulative_reviews), "job_id": job_id}
            )

            # Notify backend of completion for the primary source
            notify_backend_sync_status(str(source_id), "COMPLETED", new_review_count=new_count)

            # Replicate to companion sources
            session = get_session()
            try:
                companions = [s[0] for s in session.query(Source.source_id).filter(Source.source_url == url, Source.source_id != source_id).all()]
            except Exception as e:
                logger.error(f"Failed to fetch companions: {e}")
                companions = []
            finally:
                session.close()

            for cid in companions:
                logger.info(f"Replicating {len(cumulative_reviews)} reviews to companion source {cid}")
                try:
                    save_reviews_to_db(cumulative_reviews, str(cid))
                    save_to_json(cumulative_reviews, str(cid))
                    notify_backend_sync_status(str(cid), "VERIFY_DUPLICATION")
                    
                    sub_session = get_session()
                    try:
                        clean_booking_duplicates(sub_session, str(cid))
                        cid_new_count, _ = identify_new_reviews(sub_session, str(cid), cumulative_reviews)
                    finally:
                        sub_session.close()
                        
                    notify_backend_sync_status(str(cid), "COMPLETED", new_review_count=cid_new_count)
                except Exception as e:
                    logger.error(f"Replication failed for companion {cid}: {e}")
                    notify_backend_sync_status(str(cid), "FAILED")

            return {"status": "success", "count": f"Stored {len(cumulative_reviews)} reviews in DB & JSON", "source_id": source_id}
        else:
            logger.warning("No new reviews were extracted.")
            if job_id:
                job_manager.update_job(job_id, status=JobStatus.COMPLETED, progress="Scrape concluded without detecting new reviews.", reviews=0)
            
            # Notify backend even if no new reviews were found
            notify_backend_sync_status(str(source_id), "COMPLETED", new_review_count=0)
            
            return {"status": "warning", "message": "No new reviews found.", "count": 0, "data": []}
            
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
        # Notify backend of failure
        notify_backend_sync_status(str(source_id), "FAILED")
        
        # Notify companions of failure as well
        session = get_session()
        try:
            companions = [s[0] for s in session.query(Source.source_id).filter(Source.source_url == url, Source.source_id != source_id).all()]
            for cid in companions:
                notify_backend_sync_status(str(cid), "FAILED")
        except:
            pass
        finally:
            session.close()
        
        
        return {"status": "error", "message": str(e), "count": 0, "data": []}
    finally:
        browser_controller.stop()
