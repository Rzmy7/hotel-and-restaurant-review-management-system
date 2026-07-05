"""Insights service — keyword extraction and AI-powered action generation."""

import json
import re
from typing import List, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import text
from google import genai
from app.core.config import GENAI_KEY

_genai_client = None


def _get_genai_client():
    global _genai_client
    if _genai_client is None:
        _genai_client = genai.Client(
            api_key=GENAI_KEY, http_options={"api_version": "v1"}
        )
    return _genai_client


def _parse_categories(raw) -> list:
    """Parse the categories JSON column into a list of strings."""
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            result = []
            for c in parsed:
                if not c:
                    continue
                if isinstance(c, dict):
                    name = c.get("name", "")
                    if name:
                        result.append(str(name).strip())
                else:
                    result.append(str(c).strip())
            return [r for r in result if r]
    except Exception:
        pass
    return []


# ──────────────────────────────────────────────────────────────────────
# 1. Keyword Extraction
# ──────────────────────────────────────────────────────────────────────


def get_keywords(
    db: Session, org_id: str, period_days: int = 30
) -> Dict[str, list]:
    """
    Extract top positive and negative keywords from review categories,
    grouped by sentiment polarity within the given time window.

    Returns:
        {
            "positiveKeywords": [{"word": str, "count": int}, ...],
            "negativeKeywords": [{"word": str, "count": int}, ...],
        }
    """
    from datetime import datetime, timedelta

    if period_days <= 0:
        period_days = 90  # sensible default for all-time

    start_date = (datetime.utcnow() - timedelta(days=period_days)).date()

    rows = db.execute(
        text("""
        SELECT r.categories, r.sentiment
        FROM dbo.processed_review r
        JOIN dbo.source s ON r.source_id = s.source_id
        WHERE s.organization_id = :org_id
          AND r.reviewDate >= CAST(:start_date AS DATE)
          AND r.categories IS NOT NULL
        """),
        {"org_id": org_id, "start_date": start_date},
    ).fetchall()

    pos_counts: Dict[str, int] = {}
    neg_counts: Dict[str, int] = {}

    for row in rows:
        cats = _parse_categories(row.categories)
        sentiment = (row.sentiment or "").strip()
        target = pos_counts if sentiment == "Positive" else neg_counts
        for cat in cats:
            target[cat] = target.get(cat, 0) + 1

    # Also include Neutral sentiment reviews — treat neutral as weakly positive
    # by also running a second pass for Neutral → add to both sides at half weight
    # (skipped for simplicity; only Positive and Negative are used here)

    # Sort by count descending, take top 10
    top_pos = sorted(pos_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    top_neg = sorted(neg_counts.items(), key=lambda x: x[1], reverse=True)[:10]

    return {
        "positiveKeywords": [
            {"word": w, "count": c} for w, c in top_pos
        ],
        "negativeKeywords": [
            {"word": w, "count": c} for w, c in top_neg
        ],
    }


# ──────────────────────────────────────────────────────────────────────
# 2. AI Action Generation
# ──────────────────────────────────────────────────────────────────────


def generate_ai_actions(
    metrics: Dict[str, Any],
    categories: List[Dict[str, Any]],
    sources: List[Dict[str, Any]],
    keywords: Dict[str, list],
) -> List[Dict[str, str]]:
    """
    Generate AI-powered actionable recommendations based on the aggregated
    dashboard data: metrics, category performance, source breakdown, and keywords.

    Returns a list of action objects:
        [{"severity": "critical"|"warning"|"info", "title": str, "body": str}, ...]
    """
    # ── Build a compact summary for the LLM ─────────────────────────
    avg_rating = metrics.get("avgRating", {}).get("value", "N/A")
    total_reviews = metrics.get("totalReviews", {}).get("value", "N/A")
    neg_reviews = metrics.get("negativeReviews", {}).get("value", "N/A")

    cat_summary = ", ".join(
        f"{c.get('name','?')}(score={c.get('score','?')})" for c in categories[:4]
    ) or "none"

    src_summary = ", ".join(
        f"{s.get('name','?')}({s.get('reviews',0)} reviews, {s.get('rating',0)}★)"
        for s in sources[:4]
    ) or "none"

    pos_kw = ", ".join(
        f"{kw['word']}({kw['count']})" for kw in keywords.get("positiveKeywords", [])[:5]
    ) or "none"
    neg_kw = ", ".join(
        f"{kw['word']}({kw['count']})" for kw in keywords.get("negativeKeywords", [])[:5]
    ) or "none"

    prompt = f"""You are a hospitality business analyst. Based on the following review analytics, suggest 3-5 actionable recommendations.

Data:
- Average rating: {avg_rating}
- Total reviews: {total_reviews}
- Negative reviews: {neg_reviews}
- Top categories: {cat_summary}
- Source breakdown: {src_summary}
- Top positive keywords: {pos_kw}
- Top negative keywords: {neg_kw}

Return a JSON array of actions. Each action must have:
- "severity": one of "critical", "warning", or "info"
- "title": a short, specific headline (max 60 chars)
- "body": a 1-2 sentence actionable recommendation (max 200 chars)

Use "critical" for urgent issues (e.g., many negative reviews, very low ratings in a key category).
Use "warning" for concerning trends that need attention soon.
Use "info" for positive reinforcement or growth opportunities.

Return ONLY valid JSON array. No markdown, no code fences."""

    try:
        response = (
            _get_genai_client()
            .models.generate_content(
                model="gemini-2.5-flash-lite", contents=prompt
            )
        )
        raw = response.text or ""

        # Strip markdown code fences if present
        pattern = r"^```(?:json)?\s*(.*?)\s*```$"
        match = re.search(pattern, raw, re.DOTALL | re.MULTILINE)
        clean = match.group(1) if match else raw

        actions = json.loads(clean)
        if isinstance(actions, list):
            # Validate and sanitize each action
            result = []
            for a in actions:
                severity = a.get("severity", "info")
                if severity not in ("critical", "warning", "info"):
                    severity = "info"
                result.append({
                    "severity": severity,
                    "title": str(a.get("title", "Recommendation"))[:60],
                    "body": str(a.get("body", ""))[:200],
                })
            return result[:5]

    except Exception:
        pass  # fall through to rule-based fallback

    # ── Rule-based fallback when AI is unavailable ──────────────────
    fallback: List[Dict[str, str]] = []

    try:
        neg_count = int(str(neg_reviews).replace(",", ""))
        total_count = int(str(total_reviews).replace(",", ""))
    except (ValueError, TypeError):
        neg_count = 0
        total_count = 0

    neg_pct = (neg_count / total_count * 100) if total_count > 0 else 0

    if neg_pct > 30:
        fallback.append({
            "severity": "critical",
            "title": "High negative review ratio detected",
            "body": f"{round(neg_pct)}% of reviews are negative. Review common complaints and create an action plan to address recurring issues promptly.",
        })

    lowest_cat = None
    lowest_score = 100
    for c in categories:
        if c.get("score", 100) < lowest_score:
            lowest_score = c.get("score", 100)
            lowest_cat = c.get("name", "")

    if lowest_cat and lowest_score < 50:
        fallback.append({
            "severity": "warning",
            "title": f"Improve '{lowest_cat}' experience",
            "body": f"The '{lowest_cat}' category scores only {lowest_score}%. Focus on this area to improve overall guest satisfaction.",
        })

    if neg_kw != "none":
        top_neg_word = keywords.get("negativeKeywords", [{}])[0].get("word", "")
        if top_neg_word:
            fallback.append({
                "severity": "warning",
                "title": f"Address '{top_neg_word}' complaints",
                "body": f"'{top_neg_word}' is the most common negative keyword. Investigate root causes and implement corrective measures.",
            })

    if total_count > 0 and neg_pct < 15:
        fallback.append({
            "severity": "info",
            "title": "Strong overall satisfaction",
            "body": f"Only {round(neg_pct)}% negative reviews — maintain current standards and encourage guests to leave reviews on more platforms.",
        })

    if total_count == 0:
        fallback.append({
            "severity": "info",
            "title": "Start collecting reviews",
            "body": "No reviews found for this period. Connect more review platforms and encourage guests to share their feedback.",
        })

    return fallback[:5]
