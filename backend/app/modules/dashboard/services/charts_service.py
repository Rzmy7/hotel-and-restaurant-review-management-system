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
    Adapts granularity and labeling based on the requested period.
    """
    if days <= 0:
        # All-time: use monthly grouping
        cursor.execute("""
            SELECT 
                FORMAT(MIN(r.reviewDate), 'MMM yyyy') as label,
                COUNT(*) as volume,
                AVG(CAST(r.sentiment_score * 20 AS FLOAT)) as sentiment_avg,
                YEAR(r.reviewDate) * 100 + MONTH(r.reviewDate) as ym
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = ?
            GROUP BY YEAR(r.reviewDate) * 100 + MONTH(r.reviewDate)
            ORDER BY ym ASC
        """, org_id)
        rows = cursor.fetchall()
        return [{
            "label": row.label,
            "volume": row.volume,
            "sentiment": round(float(row.sentiment_avg or 0))
        } for row in rows]
    
    start_date = (datetime.utcnow() - timedelta(days=days)).date()
    
    if days <= 7:
        # Standard daily grouping for small windows
        cursor.execute("""
            SELECT 
                FORMAT(r.reviewDate, 'ddd') as label,
                COUNT(*) as volume,
                AVG(CAST(r.sentiment_score * 20 AS FLOAT)) as sentiment_avg,
                r.reviewDate
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = ? AND r.reviewDate >= CAST(? AS DATE)
            GROUP BY r.reviewDate
            ORDER BY r.reviewDate ASC
        """, org_id, start_date)
    else:
        # Adaptive bucketed grouping for larger windows (targeting ~6-7 points)
        bucket_size = max(1, days // 6)
        # We use a CTE to simplify the grouping and label formatting
        cursor.execute(f"""
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
    if period_days <= 0:
        # All-time: use monthly grouping
        cursor.execute("""
            WITH MonthlyData AS (
                SELECT 
                    r.sentiment_score,
                    YEAR(r.reviewDate) * 100 + MONTH(r.reviewDate) as ym
                FROM dbo.processed_review r
                JOIN dbo.source s ON r.source_id = s.source_id
                WHERE s.organization_id = ?
            )
            SELECT 
                'Month ' + CAST(ROW_NUMBER() OVER (ORDER BY ym) AS VARCHAR) as label,
                COUNT(*) as volume,
                AVG(CAST(sentiment_score * 20 AS FLOAT)) as sentiment_avg,
                ym
            FROM MonthlyData
            GROUP BY ym
            ORDER BY ym ASC
        """, org_id)
        rows = cursor.fetchall()
        return [{
            "label": row.label,
            "volume": row.volume,
            "sentiment": round(float(row.sentiment_avg or 0))
        } for row in rows]
    
    start_date = (datetime.utcnow() - timedelta(days=period_days)).date()
    
    cursor.execute("""
        WITH WeeklyData AS (
            SELECT 
                r.sentiment_score,
                DATEDIFF(day, CAST(? AS DATE), r.reviewDate) / 7 as week_index
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = ? AND r.reviewDate >= CAST(? AS DATE)
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
