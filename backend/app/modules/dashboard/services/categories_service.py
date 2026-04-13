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


def _aggregate(cursor, org_id: str, days_from: int = None, days_to: int = None):
    """Return dict mapping category names to their avg score and count (with optional time window)."""
    sql = """
        SELECT rc.name, AVG(rc.score) as avg_score, COUNT(*) as mention_count
        FROM   dbo.review_category rc
        JOIN   dbo.processed_review r ON rc.review_id = r.id
        JOIN   dbo.source s ON r.source_id = s.source_id
        WHERE  s.organization_id = ?
    """
    params = [org_id]

    if days_from is not None:
        sql += " AND r.reviewDate >= DATEADD(DAY, ?, CAST(GETDATE() AS DATE))"
        params.append(days_from)
    if days_to is not None:
        sql += " AND r.reviewDate <  DATEADD(DAY, ?, CAST(GETDATE() AS DATE))"
        params.append(days_to)

    sql += " GROUP BY rc.name"
    cursor.execute(sql, params)

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
    all_time_data = _aggregate(cursor, org_id)
    cur_data = _aggregate(cursor, org_id, -period_days, 0)
    prev_data = _aggregate(cursor, org_id, -(period_days * 2), -period_days)

    MIN_MENTIONS = 1
    results = []

    for cat, data in all_time_data.items():
        count = data["count"]
        if count < MIN_MENTIONS:
            continue

        score = data["score"] # Use All Time score as primary
        
        # Calculate trend based on 30-day window
        cur_period_score = cur_data.get(cat, {}).get("score", score)
        prev_period_score = prev_data.get(cat, {}).get("score", cur_period_score)
        delta = cur_period_score - prev_period_score

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
