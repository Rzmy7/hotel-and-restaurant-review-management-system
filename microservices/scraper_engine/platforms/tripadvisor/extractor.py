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
        # Priority 1: DOM (Bubble SVG or Class)
        try:
            svg = card.query_selector(config.RATING)
            if svg:
                # Try aria-label on SVG
                label = svg.get_attribute("aria-label") or ""
                if not label:
                    # Try finding <title> inside SVG
                    title_el = svg.query_selector("title")
                    label = title_el.inner_text() if title_el else ""
                
                m = re.search(r"(\d(?:\.\d)?)\s+of\s+5", label)
                if m:
                    return float(m.group(1))
                
                # Try class-based rating (e.g. ui_bubble_rating bubble_50)
                cls = svg.get_attribute("class") or ""
                m_cls = re.search(r"bubble_(\d+)", cls)
                if m_cls:
                    return float(m_cls.group(1)) / 10.0
        except Exception:
            pass

        # Priority 2: JSON-LD (Only if DOM fails)
        if json_data and "reviewRating" in json_data:
            return float(json_data["reviewRating"].get("ratingValue", 0))

        return None

    def _parse_review_id(self, card) -> str | None:
        try:
            # Try from the heading link
            heading = card.query_selector(config.REVIEW_HEADING)
            if heading:
                href = heading.get_attribute("href") or ""
                m = re.search(r"-r(\d+)-", href)
                if m:
                    return m.group(1)
            
            # Fallback to any anchor with -r
            anchors = card.query_selector_all("a[href*='-r']")
            for a in anchors:
                href = a.get_attribute("href") or ""
                m = re.search(r"-r(\d+)-", href)
                if m:
                    return m.group(1)
        except Exception:
            pass
        return None

    def _parse_trip_info(self, card) -> tuple[str | None, str | None]:
        trip_type = None
        trip_date = None
        try:
            # Look for "Date of stay:" pattern
            all_text = card.inner_text()
            m_date = re.search(r"Date of stay:\s*(.*?)(?:\n|$)", all_text, re.IGNORECASE)
            if m_date:
                trip_date = m_date.group(1).strip()
            
            m_type = re.search(r"Trip type:\s*(.*?)(?:\n|$)", all_text, re.IGNORECASE)
            if m_type:
                trip_type = m_type.group(1).replace("Travelled ", "").strip()
            
            # Fallback to selectors
            if not trip_date:
                trip_date = self._safe_text(card, config.STAYED_DATE)
        except Exception:
            pass
        return trip_type, trip_date

    def _expand_review(self, card):
        try:
            btn = card.query_selector(config.READ_MORE_BTN)
            if btn and btn.is_visible():
                btn.click()
                self.page.wait_for_timeout(500)
        except Exception:
            pass

    def _parse_reply(self, card) -> str | None:
        try:
            # Replies are often in a distinct block
            reply_el = card.query_selector(config.REPLY)
            if reply_el:
                # Try to clean up "Response from..." prefix
                text = reply_el.inner_text().strip()
                return re.sub(r"^Response from.*?\n", "", text, flags=re.IGNORECASE | re.DOTALL).strip()
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
            # Sub ratings are often hidden in the "Read more" expansion
            # They use small bubble icons
            script = r"""
            (card) => {
                let results = {};
                let svgs = card.querySelectorAll('svg[aria-label*="of 5 bubbles"]');
                svgs.forEach(svg => {
                    let aria = svg.getAttribute('aria-label');
                    let match = aria ? aria.match(/([\d\.]+) of 5/) : null;
                    if (match) {
                        let score = parseFloat(match[1]);
                        let container = svg.closest("div")?.parentElement;
                        let text = container ? container.innerText.toLowerCase() : "";
                        
                        if (text.includes("value")) results["rating_value"] = score;
                        else if (text.includes("service")) results["rating_service"] = score;
                        else if (text.includes("location")) results["rating_location"] = score;
                        else if (text.includes("clean")) results["rating_cleanliness"] = score;
                        else if (text.includes("room")) results["rating_rooms"] = score;
                        else if (text.includes("sleep")) results["rating_sleep_quality"] = score;
                    }
                });
                return results;
            }
            """
            extracted = card.evaluate(script)
            subs.update(extracted)
        except Exception:
            pass
        return subs

    def _parse_photos(self, card) -> list[str]:
        photos = []
        try:
            imgs = card.query_selector_all(config.IMAGES)
            for img in imgs:
                src = img.get_attribute("src") or img.get_attribute("data-lazy-src") or ""
                if src and "media-cdn.tripadvisor.com" in src and src not in photos:
                    photos.append(src)
        except Exception:
            pass
        return photos

    def extract_review(self, card) -> dict | None:
        try:
            # Pre-expansion
            self._expand_review(card)
            
            review_id = self._parse_review_id(card)
            
            # Author Name
            name = self._safe_text(card, config.AUTHOR_NAME)
            if not name or name.lower() == "wrote a review":
                # Try finding actual span with name
                el = card.query_selector('span.biGQs._P.SewaP.OgHoE')
                name = el.inner_text().strip() if el else "Anonymous"

            origin = self._safe_text(card, config.AUTHOR_NATIONALITY)
            rating = self._parse_rating(card)

            # Review Date (Written date)
            raw_date = self._safe_text(card, config.REVIEW_DATE)
            review_date = None
            if raw_date:
                # Clean "wrote a review 19 Apr" -> "19 Apr"
                m = re.search(r"wrote a review\s*(.*)", raw_date, re.IGNORECASE)
                review_date = m.group(1).strip() if m else raw_date.strip()

            title = self._safe_text(card, config.REVIEW_HEADING)
            text = self._safe_text(card, config.REVIEW_TEXT)
            
            # If text is empty, try a broader selector
            if not text:
                text = card.inner_text()
                # Try to slice out the part between title and "Date of stay"
                if title and title in text:
                    parts = text.split(title)
                    if len(parts) > 1:
                        text = parts[1].split("Date of stay:")[0].strip()

            trip_type, trip_date = self._parse_trip_info(card)

            reply = self._parse_reply(card)
            likes_count = self._parse_likes(card)
            photos = self._parse_photos(card)
            sub_ratings = self._parse_sub_ratings(card)

            return {
                "external_review_id": review_id,
                "author": name,
                "reviewer_origin": origin or None,
                "rating": rating,
                "review_date": review_date,
                "review_title": title or None,
                "review_text": text or None,
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
