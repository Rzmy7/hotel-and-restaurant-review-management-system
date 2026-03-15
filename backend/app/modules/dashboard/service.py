"""
Dashboard service — database operations for dashboard metrics.

Extracted from routers/dashboard.py.
"""

import json
from datetime import datetime, timedelta

import pyodbc

from app.core.pyodbc_connection import get_connection_string


def _table_exists(cursor, table_name: str) -> bool:
    """Check if a table exists in the database."""
    cursor.execute(
        "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = ?",
        table_name,
    )
    return cursor.fetchone()[0] > 0


def get_stats() -> dict:
    """Core metrics for the dashboard cards."""
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()

    # Total reviews
    cursor.execute("SELECT COUNT(*) FROM dbo.ProcessedReviews")
    total_reviews = cursor.fetchone()[0]

    # Average rating
    cursor.execute("SELECT AVG(CAST(rating AS FLOAT)) FROM dbo.ProcessedReviews")
    avg_rating_row = cursor.fetchone()[0]
    average_rating = round(avg_rating_row, 2) if avg_rating_row else 0

    # Response rate
    cursor.execute(
        "SELECT COUNT(*) FROM dbo.ProcessedReviews WHERE [status] = 'Replied'"
    )
    replied_count = cursor.fetchone()[0]
    response_rate = round((replied_count / total_reviews) * 100, 1) if total_reviews > 0 else 0

    # Pending reviews
    cursor.execute(
        "SELECT COUNT(*) FROM dbo.ProcessedReviews WHERE [status] = 'Pending'"
    )
    pending = cursor.fetchone()[0]

    # Competitors tracked
    competitor_count = 0
    if _table_exists(cursor, "Competitors"):
        cursor.execute("SELECT COUNT(*) FROM dbo.Competitors WHERE isTracked = 1")
        competitor_count = cursor.fetchone()[0]

    conn.close()

    return {
        "totalReviews": total_reviews,
        "averageRating": average_rating,
        "responseRate": response_rate,
        "pendingReviews": pending,
        "competitorsTracked": competitor_count,
    }


def get_usage() -> dict:
    """Reviews over time for trend chart (last 30 days, by day)."""
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()

    thirty_days_ago = (datetime.now() - timedelta(days=30)).date()

    cursor.execute("""
        SELECT
            CAST(reviewDate AS DATE) as review_day,
            COUNT(*) as review_count
        FROM dbo.ProcessedReviews
        WHERE reviewDate >= ?
        GROUP BY CAST(reviewDate AS DATE)
        ORDER BY review_day
    """, thirty_days_ago)

    rows = cursor.fetchall()
    conn.close()

    trend_data = [
        {
            "date": row.review_day.isoformat() if row.review_day else None,
            "reviews": row.review_count,
        }
        for row in rows
    ]

    return {"trendData": trend_data}


def get_recent_reviews() -> dict:
    """Most recent reviews for the dashboard list."""
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()

    cursor.execute("""
        SELECT TOP 10
            id, rating, userName, reviewText, sentiment,
            categories, reviewDate, [status], source
        FROM dbo.ProcessedReviews
        ORDER BY reviewDate DESC
    """)

    rows = cursor.fetchall()
    conn.close()

    results = []
    for row in rows:
        try:
            cat_list = json.loads(row.categories) if row.categories else []
        except json.JSONDecodeError:
            cat_list = []

        results.append({
            "id": row.id,
            "rating": row.rating,
            "userName": row.userName,
            "text": row.reviewText,
            "sentiment": row.sentiment,
            "categories": cat_list,
            "date": row.reviewDate.isoformat() if row.reviewDate else None,
            "status": row.status,
            "source": row.source,
        })

    return {"reviews": results}


def get_distribution() -> dict:
    """Rating distribution for a bar/pie chart."""
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()

    cursor.execute("""
        SELECT rating, COUNT(*) as cnt
        FROM dbo.ProcessedReviews
        GROUP BY rating
        ORDER BY rating
    """)

    rows = cursor.fetchall()
    conn.close()

    distribution = {str(i): 0 for i in range(1, 6)}
    for row in rows:
        distribution[str(row.rating)] = row.cnt

    return {"distribution": distribution}


def get_alerts() -> dict:
    """Alert notifications: new negative reviews, pending items."""
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()

    alerts = []

    # Pending reviews alert
    cursor.execute(
        "SELECT COUNT(*) FROM dbo.ProcessedReviews WHERE [status] = 'Pending'"
    )
    pending = cursor.fetchone()[0]
    if pending > 0:
        alerts.append({
            "type": "warning",
            "title": f"{pending} Pending Reviews",
            "message": "You have reviews that need attention.",
        })

    # Negative reviews (last 7 days)
    seven_days_ago = (datetime.now() - timedelta(days=7)).date()
    cursor.execute("""
        SELECT COUNT(*) FROM dbo.ProcessedReviews
        WHERE sentiment = 'Negative' AND reviewDate >= ?
    """, seven_days_ago)
    neg_count = cursor.fetchone()[0]
    if neg_count > 0:
        alerts.append({
            "type": "error",
            "title": f"{neg_count} Negative Reviews This Week",
            "message": "New negative reviews require attention.",
        })

    conn.close()
    return {"alerts": alerts}


def get_activities() -> dict:
    """Recent activities for an activity feed."""
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()

    cursor.execute("""
        SELECT TOP 15
            id, userName, sentiment, rating, reviewDate, [status], source
        FROM dbo.ProcessedReviews
        ORDER BY reviewDate DESC
    """)

    rows = cursor.fetchall()
    conn.close()

    activities = []
    for row in rows:
        action = "New review"
        if row.status == "Replied":
            action = "Replied to review"

        activities.append({
            "id": row.id,
            "action": action,
            "userName": row.userName,
            "sentiment": row.sentiment,
            "rating": row.rating,
            "date": row.reviewDate.isoformat() if row.reviewDate else None,
            "source": row.source,
        })

    return {"activities": activities}
