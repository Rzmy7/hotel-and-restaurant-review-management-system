import os
import re
import time
import math
from dotenv import load_dotenv
from platforms.google.browser import GooglePlaywrightBrowser
from platforms.google.extractor import GoogleExtractor
from platforms.google.storage import save_to_json
from core.database import init_db
from platforms.google.models import save_reviews_to_db
from core.config import setup_logger, config
from core.job_manager import job_manager, JobStatus
from platforms.google.config import google_selectors
from core.audit import audit_logger
from core.utils import notify_backend_sync_complete

load_dotenv()
logger = setup_logger("google_logic")


def extract_total_reviews(page) -> int:
    """Attempts to extract the total number of reviews from the Google Maps page."""
    try:
        count_text = page.evaluate("""
            (() => {
                const tabs = document.querySelectorAll('button[role="tab"]');
                for (const tab of tabs) {
                    const t = tab.innerText || '';
                    const m = t.match(/Reviews[\\s\\S]*(\\d[\\d,]*)/i) || t.match(/(\\d[\\d,]*)\\s*Reviews?/i);
                    if (m) return m[1];
                }
                // Fallback: look in any element with review count
                const els = document.querySelectorAll('.fontBodySmall, .F7nice');
                for (const el of els) {
                    const t = el.innerText || '';
                    const m = t.match(/(\\d[\\d,]*)\\s*reviews?/i);
                    if (m) return m[1];
                }
                return '';
            })()
        """)
        if count_text:
            return int(count_text.replace(',', ''))
    except Exception as e:
        logger.warning(f"Could not detect total review count: {e}")
    return 0


def is_signed_in(page) -> bool:
    """Checks whether the current Google Maps page is signed in."""
    try:
        sign_in_btn = page.locator("a[aria-label='Sign in'], a:has-text('Sign in')").first
        if sign_in_btn.count() > 0 and sign_in_btn.is_visible():
            return False
    except Exception:
        pass
    return True


def sign_in_google(page) -> bool:
    """
    Signs in to Google using credentials from .env.
    Returns True if sign-in appears successful, False otherwise.
    """
    email = os.getenv("GOOGLE_EMAIL")
    password = os.getenv("GOOGLE_PASSWORD")

    if not email or not password:
        logger.warning("GOOGLE_EMAIL / GOOGLE_PASSWORD not set in .env — cannot auto sign-in.")
        return False

    logger.info("Attempting automatic Google sign-in...")
    current_url = page.url  # Remember where we were

    try:
        page.goto("https://accounts.google.com/signin", wait_until="domcontentloaded")
        time.sleep(3)

        # Enter email
        email_input = page.locator('input[type="email"]')
        email_input.wait_for(state="visible", timeout=10000)
        email_input.fill(email)
        time.sleep(1)
        page.locator("#identifierNext").click()
        time.sleep(4)

        # Enter password
        pw_input = page.locator('input[type="password"]')
        pw_input.wait_for(state="visible", timeout=10000)
        pw_input.fill(password)
        time.sleep(1)
        page.locator("#passwordNext").click()
        time.sleep(6)

        # Check for "Sign in faster" (passkey enrollment) speedbump
        if "passkeyenrollment" in page.url or "speedbump/passkey" in page.url:
            logger.info("Detected 'Sign in faster' speedbump. Clicking 'Not now'...")
            try:
                # Try multiple locators for "Not now"
                not_now_btn = page.locator('button:has-text("Not now"), [aria-label="Not now"]').first
                if not_now_btn.count() > 0:
                    not_now_btn.click()
                    time.sleep(5)
            except Exception as e:
                logger.warning(f"Could not click 'Not now' on speedbump: {e}")

        # Check for other common speedbumps (e.g., recovery email)
        if "recovery" in page.url or "confirm" in page.url:
             try:
                confirm_btn = page.locator('button:has-text("Confirm"), button:has-text("Next")').first
                if confirm_btn.count() > 0:
                    logger.info("Detected recovery/confirm speedbump. Clicking confirm...")
                    confirm_btn.click()
                    time.sleep(5)
             except Exception:
                 pass

        # Check result
        result_url = page.url
        if "challenge" in result_url or "signin" in result_url:
            logger.warning(f"Sign-in may require 2FA or additional verification. URL: {result_url}")
            return False

        logger.info("Google sign-in successful. Navigating back to Maps URL...")
        page.goto(current_url, wait_until="domcontentloaded")
        time.sleep(8)
        return True

    except Exception as e:
        logger.error(f"Auto sign-in failed: {e}")
        try:
            page.goto(current_url, wait_until="domcontentloaded")
            time.sleep(5)
        except Exception:
            pass
        return False


