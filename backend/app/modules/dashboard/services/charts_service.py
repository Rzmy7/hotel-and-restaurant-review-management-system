"""Dashboard charts service — adaptive grouping and trends logic."""

import json
from datetime import datetime, timedelta
from typing import List, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import text

def get_sentiment_distribution(db: Session, org_id: str, period_days: int = 0) -> Dict[str, Any]:
    """Retrieves sentiment distribution counts and percentages. period_days=0 means all-time."""
    if period_days > 0:
        start_date = (datetime.utcnow() - timedelta(days=period_days)).date()
        rows = db.execute(text("""
            SELECT r.sentiment, COUNT(*) as cnt 
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = :org_id AND r.reviewDate >= CAST(:start_date AS DATE)
            GROUP BY r.sentiment
        """), {"org_id": org_id, "start_date": start_date}).fetchall()
    else:
        rows = db.execute(text("""
            SELECT r.sentiment, COUNT(*) as cnt 
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = :org_id 
            GROUP BY r.sentiment
        """), {"org_id": org_id}).fetchall()
    
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

def get_daily_review_trends(db: Session, org_id: str, days: int = 7) -> List[Dict[str, Any]]:
    """
    Retrieves review volume and sentiment trends.
    Automatically caps the number of data points to 10 for any time period.
    """
    if days <= 0:
        # All-time: find the total range first
        row = db.execute(text("""
            SELECT MIN(r.reviewDate), DATEDIFF(day, MIN(r.reviewDate), GETDATE())
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = :org_id
        """), {"org_id": org_id}).fetchone()
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
                DATEDIFF(day, CAST(:start_date AS DATE), r.reviewDate) / {bucket_size} as bucket
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = :org_id AND r.reviewDate >= CAST(:start_date AS DATE)
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
    rows = db.execute(text(query), {"start_date": start_date, "org_id": org_id}).fetchall()

    return [{
        "label": row.label,
        "volume": row.volume,
        "sentiment": round(float(row.sentiment_avg or 0))
    } for row in rows]

