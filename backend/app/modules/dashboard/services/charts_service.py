"""Dashboard charts service — adaptive grouping and trends logic."""

import json
from datetime import datetime, timedelta
from typing import List, Dict, Any

import pyodbc

def get_sentiment_distribution(cursor: pyodbc.Cursor, org_id: str, period_days: int = 0) -> Dict[str, Any]:
    """Retrieves sentiment distribution counts and percentages. period_days=0 means all-time."""
    if period_days > 0:
        start_date = (datetime.utcnow() - timedelta(days=period_days)).date()
        cursor.execute("""
            SELECT r.sentiment, COUNT(*) as cnt 
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = ? AND r.reviewDate >= CAST(? AS DATE)
            GROUP BY r.sentiment
        """, org_id, start_date)
    else:
        cursor.execute("""
            SELECT r.sentiment, COUNT(*) as cnt 
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = ? 
            GROUP BY r.sentiment
        """, org_id)
    
    rows = cursor.fetchall()
    counts = {"Positive": 0, "Neutral": 0, "Negative": 0}
    for row in rows:
        if row.sentiment in counts:
            counts[row.sentiment] = row.cnt
            
    total = sum(counts.values())
            
    def get_pct(name):
        cnt = counts[name]
        return round((cnt / total) * 100) if total > 0 else 0

    res = {
        "positive": {"count": counts["Positive"], "percentage": get_pct("Positive")},
        "neutral": {"count": counts["Neutral"], "percentage": get_pct("Neutral")},
        "negative": {"count": counts["Negative"], "percentage": get_pct("Negative")}
    }

    # Adjust for rounding errors to ensure sum is exactly 100%
    if total > 0:
        current_sum = sum(v["percentage"] for v in res.values())
        if current_sum != 100:
            diff = 100 - current_sum
            # Add/subtract the difference from the largest category
            largest_key = max(res.keys(), key=lambda k: res[k]["count"])
            res[largest_key]["percentage"] += diff

    return res

def get_daily_review_trends(cursor: pyodbc.Cursor, org_id: str, days: int = 7) -> List[Dict[str, Any]]:
    """
    Retrieves review volume and sentiment trends.
    Automatically caps the number of data points to 10 for any time period.
    """
    if days <= 0:
        # All-time: find the total range first
        cursor.execute("""
            SELECT MIN(r.reviewDate), DATEDIFF(day, MIN(r.reviewDate), GETDATE())
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = ?
        """, org_id)
        row = cursor.fetchone()
        if not row or not row[0]:
            return []
        start_date = row[0]
        days_span = max(1, row[1])
    else:
        start_date = (datetime.utcnow() - timedelta(days=days)).date()
        days_span = days

    # Target ~10 points (9 intervals)
    bucket_size = max(1, days_span // 9)
    
    # Adaptive Label Format
    if days_span <= 14:
        label_format = 'ddd'        # "Mon", "Tue"
    elif days_span <= 180:
        label_format = 'MMM dd'     # "Oct 15"
    else:
        label_format = 'MMM yyyy'   # "Oct 2025"

    query = f"""
        WITH BucketedData AS (
            SELECT 
                r.reviewDate,
                r.sentiment_score,
                DATEDIFF(day, CAST(? AS DATE), r.reviewDate) / {bucket_size} as bucket
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = ? AND r.reviewDate >= CAST(? AS DATE)
        )
        SELECT 
            FORMAT(MIN(reviewDate), '{label_format}') as label,
            COUNT(*) as volume,
            AVG(CAST(sentiment_score * 20 AS FLOAT)) as sentiment_avg,
            bucket
        FROM BucketedData
        GROUP BY bucket
        ORDER BY bucket ASC
    """
    cursor.execute(query, start_date, org_id, start_date)
    rows = cursor.fetchall()

    return [{
        "label": row.label,
        "volume": row.volume,
        "sentiment": round(float(row.sentiment_avg or 0))
    } for row in rows]

def get_weekly_review_trends(cursor: pyodbc.Cursor, org_id: str, period_days: int = 30) -> List[Dict[str, Any]]:
    """
    Retrieves weekly review trends relative to the start of the requested period.
    Also caps results to a maximum of 10 standardized buckets.
    """
    if period_days <= 0:
        cursor.execute("""
            SELECT MIN(r.reviewDate), DATEDIFF(day, MIN(r.reviewDate), GETDATE())
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = ?
        """, org_id)
        row = cursor.fetchone()
        if not row or not row[0]:
            return []
        start_date = row[0]
        days_span = max(1, row[1])
    else:
        start_date = (datetime.utcnow() - timedelta(days=period_days)).date()
        days_span = period_days

    bucket_size = max(1, days_span // 9)
    
    cursor.execute(f"""
        WITH BucketedData AS (
            SELECT 
                r.sentiment_score,
                DATEDIFF(day, CAST(? AS DATE), r.reviewDate) / {bucket_size} as bucket_index
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = ? AND r.reviewDate >= CAST(? AS DATE)
        )
        SELECT 
            'Point ' + CAST(bucket_index + 1 AS VARCHAR) as label,
            COUNT(*) as volume,
            AVG(CAST(sentiment_score * 20 AS FLOAT)) as sentiment_avg,
            bucket_index
        FROM BucketedData
        GROUP BY bucket_index
        ORDER BY bucket_index ASC
    """, start_date, org_id, start_date)
    
    rows = cursor.fetchall()
    return [{
        "label": row.label,
        "volume": row.volume,
        "sentiment": round(float(row.sentiment_avg or 0))
    } for row in rows]
