"""
Competitor Service Module
=========================
Handles all competitor-related database operations, scraping, AI processing,
and comparison analytics.

Moved from test/services/competitor_service.py — updated to use
core.pyodbc_connection and core.config.
"""

from __future__ import annotations
import json
import os
import re
from dataclasses import asdict
from datetime import datetime
from typing import List, Optional, Dict

import pyodbc
from google import genai

from app.core.config import GENAI_KEY
from app.core.pyodbc_connection import get_connection_string

# ------------------------------------------------------------------
# AI client (lazy — only initialized when first needed)
# ------------------------------------------------------------------
_genai_client = None


def _get_genai_client():
    global _genai_client
    if _genai_client is None:
        _genai_client = genai.Client(api_key=GENAI_KEY, http_options={"api_version": "v1"})
    return _genai_client


# ------------------------------------------------------------------
# 1. Database Operations — Competitors CRUD
# ------------------------------------------------------------------

def get_all_competitors() -> List[Dict]:
    """Return all competitors (both tracked and available)."""
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        rows = cursor.execute("""
            SELECT id, name, location, bookingUrl, avgRating, sentimentScore,
                   reviewCount, isTracked, status, createdAt
            FROM dbo.Competitors
            ORDER BY isTracked DESC, name ASC
        """).fetchall()

        return [
            {
                "id": r.id,
                "name": r.name,
                "location": r.location,
                "bookingUrl": r.bookingUrl,
                "avgRating": round(r.avgRating or 0, 2),
                "sentimentScore": round(r.sentimentScore or 0, 1),
                "reviewCount": r.reviewCount or 0,
                "isTracked": bool(r.isTracked),
                "status": r.status,
                "createdAt": r.createdAt.isoformat() if r.createdAt else None,
            }
            for r in rows
        ]


def get_tracked_competitors() -> List[Dict]:
    """Return only competitors the user is tracking."""
    all_comps = get_all_competitors()
    return [c for c in all_comps if c["isTracked"]]


def get_available_competitors() -> List[Dict]:
    """Return competitors available to add (not yet tracked)."""
    all_comps = get_all_competitors()
    return [c for c in all_comps if not c["isTracked"]]


def get_competitor_by_id(competitor_id: int) -> Optional[Dict]:
    """Return a single competitor by ID."""
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        row = cursor.execute("""
            SELECT id, name, location, bookingUrl, avgRating, sentimentScore,
                   reviewCount, isTracked, status, createdAt
            FROM dbo.Competitors WHERE id = ?
        """, competitor_id).fetchone()

        if not row:
            return None

        return {
            "id": row.id,
            "name": row.name,
            "location": row.location,
            "bookingUrl": row.bookingUrl,
            "avgRating": round(row.avgRating or 0, 2),
            "sentimentScore": round(row.sentimentScore or 0, 1),
            "reviewCount": row.reviewCount or 0,
            "isTracked": bool(row.isTracked),
            "status": row.status,
            "createdAt": row.createdAt.isoformat() if row.createdAt else None,
        }


def add_competitor(name: str, location: str, booking_url: str) -> Dict:
    """Add a new competitor to the available pool (admin action)."""
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO dbo.Competitors (name, location, bookingUrl, isTracked, status)
            OUTPUT INSERTED.id
            VALUES (?, ?, ?, 0, 'Pending')
        """, name, location, booking_url)
        new_id = cursor.fetchone()[0]
        conn.commit()

    return get_competitor_by_id(new_id)


def track_competitor(competitor_id: int) -> Optional[Dict]:
    """Mark a competitor as tracked (user action from Add modal)."""
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE dbo.Competitors SET isTracked = 1 WHERE id = ?
        """, competitor_id)
        conn.commit()

    return get_competitor_by_id(competitor_id)


