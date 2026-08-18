"""
Competitor scraping pipeline — scrape → LLM AI → DB.
Extracted from modules/competitors/service.py (scraping section).
Inserts reviews directly into dbo.processed_review and dbo.review_category.
"""

from __future__ import annotations
import json
import re
from dataclasses import asdict
from datetime import datetime
from typing import List, Dict
import uuid

import pyodbc

from app.core.pyodbc_connection import get_connection_string
from app.modules.competitors.ai.prompts import COMPETITOR_PROMPT
from app.services.llm_gateway import call as gateway_call


def _strip_markdown_fences(text: str) -> str:
    pattern = r"^```(?:json)?\s*(.*?)\s*```$"
    match = re.search(pattern, text, re.DOTALL | re.MULTILINE)
    return match.group(1) if match else text


def _insert_competitor_reviews(conn: pyodbc.Connection, source_id: str, rows: List[Dict]) -> None:
    """Insert AI-processed reviews into dbo.processed_review and dbo.review_category."""
    sql = """
        INSERT INTO dbo.processed_review (
            id, source_id, rating, reviewDate, heading, author, reviewText,
            summary, sentiment, categories, keyPhrases, language,
            source, status, scrapedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'processed', GETDATE())
    """
    sql_cats = "INSERT INTO dbo.review_category (id, review_id, name, score, created_at) VALUES (?, ?, ?, ?, GETDATE())"
    cur = conn.cursor()
    for r in rows:
        def parse_date(date_str):
            try:
                return datetime.strptime(date_str, "%b %d, %Y").date()
            except (ValueError, TypeError):
                return None

        rev_id = uuid.uuid4()
        rating_val = float(r.get("rating", 0) or 0)
        cur.execute(
            sql,
            rev_id,
            source_id,
            rating_val,
            parse_date(r.get("date")),
            r.get("heading", ""),
            r.get("userName", ""),
            r.get("reviewText", r.get("text", "")),
            r.get("summary", ""),
            r.get("sentiment", "Neutral"),
            json.dumps(r.get("categories", []), ensure_ascii=False),
            json.dumps(r.get("keyPhrases", []), ensure_ascii=False),
            r.get("language", "English"),
            r.get("source", "Booking.com"),
        )
        
        cats = r.get("categories", [])
        if isinstance(cats, list):
            for c in cats:
                cat_name = c if isinstance(c, str) else str(c)
                cur.execute(sql_cats, uuid.uuid4(), rev_id, cat_name, rating_val)
    conn.commit()
    print(f"[SUCCESS] Saved {len(rows)} competitor reviews to dbo.processed_review.")


def process_competitor_scrape(competitor_id: str, url: str, headless: bool = True) -> None:
    """Full pipeline: scrape → AI process → save to dbo.processed_review. Runs as a background task."""
    from app.modules.reviews.scraper import scrape_booking_for_competitor

    print(f"[Competitor {competitor_id}] Starting scrape for {url}...")

    # Look up competitor organization and source_id
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        row = cursor.execute("""
            SELECT c.competitor_organization_id, s.source_id
            FROM dbo.Competitors c
            LEFT JOIN dbo.source s ON s.organization_id = c.competitor_organization_id
            WHERE c.id = ?
        """, competitor_id).fetchone()

        if not row or not row.competitor_organization_id:
            print(f"[Competitor {competitor_id}] Competitor organization not found.")
            return

        source_id = row.source_id
        if not source_id:
            # Create a source row for this competitor organization if missing
            source_id = uuid.uuid4()
            cursor.execute("""
                INSERT INTO dbo.source (source_id, organization_id, source_url, source_status, fetching_frequency, created_at)
                VALUES (?, ?, ?, 'active', 2, GETDATE())
            """, source_id, row.competitor_organization_id, url)
            conn.commit()

    try:
        raw_reviews = scrape_booking_for_competitor(url, headless)

        if not raw_reviews:
            print(f"[Competitor {competitor_id}] No reviews scraped.")
            return

        print(f"[Competitor {competitor_id}] Scraped {len(raw_reviews)} raw reviews. AI processing...")

        hotel_data = json.dumps([asdict(r) for r in raw_reviews], ensure_ascii=False)
        prompt = COMPETITOR_PROMPT.format(hotel_data=hotel_data)

        response_text = gateway_call("competitor_analysis", prompt)
        processed_reviews = json.loads(_strip_markdown_fences(response_text))
        if not isinstance(processed_reviews, list):
            raise ValueError("AI response is not a JSON array")

        print(f"[Competitor {competitor_id}] AI processed {len(processed_reviews)} reviews.")

        with pyodbc.connect(get_connection_string()) as conn:
            _insert_competitor_reviews(conn, str(source_id), processed_reviews)

        print(f"[Competitor {competitor_id}] Pipeline complete!")

    except Exception as e:
        print(f"[Competitor {competitor_id}] Error in pipeline: {e}")
