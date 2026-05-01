"""Dashboard sources service — aggregate metrics by platform."""

import pyodbc
from typing import List, Dict, Any
from datetime import datetime, timedelta

# UI mappings for platforms
PLATFORM_UI_MAPPING = {
    "Booking.com": {
        "color": "#2563eb",
        "bgColor": "bg-blue-50/60",
        "borderColor": "border-blue-100",
    },
    "Booking": {
        "color": "#2563eb",
        "bgColor": "bg-blue-50/60",
        "borderColor": "border-blue-100",
    },
    "TripAdvisor": {
        "color": "#7c3aed",
        "bgColor": "bg-purple-50/60",
        "borderColor": "border-purple-100",
    },
    "Google": {
        "color": "#059669",
        "bgColor": "bg-emerald-50/60",
        "borderColor": "border-emerald-100",
    },
    "Expedia": {
        "color": "#ea580c",
        "bgColor": "bg-orange-50/60",
        "borderColor": "border-orange-100",
    },
    "Agoda": {
        "color": "#db2777",
        "bgColor": "bg-pink-50/60",
        "borderColor": "border-pink-100",
    },
    "Hotels.com": {
        "color": "#dc2626",
        "bgColor": "bg-red-50/60",
        "borderColor": "border-red-100",
    },
    # Fallback default
    "Default": {
        "color": "#64748b",
        "bgColor": "bg-slate-50/60",
        "borderColor": "border-slate-100",
    },
}


def get_source_comparison_metrics(
    cursor: pyodbc.Cursor, org_id: str, period_days: int = 0
) -> List[Dict[str, Any]]:
    """
    Retrieves performance metrics (volume, rating, sentiment distribution) broken down by review platform.
    Also calculates the trend vs the previous period.
    period_days=0 means all-time (no date filter, no trend comparison).
    """
    is_all_time = period_days <= 0
    now = datetime.utcnow()

    if not is_all_time:
        curr_start = (now - timedelta(days=period_days)).date()
        prev_start = (now - timedelta(days=period_days * 2)).date()

    # Query stats per platform — LEFT JOIN so sources with no reviews still appear
    if is_all_time:
        cursor.execute(
            """
            SELECT 
                p.platform_name,
                COUNT(r.id) as review_count,
                AVG(CAST(r.sentiment_score AS FLOAT)) as avg_rating,
                SUM(CASE WHEN r.sentiment = 'Positive' THEN 1 ELSE 0 END) as pos_count,
                SUM(CASE WHEN r.sentiment = 'Neutral' THEN 1 ELSE 0 END) as neu_count,
                SUM(CASE WHEN r.sentiment = 'Negative' THEN 1 ELSE 0 END) as neg_count,
                s.source_id
            FROM dbo.source s
            JOIN dbo.platform p ON s.platform_id = p.platform_id
            LEFT JOIN dbo.processed_review r ON r.source_id = s.source_id
            WHERE s.organization_id = ?
            GROUP BY s.source_id, p.platform_name
        """,
            org_id,
        )
    else:
        cursor.execute(
            """
            SELECT 
                p.platform_name,
                COUNT(r.id) as review_count,
                AVG(CAST(r.sentiment_score AS FLOAT)) as avg_rating,
                SUM(CASE WHEN r.sentiment = 'Positive' THEN 1 ELSE 0 END) as pos_count,
                SUM(CASE WHEN r.sentiment = 'Neutral' THEN 1 ELSE 0 END) as neu_count,
                SUM(CASE WHEN r.sentiment = 'Negative' THEN 1 ELSE 0 END) as neg_count,
                s.source_id
            FROM dbo.source s
            JOIN dbo.platform p ON s.platform_id = p.platform_id
            LEFT JOIN dbo.processed_review r ON r.source_id = s.source_id
                AND r.reviewDate >= CAST(? AS DATE)
            WHERE s.organization_id = ?
            GROUP BY s.source_id, p.platform_name
        """,
            curr_start,
            org_id,
        )

    curr_rows = cursor.fetchall()

    # Query previous period stats for trend calculation (only when not all-time)
    prev_rows = {}
    if not is_all_time:
        cursor.execute(
            """
            SELECT 
                s.source_id,
                AVG(CAST(r.sentiment_score AS FLOAT)) as prev_avg_rating
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = ? AND r.reviewDate >= CAST(? AS DATE) AND r.reviewDate < CAST(? AS DATE)
            GROUP BY s.source_id
        """,
            org_id,
            prev_start,
            curr_start,
        )

        prev_rows = {row.source_id: row.prev_avg_rating for row in cursor.fetchall()}

    total_reviews = sum(row.review_count for row in curr_rows)

    results = []
    for row in curr_rows:
        platform = row.platform_name
        ui = PLATFORM_UI_MAPPING.get(platform, PLATFORM_UI_MAPPING["Default"])

        review_count = row.review_count or 0
        avg_rating = float(row.avg_rating) if row.avg_rating is not None else 0.0

        # Trend calculation based on rating
        if is_all_time:
            trend_type = "neutral"
            trend_str = "—"
        else:
            prev_rating = prev_rows.get(
                row.source_id, avg_rating
            )  # Default to current if no prev data
            trend_diff = avg_rating - float(prev_rating or 0)

            if trend_diff > 0.05:
                trend_type = "up"
                trend_str = f"+{trend_diff:.1f}"
            elif trend_diff < -0.05:
                trend_type = "down"
                trend_str = f"{trend_diff:.1f}"
            else:
                trend_type = "neutral"
                trend_str = "0"

        # Calculate sentiment percentages
        pos_count = row.pos_count or 0
        neu_count = row.neu_count or 0
        neg_count = row.neg_count or 0
        r_total = float(review_count) if review_count > 0 else 1.0
        pos_pct = round((pos_count / r_total) * 100)
        neu_pct = round((neu_count / r_total) * 100)
        neg_pct = round((neg_count / r_total) * 100)

        # Calculate overall market share percentage
        pct = round((review_count / total_reviews) * 100) if total_reviews > 0 else 0

        # Construct front-end object
        results.append(
            {
                "name": platform,
                "rating": round(avg_rating, 1),
                "trend": trend_str,
                "trendType": trend_type,
                "reviews": review_count,
                "pct": pct,
                "color": ui["color"],
                "bgColor": ui["bgColor"],
                "borderColor": ui["borderColor"],
                "sentiment": {"pos": pos_pct, "neu": neu_pct, "neg": neg_pct},
                "lastSync": "Just now" if review_count > 0 else "No reviews",
            }
        )

    # Sort by review volume descending
    results.sort(key=lambda x: x["reviews"], reverse=True)
    return results