def handle_google_speedbumps(page):
    """Detects and bypasses Google speedbumps like 'Sign in faster' or 'Protect your account'."""
    try:
        # Check if we are stuck on a Google Accounts URL instead of Maps
        if "accounts.google.com" in page.url:
            if "passkeyenrollment" in page.url or "speedbump" in page.url:
                logger.info("Detected 'Sign in faster' speedbump. Clicking 'Not now'...")
                not_now_btn = page.locator('button:has-text("Not now"), [aria-label="Not now"]').first
                if not_now_btn.count() > 0:
                    not_now_btn.click()
                    time.sleep(5)
                    return True
            
            if "recovery" in page.url or "confirm" in page.url:
                logger.info("Detected recovery/confirm speedbump. Clicking 'Confirm'...")
                confirm_btn = page.locator('button:has-text("Confirm"), button:has-text("Next"), button:has-text("Continue")').first
                if confirm_btn.count() > 0:
                    confirm_btn.click()
                    time.sleep(5)
                    return True
    except Exception as e:
        logger.warning(f"Error handling speedbumps: {e}")
    return False


def click_reviews_tab(page):
    """Clicks the 'Reviews' tab on the Google Maps place page. Uses multiple strategies."""
    
    # Strategy 0: Check if speedbumps are blocking us
    handle_google_speedbumps(page)

    # Strategy 1: Playwright locator (text based)
    try:
        # Check for buttons OR links with "Reviews" text
        reviews_tab = page.locator("button, a").filter(has_text=re.compile(r"^Reviews$", re.I)).first
        if reviews_tab.count() == 0:
             reviews_tab = page.locator("button, a").filter(has_text=re.compile(r"Reviews", re.I)).first
        
        if reviews_tab.count() > 0:
            logger.info("Strategy 1: Clicking 'Reviews' tab via Playwright locator.")
            reviews_tab.click()
            time.sleep(4)
            
            # Check if reviews loaded
            card_count = page.locator(google_selectors.review_card).count()
            if card_count > 0:
                logger.info(f"Reviews tab clicked successfully. {card_count} cards found.")
                return
            logger.warning("Strategy 1 clicked but no review cards appeared.")
    except Exception as e:
        logger.warning(f"Strategy 1 failed: {e}")

    # Strategy 2: JavaScript click on matching tab
    try:
        logger.info("Strategy 2: Searching all buttons/links for 'Reviews' text via JS.")
        found = page.evaluate("""
            (() => {
                const els = document.querySelectorAll('button, a, div[role="button"]');
                for (const el of els) {
                    const text = el.innerText || '';
                    if (/^Reviews$/i.test(text.trim()) || (text.includes('Reviews') && text.length < 20)) {
                        el.click();
                        return true;
                    }
                }
                return false;
            })()
        """)
        if found:
            time.sleep(5)
            card_count = page.locator(google_selectors.review_card).count()
            if card_count > 0:
                logger.info(f"Strategy 2 succeeded. {card_count} review cards found.")
                return
        logger.warning("Strategy 2 failed or no cards found.")
    except Exception as e:
        logger.warning(f"Strategy 2 failed: {e}")

    # Strategy 2.5: Click the "123 reviews" link/text (often near rating)
    try:
        logger.info("Strategy 2.5: Clicking review count text (e.g. '152 reviews').")
        review_text_link = page.locator('button[aria-label*="reviews"], span:has-text("reviews")').first
        if review_text_link.count() > 0:
            review_text_link.click()
            time.sleep(4)
            card_count = page.locator(google_selectors.review_card).count()
            if card_count > 0:
                logger.info(f"Strategy 2.5 succeeded via clicking review count text.")
                return
    except Exception:
        pass

    # Strategy 3: click any aria-label containing "review"
    try:
        logger.info("Strategy 3: Trying aria-label based selector via JS.")
        page.evaluate("""
            (() => {
                const btns = document.querySelectorAll('button[aria-label], a[aria-label]');
                for (const b of btns) {
                    const label = b.getAttribute('aria-label') || '';
                    if (label.toLowerCase().includes('review') && !label.toLowerCase().includes('write')) {
                        b.click();
                        return true;
                    }
                }
                return false;
            })()
        """)
        time.sleep(5)
    except Exception as e:
        logger.warning(f"Strategy 3 failed: {e}")

    # Check after Strategy 3
    card_count = page.locator(google_selectors.review_card).count()
    if card_count > 0:
        logger.info(f"Strategy 3 succeeded. {card_count} review cards found.")
        return

    # Strategy 4: Auto sign-in — if not signed in, log in and retry
    if not is_signed_in(page):
        logger.info("Strategy 4: Not signed in. Attempting automatic Google sign-in...")
        if sign_in_google(page):
            logger.info("Sign-in complete. Retrying Reviews tab click strategies...")
            # Recursively call click_reviews_tab ONCE after sign-in
            # (using a simple flag to avoid infinite recursion would be better, but for now we just try direct)
            try:
                page.evaluate("document.querySelectorAll('button').forEach(b => { if(b.innerText.includes('Reviews')) b.click() })")
                time.sleep(5)
                if page.locator(google_selectors.review_card).count() > 0:
                    return
            except Exception: pass
    else:
        logger.info("User IS signed in, but reviews still not loading.")

    # Strategy 5: "Force" Reviews via URL modification if possible
    # Google Maps URL pattern for reviews list usually includes !9m1!1b1
    current_url = page.url
    if "!9m1!1b1" not in current_url and "/maps/place/" in current_url:
        logger.info("Strategy 5: Attempting to force Reviews view via URL suffix.")
        force_url = current_url
        if "?" in force_url:
            force_url = force_url.replace("?", "/data=!9m1!1b1?")
        else:
            force_url += "/data=!9m1!1b1"
        try:
            page.goto(force_url, wait_until="domcontentloaded")
            time.sleep(6)
            if page.locator(google_selectors.review_card).count() > 0:
                logger.info("Strategy 5: Force URL success.")
                return
        except Exception as e:
            logger.warning(f"Strategy 5 failed: {e}")

    # Final wait: give Google Maps extra time to render
    try:
        page.wait_for_selector(google_selectors.review_card, timeout=15000)
        logger.info("Review cards appeared after extended wait.")
    except Exception:
        logger.warning("No review cards found after all strategies including sign-in. Proceeding anyway.")


