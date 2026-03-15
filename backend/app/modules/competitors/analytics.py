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
from app.modules.competitors.service import get_competitor_by_id


# ------------------------------------------------------------------
# 4. Comparison Analytics
# ------------------------------------------------------------------

def get_my_hotel_stats() -> Dict:
    """Get aggregate stats for the user's own hotel from ProcessedReviews."""
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()

        row = cursor.execute("""
            SELECT
                COUNT(*) as cnt,
                AVG(CAST(rating AS FLOAT)) as avgRating,
                SUM(CASE WHEN sentiment = 'Positive' THEN 1 ELSE 0 END) as positive,
                SUM(CASE WHEN sentiment = 'Negative' THEN 1 ELSE 0 END) as negative,
                SUM(CASE WHEN sentiment = 'Neutral' THEN 1 ELSE 0 END) as neutral
            FROM dbo.ProcessedReviews
        """).fetchone()

        cnt = row.cnt or 0
        return {
            "reviewCount": cnt,
            "avgRating": round(row.avgRating or 0, 2),
            "positiveCount": row.positive or 0,
            "negativeCount": row.negative or 0,
            "neutralCount": row.neutral or 0,
            "positivePercent": round((row.positive or 0) / cnt * 100, 1) if cnt > 0 else 0,
            "negativePercent": round((row.negative or 0) / cnt * 100, 1) if cnt > 0 else 0,
        }


def get_competitor_stats(competitor_id: int) -> Dict:
    """Get aggregate stats for a competitor."""
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()

        row = cursor.execute("""
            SELECT
                COUNT(*) as cnt,
                AVG(CAST(rating AS FLOAT)) as avgRating,
                SUM(CASE WHEN sentiment = 'Positive' THEN 1 ELSE 0 END) as positive,
                SUM(CASE WHEN sentiment = 'Negative' THEN 1 ELSE 0 END) as negative,
                SUM(CASE WHEN sentiment = 'Neutral' THEN 1 ELSE 0 END) as neutral
            FROM dbo.CompetitorReviews
            WHERE competitorId = ?
        """, competitor_id).fetchone()

        cnt = row.cnt or 0
        return {
            "reviewCount": cnt,
            "avgRating": round(row.avgRating or 0, 2),
            "positiveCount": row.positive or 0,
            "negativeCount": row.negative or 0,
            "neutralCount": row.neutral or 0,
            "positivePercent": round((row.positive or 0) / cnt * 100, 1) if cnt > 0 else 0,
            "negativePercent": round((row.negative or 0) / cnt * 100, 1) if cnt > 0 else 0,
        }


def get_category_scores(table: str, where_clause: str = "", params: list = None) -> Dict[str, float]:
    """Calculate average rating per category from a reviews table."""
    if params is None:
        params = []

    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()

        query = f"SELECT rating, categories FROM {table}"
        if where_clause:
            query += f" WHERE {where_clause}"

        rows = cursor.execute(query, *params).fetchall()

    category_totals: Dict[str, List[float]] = {}
    for r in rows:
        try:
            cats = json.loads(r.categories) if r.categories else []
        except json.JSONDecodeError:
            cats = []

        rating = r.rating or 0
        for cat in cats:
            category_totals.setdefault(cat, []).append(rating)

    return {
        cat: round(sum(vals) / len(vals), 2)
        for cat, vals in category_totals.items()
        if vals
    }


def get_monthly_ratings(table: str, date_col: str, where_clause: str = "", params: list = None) -> List[Dict]:
    """Get average rating grouped by month for trend chart."""
    if params is None:
        params = []

    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()

        query = f"""
            SELECT
                FORMAT({date_col}, 'yyyy-MM') as month,
                AVG(CAST(rating AS FLOAT)) as avgRating,
                COUNT(*) as cnt
            FROM {table}
            WHERE {date_col} IS NOT NULL
        """
        if where_clause:
            query += f" AND {where_clause}"
        query += f" GROUP BY FORMAT({date_col}, 'yyyy-MM') ORDER BY month"

        rows = cursor.execute(query, *params).fetchall()

    return [
        {
            "month": r.month,
            "avgRating": round(r.avgRating, 2),
            "count": r.cnt,
        }
        for r in rows
    ]


