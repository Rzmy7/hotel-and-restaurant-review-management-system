"""
Competitor scraping pipeline — scrape → Gemini AI → DB.
Extracted from modules/competitors/service.py (scraping section).
"""

from __future__ import annotations
import json
import re
from dataclasses import asdict
from datetime import datetime
from typing import List, Dict
import uuid

import pyodbc
from google import genai

from app.core.config import GENAI_KEY
from app.core.pyodbc_connection import get_connection_string
from app.modules.competitors.ai.prompts import COMPETITOR_PROMPT

_genai_client = None


def _get_genai_client():
    global _genai_client
    if _genai_client is None:
        _genai_client = genai.Client(
            api_key=GENAI_KEY, http_options={"api_version": "v1"}
        )
    return _genai_client


def _strip_markdown_fences(text: str) -> str:
    pattern = r"^```(?:json)?\s*(.*?)\s*```$"
    match = re.search(pattern, text, re.DOTALL | re.MULTILINE)
    return match.group(1) if match else text


def _insert_competitor_reviews(
    conn: pyodbc.Connection, competitor_id: str, rows: List[Dict]
) -> None:
    """Insert AI-processed reviews into CompetitorReviews table and ReviewCategory."""
    sql = """
        INSERT INTO dbo.CompetitorReviews (
            id, competitorId, platformReviewId, rating, userName, reviewText,
            summary, sentiment, categories, keyPhrases, language,
            reviewDate, source
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    sql_cats = "INSERT INTO dbo.ReviewCategory (id, competitor_review_id, category_name) VALUES (?, ?, ?)"
    cur = conn.cursor()
    for r in rows:

        def parse_date(date_str):
            try:
                return datetime.strptime(date_str, "%b %d, %Y").date()
            except (ValueError, TypeError):
                return None

        rev_id = str(uuid.uuid4())
        cur.execute(
            sql,
            rev_id,
            competitor_id,
            r.get("platformReviewId", ""),
            r.get("rating", 0),
            r.get("userName", ""),
            r.get("reviewText", r.get("text", "")),
            r.get("summary", ""),
            r.get("sentiment", "Neutral"),
            json.dumps(r.get("categories", []), ensure_ascii=False),
            json.dumps(r.get("keyPhrases", []), ensure_ascii=False),
            r.get("language", "English"),
            parse_date(r.get("date")),
            r.get("source", "Booking.com"),
        )

        cats = r.get("categories", [])
        if isinstance(cats, list):
            for c in cats:
                cur.execute(sql_cats, str(uuid.uuid4()), rev_id, str(c))
    conn.commit()
    print(f"✓ Saved {len(rows)} competitor reviews to DB.")


def _update_competitor_stats(competitor_id: str) -> None:
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        row = cursor.execute(
            """
            SELECT
                COUNT(*) as cnt,
                AVG(CAST(rating AS FLOAT)) as avgRating,
                SUM(CASE WHEN sentiment = 'Positive' THEN 1 ELSE 0 END) * 100.0 /
                    NULLIF(COUNT(*), 0) as sentimentScore
            FROM dbo.CompetitorReviews
            WHERE competitorId = ?
        """,
            competitor_id,
        ).fetchone()

        if row and row.cnt > 0:
            cursor.execute(
                """
                UPDATE dbo.Competitors
                SET avgRating = ?, sentimentScore = ?, reviewCount = ?, status = 'Active'
                WHERE id = ?
            """,
                round(row.avgRating or 0, 2),
                round(row.sentimentScore or 0, 1),
                row.cnt,
                competitor_id,
            )
            conn.commit()


def process_competitor_scrape(
    competitor_id: str, url: str, headless: bool = True
) -> None:
    """Full pipeline: scrape → AI process → save to DB. Runs as a background task."""
    from app.modules.reviews.scraper import scrape_booking_for_competitor

    print(f"[Competitor {competitor_id}] Starting scrape for {url}...")

    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE dbo.Competitors SET status = 'Scraping' WHERE id = ?", competitor_id
        )
        conn.commit()

    try:
        raw_reviews = scrape_booking_for_competitor(url, headless)

        if not raw_reviews:
            print(f"[Competitor {competitor_id}] No reviews scraped.")
            with pyodbc.connect(get_connection_string()) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE dbo.Competitors SET status = 'Active' WHERE id = ?",
                    competitor_id,
                )
                conn.commit()
            return

        print(
            f"[Competitor {competitor_id}] Scraped {len(raw_reviews)} raw reviews. AI processing..."
        )

        hotel_data = json.dumps([asdict(r) for r in raw_reviews], ensure_ascii=False)
        prompt = COMPETITOR_PROMPT.format(hotel_data=hotel_data)

        response = _get_genai_client().models.generate_content(
            model="gemini-2.5-flash-lite", contents=prompt
        )

        processed_reviews = json.loads(_strip_markdown_fences(response.text))
        if not isinstance(processed_reviews, list):
            raise ValueError("AI response is not a JSON array")

        print(
            f"[Competitor {competitor_id}] AI processed {len(processed_reviews)} reviews."
        )

        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "DELETE FROM dbo.CompetitorReviews WHERE competitorId = ?",
                competitor_id,
            )
            conn.commit()
            _insert_competitor_reviews(conn, competitor_id, processed_reviews)

        _update_competitor_stats(competitor_id)
        print(f"[Competitor {competitor_id}] Pipeline complete!")

    except Exception as e:
        print(f"[Competitor {competitor_id}] Error in pipeline: {e}")
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE dbo.Competitors SET status = 'Error' WHERE id = ?",
                competitor_id,
            )
            conn.commit()