def dismiss_consent(page):
    """Dismisses Google consent dialog if present."""
    try:
        consent_btn = page.locator("button:has-text('Accept all'), button:has-text('Reject all'), form[action*='consent'] button").first
        if consent_btn.count() > 0 and consent_btn.is_visible():
            logger.info("Dismissing Google consent dialog.")
            consent_btn.click()
            time.sleep(2)
    except Exception:
        pass


def expand_all_reviews(page):
    """Clicks all 'More' buttons to expand truncated review texts and owner replies."""
    try:
        more_buttons = page.locator(google_selectors.expand_review_btn)
        count = more_buttons.count()
        if count > 0:
            logger.info(f"Expanding {count} truncated review texts...")
            for i in range(count):
                try:
                    more_buttons.nth(i).click(timeout=500)
                except Exception:
                    pass
            time.sleep(1)
    except Exception:
        pass


def scroll_reviews(page, target_count: int, max_scrolls: int = 500, job_id: str = None, total_reviews_count: int = 0):
    """
    Scrolls the reviews panel to load more reviews via infinite scroll.
    Uses JS-based scrolling for reliability with Google Maps' DOM.
    """
    # Check if scroll container exists using JS
    container_exists = page.evaluate("""
        document.querySelector('.m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde') !== null
    """)
    
    if not container_exists:
        # Fallback: try to find any scrollable container with m6QErb class
        logger.warning("Primary scroll container not found. Trying fallback selectors...")
        container_exists = page.evaluate("""
            (() => {
                const containers = document.querySelectorAll('.m6QErb');
                for (const c of containers) {
                    if (c.scrollHeight > c.clientHeight) return true;
                }
                return false;
            })()
        """)
        if not container_exists:
            logger.warning("No scrollable reviews container found at all.")
            return page.locator(google_selectors.review_card).count()

    prev_count = 0
    stale_count = 0
    scroll_iteration = 0

    while scroll_iteration < max_scrolls:
        current_count = page.locator(google_selectors.review_card).count()
        
        if scroll_iteration == 0:
            logger.info(f"Initial review card count: {current_count}")
        
        if current_count >= target_count:
            logger.info(f"Reached target of {target_count} reviews ({current_count} loaded).")
            break

        if current_count == prev_count:
            stale_count += 1
            if stale_count >= 8:
                logger.info(f"No new reviews after 8 scroll attempts. Total loaded: {current_count}")
                break
        else:
            stale_count = 0
            
        prev_count = current_count
        scroll_iteration += 1

        # Update job progress
        if job_id and scroll_iteration % 3 == 0:
            job_manager.update_job(
                job_id,
                progress=f"Scrolling to load reviews... ({current_count} loaded)",
                reviews=current_count,
                current_page=current_count,
                total_pages=target_count if target_count < float('inf') else total_reviews_count,
                total_reviews=total_reviews_count
            )

        # Scroll the container using JS
        page.evaluate("""
            (() => {
                const el = document.querySelector('.m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde');
                if (el) {
                    el.scrollTop = el.scrollHeight;
                } else {
                    // Fallback: scroll any m6QErb that is scrollable
                    const containers = document.querySelectorAll('.m6QErb');
                    for (const c of containers) {
                        if (c.scrollHeight > c.clientHeight) {
                            c.scrollTop = c.scrollHeight;
                            break;
                        }
                    }
                }
            })()
        """)
        time.sleep(1.5)

        if scroll_iteration % 10 == 0:
            logger.info(f"Scroll iteration {scroll_iteration}: {current_count} reviews loaded.")

    final_count = page.locator(google_selectors.review_card).count()
    logger.info(f"Scrolling complete. {final_count} review cards in DOM.")
    return final_count


