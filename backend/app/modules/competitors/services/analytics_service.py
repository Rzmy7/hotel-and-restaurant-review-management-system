"""
Competitor analytics service — comparison stats + AI insights.

All queries now read from dbo.processed_review filtered by organization_id,
instead of from the legacy dbo.CompetitorReviews table.
"""

from __future__ import annotations
import json
import re
from datetime import datetime
from typing import List, Optional, Dict

import pyodbc
from google import genai

from app.core.config import GENAI_KEY
from app.core.pyodbc_connection import connect_db
from app.modules.competitors.ai.prompts import COMPARISON_INSIGHT_PROMPT
from app.modules.competitors.services.competitor_service import (
    get_competitor_by_id,
    get_tracked_competitors,
)

_genai_client = None


def _get_genai_client():
    global _genai_client
    if _genai_client is None:
        _genai_client = genai.Client(api_key=GENAI_KEY, http_options={"api_version": "v1"})
    return _genai_client


def _strip_markdown_fences(text: str) -> str:
    pattern = r"^```(?:json)?\s*(.*?)\s*```$"
    match = re.search(pattern, text, re.DOTALL | re.MULTILINE)
    return match.group(1) if match else text


def _get_review_stats(org_id: str) -> Dict:
    """Generic stats for any organization_id from processed_review."""
    with connect_db() as conn:
        cursor = conn.cursor()
        row = cursor.execute("""
            SELECT
                COUNT(*) as cnt,
                AVG(CAST(pr.rating AS FLOAT)) as avgRating,
                SUM(CASE WHEN pr.sentiment = 'Positive' THEN 1 ELSE 0 END) as positive,
                SUM(CASE WHEN pr.sentiment = 'Negative' THEN 1 ELSE 0 END) as negative,
                SUM(CASE WHEN pr.sentiment = 'Neutral' THEN 1 ELSE 0 END) as neutral
            FROM dbo.processed_review pr
            JOIN dbo.source s ON pr.source_id = s.source_id
            WHERE s.organization_id = ?
        """, org_id).fetchone()
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


def get_my_hotel_stats(my_org_id: str) -> Dict:
    return _get_review_stats(my_org_id)


def get_competitor_stats(competitor_id: str) -> Dict:
    competitor = get_competitor_by_id(competitor_id)
    if not competitor or not competitor.get("organization_id"):
        return {"reviewCount": 0, "avgRating": 0, "positiveCount": 0,
                "negativeCount": 0, "neutralCount": 0,
                "positivePercent": 0, "negativePercent": 0}
    return _get_review_stats(competitor["organization_id"])


def get_category_scores(org_id: str) -> Dict[str, float]:
    """Average category scores for an organization via ReviewCategory JOIN."""
    with connect_db() as conn:
        cursor = conn.cursor()
        # First try the relational ReviewCategory table (populated by new pipeline)
        try:
            rows = cursor.execute("""
                SELECT rc.category_name, AVG(CAST(r.rating AS FLOAT)) as avgScore
                FROM dbo.processed_review r
                JOIN dbo.source s ON r.source_id = s.source_id
                JOIN dbo.ReviewCategory rc ON r.id = rc.review_id
                WHERE s.organization_id = ?
                GROUP BY rc.category_name
            """, org_id).fetchall()

            if rows:
                return {r.category_name: round(r.avgScore or 0, 2) for r in rows if r.category_name}
        except Exception:
            pass  # ReviewCategory table doesn't exist yet; use JSON fallback below

        # Fallback: parse JSON categories column (for existing data)
        rows = cursor.execute("""
            SELECT pr.rating, pr.categories
            FROM dbo.processed_review pr
            JOIN dbo.source s ON pr.source_id = s.source_id
            WHERE s.organization_id = ?
              AND pr.categories IS NOT NULL
        """, org_id).fetchall()

    totals: Dict[str, List[float]] = {}
    for r in rows:
        try:
            cats = json.loads(r.categories) if r.categories else []
        except Exception:
            cats = []
        for cat in cats:
            # categories can be stored as plain strings OR as dicts like {"name": "Cleanliness"}
            if isinstance(cat, dict):
                cat_name = cat.get("name") or cat.get("category") or cat.get("type") or ""
            else:
                cat_name = str(cat)
            if cat_name:
                totals.setdefault(cat_name, []).append(r.rating or 0)

    return {cat: round(sum(v) / len(v), 2) for cat, v in totals.items() if v}


def get_monthly_ratings(org_id: str) -> List[Dict]:
    with connect_db() as conn:
        cursor = conn.cursor()
        rows = cursor.execute("""
            SELECT
                FORMAT(pr.reviewDate, 'yyyy-MM') as month,
                AVG(CAST(pr.rating AS FLOAT)) as avgRating,
                COUNT(*) as cnt
            FROM dbo.processed_review pr
            JOIN dbo.source s ON pr.source_id = s.source_id
            WHERE pr.reviewDate IS NOT NULL
              AND s.organization_id = ?
            GROUP BY FORMAT(pr.reviewDate, 'yyyy-MM')
            ORDER BY month
        """, org_id).fetchall()
    return [{"month": r.month, "avgRating": round(r.avgRating, 2), "count": r.cnt} for r in rows]