def get_weekly_review_trends(db: Session, org_id: str, period_days: int = 30) -> List[Dict[str, Any]]:
    """
    Retrieves weekly review trends relative to the start of the requested period.
    Also caps results to a maximum of 10 standardized buckets.
    """
    if period_days <= 0:
        row = db.execute(text("""
            SELECT MIN(r.reviewDate), DATEDIFF(day, MIN(r.reviewDate), GETDATE())
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = :org_id
        """), {"org_id": org_id}).fetchone()
        if not row or not row[0]:
            return []
        start_date = row[0]
        days_span = max(1, row[1])
    else:
        start_date = (datetime.utcnow() - timedelta(days=period_days)).date()
        days_span = period_days

    bucket_size = max(1, days_span // 9)
    
    query = f"""
        WITH BucketedData AS (
            SELECT 
                r.sentiment_score,
                DATEDIFF(day, CAST(:start_date AS DATE), r.reviewDate) / {bucket_size} as bucket_index
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = :org_id AND r.reviewDate >= CAST(:start_date AS DATE)
        )
        SELECT 
            'Point ' + CAST(bucket_index + 1 AS VARCHAR) as label,
            COUNT(*) as volume,
            AVG(CAST(sentiment_score * 20 AS FLOAT)) as sentiment_avg,
            bucket_index
        FROM BucketedData
        GROUP BY bucket_index
        ORDER BY bucket_index ASC
    """
    rows = db.execute(text(query), {"start_date": start_date, "org_id": org_id}).fetchall()
    
    return [{
        "label": row.label,
        "volume": row.volume,
        "sentiment": round(float(row.sentiment_avg or 0))
    } for row in rows]


def get_weekly_sentiment_series(
    db: Session, org_id: str, period_days: int = 30
) -> Dict[str, Any]:
    """
    Returns separate Positive / Neutral / Negative count arrays for the
    sentiment-over-time chart on the Insights page.
    Groups reviews into up to 10 equal time buckets.
    """
    if period_days <= 0:
        row = db.execute(text("""
            SELECT MIN(r.reviewDate), DATEDIFF(day, MIN(r.reviewDate), GETDATE())
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = :org_id
        """), {"org_id": org_id}).fetchone()
        if not row or not row[0]:
            return {"labels": [], "positive": [], "neutral": [], "negative": []}
        start_date = row[0]
        days_span = max(1, row[1])
    else:
        start_date = (datetime.utcnow() - timedelta(days=period_days)).date()
        days_span = period_days

    bucket_size = max(1, days_span // 9)

    query = f"""
        SELECT
            bucket_index,
            'Point ' + CAST(bucket_index + 1 AS VARCHAR) AS label,
            SUM(CASE WHEN sentiment = 'Positive' THEN 1 ELSE 0 END) AS pos,
            SUM(CASE WHEN sentiment = 'Neutral'  THEN 1 ELSE 0 END) AS neu,
            SUM(CASE WHEN sentiment = 'Negative' THEN 1 ELSE 0 END) AS neg
        FROM (
            SELECT
                DATEDIFF(day, CAST(:start_date AS DATE), r.reviewDate) / {bucket_size} AS bucket_index,
                r.sentiment
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = :org_id AND r.reviewDate >= CAST(:start_date AS DATE)
        ) AS Bucketed
        GROUP BY bucket_index
        ORDER BY bucket_index ASC
    """
    rows = db.execute(text(query), {"start_date": start_date, "org_id": org_id}).fetchall()

    labels, pos_arr, neu_arr, neg_arr = [], [], [], []
    for row in rows:
        labels.append(row.label)
        total = (row.pos or 0) + (row.neu or 0) + (row.neg or 0)
        if total > 0:
            pos_arr.append(round((row.pos / total) * 100))
            neu_arr.append(round((row.neu / total) * 100))
            neg_arr.append(round((row.neg / total) * 100))
        else:
            pos_arr.append(0)
            neu_arr.append(0)
            neg_arr.append(0)

    return {"labels": labels, "positive": pos_arr, "neutral": neu_arr, "negative": neg_arr}


def get_review_volume_heatmap(
    db: Session, org_id: str, period_days: int = 30
) -> List[List[int]]:
    """
    Returns a 7-row (Mon=0 … Sun=6) × N-week grid of review counts.
    Each outer list is a WEEK column; each inner list has 7 day counts.
    This matches the InsightsPage heatmap rendering (columns = weeks, rows = days).
    """
    if period_days <= 0:
        period_days = 90  # default all-time fallback

    start_date = (datetime.utcnow() - timedelta(days=period_days)).date()

    # Use a derived table so reviewDate is only referenced in the inner
    # query (no GROUP BY). The outer query groups by simple column names.
    query = """
        SELECT
            week_index,
            day_of_week,
            COUNT(*) AS cnt
        FROM (
            SELECT
                DATEDIFF(week, CAST(:start_date AS DATE), CAST(r.reviewDate AS DATE)) AS week_index,
                (DATEPART(weekday, r.reviewDate) + 5) % 7 AS day_of_week
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = :org_id
              AND r.reviewDate >= CAST(:start_date AS DATE)
        ) AS sub
        GROUP BY week_index, day_of_week
        ORDER BY week_index, day_of_week
    """
    rows = db.execute(text(query), {"start_date": start_date, "org_id": org_id}).fetchall()
    if not rows:
        return []

    max_week = max(row.week_index for row in rows)
    # Build grid: weeks as columns, days as rows
    grid = [[0] * 7 for _ in range(max_week + 1)]
    for row in rows:
        wi = int(row.week_index)
        di = int(row.day_of_week)
        if 0 <= wi <= max_week and 0 <= di <= 6:
            grid[wi][di] = row.cnt

    return grid
