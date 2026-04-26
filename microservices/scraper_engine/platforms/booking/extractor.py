import hashlib
import random
import re
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from playwright.sync_api import Page, Locator
from core.config import setup_logger
from platforms.booking.config import booking_selectors as config

logger = setup_logger("booking_extractor")


def rand_between(a: int = 500, b: int = 1500) -> int:
    return random.randint(min(a, b), max(a, b))


def first_float(text: str) -> Optional[float]:
    if not text:
        return None
    match = re.search(r"[-+]?(?:\d+(?:\.\d*)?|\.\d+)", text)
    return float(match.group(0)) if match else None


class Picture(BaseModel):
    src: str = ""
    alt: str = ""


class BookingReviewData(BaseModel):
    id: str
    title: str = "No Title"
    score: float = 0.0
    positive_txt: str = ""
    negative_txt: str = ""
    posted_date: Optional[str] = None
    reviewer_stay_date: Optional[str] = None
    num_of_nights: int = 0
    traveler_type: str = ""
    room_name: str = ""
    author: str = "Anonymous"
    reviewer_nationality: str = "Unknown"
    reply: str = ""
    photo: List[Picture] = []


class BookingExtractor:
    def __init__(self, page: Page):
        self.page = page

    def extract_reviews(self) -> List[BookingReviewData]:
        logger.info("Extracting Booking.com reviews from current DOM state.")
        reviews = []

        try:
            self.page.wait_for_selector(config.review_card, timeout=5000)
        except Exception:
            logger.warning("No reviews found or timeout waiting for review cards.")
            return reviews

        review_nodes = self.page.locator(config.review_card)
        count = review_nodes.count()
        logger.info(f"Found {count} review cards on current page.")

        for i in range(count):
            review = review_nodes.nth(i)

            # --- Text Nodes ---
            try:
                author = review.locator(config.review_author).first.text_content(
                    timeout=1000
                )
                author = author.strip() if author else "Anonymous"
            except Exception:
                author = "Anonymous"

            try:
                nationality = review.locator(
                    config.review_nationality
                ).first.text_content(timeout=1000)
                reviewer_nationality = nationality.strip() if nationality else "Unknown"
            except Exception:
                reviewer_nationality = "Unknown"

            try:
                reply_node = review.locator(config.review_reply).first
                if reply_node.count() > 0:
                    reply = reply_node.text_content(timeout=1000).strip()
                    if reply.startswith("Property response:"):
                        reply = reply.replace("Property response:", "", 1).strip()
                else:
                    reply = ""
            except Exception:
                reply = ""

            try:
                review_title = (
                    review.locator(config.review_title)
                    .first.text_content(timeout=1000)
                    .strip()
                )
            except Exception:
                review_title = "No Title"

            try:
                # Format is "Reviewed: 23 February 2026"
                rev_po_date_raw = (
                    review.locator(config.review_date)
                    .first.text_content(timeout=1000)
                    .strip()
                )
                clean_date_str = (
                    rev_po_date_raw.split(":", 1)[-1].strip()
                    if ":" in rev_po_date_raw
                    else rev_po_date_raw
                )
                review_post_date = (
                    datetime.strptime(clean_date_str, "%d %B %Y").date().isoformat()
                )
            except Exception:
                review_post_date = None

            try:
                score_text = (
                    review.locator(config.review_score)
                    .text_content(timeout=1000)
                    .strip()
                )
                review_score = first_float(score_text) or 0.0
            except Exception:
                review_score = 0.0

            try:
                pos_rev = review.locator(config.review_positive_text)
                positive_review = (
                    pos_rev.text_content(timeout=1000).strip()
                    if pos_rev.count() > 0
                    else ""
                )
            except Exception:
                positive_review = ""

            try:
                neg_rev = review.locator(config.review_negative_text)
                negative_review = (
                    neg_rev.text_content(timeout=1000).strip()
                    if neg_rev.count() > 0
                    else ""
                )
            except Exception:
                negative_review = ""

            try:
                st_date = (
                    review.locator(config.review_stay_date)
                    .text_content(timeout=1000)
                    .strip()
                )
                stayed_date = datetime.strptime(st_date, "%B %Y").date().isoformat()
            except Exception:
                stayed_date = None

            try:
                nights_text = (
                    review.locator(config.review_num_nights)
                    .text_content(timeout=1000)
                    .strip()
                )
                num_of_nights = int(first_float(nights_text) or 0)
            except Exception:
                num_of_nights = 0

            try:
                traveler_type = (
                    review.locator(config.review_traveler_type)
                    .text_content(timeout=1000)
                    .strip()
                )
            except Exception:
                traveler_type = ""

            try:
                room_name = (
                    review.locator(config.review_room_name)
                    .text_content(timeout=1000)
                    .strip()
                )
            except Exception:
                room_name = ""

            # --- Images & Gallery Logic ---
            review_pictures: List[Picture] = []
            try:
                is_photo = review.locator(config.review_photos)
                if is_photo.count() > 0:
                    logger.info("Detected photos, triggering gallery modal sequence.")
                    thumb_place = is_photo.locator(config.review_thumbnail).first
                    thumb_place.wait_for(state="visible", timeout=2000)
                    thumb_place.hover()
                    self.page.wait_for_timeout(rand_between())
                    thumb_place.click()

                    gallery = self.page.locator(config.gallery)
                    gallery.wait_for(state="visible", timeout=5000)
                    self.page.wait_for_timeout(1000)

                    gallery.locator(config.gallery_photo).first.wait_for(
                        state="attached", timeout=5000
                    )
                    self.page.wait_for_timeout(rand_between())

                    img_elements = gallery.locator(config.gallery_photo).all()
                    for img in img_elements:
                        try:
                            src = img.get_attribute("src", timeout=1000) or ""
                            alt = img.get_attribute("alt", timeout=1000) or ""
                            review_pictures.append(Picture(src=src, alt=alt))
                        except Exception:
                            continue

                    close_btn = self.page.locator(config.gallery_close)
                    close_btn.wait_for(state="visible", timeout=2000)
                    self.page.wait_for_timeout(rand_between())
                    close_btn.click()

                    gallery.wait_for(state="hidden", timeout=2000)
                    self.page.wait_for_timeout(500)

            except Exception as e:
                logger.warning(f"Photo extraction modal failed: {str(e)[:100]}")
                try:
                    close_btn = self.page.locator(config.gallery_close)
                    if close_btn.count() > 0 and close_btn.is_visible():
                        close_btn.click()
                        self.page.wait_for_timeout(500)
                except Exception:
                    pass

            # Unique ID Generation based on review traits since booking doesnt render flat IDs
            hashable_string = (
                f"{review_title}_{review_post_date}_{author}_{positive_review[:20]}"
            )
            review_id = hashlib.md5(hashable_string.encode()).hexdigest()

            reviews.append(
                BookingReviewData(
                    id=review_id,
                    title=review_title,
                    score=review_score,
                    positive_txt=positive_review,
                    negative_txt=negative_review,
                    posted_date=review_post_date,
                    reviewer_stay_date=stayed_date,
                    num_of_nights=num_of_nights,
                    traveler_type=traveler_type,
                    room_name=room_name,
                    author=author,
                    reviewer_nationality=reviewer_nationality,
                    reply=reply,
                    photo=review_pictures,
                )
            )

        return reviews