def get_comparison_data(competitor_id: str, my_org_id: str) -> Optional[Dict]:
    competitor = get_competitor_by_id(competitor_id)
    if not competitor or not competitor.get("organization_id"):
        return None

    comp_org_id = competitor["organization_id"]

    my_stats = get_my_hotel_stats(my_org_id)
    comp_stats = _get_review_stats(comp_org_id)
    my_categories = get_category_scores(my_org_id)
    comp_categories = get_category_scores(comp_org_id)

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

    my_trend = get_monthly_ratings(my_org_id)
    comp_trend = get_monthly_ratings(comp_org_id)

    trend_months = sorted(set([t["month"] for t in my_trend] + [t["month"] for t in comp_trend]))
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
            "myHotel": my_trend_map.get(m),
            "competitor": comp_trend_map.get(m),
        }
        for m in trend_months[-7:]
    ]

    # Fetch the user's org name for display
    with connect_db() as conn:
        cursor = conn.cursor()
        row = cursor.execute(
            "SELECT organization_name FROM dbo.organization WHERE organization_id = ?", my_org_id
        ).fetchone()
    my_org_name = row.organization_name if row else "My Organization"

    return {
        "competitor": competitor,
        "myOrganizationName": my_org_name,
        "kpis": {
            "avgRating": {"myHotel": my_stats["avgRating"], "competitor": comp_stats["avgRating"],
                          "gap": round(my_stats["avgRating"] - comp_stats["avgRating"], 2)},
            "reviewCount": {"myHotel": my_stats["reviewCount"], "competitor": comp_stats["reviewCount"],
                            "gap": my_stats["reviewCount"] - comp_stats["reviewCount"]},
            "positivePercent": {"myHotel": my_stats["positivePercent"], "competitor": comp_stats["positivePercent"],
                                "gap": round(my_stats["positivePercent"] - comp_stats["positivePercent"], 1)},
            "negativePercent": {"myHotel": my_stats["negativePercent"], "competitor": comp_stats["negativePercent"],
                                "gap": round(my_stats["negativePercent"] - comp_stats["negativePercent"], 1)},
        },
        "aspectData": aspect_data,
        "trendData": trend_data,
        "sentimentData": [
            {"name": "Positive", "myHotel": my_stats["positiveCount"], "competitor": comp_stats["positiveCount"]},
            {"name": "Neutral", "myHotel": my_stats["neutralCount"], "competitor": comp_stats["neutralCount"]},
            {"name": "Negative", "myHotel": my_stats["negativeCount"], "competitor": comp_stats["negativeCount"]},
        ],
    }


def get_rankings_data(my_org_id: str) -> Dict:
    """Build the full rankings list including my hotel and all tracked competitors."""
    my_stats = _get_review_stats(my_org_id)
    tracked = get_tracked_competitors()

    # Fetch name for my org
    with connect_db() as conn:
        cursor = conn.cursor()
        row = cursor.execute(
            "SELECT organization_name FROM dbo.organization WHERE organization_id = ?", my_org_id
        ).fetchone()
    my_name = row.organization_name if row else "My Hotel"

    entries = [{
        "name": my_name,
        "isYou": True,
        "rating": my_stats["avgRating"],
        "sentiment": my_stats["positivePercent"],
        "reviews": my_stats["reviewCount"],
    }]

    for c in tracked:
        if c.get("organization_id"):
            stats = _get_review_stats(c["organization_id"])
        else:
            stats = {"avgRating": c["avgRating"], "positivePercent": c["sentimentScore"], "reviewCount": c["reviewCount"]}

        entries.append({
            "name": c["name"],
            "isYou": False,
            "rating": stats["avgRating"],
            "sentiment": stats["positivePercent"],
            "reviews": stats["reviewCount"],
        })

    entries.sort(key=lambda x: x["rating"], reverse=True)
    for i, entry in enumerate(entries):
        entry["rank"] = i + 1

    your_rank = next((e["rank"] for e in entries if e["isYou"]), 0)
    return {
        "rankings": entries,
        "yourRank": your_rank,
        "totalCompetitors": len(tracked),
        "topPerformer": entries[0] if entries else None,
    }


def get_ai_comparison_insights(competitor_id: str, my_org_id: str) -> Dict:
    competitor = get_competitor_by_id(competitor_id)
    if not competitor or not competitor.get("organization_id"):
        return {"error": "Competitor not found"}

    my_stats = get_my_hotel_stats(my_org_id)
    comp_stats = _get_review_stats(competitor["organization_id"])
    my_cats = get_category_scores(my_org_id)
    comp_cats = get_category_scores(competitor["organization_id"])

    prompt = COMPARISON_INSIGHT_PROMPT.format(
        competitor_name=competitor["name"],
        my_rating=my_stats["avgRating"], my_reviews=my_stats["reviewCount"],
        my_positive=my_stats["positivePercent"], my_negative=my_stats["negativePercent"],
        comp_rating=comp_stats["avgRating"], comp_reviews=comp_stats["reviewCount"],
        comp_positive=comp_stats["positivePercent"], comp_negative=comp_stats["negativePercent"],
        my_categories=json.dumps(my_cats), comp_categories=json.dumps(comp_cats),
    )

    try:
        response = _get_genai_client().models.generate_content(model="gemini-2.5-flash-lite", contents=prompt)
        return json.loads(_strip_markdown_fences(response.text))
    except Exception as e:
        print(f"AI Insights Error: {e}")
        return {"strengths": ["Unable to generate insights at this time."],
                "weaknesses": [], "recommendations": [], "tags": []}
