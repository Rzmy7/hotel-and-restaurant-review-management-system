import hashlib
import re
from typing import List, Optional
from pydantic import BaseModel
from playwright.sync_api import Page
from core.config import setup_logger
from platforms.google.config import google_selectors as config

logger = setup_logger("google_extractor")


def first_float(text: str) -> Optional[float]:
    if not text:
        return None
    match = re.search(r'[-+]?(?:\d+(?:\.\d*)?|\.\d+)', text)
    return float(match.group(0)) if match else None


class GoogleReviewData(BaseModel):
    id: str
    author: str = "Anonymous"
    author_badge: str = ""
    rating: float = 0.0
    text: str = ""
    date: str = ""
    reply: str = ""
    photos: List[str] = []


class GoogleExtractor:
    def __init__(self, page: Page):
        self.page = page

    def extract_reviews(self) -> List[GoogleReviewData]:
        """Extracts all currently visible review cards from the Google Maps DOM."""
        logger.info("Extracting Google reviews from current DOM state.")
        reviews = []

        review_nodes = self.page.locator(config.review_card)
        count = review_nodes.count()
        logger.info(f"Found {count} review cards in the DOM.")

        for i in range(count):
            review = review_nodes.nth(i)

            # --- Review ID ---
            try:
                review_id = review.get_attribute(config.review_id_attr, timeout=1000) or ""
            except Exception:
                review_id = ""
            
            if not review_id:
                continue  # Skip reviews without an ID

            # --- Author ---
            try:
                author = review.locator(config.reviewer_name).first.text_content(timeout=1000)
                author = author.strip() if author else "Anonymous"
            except Exception:
                author = "Anonymous"

            # --- Author Badge ---
            try:
                badge = review.locator(config.reviewer_badge).first.text_content(timeout=1000)
                author_badge = badge.strip() if badge else ""
            except Exception:
                author_badge = ""

            # --- Rating ---
            try:
                rating_el = review.locator(config.review_rating).first
                rating_label = rating_el.get_attribute("aria-label", timeout=1000) or ""
                rating = first_float(rating_label) or 0.0
            except Exception:
                rating = 0.0

            # --- Date ---
            try:
                date_text = review.locator(config.review_date).first.text_content(timeout=1000)
                review_date = date_text.strip() if date_text else ""
            except Exception:
                review_date = ""

            # --- Review Text ---
            try:
                # Google Maps truncates long reviews; need to skip the reply's .wiI7pd
                text_nodes = review.locator(f"{config.review_text}")
                review_text = ""
                if text_nodes.count() > 0:
                    # The first .wiI7pd that is NOT inside .CDe7pd is the review text
                    first_text = text_nodes.first.text_content(timeout=1000)
                    review_text = first_text.strip() if first_text else ""
            except Exception:
                review_text = ""

            # --- Owner Reply ---
            try:
                reply_container = review.locator(config.reply_container)
                if reply_container.count() > 0:
                    reply_text_node = reply_container.locator(".wiI7pd").first
                    reply = reply_text_node.text_content(timeout=1000).strip() if reply_text_node.count() > 0 else ""
                else:
                    reply = ""
            except Exception:
                reply = ""

            # --- Photos ---
            photo_urls = []
            try:
                photo_btns = review.locator(config.review_photos)
                if photo_btns.count() > 0:
                    for p in range(photo_btns.count()):
                        try:
                            style = photo_btns.nth(p).get_attribute("style", timeout=500) or ""
                            url_match = re.search(r'url\("([^"]+)"\)', style)
                            if url_match:
                                photo_urls.append(url_match.group(1))
                        except Exception:
                            continue
            except Exception:
                pass

            reviews.append(
                GoogleReviewData(
                    id=review_id,
                    author=author,
                    author_badge=author_badge,
                    rating=rating,
                    text=review_text,
                    date=review_date,
                    reply=reply,
                    photos=photo_urls
                )
            )

        return reviews
