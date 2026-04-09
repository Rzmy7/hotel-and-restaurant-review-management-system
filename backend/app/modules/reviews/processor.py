"""
Review Processor — AI-powered review analysis pipeline.

Moved from services/review_processor.py.
Fetches raw reviews, sends to Gemini AI, stores processed results.
"""

from __future__ import annotations
import json
import pathlib
import re
from dataclasses import dataclass, asdict
from typing import List, Optional
from datetime import date, datetime

import pyodbc
from pydantic import BaseModel
from google import genai

from app.core.config import GENAI_KEY
from app.core.pyodbc_connection import get_connection_string

# ------------------------------------------------------------------
# AI client (lazy — only initialized when first needed)
# ------------------------------------------------------------------
_client = None


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=GENAI_KEY, http_options={"api_version": "v1"})
    return _client


# ------------------------------------------------------------------
# 1. Data Models (DTOs)
# ------------------------------------------------------------------
@dataclass
class Picture:
    src: str
    alt: str


@dataclass
class Review:
    """Represents a RAW review from the old tables."""
    review_id: int
    title: str
    score: float
    positive_txt: str
    negative_txt: str
    posted_date: str | None
    reviewer_stay_date: str | None
    num_of_nights: int
    traveler_type: str
    room_name: str
    raw_review: str
    photo: List[Picture]


class ProcessedReview(BaseModel):
    """Represents a PROCESSED review for the new table."""
    id: str
    rating: int
    userName: str
    text: str
    sentiment: str
    categories: List[str]
    keyPhrases: List[str]
    date: Optional[date]
    status: str
    source: str
    photos: List[dict] = []


# ------------------------------------------------------------------
# 2. Database Operations
# ------------------------------------------------------------------

def fetch_reviews() -> List[Review]:
    """Fetch RAW reviews + photos from the source tables."""
    with pyodbc.connect(get_connection_string()) as conn:
        cur = conn.cursor()

        rows = cur.execute(
            "SELECT review_id, title, score, positive_txt, negative_txt, "
            "posted_date, reviewer_stay_date, num_of_nights, traveler_type, "
            "room_name, raw_review FROM reviews"
        ).fetchall()

        pics = cur.execute("SELECT review_id, src, alt FROM review_media").fetchall()

        photo_map: dict[int, List[Picture]] = {}
        for rev_id, src, alt in pics:
            photo_map.setdefault(rev_id, []).append(
                Picture(src=src or "", alt=alt or "")
            )

        reviews = []
        for r in rows:
            rev = Review(
                review_id=r.review_id,
                title=r.title or "",
                score=float(r.score or 0),
                positive_txt=r.positive_txt or "",
                negative_txt=r.negative_txt or "",
                posted_date=r.posted_date.isoformat() if r.posted_date else None,
                reviewer_stay_date=(
                    r.reviewer_stay_date.isoformat() if r.reviewer_stay_date else None
                ),
                num_of_nights=r.num_of_nights or 0,
                traveler_type=r.traveler_type or "",
                room_name=r.room_name or "",
                raw_review=r.raw_review or "",
                photo=photo_map.get(r.review_id, []),
            )
            reviews.append(rev)
    return reviews


def insert_processed_reviews(conn: pyodbc.Connection, rows: list[dict]) -> None:
    """Insert processed reviews into the ProcessedReviews SQL table."""
    sql = """
        INSERT INTO dbo.processed_review (
            id, platformReviewId, source, rating, userName, reviewerName,
            reviewText, [text], summary, sentiment, language, categories,
            keyPhrases, reviewDate, firstSeen, lastUpdated, scrapedAt,
            [status], replyStatus, hasReply
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """

    cur = conn.cursor()

    for r in rows:
        def parse_ts(ts_str):
            try:
                return datetime.strptime(ts_str, "%B %d, %Y at %I:%M %p")
            except (ValueError, TypeError):
                return None

        def parse_date(date_str):
            try:
                return datetime.strptime(date_str, "%b %d, %Y").date()
            except (ValueError, TypeError):
                return None

        sql_cat = "INSERT INTO dbo.ReviewCategory (id, review_id, category_name) VALUES (?, ?, ?)"

        categories_json = json.dumps(r.get("categories", []), ensure_ascii=False)
        key_phrases_json = json.dumps(r.get("keyPhrases", []), ensure_ascii=False)

        cur.execute(
            sql,
            r["id"],
            r.get("platformReviewId", ""),
            r.get("source", "Booking.com"),
            r["rating"],
            r.get("userName", ""),
            r.get("reviewerName", ""),
            r.get("reviewText", ""),
            r.get("text", ""),
            r.get("summary", ""),
            r.get("sentiment", "Neutral"),
            r.get("language", "English"),
            categories_json,
            key_phrases_json,
            parse_date(r.get("date")),
            parse_ts(r.get("firstSeen")),
            parse_ts(r.get("lastUpdated")),
            parse_ts(r.get("scrapedAt")),
            r.get("status", "Pending"),
            r.get("replyStatus", "Pending"),
            r.get("hasReply", "No"),
        )
        
        # Insert categories relation if available
        cats = r.get("categories", [])
        if isinstance(cats, list):
            import uuid
            for c in cats:
                cur.execute(sql_cat, str(uuid.uuid4()), r["id"], str(c))
                
    conn.commit()
    print(f"✓ Saved {len(rows)} processed reviews to SQL table.")


# ------------------------------------------------------------------
# 3. Prompt Logic
# ------------------------------------------------------------------
def strip_markdown_fences(text: str) -> str:
    pattern = r"^```(?:json)?\s*(.*?)\s*```$"
    match = re.search(pattern, text, re.DOTALL | re.MULTILINE)
    return match.group(1) if match else text


