"""
TripAdvisor DOM extractor.
Parses a single review card element into a structured dict.
"""
import re
from core.config import setup_logger
from platforms.tripadvisor.config import tripadvisor_selectors as config

logger = setup_logger("tripadvisor_extractor")


class TripAdvisorExtractor:
    def __init__(self, page):
        self.page = page

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

    def _parse_rating(self, card) -> float | None:
        try:
            # Fallback 1: the custom SVG selector
            svg = card.query_selector(config.RATING)
            if svg:
                label = svg.get_attribute("aria-label") or ""
                m = re.search(r"(\d(?:\.\d)?)\s+of\s+5", label)
                if m:
                    return float(m.group(1))
        except Exception:
            pass
        return None

    def _parse_review_id(self, card) -> str | None:
        try:
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
            raw_text = self._safe_text(card, config.STAYED_DATE)
            if raw_text:
                if "•" in raw_text:
                    parts = [p.strip() for p in raw_text.split("•")]
                    trip_date = parts[0] if len(parts) > 0 else None
                    trip_type = parts[1] if len(parts) > 1 else None
                else:
                    trip_date = raw_text
        except Exception:
            pass
        return trip_type, trip_date

    def _expand_review(self, card):
        try:
            btn = card.query_selector(config.READ_MORE_BTN)
            if btn:
                btn.click()
                self.page.wait_for_timeout(400)
        except Exception:
            pass

    def _parse_reply(self, card) -> str | None:
        try:
            reply_el = card.query_selector(config.REPLY)
            if reply_el:
                return reply_el.inner_text().strip()
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
            script = """
            (card) => {
                let results = {};
                let subRatingDiv = card.querySelector('div[data-automation="reviewSubRating"]');
                let svgs = subRatingDiv ? subRatingDiv.querySelectorAll('svg[aria-label*="of 5"]') : card.querySelectorAll('svg[aria-label*="of 5"]');
                svgs.forEach(svg => {
                    let aria = svg.getAttribute('aria-label');
                    let match = aria ? aria.match(/([\d\.]+) of 5/) : null;
                    if (match && svg.closest) {
                        let score = parseFloat(match[1]);
                        let container = svg.closest("div")?.parentElement;
                        let text = container ? container.innerText.toLowerCase() : "";
                        
                        // Exclude the main review rating which lacks specific text
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
        except Exception as e:
            logger.debug(f"Error extracting sub-ratings: {e}")
        return subs

    def _parse_photos(self, card) -> list[str]:
        photos = []
        try:
            imgs = card.query_selector_all(config.IMAGES)
            for img in imgs:
                src = img.get_attribute("src") or ""
                if src and src not in photos:
                    photos.append(src)
        except Exception:
            pass
        return photos

    def extract_review(self, card) -> dict | None:
        try:
            self._expand_review(card)

            name = self._safe_text(card, config.AUTHOR_NAME)
            if not name:
                name = "Anonymous"

            origin = self._safe_text(card, config.AUTHOR_NATIONALITY)
            rating = self._parse_rating(card)

            raw_date = self._safe_text(card, config.REVIEW_DATE)
            review_date = raw_date.replace("Reviewed", "").replace("Written", "").strip() if raw_date else None

            title = self._safe_text(card, config.REVIEW_HEADING)
            text = self._safe_text(card, config.REVIEW_TEXT)
            trip_type, trip_date = self._parse_trip_info(card)

            reply = self._parse_reply(card)
            likes_count = self._parse_likes(card)
            photos = self._parse_photos(card)

            sub_ratings = self._parse_sub_ratings(card)
            review_id = self._parse_review_id(card)

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
