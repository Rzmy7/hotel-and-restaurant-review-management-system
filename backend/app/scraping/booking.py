"""
Booking.com review scraper using Playwright.

Moved from test/scraping/booking.py — updated imports.
"""

from datetime import datetime
from dataclasses import dataclass, asdict
import argparse
import json
import pathlib
import random
import re
from time import sleep
from typing import List

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

import pyodbc
import sys
import os

from app.core.pyodbc_connection import get_connection_string


def rand_between(a: int = 2000, b: int = 4500) -> int:
    return random.randint(min(a, b), max(a, b))


def first_float(text: str) -> float | None:
    if not text:
        return None
    match = re.search(r'[-+]?(?:\d+(?:\.\d*)?|\.\d+)', text)
    return float(match.group(0)) if match else None


@dataclass
class Picture:
    src: str = ""
    alt: str = ""


@dataclass
class Review:
    review_id: int
    title: str
    score: float
    positive_txt: str = ""
    negative_txt: str = ""
    posted_date: str = None
    reviewer_stay_date: str = None
    num_of_nights: int = 0
    traveler_type: str = ""
    room_name: str = ""
    raw_review: str = ""
    photo: List[Picture] | None = None

    def __post_init__(self) -> None:
        if self.photo is None:
            self.photo = []


def insert_review(cursor, review: Review) -> None:
    """Insert a single raw review + photos into the database."""
    cursor.execute(
        """
        INSERT INTO reviews (
            review_id, title, score, positive_txt, negative_txt,
            posted_date, reviewer_stay_date, num_of_nights,
            traveler_type, room_name, raw_review
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        review.review_id,
        review.title,
        review.score,
        review.positive_txt,
        review.negative_txt,
        review.posted_date,
        review.reviewer_stay_date,
        review.num_of_nights,
        review.traveler_type,
        review.room_name,
        review.raw_review,
    )

    for pic in review.photo:
        cursor.execute(
            """
            INSERT INTO review_photos (review_id, src, alt)
            VALUES (?, ?, ?)
            """,
            review.review_id,
            pic.src,
            pic.alt,
        )


def run_review_processor() -> None:
    """Run the AI review processing pipeline after scraping."""
    try:
        from app.services.review_processor import main as process_main
        process_main()
        print("✓ Review processing completed.")
    except ImportError:
        print("Review processor not found; skipping post-processing.")


def remove_all_reviews_from_db() -> bool:
    """Clear all reviews from the database."""
    try:
        conn = pyodbc.connect(get_connection_string())
        cursor = conn.cursor()

        cursor.execute("DELETE FROM dbo.reviews")
        conn.commit()

        cursor.execute("DELETE FROM dbo.review_photos")
        conn.commit()

        cursor.execute("DELETE FROM dbo.ProcessedReviews")
        conn.commit()

        conn.close()
        return True
    except Exception as e:
        print(f"Database Error: {e}")
        raise e


def scrape_booking(url: str, headless: bool = True) -> dict:
    """Scrape reviews from a Booking.com property page."""
    if not url or not url.startswith("http"):
        raise ValueError("A valid Booking.com property reviews URL is required.")

    screenshot_dir = pathlib.Path("scraping/screenshots")
    screenshot_dir.mkdir(parents=True, exist_ok=True)
    print(f"Screenshots will be saved to: {screenshot_dir.absolute()}")

    all_reviews: List[Review] = []
    output_file = None

    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()

        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=headless,
                args=['--disable-blink-features=AutomationControlled'],
            )

            context = browser.new_context(
                viewport={'width': 1050, 'height': 600},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )

            page = context.new_page()

            try:
                print("Loading page...")
                page.goto(url, wait_until="domcontentloaded", timeout=60000)
                page.screenshot(path=str(screenshot_dir / "01_initial_page_load.png"))

                print("Waiting for reviews button...")
                view_all_reviews = page.locator('[data-testid="fr-read-all-reviews"]')
                view_all_reviews.wait_for(state="visible", timeout=10000)
                page.screenshot(path=str(screenshot_dir / "02_review_button_visible.png"))

                page.locator('[data-testid="poi-block"]').last.wait_for(state="visible")
                view_all_reviews.hover()
                page.wait_for_timeout(rand_between())
                view_all_reviews.click()
                print("Review button clicked, waiting for modal...")

                page.wait_for_timeout(2000)
                page.locator('[data-testid="review-card"]').first.wait_for(state="visible", timeout=10000)
                page.screenshot(path=str(screenshot_dir / "03_review_modal_loaded.png"))

                page_counter = 1
                while True:
                    print(f"\n--- Processing Page {page_counter} ---")

                    sleep(0.5)
                    page.wait_for_timeout(rand_between())

                    review_nodes = page.locator('[data-testid="review-card"]')
                    review_nodes.last.wait_for(state="visible")
                    page.screenshot(path=str(screenshot_dir / f"04_page_{page_counter}_content.png"))

                    base_id = len(all_reviews) + 1
                    no_of_reviews_for_the_page = review_nodes.count()

                    for i in range(no_of_reviews_for_the_page):
                        print(f"Reading review: {i + 1}/{no_of_reviews_for_the_page}")

                        review = review_nodes.nth(i)

                        try:
                            raw_text = review.text_content(timeout=1000) or ""
                        except Exception:
                            raw_text = ""

                        try:
                            review_title = review.locator('[data-testid="review-title"]').text_content(timeout=1000).strip()
                        except Exception:
                            review_title = "No Title"

                        try:
                            rev_po_date = review.locator('[data-testid="review-date"]').text_content(timeout=1000).strip().split(":", 1)[-1].strip()
                            review_post_date = datetime.strptime(rev_po_date, "%B %d, %Y").date().isoformat()
                        except Exception:
                            review_post_date = None

                        try:
                            score_text = review.locator('[data-testid="review-score"]').text_content(timeout=1000).strip()
                            review_score = first_float(score_text) or 0.0
                        except Exception:
                            review_score = 0.0

                        try:
                            pos_rev = review.locator('[data-testid="review-positive-text"]')
                            positive_review = pos_rev.text_content(timeout=1000).strip() if pos_rev.count() > 0 else ""
                        except Exception:
                            positive_review = ""

                        try:
                            neg_rev = review.locator('[data-testid="review-negative-text"]')
                            negative_review = neg_rev.text_content(timeout=1000).strip() if neg_rev.count() > 0 else ""
                        except Exception:
                            negative_review = ""

                        try:
                            st_date = review.locator('[data-testid="review-stay-date"]').text_content(timeout=1000).strip()
                            stayed_date = datetime.strptime(st_date, "%B %Y").date().isoformat()
                        except Exception:
                            stayed_date = None

                        try:
                            nights_text = review.locator('[data-testid="review-num-nights"]').text_content(timeout=1000).strip()
                            num_of_nights = int(first_float(nights_text) or 0)
                        except Exception:
                            num_of_nights = 0

                        try:
                            traveler_type = review.locator('[data-testid="review-traveler-type"]').text_content(timeout=1000).strip()
                        except Exception:
                            traveler_type = ""

                        try:
                            room_name = review.locator('[data-testid="review-room-name"]').text_content(timeout=1000).strip()
                        except Exception:
                            room_name = ""

                        review_pictures: List[Picture] = []
                        try:
                            is_photo = review.locator('[data-testid="review-photos"]')
                            if is_photo.count() > 0:
                                print("  → Detected photos, opening gallery...")
                                thumb_place = is_photo.locator('[data-testid="REVIEW_THUMBNAIL_PROPERTY"]').first

                                thumb_place.wait_for(state="visible", timeout=2000)
                                thumb_place.hover()
                                page.wait_for_timeout(rand_between())
                                thumb_place.click()

                                gallery = page.locator('[data-testid="GALLERY"]')
                                gallery.wait_for(state="visible", timeout=5000)
                                page.wait_for_timeout(1000)

                                gallery.locator('[data-testid="REVIEW_PHOTO_PROPERTY"] img').first.wait_for(state="attached", timeout=5000)
                                page.wait_for_timeout(rand_between())
                                page.screenshot(path=str(screenshot_dir / f"05_gallery_pg{page_counter}_rev{i + 1}.png"))

                                img_elements = gallery.locator('[data-testid="REVIEW_PHOTO_PROPERTY"] img').all()

                                print(f"  → Extracting {len(img_elements)} photo(s)...")
                                for img in img_elements:
                                    try:
                                        src = img.get_attribute("src", timeout=1000) or ""
                                        alt = img.get_attribute("alt", timeout=1000) or ""
                                        review_pictures.append(Picture(src=src, alt=alt))
                                    except Exception:
                                        continue

                                close_btn = page.locator('[data-testid="GALLERY_CLOSE"]')
                                close_btn.wait_for(state="visible", timeout=2000)
                                page.wait_for_timeout(rand_between())
                                close_btn.click()

                                gallery.wait_for(state="hidden", timeout=2000)
                                page.wait_for_timeout(500)

                        except Exception as e:
                            print(f"  → Photo extraction failed: {str(e)[:50]}...")
                            try:
                                close_btn = page.locator('[data-testid="GALLERY_CLOSE"]')
                                if close_btn.count() > 0 and close_btn.is_visible():
                                    close_btn.click()
                                    page.wait_for_timeout(500)
                            except Exception:
                                pass

                        all_reviews.append(
                            Review(
                                review_id=base_id + i,
                                title=review_title,
                                score=review_score,
                                positive_txt=positive_review,
                                negative_txt=negative_review,
                                posted_date=review_post_date,
                                reviewer_stay_date=stayed_date,
                                num_of_nights=num_of_nights,
                                traveler_type=traveler_type,
                                room_name=room_name,
                                photo=review_pictures,
                                raw_review=raw_text,
                            )
                        )

                    page_counter += 1
                    print(f"\nMoving to page {page_counter}...")

                    next_page_button = page.locator('[aria-label="Next page"]')

                    if next_page_button.count() == 0 or next_page_button.is_disabled():
                        print("No more pages available.")
                        break

                    next_page_button.hover()
                    page.wait_for_timeout(rand_between())
                    next_page_button.click()
                    print("Next page clicked, waiting for load...")

                    page.wait_for_timeout(rand_between())
                    page.locator('[data-testid="review-card"]').first.wait_for(state='visible', timeout=10000)

                print("\nFinished scraping all reviews!")
                page.wait_for_timeout(1000)

            except Exception as exc:
                print(f"\nError occurred: {exc}")
                try:
                    page.screenshot(path=str(screenshot_dir / "99_error_state.png"))
                except Exception:
                    pass
                print("Saving collected reviews before exit...")

            finally:
                print("Closing browser...")
                browser.close()

        if all_reviews:
            output_dir = pathlib.Path("scraping/BookingOutput")
            output_dir.mkdir(parents=True, exist_ok=True)

            reviews_data = [asdict(review) for review in all_reviews]
            output_file = output_dir / "reviews.json"
            output_file.write_text(
                json.dumps(reviews_data, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
            print(f"\n✓ Successfully wrote {len(all_reviews)} reviews to reviews.json")

            # Clear existing reviews
            print("Clearing existing reviews from database...")
            remove_all_reviews_from_db()

            # Save to DB
            print("\nSaving reviews to database...")
            for review in all_reviews:
                insert_review(cursor, review)

            conn.commit()
            print(f"✓ Successfully saved {len(all_reviews)} reviews to database")
            run_review_processor()
        else:
            print("\nNo reviews were collected.")

    return {
        "review_count": len(all_reviews),
        "output_file": str(output_file) if output_file else None,
    }


def scrape_booking_for_competitor(url: str, headless: bool = True) -> List[Review]:
    """
    Scrape reviews for a competitor — returns raw Review objects
    without saving to DB (the competitor service handles that separately).
    """
    if not url or not url.startswith("http"):
        raise ValueError("A valid Booking.com property reviews URL is required.")

    all_reviews: List[Review] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=headless,
            args=['--disable-blink-features=AutomationControlled'],
        )

        context = browser.new_context(
            viewport={'width': 1050, 'height': 600},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )

        page = context.new_page()

        try:
            page.goto(url, wait_until="domcontentloaded", timeout=60000)

            view_all_reviews = page.locator('[data-testid="fr-read-all-reviews"]')
            view_all_reviews.wait_for(state="visible", timeout=10000)
            page.locator('[data-testid="poi-block"]').last.wait_for(state="visible")
            view_all_reviews.hover()
            page.wait_for_timeout(rand_between())
            view_all_reviews.click()

            page.wait_for_timeout(2000)
            page.locator('[data-testid="review-card"]').first.wait_for(state="visible", timeout=10000)

            page_counter = 1
            while True:
                sleep(0.5)
                page.wait_for_timeout(rand_between())

                review_nodes = page.locator('[data-testid="review-card"]')
                review_nodes.last.wait_for(state="visible")

                base_id = len(all_reviews) + 1

                for i in range(review_nodes.count()):
                    review = review_nodes.nth(i)

                    try:
                        raw_text = review.text_content(timeout=1000) or ""
                    except Exception:
                        raw_text = ""

                    try:
                        review_title = review.locator('[data-testid="review-title"]').text_content(timeout=1000).strip()
                    except Exception:
                        review_title = "No Title"

                    try:
                        rev_po_date = review.locator('[data-testid="review-date"]').text_content(timeout=1000).strip().split(":", 1)[-1].strip()
                        review_post_date = datetime.strptime(rev_po_date, "%B %d, %Y").date().isoformat()
                    except Exception:
                        review_post_date = None

                    try:
                        score_text = review.locator('[data-testid="review-score"]').text_content(timeout=1000).strip()
                        review_score = first_float(score_text) or 0.0
                    except Exception:
                        review_score = 0.0

                    try:
                        pos_rev = review.locator('[data-testid="review-positive-text"]')
                        positive_review = pos_rev.text_content(timeout=1000).strip() if pos_rev.count() > 0 else ""
                    except Exception:
                        positive_review = ""

                    try:
                        neg_rev = review.locator('[data-testid="review-negative-text"]')
                        negative_review = neg_rev.text_content(timeout=1000).strip() if neg_rev.count() > 0 else ""
                    except Exception:
                        negative_review = ""

                    try:
                        st_date = review.locator('[data-testid="review-stay-date"]').text_content(timeout=1000).strip()
                        stayed_date = datetime.strptime(st_date, "%B %Y").date().isoformat()
                    except Exception:
                        stayed_date = None

                    try:
                        nights_text = review.locator('[data-testid="review-num-nights"]').text_content(timeout=1000).strip()
                        num_of_nights = int(first_float(nights_text) or 0)
                    except Exception:
                        num_of_nights = 0

                    try:
                        traveler_type = review.locator('[data-testid="review-traveler-type"]').text_content(timeout=1000).strip()
                    except Exception:
                        traveler_type = ""

                    try:
                        room_name = review.locator('[data-testid="review-room-name"]').text_content(timeout=1000).strip()
                    except Exception:
                        room_name = ""

                    all_reviews.append(
                        Review(
                            review_id=base_id + i,
                            title=review_title,
                            score=review_score,
                            positive_txt=positive_review,
                            negative_txt=negative_review,
                            posted_date=review_post_date,
                            reviewer_stay_date=stayed_date,
                            num_of_nights=num_of_nights,
                            traveler_type=traveler_type,
                            room_name=room_name,
                            raw_review=raw_text,
                        )
                    )

                page_counter += 1
                next_page_button = page.locator('[aria-label="Next page"]')

                if next_page_button.count() == 0 or next_page_button.is_disabled():
                    break

                next_page_button.hover()
                page.wait_for_timeout(rand_between())
                next_page_button.click()
                page.wait_for_timeout(rand_between())
                page.locator('[data-testid="review-card"]').first.wait_for(state='visible', timeout=10000)

        except Exception as exc:
            print(f"Competitor scrape error: {exc}")

        finally:
            browser.close()

    return all_reviews


def main(url: str | None = None, headless: bool = True) -> None:
    target_url = url or input("Paste the Booking.com property reviews URL and press Enter: ").strip()
    summary = scrape_booking(target_url, headless=headless)
    print(f"Scrape finished: {summary}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scrape Booking.com reviews into DB + JSON.")
    parser.add_argument("--url", help="Booking.com property reviews URL", required=False)
    parser.add_argument(
        "--show-browser",
        action="store_true",
        help="Show Chromium instead of headless mode",
    )
    args = parser.parse_args()

    main(url=args.url, headless=not args.show_browser)
