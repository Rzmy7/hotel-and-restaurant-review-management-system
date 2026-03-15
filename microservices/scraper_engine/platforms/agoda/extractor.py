import hashlib
from typing import List, Optional
from pydantic import BaseModel
from playwright.sync_api import Page, Locator
from core.config import setup_logger
from platforms.agoda.config import agoda_selectors as config

logger = setup_logger("agoda_extractor")

class Review(BaseModel):
    id: str
    author: str
    reviewer_nationality: Optional[str] = None
    rating: float
    heading: Optional[str] = None
    text: str
    date: str
    stayed_dates: Optional[str] = None
    traveler_type: Optional[str] = None
    room_type: Optional[str] = None
    images: List[str] = []
    reply: Optional[str] = None

class AgodaExtractor:
    def __init__(self, page: Page):
        self.page = page

    def _extract_text(self, element: Locator, selector: str) -> Optional[str]:
        target = element.locator(selector).first
        if target.count() > 0:
            return target.inner_text().strip()
        return None

    def _extract_images(self, element: Locator) -> List[str]:
        images = []
        locators = element.locator(config.review_images_selector)
        for i in range(locators.count()):
            src = locators.nth(i).get_attribute("src")
            if src:
                if src.startswith("//"):
                    src = "https:" + src
                images.append(src)
        return images

    def extract_reviews(self) -> List[Review]:
        logger.info("Extracting reviews from the current page views.")
        reviews = []
        
        # Ensure we wait briefly for reviews to appear
        try:
            self.page.wait_for_selector(config.review_container_selector, timeout=5000)
        except Exception:
            logger.warning("No reviews found or timeout waiting for review container.")
            return reviews

        containers = self.page.locator(config.review_container_selector)
        count = containers.count()
        logger.info(f"Found {count} review containers on current page.")

        for i in range(count):
            container = containers.nth(i)
            
            author_text = self._extract_text(container, config.reviewer_name_selector)
            if not author_text:
                logger.debug("Skipping container with no author (likely a host reply block).")
                continue
                
            rating_text = self._extract_text(container, config.review_rating_selector)
            
            rating = 0.0
            if rating_text:
                try:
                    rating = float(rating_text)
                except ValueError:
                    pass
                    
            text = self._extract_text(container, config.review_text_selector) or ""
            
            heading = self._extract_text(container, config.review_heading_selector)
            room_type = self._extract_text(container, config.review_room_type_selector)
            traveler_type = self._extract_text(container, config.review_traveler_type_selector)
            stayed_dates = self._extract_text(container, config.review_stay_detail_selector)
            reviewer_nationality = self._extract_text(container, config.review_nationality_selector)
            
            # Date xpath is specific, fallback to finding 'Reviewed' if possible
            date_locator = container.locator(config.review_date_xpath).first
            date_text = date_locator.inner_text().strip() if date_locator.count() > 0 else ""
            
            images = self._extract_images(container)
            
            # Reply
            reply_container = container.locator(config.review_reply_selector).first
            reply_text = None
            if reply_container.count() > 0:
                reply_text = self._extract_text(reply_container, config.review_reply_text_selector)
                
            review_id = hashlib.md5(f"{author_text}_{date_text}_{rating}".encode()).hexdigest()

            review = Review(
                id=review_id,
                author=author_text,
                reviewer_nationality=reviewer_nationality if reviewer_nationality else None,
                rating=rating,
                heading=heading if heading else None,
                text=text,
                date=date_text,
                stayed_dates=stayed_dates if stayed_dates else None,
                traveler_type=traveler_type if traveler_type else None,
                room_type=room_type if room_type else None,
                images=images,
                reply=reply_text if reply_text else None
            )
            reviews.append(review)

        return reviews
