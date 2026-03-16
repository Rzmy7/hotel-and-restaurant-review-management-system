"""Dashboard trends service — usage over time and recent reviews."""

import json
from datetime import datetime, timedelta

import pyodbc
from app.core.pyodbc_connection import get_connection_string


def get_usage() -> dict:
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()
    thirty_days_ago = (datetime.now() - timedelta(days=30)).date()
    cursor.execute("""
        SELECT CAST(reviewDate AS DATE) as review_day, COUNT(*) as review_count
        FROM dbo.ProcessedReviews WHERE reviewDate >= ?
        GROUP BY CAST(reviewDate AS DATE) ORDER BY review_day
    """, thirty_days_ago)
    rows = cursor.fetchall()
    conn.close()
    return {"trendData": [{"date": row.review_day.isoformat() if row.review_day else None, "reviews": row.review_count} for row in rows]}


def get_recent_reviews() -> dict:
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()
    cursor.execute("""
        SELECT TOP 10 id, rating, userName, reviewText, sentiment, categories, reviewDate, [status], source
        FROM dbo.ProcessedReviews ORDER BY reviewDate DESC
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
            "id": row.id, "rating": row.rating, "userName": row.userName,
            "text": row.reviewText, "sentiment": row.sentiment, "categories": cat_list,
            "date": row.reviewDate.isoformat() if row.reviewDate else None,
            "status": row.status, "source": row.source,
        })
    return {"reviews": results}