def untrack_competitor(competitor_id: int) -> bool:
    """Untrack a competitor (user removes from their list)."""
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE dbo.Competitors SET isTracked = 0 WHERE id = ?
        """, competitor_id)
        conn.commit()
    return True


def delete_competitor(competitor_id: int) -> bool:
    """Permanently delete a competitor and all its reviews (admin action)."""
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM dbo.Competitors WHERE id = ?", competitor_id)
        conn.commit()
    return True


# ------------------------------------------------------------------
# 2. Database Operations — Competitor Reviews
# ------------------------------------------------------------------

def get_competitor_reviews(competitor_id: int) -> List[Dict]:
    """Get all processed reviews for a competitor."""
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        rows = cursor.execute("""
            SELECT id, competitorId, platformReviewId, rating, userName,
                   reviewText, summary, sentiment, categories, keyPhrases,
                   language, reviewDate, source
            FROM dbo.CompetitorReviews
            WHERE competitorId = ?
            ORDER BY reviewDate DESC
        """, competitor_id).fetchall()

        results = []
        for r in rows:
            try:
                cat_list = json.loads(r.categories) if r.categories else []
            except json.JSONDecodeError:
                cat_list = []
            try:
                phrase_list = json.loads(r.keyPhrases) if r.keyPhrases else []
            except json.JSONDecodeError:
                phrase_list = []

            results.append({
                "id": r.id,
                "competitorId": r.competitorId,
                "platformReviewId": r.platformReviewId,
                "rating": r.rating or 0,
                "userName": r.userName or "Anonymous",
                "reviewText": r.reviewText,
                "summary": r.summary,
                "sentiment": r.sentiment,
                "categories": cat_list,
                "keyPhrases": phrase_list,
                "language": r.language,
                "reviewDate": r.reviewDate.isoformat() if r.reviewDate else None,
                "source": r.source,
            })
        return results


def insert_competitor_reviews(conn: pyodbc.Connection, competitor_id: int, rows: List[Dict]) -> None:
    """Insert AI-processed reviews into CompetitorReviews table."""
    sql = """
        INSERT INTO dbo.CompetitorReviews (
            competitorId, platformReviewId, rating, userName, reviewText,
            summary, sentiment, categories, keyPhrases, language,
            reviewDate, source
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    cur = conn.cursor()
    for r in rows:
        def parse_date(date_str):
            try:
                return datetime.strptime(date_str, "%b %d, %Y").date()
            except (ValueError, TypeError):
                return None

        categories_json = json.dumps(r.get("categories", []), ensure_ascii=False)
        key_phrases_json = json.dumps(r.get("keyPhrases", []), ensure_ascii=False)

        cur.execute(
            sql,
            competitor_id,
            r.get("platformReviewId", ""),
            r.get("rating", 0),
            r.get("userName", ""),
            r.get("reviewText", r.get("text", "")),
            r.get("summary", ""),
            r.get("sentiment", "Neutral"),
            categories_json,
            key_phrases_json,
            r.get("language", "English"),
            parse_date(r.get("date")),
            r.get("source", "Booking.com"),
        )
    conn.commit()
    print(f"✓ Saved {len(rows)} competitor reviews to DB.")


def update_competitor_stats(competitor_id: int) -> None:
    """Recalculate and update a competitor's aggregate stats."""
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()

        row = cursor.execute("""
            SELECT
                COUNT(*) as cnt,
                AVG(CAST(rating AS FLOAT)) as avgRating,
                SUM(CASE WHEN sentiment = 'Positive' THEN 1 ELSE 0 END) * 100.0 /
                    NULLIF(COUNT(*), 0) as sentimentScore
            FROM dbo.CompetitorReviews
            WHERE competitorId = ?
        """, competitor_id).fetchone()

        if row and row.cnt > 0:
            cursor.execute("""
                UPDATE dbo.Competitors
                SET avgRating = ?, sentimentScore = ?, reviewCount = ?, status = 'Active'
                WHERE id = ?
            """, round(row.avgRating or 0, 2), round(row.sentimentScore or 0, 1), row.cnt, competitor_id)
            conn.commit()


# ------------------------------------------------------------------
# 3. Competitor Scraping + AI Processing
# ------------------------------------------------------------------

COMPETITOR_PROMPT = """Role: You are an Advanced Review Data Processor and Sentiment Analyst.

Task: Analyze the provided raw review JSON data from a competitor hotel and transform it into a structured JSON array.

Input Data: {hotel_data}

---

### TRANSFORMATION LOGIC

For each review object, generate an output object:

1. **platformReviewId**: Format as "BK-" followed by the original `review_id`.
2. **rating**: Input `score` is out of 10. Divide by 2, round to nearest integer (1-5 scale).
3. **userName**: Extract name from `raw_review`. Use first 1-2 words before room type. If unclear, use "Guest".
4. **text**: Combine `title`, `positive_txt`, `negative_txt` into one paragraph.
5. **reviewText**: Same as `text`.
6. **sentiment**: Based on rating. 4-5 = "Positive", 3 = "Neutral", 1-2 = "Negative".
7. **categories**: Select 1-3 from: ["Cleanliness", "Staff", "Location", "Facilities", "Comfort", "Value", "Noise", "Food", "Privacy", "WiFi", "Room Size"].
8. **keyPhrases**: Extract 3-5 short keywords/phrases from the text.
9. **summary**: One-sentence professional summary.
10. **date**: Format `reviewer_stay_date` to "MMM DD, YYYY" (e.g., "Nov 15, 2025").
11. **language**: Detect language, default "English".
12. **source**: Always "Booking.com".

### OUTPUT FORMAT
Return ONLY a valid JSON array. No markdown formatting.

[
  {{
    "platformReviewId": "BK-1",
    "rating": 4,
    "userName": "John",
    "text": "Great location and friendly staff...",
    "reviewText": "Great location and friendly staff...",
    "sentiment": "Positive",
    "categories": ["Location", "Staff"],
    "keyPhrases": ["Great location", "Friendly staff"],
    "summary": "Guest praised the location and staff service.",
    "date": "Nov 15, 2025",
    "language": "English",
    "source": "Booking.com"
  }}
]
"""


def strip_markdown_fences(text: str) -> str:
    """Remove markdown code fences from AI response."""
    pattern = r"^```(?:json)?\s*(.*?)\s*```$"
    match = re.search(pattern, text, re.DOTALL | re.MULTILINE)
    return match.group(1) if match else text


def process_competitor_scrape(competitor_id: int, url: str, headless: bool = True) -> None:
    """
    Full pipeline: scrape a competitor's Booking.com page, process with AI, save to DB.
    This runs as a background task.
    """
    from app.modules.reviews.scraper import scrape_booking_for_competitor

    print(f"[Competitor {competitor_id}] Starting scrape for {url}...")

    # Update status to 'Scraping'
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE dbo.Competitors SET status = 'Scraping' WHERE id = ?", competitor_id)
        conn.commit()

    try:
        # Step 1: Scrape raw reviews
        raw_reviews = scrape_booking_for_competitor(url, headless)

        if not raw_reviews:
            print(f"[Competitor {competitor_id}] No reviews scraped.")
            with pyodbc.connect(get_connection_string()) as conn:
                cursor = conn.cursor()
                cursor.execute("UPDATE dbo.Competitors SET status = 'Active' WHERE id = ?", competitor_id)
                conn.commit()
            return

        print(f"[Competitor {competitor_id}] Scraped {len(raw_reviews)} raw reviews. Processing with AI...")

        # Step 2: Send to Gemini for AI processing
        hotel_data = json.dumps([asdict(r) for r in raw_reviews], ensure_ascii=False)
        prompt = COMPETITOR_PROMPT.format(hotel_data=hotel_data)

        response = _get_genai_client().models.generate_content(
            model="gemini-2.5-flash-lite", contents=prompt
        )

        clean_json_text = strip_markdown_fences(response.text)
        processed_reviews = json.loads(clean_json_text)

        if not isinstance(processed_reviews, list):
            raise ValueError("AI response is not a JSON array")

        print(f"[Competitor {competitor_id}] AI processed {len(processed_reviews)} reviews.")

        # Step 3: Clear old reviews and insert new ones
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM dbo.CompetitorReviews WHERE competitorId = ?", competitor_id)
            conn.commit()
            insert_competitor_reviews(conn, competitor_id, processed_reviews)

        # Step 4: Update competitor stats
        update_competitor_stats(competitor_id)

        print(f"[Competitor {competitor_id}] Pipeline complete!")

    except Exception as e:
        print(f"[Competitor {competitor_id}] Error in pipeline: {e}")
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE dbo.Competitors SET status = 'Error' WHERE id = ?", competitor_id)
            conn.commit()
