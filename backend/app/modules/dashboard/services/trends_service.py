"""Dashboard trends service — usage over time and recent reviews."""

import json
from datetime import datetime, timedelta

import pyodbc
from app.core.pyodbc_connection import get_connection_string


def get_usage(org_id: str = None, period: int = 30) -> dict:
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()
    period_start = (datetime.now() - timedelta(days=period)).date()
    
    if org_id:
        cursor.execute("""
            SELECT CAST(reviewDate AS DATE) as review_day, COUNT(*) as review_count
            FROM dbo.processed_review 
            WHERE reviewDate >= ? AND organization_id = ?
            GROUP BY CAST(reviewDate AS DATE) ORDER BY review_day
        """, period_start, org_id)
    else:
        cursor.execute("""
            SELECT CAST(reviewDate AS DATE) as review_day, COUNT(*) as review_count
            FROM dbo.processed_review WHERE reviewDate >= ?
            GROUP BY CAST(reviewDate AS DATE) ORDER BY review_day
        """, period_start)
        
    rows = cursor.fetchall()
    conn.close()
    return {"trendData": [{"date": row.review_day.isoformat() if row.review_day else None, "reviews": row.review_count} for row in rows]}


def get_recent_reviews(org_id: str = None) -> dict:
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()
    
    if org_id:
        cursor.execute("""
            SELECT TOP 10 id, rating, reviewerName as userName, text as reviewText, sentiment, categories, reviewDate, [status], platform_id as source
            FROM dbo.processed_review 
            WHERE organization_id = ?
            ORDER BY reviewDate DESC
        """, org_id)
    else:
        cursor.execute("""
            SELECT TOP 10 id, rating, reviewerName as userName, text as reviewText, sentiment, categories, reviewDate, [status], platform_id as source
            FROM dbo.processed_review ORDER BY reviewDate DESC
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