SYSTEM_PROMPT = """Role: You are an Advanced Review Data Processor and Sentiment Analyst for a generic Hotel Reputation Management SaaS.

Task: Analyze the provided raw review JSON data and transform it into a strictly formatted, enriched JSON array for our database.

Input Data: {hotel_data}

---

### TRANSFORMATION LOGIC & FIELD MAPPING

For each review object in the input, generate an output object using these specific rules. If a field is missing in the input, infer it logically or use the defaults provided below.

1. **id**: Generate an internal system ID using the format "REV-" followed by the original `review_id` padded to 3 digits (e.g., if review_id is 1, output "REV-001").
2. **rating**: The input `score` is out of 10. Divide by 2 to get a 5-star scale. Round to the nearest integer.
3. **userName**: Extract the name from the `raw_review` string. It is typically the first 1-2 words before the room type (e.g., from "AAppley MaldivesStandard Double...", extract "AAppley").
4. **reviewerName**: Duplicate of `userName`.
5. **text**: Combine `title`, `positive_txt`, and `negative_txt` into a single coherent paragraph. Format: "Title. Positive Text. Negative Text." (Ignore empty fields).
6. **reviewText**: Duplicate of `text`.
7. **sentiment**: Analyze the `text` and `rating`. Output exactly one: "Positive", "Neutral", "Negative".
   - Logic: Rating 4-5 = Positive; 3 = Neutral; 1-2 = Negative.
8. **categories**: Analyze the text and select 1-3 tags from this list: ["Cleanliness", "Staff", "Location", "Facilities", "Comfort", "Value", "Noise", "Food", "Privacy", "WiFi", "Room Size"].
9. **source**: Always "Booking.com".
10. **date**: Format `reviewer_stay_date` to "MMM DD, YYYY" (e.g., "Nov 15, 2025").
11. **keyPhrases**: Extract 3-5 short, punchy keywords or phrases from the text that highlight the user's experience (e.g., "weak wifi", "friendly staff", "small room").
12. **summary**: Write a one-sentence professional summary of the review (e.g., "Guest complained about room size and amenities but praised the location.").
13. **platformReviewId**: Format as "BK-" followed by the original `review_id` (e.g., "BK-2951273").
14. **language**: Detect language (e.g., "English"). Default to "English" if unsure.
15. **status**: Analyze the `raw_review`. If it contains a hotel response text, set to "Replied". If not, set to "Pending". (If unsure, default to "Pending").
16. **replyStatus**: Same as `status`.
17. **hasReply**: Set to "Yes" if status is "Replied", otherwise "No".
18. **Time Fields (`firstSeen`, `lastUpdated`, `scrapedAt`)**:
   - Since these are system timestamps not present in the raw data, generate a realistic timestamp based on the `posted_date`.
   - Set `scrapedAt` to the `posted_date` at "08:00 PM".
   - Set `firstSeen` to the `posted_date` at "09:00 AM".

---

### OUTPUT FORMAT

Return ONLY a valid JSON array. Do not include markdown formatting (```json) or introductory text.

[
  {{
    "id": "REV-001",
    "rating": 3,
    "userName": "AAppley",
    "reviewerName": "AAppley",
    "text": "Backpacker. Strong Wifi, Location and Hot water is good. The room size is very small...",
    "sentiment": "Neutral",
    "categories": ["Location", "WiFi", "Room Size"],
    "source": "Booking.com",
    "date": "Jul 01, 2023",
    "status": "Pending",
    "reviewText": "Backpacker. Strong Wifi, Location and Hot water is good. The room size is very small...",
    "keyPhrases": ["Strong Wifi", "Good Location", "Small Room"],
    "summary": "Guest appreciated the location and wifi but found the room size small and housekeeping lacking.",
    "platformReviewId": "BK-1",
    "language": "English",
    "replyStatus": "Pending",
    "firstSeen": "July 11, 2023 at 09:00 AM",
    "lastUpdated": "July 11, 2023 at 09:00 AM",
    "scrapedAt": "July 11, 2023 at 08:00 PM",
    "hasReply": "No"
  }}
]
"""


# ------------------------------------------------------------------
# 4. Main Execution
# ------------------------------------------------------------------
def main() -> None:
    """Run the full review processing pipeline."""
    # 1. Get Raw Data
    print("Fetching raw reviews from DB...")
    reviews = fetch_reviews()
    if not reviews:
        print("No reviews found in DB – aborting.")
        return
    print(f"Fetched {len(reviews)} raw reviews.")

    # 2. Prepare Prompt
    hotel_data = json.dumps([asdict(r) for r in reviews], ensure_ascii=False)
    prompt = SYSTEM_PROMPT.format(hotel_data=hotel_data)

    # 3. Call Gemini
    print("Sending data to Gemini for analysis...")
    try:
        response = _get_client().models.generate_content(
            model="gemini-2.5-flash-lite", contents=prompt
        )
    except Exception as e:
        print(f"Error calling Gemini: {e}")
        return

    # 4. Parse Response
    response_text = response.text
    clean_json_text = strip_markdown_fences(response_text)

    try:
        cleaned_rows = json.loads(clean_json_text)
        if not isinstance(cleaned_rows, list):
            raise ValueError("Response is not a JSON array")
    except json.JSONDecodeError as e:
        print(f"Failed to parse JSON: {e}")
        print("Raw response:", clean_json_text)
        return

    print("--- Analysis Complete ---")

    # 5. Save Results
    pathlib.Path("analyzed_data_frontend.json").write_text(
        json.dumps(cleaned_rows, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    with pyodbc.connect(get_connection_string()) as conn:
        insert_processed_reviews(conn, cleaned_rows)


if __name__ == "__main__":
    main()
