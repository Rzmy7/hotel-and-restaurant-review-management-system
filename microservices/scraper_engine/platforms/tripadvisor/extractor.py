"""
TripAdvisor DOM extractor.
Parses a single review card element into a structured dict.
"""
import re
from core.config import setup_logger

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

    # ─────────────────────────────────────────────
    # Rating: SVG aria-label "5 of 5 bubbles" → 5.0
    # ─────────────────────────────────────────────
    def _parse_rating(self, card) -> float | None:
        try:
            svg = card.query_selector('svg[aria-label*="of 5 bubbles"]')
            if svg:
                label = svg.get_attribute("aria-label") or ""
                m = re.search(r"(\d(?:\.\d)?)\s+of\s+5", label)
                if m:
                    return float(m.group(1))
        except Exception:
            pass
        return None

    # ─────────────────────────────────────────────
    # Review ID from any anchor link like /ShowUserReviews-…-r12345678-…
    # ─────────────────────────────────────────────
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

    # ─────────────────────────────────────────────
    # Trip type & date of stay from the detail block
    # ─────────────────────────────────────────────
    def _parse_trip_info(self, card) -> tuple[str | None, str | None]:
        trip_type = None
        trip_date = None
        try:
            blocks = card.query_selector_all("div.TDKzw")
            for block in blocks:
                text = block.inner_text()
                if "Type of trip" in text:
                    trip_type = text.split("Trip type:")[-1].split("Type of trip:")[-1].strip()
                if "Date of stay" in text:
                    trip_date = text.split("Date of stay:")[-1].strip()
        except Exception:
            pass
        return trip_type, trip_date

    # ─────────────────────────────────────────────
    # Expand "Read more" before reading text
    # ─────────────────────────────────────────────
    def _expand_review(self, card):
        try:
            btn = card.query_selector('button.UikNM, span.Vm7mi')
            if btn:
                btn.click()
                self.page.wait_for_timeout(400)
        except Exception:
            pass

    # ─────────────────────────────────────────────
    # Management reply text
    # ─────────────────────────────────────────────
    def _parse_reply(self, card) -> str | None:
        try:
            reply_el = card.query_selector('div[data-test-target="management-response"]')
            if reply_el:
                return reply_el.inner_text().strip()
        except Exception:
            pass
        return None

    # ─────────────────────────────────────────────
    # Contributions and Sub-Ratings
    # ─────────────────────────────────────────────
    def _parse_contribution_count(self, card) -> int | None:
        try:
            spans = card.query_selector_all(config.CONTRIBUTION_COUNT)
            for span in spans:
                text = span.inner_text().lower()
                if "contribution" in text:
                    m = re.search(r'([\d,]+)', text)
                    if m:
                        return int(m.group(1).replace(',', ''))
        except Exception:
            pass
        return None

    def _parse_sub_ratings(self, card) -> dict:
        subs = {
            "rating_value": None,
            "rating_service": None,
            "rating_location": None,
            "rating_cleanliness": None,
            "rating_rooms": None,
            "rating_sleep_quality": None,
            "rating_food": None,
            "rating_atmosphere": None,
        }
        try:
            script = """
            (card) => {
                let results = {};
                let svgs = card.querySelectorAll('svg[aria-label*="of 5"]');
                svgs.forEach(svg => {
                    let aria = svg.getAttribute('aria-label');
                    let match = aria.match(/([\d\.]+) of 5/);
                    if (match && svg.closest) {
                        let score = parseFloat(match[1]);
                        let container = svg.closest("div")?.parentElement;
                        let text = container ? container.innerText.toLowerCase() : "";
                        
                        if (text.includes("value")) results["rating_value"] = score;
                        else if (text.includes("service")) results["rating_service"] = score;
                        else if (text.includes("location")) results["rating_location"] = score;
                        else if (text.includes("clean")) results["rating_cleanliness"] = score;
                        else if (text.includes("room")) results["rating_rooms"] = score;
                        else if (text.includes("sleep")) results["rating_sleep_quality"] = score;
                        else if (text.includes("food")) results["rating_food"] = score;
                        else if (text.includes("atmosphere")) results["rating_atmosphere"] = score;
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

    # ─────────────────────────────────────────────
    # Photos
    # ─────────────────────────────────────────────
    def _parse_photos(self, card) -> list[str]:
        photos = []
        try:
            imgs = card.query_selector_all('img[src*="media-cdn.tripadvisor.com"]')
            for img in imgs:
                src = img.get_attribute("src") or ""
                if src and src not in photos:
                    photos.append(src)
        except Exception:
            pass
        return photos

    # ─────────────────────────────────────────────
    # Main entry: parse a single review card
    # ─────────────────────────────────────────────
    def extract_review(self, card) -> dict | None:
        try:
            self._expand_review(card)

            # Name — try profile link first, then generic bold
            name = self._safe_text(card, 'a[href*="/Profile/"] span')
            if not name:
                name = self._safe_text(card, 'span.biGQs._P.fiohW.fOtGX')
            if not name:
                name = "Anonymous"

            # Origin
            origin = self._safe_text(card, 'span.wiI7l')

            # Rating
            rating = self._parse_rating(card)

            # Date — "Reviewed Oct 2024" → "Oct 2024"
            raw_date = self._safe_text(card, 'div.RpeCd')
            review_date = raw_date.replace("Reviewed", "").strip() if raw_date else None

            # Title
            title = self._safe_text(card, 'span[data-test-target="review-title"]')
            if not title:
                title = self._safe_text(card, 'a[href*="ShowUserReviews"] span')

            # Text — try full (post-expand), then fallback
            text = self._safe_text(card, 'span.JguWG')
            if not text:
                text = self._safe_text(card, 'span.yCeTE')
            if not text:
                text = self._safe_text(card, 'div.biGQs._P.pZUbB.KxBGd')

            # Trip info
            trip_type, trip_date = self._parse_trip_info(card)

            # Reply
            reply = self._parse_reply(card)

            # Photos
            photos = self._parse_photos(card)

            # TripAdvisor specific sub-ratings & contribution
            contribution_count = self._parse_contribution_count(card)
            sub_ratings = self._parse_sub_ratings(card)
            
            # Review ID
            review_id = self._parse_review_id(card)

            return {
                "external_review_id": review_id,
                "author": name,
                "reviewer_origin": origin or None,
                "contribution_count": contribution_count,
                "rating": rating,
                **sub_ratings,
                "author": name,
                "reviewer_origin": origin or None,
                "rating": rating,
                "review_date": review_date,
                "review_title": title or None,
                "review_text": text or None,
                "traveler_type": trip_type,
                "trip_date": trip_date,
                "reply_text": reply,
                "images": photos,
            }
        except Exception as e:
            logger.warning(f"Failed to extract review card: {e}")
            return None

    # ─────────────────────────────────────────────
    # Extract all review cards on the current page
    # ─────────────────────────────────────────────
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

    # ─────────────────────────────────────────────
    # Parse total review count from page header
    # ─────────────────────────────────────────────
    def extract_total_reviews(self) -> int:
        try:
            selectors = [
                'span.khYLe', 'span.qS986',
                'a[href*="#REVIEWS"] span',
                'div.cPgBc span',
            ]
            for sel in selectors:
                el = self.page.query_selector(sel)
                if el:
                    txt = el.inner_text()
                    m = re.search(r"([\d,]+)", txt)
                    if m:
                        return int(m.group(1).replace(",", ""))
        except Exception:
            pass

        # Fallback: look in page text
        try:
            content = self.page.inner_text("body")
            m = re.search(r"([\d,]+)\s+review", content, re.IGNORECASE)
            if m:
                return int(m.group(1).replace(",", ""))
        except Exception:
            pass

        return 0
