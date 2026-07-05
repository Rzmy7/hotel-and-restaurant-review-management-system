"""
Category performance service — computes per-category sentiment scores
from the processed_review.categories JSON column.
"""

import json
from sqlalchemy.orm import Session
from sqlalchemy import text


_ICON_MAP = {
    "staff": "Users",
    "service": "Users",
    "cleanliness": "Droplets",
    "hygiene": "Droplets",
    "location": "MapPin",
    "area": "MapPin",
    "food": "Utensils",
    "restaurant": "Utensils",
    "breakfast": "Utensils",
    "dining": "Utensils",
    "room": "BedDouble",
    "amenities": "Star",
    "value": "DollarSign",
    "wifi": "Wifi",
    "parking": "Car",
    "pool": "Waves",
    "gym": "Dumbbell",
    "spa": "Sparkles",
    "bar": "Wine",
    "check-in": "LogIn",
    "check-out": "LogOut",
    "noise": "Volume2",
    "bathroom": "Bath",
    "bedding": "Bed",
    "safety": "Shield",
    "decor": "Palette",
    "atmosphere": "Smile",
    "maintenance": "Wrench",
    "comfort": "Smile",
    "room size": "MapPin",
}


def _resolve_icon(category: str) -> str:
    key = category.strip().lower()
    for k, icon in _ICON_MAP.items():
        if k in key:
            return icon
    return "Star"


def _parse_categories(raw) -> list:
    from app.core.db_utils import normalize_string_list
    return normalize_string_list(raw)


def _aggregate_all_time_totals(db: Session, org_id: str):
    """Return all-time category mention counts."""
    rows = db.execute(
        text("""
        SELECT r.categories
        FROM   dbo.processed_review r
        JOIN   dbo.source s ON r.source_id = s.source_id
        WHERE  s.organization_id = :org_id
        """),
        {"org_id": org_id},
    ).fetchall()
    total: dict = {}
    for row in rows:
        cats = _parse_categories(row.categories)
        for cat in cats:
            key = cat.strip()
            if not key:
                continue
            total[key] = total.get(key, 0) + 1
    return total


def _aggregate(db: Session, org_id: str, days_from: int, days_to: int):
    """Return (cat_total, cat_positive_count) dicts for a time window."""
    rows = db.execute(
        text("""
        SELECT r.categories,
               ISNULL(r.sentiment_score, 3.0) as sentiment_score,
               ISNULL(r.sentiment, 'Neutral')  as sentiment
        FROM   dbo.processed_review r
        JOIN   dbo.source s ON r.source_id = s.source_id
        WHERE  s.organization_id = :org_id
          AND  r.reviewDate >= DATEADD(DAY, :days_from, CAST(GETDATE() AS DATE))
          AND  r.reviewDate <  DATEADD(DAY, :days_to + 1, CAST(GETDATE() AS DATE))
        """),
        {"org_id": org_id, "days_from": days_from, "days_to": days_to},
    ).fetchall()
    total: dict = {}
    positive_counts: dict = {}
    score_sums: dict = {}
    for row in rows:
        cats = _parse_categories(row.categories)
        s_score = float(row.sentiment_score)
        sentiment = row.sentiment
        for cat in cats:
            key = cat.strip()
            if not key:
                continue
            total[key] = total.get(key, 0) + 1
            score_sums[key] = score_sums.get(key, 0.0) + s_score
            if sentiment == "Positive":
                positive_counts[key] = positive_counts.get(key, 0) + 1
    return total, positive_counts, score_sums


def _aggregate_all_time(db: Session, org_id: str):
    """Return per-category totals, positive counts, and score sums for ALL reviews."""
    rows = db.execute(
        text("""
        SELECT r.categories,
               ISNULL(r.sentiment_score, 3.0) as sentiment_score,
               ISNULL(r.sentiment, 'Neutral')  as sentiment
        FROM   dbo.processed_review r
        JOIN   dbo.source s ON r.source_id = s.source_id
        WHERE  s.organization_id = :org_id
        """),
        {"org_id": org_id},
    ).fetchall()
    total: dict = {}
    positive_counts: dict = {}
    score_sums: dict = {}
    for row in rows:
        cats = _parse_categories(row.categories)
        s_score = float(row.sentiment_score)
        sentiment = row.sentiment
        for cat in cats:
            key = cat.strip()
            if not key:
                continue
            total[key] = total.get(key, 0) + 1
            score_sums[key] = score_sums.get(key, 0.0) + s_score
            if sentiment == "Positive":
                positive_counts[key] = positive_counts.get(key, 0) + 1
    return total, positive_counts, score_sums


def get_category_performance(db: Session, org_id: str, period_days: int = 0) -> list:
    """
    Returns up to 4 category objects with score, count, icon, trend, trendType.
    Score = average sentiment_score mapped to 0-100 scale (1.0→0%, 5.0→100%).
    When period_days=0, shows all-time data with no trend comparison.
    When period_days>0, shows period-filtered data with trend vs previous period.
    """
    is_all_time = period_days <= 0

    if is_all_time:
        # All-time: use all data, no trend comparison
        data_total, data_pos, data_scores = _aggregate_all_time(db, org_id)
    else:
        # Period-filtered: use current period data for scores/counts
        data_total, data_pos, data_scores = _aggregate(db, org_id, -period_days, 0)
        # Previous period for trend comparison
        prev_total, prev_pos, prev_scores = _aggregate(
            db, org_id, -(period_days * 2), -period_days
        )

    MIN_MENTIONS = 1
    results = []

    for cat, total in data_total.items():
        if total < MIN_MENTIONS:
            continue

        # Score = average sentiment_score mapped from 1-5 to 0-100
        avg_score = data_scores.get(cat, 0.0) / total
        score = round(((avg_score - 1.0) / 4.0) * 100)
        score = max(0, min(100, score))  # clamp

        if is_all_time:
            trend_str, trend_type = "—", "neutral"
        else:
            # Trend: compare current period avg vs previous period avg
            prev_t = prev_total.get(cat, 0)

            if prev_t > 0:
                prev_avg = prev_scores.get(cat, 0.0) / prev_t
                prev_pct = round(((prev_avg - 1.0) / 4.0) * 100)
            else:
                prev_pct = score  # no previous data → no change

            delta = score - prev_pct

            if delta == 0:
                trend_str, trend_type = "0%", "neutral"
            elif delta > 0:
                trend_str, trend_type = f"+{delta}%", "up"
            else:
                trend_str, trend_type = f"{delta}%", "down"

        results.append(
            {
                "name": cat,
                "score": score,
                "count": total,
                "icon": _resolve_icon(cat),
                "trend": trend_str,
                "trendType": trend_type,
            }
        )

    results.sort(key=lambda x: x["count"], reverse=True)
    return results[:4]
