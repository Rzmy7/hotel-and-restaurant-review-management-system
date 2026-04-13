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


def _aggregate(cursor, org_id: str, days_from: int, days_to: int):
    """Return dict mapping category names to their avg score and count for a time window."""
    cursor.execute(
        """
        SELECT rc.name, AVG(rc.score) as avg_score, COUNT(*) as mention_count
        FROM   dbo.review_category rc
        JOIN   dbo.processed_review r ON rc.review_id = r.id
        JOIN   dbo.source s ON r.source_id = s.source_id
        WHERE  s.organization_id = ?
          AND  r.reviewDate >= DATEADD(DAY, ?, CAST(GETDATE() AS DATE))
          AND  r.reviewDate <  DATEADD(DAY, ?, CAST(GETDATE() AS DATE))
        GROUP BY rc.name
        """,
        org_id, days_from, days_to,
    )
    rows = cursor.fetchall()
    results = {}
    for row in rows:
        results[row.name] = {
            "score": round(row.avg_score or 0),
            "count": row.mention_count
        }
    return results


def get_category_performance(cursor, org_id: str, period_days: int = 30) -> list:
    """
    Returns up to 6 category objects with score, count, icon, trend, trendType.
    Only categories with >= 1 mentions are included.
    """
    cur_data = _aggregate(cursor, org_id, -period_days, 0)
    prev_data = _aggregate(cursor, org_id, -(period_days * 2), -period_days)

    MIN_MENTIONS = 1
    results = []

    for cat, data in cur_data.items():
        count = data["count"]
        if count < MIN_MENTIONS:
            continue

        score = data["score"]
        prev_score = prev_data.get(cat, {}).get("score", score)
        delta = score - prev_score

        if abs(delta) < 0.05:
            trend_str, trend_type = "0.0%", "neutral"
        elif delta > 0:
            trend_str, trend_type = f"+{delta:.1f}%", "up"
        else:
            trend_str, trend_type = f"{delta:.1f}%", "down"

        results.append({
            "name": cat,
            "score": score,
            "count": count,
            "icon": _resolve_icon(cat),
            "trend": trend_str,
            "trendType": trend_type,
        })

    results.sort(key=lambda x: x["count"], reverse=True)
    return results[:6]
