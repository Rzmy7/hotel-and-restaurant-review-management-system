"""
TripAdvisor DOM extractor.
Parses a single review card element into a structured dict.
"""
import re
import json
from core.config import setup_logger
from platforms.tripadvisor.config import tripadvisor_selectors as config

logger = setup_logger("tripadvisor_extractor")


class TripAdvisorExtractor:
    def __init__(self, page):
        self.page = page
        self._json_ld_data = []

    def _safe_text(self, element, selector: str, default="") -> str:
        try:
            el = element.query_selector(selector)
            return el.inner_text().strip() if el else default
        except Exception:
            return default

    def _safe_attr(self, element, selector: str, attr: str, default="") -> str:
        try:
            el = element.query_selector(selector)
            return (el.get_attribute(attr) or "").strip() if el else default
        except Exception:
            return default

    def _load_json_ld(self):
        """Extract all JSON-LD blocks from the page."""
        try:
            scripts = self.page.query_selector_all('script[type="application/ld+json"]')
            self._json_ld_data = []
            for s in scripts:
                try:
                    data = json.loads(s.inner_text())
                    if isinstance(data, list):
                        self._json_ld_data.extend(data)
                    else:
                        self._json_ld_data.append(data)
                except Exception:
                    continue
            logger.debug(f"Loaded {len(self._json_ld_data)} JSON-LD blocks.")
        except Exception as e:
            logger.warning(f"Failed to load JSON-LD: {e}")

    def _get_json_ld_review(self, review_id: str) -> dict:
        """Find a review in loaded JSON-LD by ID (matching URL or description)."""
        for item in self._json_ld_data:
            # TripAdvisor JSON-LD often contains @type: "Review"
            if item.get("@type") == "Review":
                url = item.get("url", "")
                if review_id and f"-r{review_id}-" in url:
                    return item
        return {}

    def _parse_rating(self, card, json_data=None) -> float | None:
        try:
            svg = card.query_selector(config.RATING)
            if svg:
                # Try finding <title> inside SVG (most reliable)
                title_el = svg.query_selector("title")
                label = title_el.text_content() if title_el else (svg.get_attribute("aria-label") or "")
                
                # Extract "X of 5" or "X.0 of 5"
                m = re.search(r"(\d(?:\.\d)?)\s+of\s+5", label)
                if m:
                    return float(m.group(1))
                
                # Try class-based fallback (e.g. bubble_50)
                cls = svg.get_attribute("class") or ""
                m_cls = re.search(r"bubble_(\d+)", cls)
                if m_cls:
                    return float(m_cls.group(1)) / 10.0
        except Exception:
            pass

        if json_data and "reviewRating" in json_data:
            return float(json_data["reviewRating"].get("ratingValue", 0))

        return None

    def _parse_review_id(self, card) -> str | None:
        try:
            heading = card.query_selector(config.REVIEW_HEADING)
            if not heading:
                heading = card.query_selector('a[href*="/ShowUserReviews-"]')
            
            if heading:
                href = heading.get_attribute("href") or ""
                m = re.search(r"r(\d+)", href)
                if m:
                    return m.group(1)
        except Exception:
            pass
        return None

    def _parse_trip_info(self, card) -> tuple[str | None, str | None]:
        trip_type = None
        trip_date = None
        try:
            all_text = card.inner_text()
            m_date = re.search(r"Date of stay:\s*(.*?)(?:\n|$)", all_text, re.IGNORECASE)
            if m_date:
                trip_date = m_date.group(1).strip()
            
            m_type = re.search(r"Trip type:\s*(.*?)(?:\n|$)", all_text, re.IGNORECASE)
            if m_type:
                trip_type = m_type.group(1).replace("Travelled ", "").strip()
        except Exception:
            pass
        return trip_type, trip_date

    def _expand_review(self, card):
        try:
            # 1. Expand the main review
            btn = card.query_selector(config.READ_MORE_BTN)
            if btn and btn.is_visible():
                btn.click()
                # Brief wait for dynamic content to load
                self.page.wait_for_timeout(800)
            
            # 2. Expand management response if present
            reply_container = card.query_selector(config.REPLY_CONTAINER)
            if reply_container:
                reply_btn = reply_container.query_selector(config.READ_MORE_BTN)
                if reply_btn and reply_btn.is_visible():
                    reply_btn.click()
                    self.page.wait_for_timeout(500)
        except Exception:
            pass

    def _parse_reply(self, card) -> str | None:
        try:
            reply_container = card.query_selector(config.REPLY_CONTAINER)
            if reply_container:
                # Find the actual text body within the container
                body = reply_container.query_selector(config.REPLY_TEXT)
                text = body.inner_text().strip() if body else reply_container.inner_text().strip()
                
                # 1. Remove "Read more" / "Read less"
                text = text.replace("Read more", "").replace("Read less", "").strip()
                
                # 2. Remove "Response from..." header if we grabbed the whole container
                if "Response from" in text:
                    # Look for the last newline or separator after the header
                    # Usually "Responded 6 Jan 2026" or similar
                    parts = re.split(r"Responded\s+\d{1,2}\s+\w+\s+\d{4}", text, flags=re.IGNORECASE)
                    if len(parts) > 1:
                        text = parts[-1].strip()
                    else:
                        # Fallback for different date formats
                        parts = re.split(r"Responded\s+\w+\s+\d{4}", text, flags=re.IGNORECASE)
                        if len(parts) > 1:
                            text = parts[-1].strip()
                
                # 3. Remove legal disclaimer
                disclaimer = "This response is the subjective opinion of the management representative"
                if disclaimer in text:
                    text = text.split(disclaimer)[0].strip()
                
                return text
        except Exception:
            pass
        return None

    def _parse_likes(self, card) -> int | None:
        try:
            likes_str = self._safe_text(card, config.LIKES)
            if likes_str:
                m = re.search(r'(\d+)', likes_str)
                if m:
                    return int(m.group(1))
        except Exception:
            pass
        return 0

    def _parse_sub_ratings(self, card) -> dict:
        subs = {
            "rating_value": None,
            "rating_service": None,
            "rating_location": None,
            "rating_cleanliness": None,
            "rating_rooms": None,
            "rating_sleep_quality": None,
        }
        try:
            # Refined JS evaluation to find SVGs strictly relative to their labels
            results = card.evaluate(r"""
                (card) => {
                    const data = {};
                    const labels = ["Value", "Rooms", "Location", "Cleanliness", "Service", "Sleep Quality"];
                    
                    labels.forEach(label => {
                        // Find the deepest element containing exactly this label text
                        const allElements = Array.from(card.querySelectorAll('*'));
                        const labelEl = allElements.find(el => 
                            el.children.length === 0 && 
                            el.textContent && 
                            el.textContent.trim() === label
                        );
                        
                        if (labelEl) {
                            // Search up through parents for the nearest SVG
                            let current = labelEl;
                            let svg = null;
                            for (let i = 0; i < 3; i++) {
                                if (!current || current === card) break;
                                
                                // Check if the parent contains an SVG with a title
                                svg = current.parentElement.querySelector('svg');
                                if (svg && svg.querySelector('title')) break;
                                
                                current = current.parentElement;
                            }
                            
                            if (svg) {
                                const title = svg.querySelector('title');
                                if (title) {
                                    const m = title.textContent.match(/(\d(?:\.\d)?)\s+of\s+5/);
                                    if (m) {
                                        data[label] = parseFloat(m[1]);
                                    }
                                }
                            }
                        }
                    });
                    return data;
                }
            """)
            
            if results:
                for label, score in results.items():
                    key = f"rating_{label.lower().replace(' ', '_')}"
                    if key in subs:
                        subs[key] = score
        except Exception as e:
            logger.debug(f"Sub-rating JS extraction failed: {e}")
        return subs

    def _parse_card_photos(self, card) -> list[str]:
        """Extract images visible directly on the review card."""
        photos = []
        try:
            imgs = card.query_selector_all(config.IMAGES)
            for img in imgs:
                media_id = img.get_attribute("data-mediaid")
                if media_id:
                    src = img.get_attribute("src") or img.get_attribute("srcset") or ""
                    if " " in src:
                        src = src.split(",")[-1].split(" ")[0].strip()
                    if src and src not in photos:
                        photos.append(src)
        except Exception:
            pass
        return photos

    def _parse_photos(self, card, author_name: str) -> list[str]:
        """
        Orchestrates photo extraction. 
        Collects card photos first, then enters gallery if a 'See all' button exists.
        """
        photos = self._parse_card_photos(card)
        
        try:
            see_all = card.query_selector(config.SEE_ALL_PHOTOS_BTN)
            if see_all:
                see_all.scroll_into_view_if_needed()
                self.page.wait_for_timeout(500) # Wait for animation
                
                if see_all.is_visible():
                    logger.info(f"Detected 'See all' media button for review by {author_name}. Opening gallery...")
                    see_all.click(force=True)
                    self.page.wait_for_selector(config.GALLERY_MODAL, timeout=10000)
                    
                    gallery_photos = []
                max_gallery_attempts = 20 # Safety limit
                
                for _ in range(max_gallery_attempts):
                    # 1. Verify author in gallery
                    gallery_author_el = self.page.query_selector(config.GALLERY_AUTHOR)
                    if gallery_author_el:
                        gallery_author = gallery_author_el.inner_text().strip()
                        if author_name not in gallery_author and gallery_author not in author_name:
                            logger.info(f"Gallery author changed to {gallery_author}. Finished this review's media.")
                            break
                    
                    # 2. Extract current image
                    img_el = self.page.query_selector(config.GALLERY_IMAGE)
                    if img_el:
                        src = img_el.get_attribute("src") or ""
                        if src and src not in gallery_photos:
                            gallery_photos.append(src)
                    
                    # 3. Click next
                    next_btn = self.page.query_selector(config.GALLERY_NEXT_BTN)
                    if next_btn and next_btn.is_enabled():
                        next_btn.click()
                        self.page.wait_for_timeout(1000) # Small delay for transition
                    else:
                        break
                
                # Merge and close
                for p in gallery_photos:
                    if p not in photos:
                        photos.append(p)
                
                close_btn = self.page.query_selector(config.GALLERY_CLOSE_BTN)
                if close_btn:
                    close_btn.click()
                    self.page.wait_for_timeout(500)
                    
        except Exception as e:
            logger.warning(f"Failed to extract photos from TripAdvisor gallery: {e}")
            # Try to close the modal if we are stuck
            try:
                self.page.keyboard.press("Escape")
            except Exception:
                pass
                
        return photos

    def extract_review(self, card) -> dict | None:
        try:
            self._expand_review(card)
            review_id = self._parse_review_id(card)
            
            # Author & Location
            name = "Anonymous"
            origin = None
            author_area = card.query_selector(config.AUTHOR_AREA)
            if author_area:
                # Name is usually the first bold span
                name_el = author_area.query_selector('span.biGQs._P.SewaP.OgHoE, a span')
                name = name_el.inner_text().strip() if name_el else "Anonymous"
                
                # Location is usually a span.qVkLn that doesn't say "contributions"
                spans = author_area.query_selector_all('span.qVkLn')
                for s in spans:
                    txt = s.inner_text().strip()
                    if txt and "contribution" not in txt.lower() and "helpful" not in txt.lower():
                        origin = txt
                        break

            rating = self._parse_rating(card)
            
            # Clean Review Date
            raw_date_el = card.query_selector(config.REVIEW_DATE)
            raw_date = raw_date_el.inner_text() if raw_date_el else ""
            clean_date = re.sub(r".*wrote a review\s*", "", raw_date, flags=re.IGNORECASE).strip()
            clean_date = clean_date.split("\n")[0].strip()

            title = self._safe_text(card, config.REVIEW_HEADING)
            text = self._safe_text(card, config.REVIEW_TEXT)
            
            # Filter Disclaimer
            if text and "subjective opinion" in text:
                text = text.split("This review is the subjective opinion")[0].strip()

            trip_type, trip_date = self._parse_trip_info(card)
            reply = self._parse_reply(card)
            likes_count = self._parse_likes(card)
            photos = self._parse_photos(card, name)
            sub_ratings = self._parse_sub_ratings(card)

            return {
                "external_review_id": review_id,
                "author": name,
                "reviewer_origin": origin,
                "rating": rating,
                "review_date": clean_date,
                "review_title": title,
                "review_text": text,
                "traveler_type": trip_type,
                "trip_date": trip_date,
                "reply_text": reply,
                "likes_count": likes_count,
                "images": photos,
                **sub_ratings
            }
        except Exception as e:
            logger.warning(f"Failed to extract review card: {e}")
            return None

    def extract_all_on_page(self) -> list[dict]:
        reviews = []
        try:
            self._load_json_ld()
            cards = self.page.query_selector_all(config.REVIEW_CARD)
            logger.info(f"Found {len(cards)} review cards on current page.")
            for card in cards:
                r = self.extract_review(card)
                if r:
                    reviews.append(r)
        except Exception as e:
            logger.error(f"Error during page extraction: {e}")
        return reviews

    def extract_total_reviews(self) -> int:
        try:
            el = self.page.query_selector(config.TOTAL_REVIEW_COUNT)
            if el:
                txt = el.inner_text()
                m = re.search(r"([\d,]+)", txt)
                if m:
                    return int(m.group(1).replace(",", ""))
        except Exception:
            pass

        # Fallback
        try:
            content = self.page.inner_text("body")
            m = re.search(r"([\d,]+)\s+review", content, re.IGNORECASE)
            if m:
                return int(m.group(1).replace(",", ""))
        except Exception:
            pass

        return 0