def scrape_google(url: str, headless: bool = True, pages: str = "*", job_id: str = None, source_id: str = None):
    """
    Main orchestrator for Google Maps review scraping.
    Since Google Maps uses infinite scroll (not pages), the 'pages' param
    is interpreted as the target number of reviews to scrape:
    - "*" = all reviews
    - "100" = first 100 reviews
    """
    config.headless = headless
    
    logger.info(f"Starting Google Reviews scraper for URL: {url} (Headless: {headless}, Target: {pages}, source_id: {source_id})")

    if job_id:
        job_manager.update_job(job_id, status=JobStatus.RUNNING, progress="Initializing database and browser...")

    # Initialize database tables
    init_db()

    browser_controller = GooglePlaywrightBrowser()
    page = browser_controller.start(job_id=job_id)

    audit_logger.info(
        category=u'SCRAPE',
        action=u'SCRAPE_START',
        target_type=u'SOURCE',
        target_id=str(source_id),
        details={"platform": "google", "target": pages, "headless": headless, "job_id": job_id, "url": url}
    )

    all_reviews = []
    seen_ids = set()
    
    try:
        # Navigate to the Google Maps URL
        logger.info(f"Navigating to {url}")
        page.goto(url, wait_until="domcontentloaded", timeout=60000)
        
        # Wait for Google Maps to render (the page title changes from "Google Maps" to the place name)
        time.sleep(8)
        logger.info(f"Page loaded, final URL: {page.url}")
        
        # Dismiss consent dialog if present
        dismiss_consent(page)



        # Click the Reviews tab
        click_reviews_tab(page)
        time.sleep(2)

        # Detect total review count
        total_reviews_count = extract_total_reviews(page)
        logger.info(f"Total reviews detected: {total_reviews_count}")

        # Determine target count
        if pages == "*":
            target_count = total_reviews_count if total_reviews_count > 0 else 99999
        else:
            try:
                target_count = int(pages)
            except ValueError:
                target_count = 100

        if job_id:
            job_manager.update_job(
                job_id, 
                progress=f"Detected {total_reviews_count} reviews. Scrolling to load...",
                total_reviews=total_reviews_count,
                total_pages=target_count
            )

        # Scroll to load reviews
        loaded_count = scroll_reviews(page, target_count, job_id=job_id, total_reviews_count=total_reviews_count)

        # Expand truncated texts
        if job_id:
            job_manager.update_job(job_id, progress="Expanding truncated review texts...")
        expand_all_reviews(page)

        # Extract all reviews
        if job_id:
            job_manager.update_job(job_id, progress="Parsing review data from DOM...")
        
        extractor = GoogleExtractor(page)
        extracted = extractor.extract_reviews()

        # Deduplicate
        for r in extracted:
            if r.id not in seen_ids:
                seen_ids.add(r.id)
                all_reviews.append(r)

        logger.info(f"Extracted {len(all_reviews)} unique reviews from DOM.")

        # Identify new reviews vs existing ones
        from core.database import get_session
        from core.utils import identify_new_reviews
        
        session = get_session()
        new_count = 0
        try:
            new_count, new_ids = identify_new_reviews(session, source_id, all_reviews)
            logger.info(f"Deduplication results: {new_count} new reviews identified for source {source_id}.")
        except Exception as e:
            logger.warning(f"Could not identify new reviews: {e}")
        finally:
            session.close()

        # Save to database in batches
        if all_reviews:
            batch_size = 50
            for i in range(0, len(all_reviews), batch_size):
                batch = all_reviews[i:i + batch_size]
                logger.info(f"Saving batch {i // batch_size + 1} ({len(batch)} reviews) to database.")
                save_reviews_to_db(batch, source_id)
                
                if job_id:
                    job_manager.update_job(
                        job_id,
                        progress=f"Saved {min(i + batch_size, len(all_reviews))}/{len(all_reviews)} reviews to DB...",
                        reviews=min(i + batch_size, len(all_reviews)),
                        current_page=min(i + batch_size, len(all_reviews)),
                        total_pages=len(all_reviews)
                    )

            # Save JSON backup
            save_to_json(all_reviews, str(source_id))

            if job_id:
                job_manager.update_job(
                    job_id, status=JobStatus.COMPLETED,
                    progress="Finished scraping, JSON generated.",
                    reviews=len(all_reviews),
                    current_page=len(all_reviews),
                    total_pages=len(all_reviews)
                )

            audit_logger.info(
                category=u'SCRAPE',
                action=u'SCRAPE_COMPLETE',
                target_type=u'SOURCE',
                target_id=str(source_id),
                details={"reviews_saved": len(all_reviews), "job_id": job_id}
            )

            # Notify backend of completion
            notify_backend_sync_complete(str(source_id), new_review_count=new_count)

            return {"status": "success", "count": f"Stored {len(all_reviews)} reviews in DB & JSON", "source_id": source_id}
        else:
            logger.warning("No reviews were extracted.")
            if job_id:
                job_manager.update_job(job_id, status=JobStatus.COMPLETED, progress="No reviews found.", reviews=0)
            
            # Notify backend even if no reviews were found
            notify_backend_sync_complete(str(source_id), new_review_count=0)
            
            return {"status": "warning", "message": "No reviews found.", "count": 0}

    except Exception as e:
        logger.error(f"Error during Google scraping: {e}", exc_info=True)
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
        return {"status": "error", "message": str(e), "count": 0}
    finally:
        browser_controller.stop()
