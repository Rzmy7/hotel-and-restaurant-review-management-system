"""Dashboard charts service — adaptive grouping and trends logic."""

import json
from datetime import datetime, timedelta
from typing import List, Dict, Any

import pyodbc

def get_sentiment_distribution(cursor: pyodbc.Cursor, org_id: str) -> Dict[str, Any]:
    """Retrieves all-time sentiment distribution counts and percentages."""
    cursor.execute("""
        SELECT sentiment, COUNT(*) as cnt 
        FROM dbo.processed_review 
        WHERE organization_id = ? 
        GROUP BY sentiment
    """, org_id)
    
    rows = cursor.fetchall()
    total = sum(row.cnt for row in rows)
    
    counts = {"Positive": 0, "Neutral": 0, "Negative": 0}
    for row in rows:
        if row.sentiment in counts:
            counts[row.sentiment] = row.cnt
            
    def fmt(name):
        cnt = counts[name]
        return {
            "count": cnt,
            "percentage": round((cnt / total) * 100) if total > 0 else 0
        }
        
    return {
        "positive": fmt("Positive"),
        "neutral": fmt("Neutral"),
        "negative": fmt("Negative")
    }

def get_daily_review_trends(cursor: pyodbc.Cursor, org_id: str, days: int = 7) -> List[Dict[str, Any]]:
    """
    Retrieves review volume and sentiment trends.
    Adapts granularity and labeling based on the requested period.
    """
    if days < 1: days = 7
    start_date = (datetime.utcnow() - timedelta(days=days)).date()
    
    if days <= 7:
        # Standard daily grouping for small windows
        cursor.execute("""
            SELECT 
                FORMAT(reviewDate, 'ddd') as label,
                COUNT(*) as volume,
                AVG(CAST(sentiment_score * 20 AS FLOAT)) as sentiment_avg,
                reviewDate
            FROM dbo.processed_review
            WHERE organization_id = ? AND reviewDate >= CAST(? AS DATE)
            GROUP BY reviewDate
            ORDER BY reviewDate ASC
        """, org_id, start_date)
    else:
        # Adaptive bucketed grouping for larger windows (targeting ~6-7 points)
        bucket_size = max(1, days // 6)
        # We use a CTE to simplify the grouping and label formatting
        cursor.execute(f"""
            WITH BucketedData AS (
                SELECT 
                    reviewDate,
                    sentiment_score,
                    DATEDIFF(day, CAST(? AS DATE), reviewDate) / {bucket_size} as bucket
                FROM dbo.processed_review
                WHERE organization_id = ? AND reviewDate >= CAST(? AS DATE)
            )
            SELECT 
                FORMAT(MIN(reviewDate), 'MMM dd') as label,
                COUNT(*) as volume,
                AVG(CAST(sentiment_score * 20 AS FLOAT)) as sentiment_avg,
                bucket
            FROM BucketedData
            GROUP BY bucket
            ORDER BY bucket ASC
        """, start_date, org_id, start_date)
    
    rows = cursor.fetchall()
    return [{
        "label": row.label,
        "volume": row.volume,
        "sentiment": round(float(row.sentiment_avg or 0))
    } for row in rows]

def get_weekly_review_trends(cursor: pyodbc.Cursor, org_id: str, period_days: int = 30) -> List[Dict[str, Any]]:
    """
    Retrieves weekly review trends relative to the start of the requested period.
    Example: Week 1, Week 2, etc.
    """
    start_date = (datetime.utcnow() - timedelta(days=period_days)).date()
    
    cursor.execute("""
        WITH WeeklyData AS (
            SELECT 
                sentiment_score,
                DATEDIFF(day, CAST(? AS DATE), reviewDate) / 7 as week_index
            FROM dbo.processed_review
            WHERE organization_id = ? AND reviewDate >= CAST(? AS DATE)
        )
        SELECT 
            'Week ' + CAST(week_index + 1 AS VARCHAR) as label,
            COUNT(*) as volume,
            AVG(CAST(sentiment_score * 20 AS FLOAT)) as sentiment_avg,
            week_index
        FROM WeeklyData
        GROUP BY week_index
        ORDER BY week_index ASC
    """, start_date, org_id, start_date)
    
    rows = cursor.fetchall()
    return [{
        "label": row.label,
        "volume": row.volume,
        "sentiment": round(float(row.sentiment_avg or 0))
    } for row in rows]
