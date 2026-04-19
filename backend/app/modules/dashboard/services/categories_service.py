"""
Category performance service — computes per-category sentiment scores
from the processed_review.categories JSON column.
"""
import json
import pyodbc


_ICON_MAP = {
    "staff": "Users", "service": "Users",
    "cleanliness": "Droplets", "hygiene": "Droplets",
    "location": "MapPin", "area": "MapPin",
    "food": "Utensils", "restaurant": "Utensils",
    "breakfast": "Utensils", "dining": "Utensils",
    "room": "BedDouble", "amenities": "Star",
    "value": "DollarSign", "wifi": "Wifi",
    "parking": "Car", "pool": "Waves",
    "gym": "Dumbbell", "spa": "Sparkles",
    "bar": "Wine", "check-in": "LogIn",
    "check-out": "LogOut", "noise": "Volume2",
    "bathroom": "Bath", "bedding": "Bed",
    "safety": "Shield", "decor": "Palette",
    "atmosphere": "Smile", "maintenance": "Wrench",
    "comfort": "Smile", "room size": "MapPin",
}


def _resolve_icon(category: str) -> str:
    key = category.strip().lower()
    for k, icon in _ICON_MAP.items():
        if k in key:
            return icon
    return "Star"


def _parse_categories(raw) -> list:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [str(c) for c in parsed if c]
    except Exception:
        pass
    return []


def _aggregate_all_time_totals(cursor, org_id: str):
    """Return all-time category mention counts."""
    cursor.execute(
        """
        SELECT r.categories
        FROM   dbo.processed_review r
        JOIN   dbo.source s ON r.source_id = s.source_id
        WHERE  s.organization_id = ?
        """,
        org_id,
    )
    rows = cursor.fetchall()
    total: dict = {}
    for row in rows:
        cats = _parse_categories(row.categories)
        for cat in cats:
            key = cat.strip()
            if not key:
                continue
            total[key] = total.get(key, 0) + 1
    return total

def _aggregate(cursor, org_id: str, days_from: int, days_to: int):
    """Return (cat_total, cat_score_sum) dicts for a time window."""
    cursor.execute(
        """
        SELECT r.categories, ISNULL(r.sentiment_score, 3.0) as sentiment_score
        FROM   dbo.processed_review r
        JOIN   dbo.source s ON r.source_id = s.source_id
        WHERE  s.organization_id = ?
          AND  r.reviewDate >= DATEADD(DAY, ?, CAST(GETDATE() AS DATE))
          AND  r.reviewDate <  DATEADD(DAY, ? + 1, CAST(GETDATE() AS DATE))
        """,
        org_id, days_from, days_to,
    )
    rows = cursor.fetchall()
    total: dict = {}
    score_sums: dict = {}
    for row in rows:
        cats = _parse_categories(row.categories)
        s_score = float(row.sentiment_score)
        for cat in cats:
            key = cat.strip()
            if not key:
                continue
            total[key] = total.get(key, 0) + 1
            score_sums[key] = score_sums.get(key, 0.0) + s_score
    return total, score_sums


def get_category_performance(cursor, org_id: str, period_days: int = 30) -> list:
    """
    Returns up to 6 category objects with score, count, icon, trend, trendType.
    Only categories with >= 5 mentions are included.
    """
    all_time_totals = _aggregate_all_time_totals(cursor, org_id)
    cur_total, cur_pos = _aggregate(cursor, org_id, -period_days, 0)
    prev_total, prev_pos = _aggregate(cursor, org_id, -(period_days * 2), -period_days)

    MIN_MENTIONS = 1
    results = []

    for cat, total in cur_total.items():
        if total < MIN_MENTIONS:
            continue

        # sentiment_score is 1 to 5; multiply average by 20 to get percentage
        score = round((cur_pos.get(cat, 0) / total) * 20)
        prev_t = prev_total.get(cat, 0)
        prev_score = round((prev_pos.get(cat, 0) / prev_t) * 20) if prev_t > 0 else score
        delta = score - prev_score

        if delta == 0:
            trend_str, trend_type = "0%", "neutral"
        elif delta > 0:
            trend_str, trend_type = f"+{delta}%", "up"
        else:
            trend_str, trend_type = f"{delta}%", "down"

        results.append({
            "name": cat,
            "score": score,
            "count": all_time_totals.get(cat, total),
            "icon": _resolve_icon(cat),
            "trend": trend_str,
            "trendType": trend_type,
        })

    results.sort(key=lambda x: x["count"], reverse=True)
    return results[:4]
