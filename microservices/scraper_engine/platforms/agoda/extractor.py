import hashlib
import re
from typing import List, Optional
from pydantic import BaseModel
from playwright.sync_api import Page
from core.config import setup_logger
from platforms.agoda.config import agoda_selectors


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
    num_of_nights: Optional[int] = None
    images: List[str] = []
    reply: Optional[str] = None

class AgodaExtractor:
    def __init__(self, page: Page):
        self.page = page

    def extract_reviews(self) -> List[Review]:
        logger.info("Extracting reviews using Hybrid DOM + Regex from native #reviewSection inline DOM.")
        reviews = []
        
        try:
            self.page.wait_for_selector('#reviewSection', timeout=8000)
        except Exception:
            logger.warning("No #reviewSection found or timeout.")
            return reviews

        root = self.page.locator('#reviewSection')
        containers = root.locator('.Review-comment')
        
        count = containers.count()
        logger.info(f"Found {count} review containers natively inline.")

        for i in range(count):
            container = containers.nth(i)
            try:
                html = container.evaluate("el => el.innerHTML")
            except Exception as e:
                logger.warning(f"Could not read innerHTML of review: {e}")
                continue
                
            # 1. Author Name
            author_match = re.search(r'data-info-type="reviewer-name"[^>]*>.*?<strong>([^<]+)</strong>', html)
            if not author_match:
                continue
            author_text = author_match.group(1).strip()
            
            # 2. Nationality 
            nat_match = re.search(r'data-info-type="reviewer-name"[^>]*>.*?<span>([^<]+)</span></div>', html)
            reviewer_nationality = nat_match.group(1).strip() if nat_match else None
            
            # 3. Rating Score (Agoda uses Review-comment-leftScore or data-selenium="review-score")
            rating_match = re.search(r'Review-comment-leftScore[^>]*>([\d.]+)<', html)
            if not rating_match:
                rating_match = re.search(r'data-selenium="review-score"[^>]*>([\d.]+)<', html)
                
            rating = 0.0
            if rating_match:
                try:
                    rating = float(rating_match.group(1))
                except ValueError:
                    pass
            
            # 4. Heading
            heading_match = re.search(r'data-testid="review-title"[^>]*>([^<]+)<', html)
            heading = heading_match.group(1).strip() if heading_match else None
            
            # 5. Review Text 
            text_match = re.search(r'data-selenium="comment"[^>]*>([^<]+)<', html)
            if not text_match:
                text_match = re.search(r'data-selenium="review-body"[^>]*>([^<]+)<', html)
            if not text_match:
                text_match = re.search(r'class="[^"]*Review-comment-bodyText[^"]*"[^>]*>([^<]+)<', html)
                
            text = text_match.group(1).strip() if text_match else ""
            
            # 6. Date
            date_match = re.search(r'data-selenium="review-date"[^>]*>([^<]+)<', html)
            if not date_match:
                date_match = re.search(r'Reviewed ([^<]+)</span>', html)
            date_text = date_match.group(1).strip() if date_match else ""
            
            # 7. Metadata 
            room_match = re.search(r'data-info-type="room-type"[^>]*><i[^>]*></i><span>([^<]+)</span>', html)
            room_type = room_match.group(1).strip() if room_match else None
            
            travel_match = re.search(r'data-info-type="group-name"[^>]*><i[^>]*></i><span>([^<]+)</span>', html)
            traveler_type = travel_match.group(1).strip() if travel_match else None
            
            stay_match = re.search(r'data-info-type="stay-detail"[^>]*><i[^>]*></i><span>([^<]+)</span>', html)
            stayed_dates = stay_match.group(1).strip() if stay_match else None
            
            # 7b. Number of nights (parsed from stay-detail text like "Stayed 2 nights")
            num_of_nights = None
            if stayed_dates:
                nights_match = re.search(r'(\d+)\s*night', stayed_dates, re.IGNORECASE)
                if nights_match:
                    num_of_nights = int(nights_match.group(1))
            
            # 8. Images attached (Modern Agoda uses buttons with data-picture-id)
            images = []
            try:
                # Use the robust locator from config to find images inside buttons/containers
                img_elements = container.locator(agoda_selectors.review_images_selector).all()
                for img_el in img_elements:
                    src = img_el.get_attribute("src")
                    if src:
                        full_src = src if not src.startswith('//') else 'https:' + src
                        if full_src not in images:
                            images.append(full_src)
            except Exception as e:
                logger.debug(f"Locator-based image extraction failed, falling back to regex: {e}")
            
            if not images:
                # Fallback: regex search for data-picture-id and src in the same block
                img_matches = re.finditer(r'data-picture-id="[^"]*".*?src="([^"]+)"', html, re.DOTALL)
                for m in img_matches:
                    full_src = m.group(1) if not m.group(1).startswith('//') else 'https:' + m.group(1)
                    if full_src not in images:
                        images.append(full_src)
            
            # 9. Host Reply
            reply_match = re.search(r'class="[^"]*Review-response-text[^"]*"[^>]*>([^<]+)<', html)
            reply_text = reply_match.group(1).strip() if reply_match else None
            
            review_id = hashlib.md5(f"{author_text}_{date_text}_{rating}".encode()).hexdigest()

            review = Review(
                id=review_id,
                author=author_text,
                reviewer_nationality=reviewer_nationality,
                rating=rating,
                heading=heading,
                text=text,
                date=date_text,
                stayed_dates=stayed_dates,
                num_of_nights=num_of_nights,
                traveler_type=traveler_type,
                room_type=room_type,
                images=images,
                reply=reply_text
            )
            reviews.append(review)

        return reviews