def get_comparison_data(competitor_id: int) -> Optional[Dict]:
    """Build the full comparison dataset between the user's hotel and a competitor."""
    competitor = get_competitor_by_id(competitor_id)
    if not competitor:
        return None

    my_stats = get_my_hotel_stats()
    comp_stats = get_competitor_stats(competitor_id)

    # Category scores
    my_categories = get_category_scores("dbo.ProcessedReviews")
    comp_categories = get_category_scores(
        "dbo.CompetitorReviews", "competitorId = ?", [competitor_id]
    )

    all_cats = sorted(set(list(my_categories.keys()) + list(comp_categories.keys())))
    aspect_data = [
        {
            "subject": cat,
            "myHotel": my_categories.get(cat, 0),
            "competitor": comp_categories.get(cat, 0),
            "fullMark": 5,
        }
        for cat in all_cats
    ]

    # Monthly rating trends
    my_trend = get_monthly_ratings("dbo.ProcessedReviews", "reviewDate")
    comp_trend = get_monthly_ratings(
        "dbo.CompetitorReviews", "reviewDate", "competitorId = ?", [competitor_id]
    )

    trend_months = sorted(set(
        [t["month"] for t in my_trend] + [t["month"] for t in comp_trend]
    ))
    my_trend_map = {t["month"]: t["avgRating"] for t in my_trend}
    comp_trend_map = {t["month"]: t["avgRating"] for t in comp_trend}

    def month_label(ym: str) -> str:
        try:
            return datetime.strptime(ym, "%Y-%m").strftime("%b")
        except ValueError:
            return ym

    trend_data = [
        {
            "name": month_label(m),
            "myHotel": my_trend_map.get(m, None),
            "competitor": comp_trend_map.get(m, None),
        }
        for m in trend_months[-7:]
    ]

    # Sentiment distribution
    sentiment_data = [
        {"name": "Positive", "myHotel": my_stats["positiveCount"], "competitor": comp_stats["positiveCount"]},
        {"name": "Neutral", "myHotel": my_stats["neutralCount"], "competitor": comp_stats["neutralCount"]},
        {"name": "Negative", "myHotel": my_stats["negativeCount"], "competitor": comp_stats["negativeCount"]},
    ]

    # KPI cards
    rating_gap = round(my_stats["avgRating"] - comp_stats["avgRating"], 2)
    review_gap = my_stats["reviewCount"] - comp_stats["reviewCount"]
    positive_gap = round(my_stats["positivePercent"] - comp_stats["positivePercent"], 1)
    negative_gap = round(my_stats["negativePercent"] - comp_stats["negativePercent"], 1)

    return {
        "competitor": competitor,
        "kpis": {
            "avgRating": {"myHotel": my_stats["avgRating"], "competitor": comp_stats["avgRating"], "gap": rating_gap},
            "reviewCount": {"myHotel": my_stats["reviewCount"], "competitor": comp_stats["reviewCount"], "gap": review_gap},
            "positivePercent": {"myHotel": my_stats["positivePercent"], "competitor": comp_stats["positivePercent"], "gap": positive_gap},
            "negativePercent": {"myHotel": my_stats["negativePercent"], "competitor": comp_stats["negativePercent"], "gap": negative_gap},
        },
        "aspectData": aspect_data,
        "trendData": trend_data,
        "sentimentData": sentiment_data,
    }


def get_rankings_data() -> Dict:
    """Build rankings: user's hotel + all tracked competitors, sorted by avgRating."""
    my_stats = get_my_hotel_stats()
    tracked = get_tracked_competitors()

    entries = [
        {
            "name": "My Hotel",
            "isYou": True,
            "rating": my_stats["avgRating"],
            "sentiment": my_stats["positivePercent"],
            "reviews": my_stats["reviewCount"],
        }
    ]

    for c in tracked:
        entries.append({
            "name": c["name"],
            "isYou": False,
            "rating": c["avgRating"],
            "sentiment": c["sentimentScore"],
            "reviews": c["reviewCount"],
        })

    entries.sort(key=lambda x: x["rating"], reverse=True)

    for i, entry in enumerate(entries):
        entry["rank"] = i + 1

    your_rank = next((e["rank"] for e in entries if e["isYou"]), 0)
    top_performer = entries[0] if entries else None

    return {
        "rankings": entries,
        "yourRank": your_rank,
        "totalCompetitors": len(tracked),
        "topPerformer": top_performer,
    }


# ------------------------------------------------------------------
# 5. AI Comparison Insights
# ------------------------------------------------------------------

COMPARISON_INSIGHT_PROMPT = """You are an AI hospitality analyst. Given the comparison data between "My Hotel" and a competitor hotel "{competitor_name}", generate competitive insights.

Data:
- My Hotel: avg rating {my_rating}, {my_reviews} reviews, {my_positive}% positive, {my_negative}% negative
- {competitor_name}: avg rating {comp_rating}, {comp_reviews} reviews, {comp_positive}% positive, {comp_negative}% negative

My Hotel category scores: {my_categories}
Competitor category scores: {comp_categories}

Generate EXACTLY this JSON structure:
{{
  "strengths": ["list of 2-3 areas where My Hotel is stronger"],
  "weaknesses": ["list of 2-3 areas where the competitor is stronger"],
  "recommendations": ["list of 2-3 actionable recommendations to improve"],
  "tags": [
    {{"label": "strength area", "type": "positive"}},
    {{"label": "weakness area", "type": "warning"}}
  ]
}}

Return ONLY valid JSON. No markdown.
"""


def get_ai_comparison_insights(competitor_id: int) -> Dict:
    """Generate real-time AI insights comparing your hotel vs a competitor."""
    competitor = get_competitor_by_id(competitor_id)
    if not competitor:
        return {"error": "Competitor not found"}

    my_stats = get_my_hotel_stats()
    comp_stats = get_competitor_stats(competitor_id)
    my_cats = get_category_scores("dbo.ProcessedReviews")
    comp_cats = get_category_scores(
        "dbo.CompetitorReviews", "competitorId = ?", [competitor_id]
    )

    prompt = COMPARISON_INSIGHT_PROMPT.format(
        competitor_name=competitor["name"],
        my_rating=my_stats["avgRating"],
        my_reviews=my_stats["reviewCount"],
        my_positive=my_stats["positivePercent"],
        my_negative=my_stats["negativePercent"],
        comp_rating=comp_stats["avgRating"],
        comp_reviews=comp_stats["reviewCount"],
        comp_positive=comp_stats["positivePercent"],
        comp_negative=comp_stats["negativePercent"],
        my_categories=json.dumps(my_cats),
        comp_categories=json.dumps(comp_cats),
    )

    try:
        response = _get_genai_client().models.generate_content(
            model="gemini-2.5-flash-lite", contents=prompt
        )
        clean_text = strip_markdown_fences(response.text)
        insights = json.loads(clean_text)
        return insights
    except Exception as e:
        print(f"AI Insights Error: {e}")
        return {
            "strengths": ["Unable to generate insights at this time."],
            "weaknesses": [],
            "recommendations": [],
            "tags": [],
        }

