"""Dashboard trends service — usage over time and recent reviews."""

import json
from datetime import datetime, timedelta
from typing import Dict, Any, List

from sqlalchemy.orm import Session
from sqlalchemy import text


def get_usage(db: Session, org_id: str = None, period: int = 30) -> dict:
    period_start = (datetime.utcnow() - timedelta(days=period)).date()
    
    if org_id:
        sql = """
            SELECT CAST(r.reviewDate AS DATE) as review_day, COUNT(*) as review_count
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE r.reviewDate >= :period_start AND s.organization_id = :org_id
            GROUP BY CAST(r.reviewDate AS DATE) ORDER BY review_day
        """
        params = {"period_start": period_start, "org_id": org_id}
    else:
        sql = """
            SELECT CAST(reviewDate AS DATE) as review_day, COUNT(*) as review_count
            FROM dbo.processed_review WHERE reviewDate >= :period_start
            GROUP BY CAST(reviewDate AS DATE) ORDER BY review_day
        """
        params = {"period_start": period_start}
        
    rows = db.execute(text(sql), params).fetchall()
    return {
        "trendData": [
            {
                "date": row.review_day.isoformat() if row.review_day else None,
                "reviews": row.review_count
            }
            for row in rows
        ]
    }


def get_recent_reviews(db: Session, org_id: str = None, period_days: int = 0) -> dict:
    date_filter = ""
    params = {}
    if period_days > 0:
        period_start = (datetime.utcnow() - timedelta(days=period_days)).date()
        date_filter = " AND r.reviewDate >= CAST(:period_start AS DATE)"
        params["period_start"] = period_start
    
    if org_id:
        query = f"""
            SELECT TOP 10 
                r.id, r.rating, r.reviewerName as userName, r.text as reviewText, 
                r.positive_text, r.negative_text, r.heading,
                r.sentiment, r.categories, r.reviewDate, r.[status], 
                p.platform_name as source
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            JOIN dbo.platform p ON s.platform_id = p.platform_id
            WHERE s.organization_id = :org_id{date_filter}
            ORDER BY r.reviewDate DESC
        """
        params["org_id"] = org_id
    else:
        query = f"""
            SELECT TOP 10 
                r.id, r.rating, r.reviewerName as userName, r.text as reviewText, 
                r.positive_text, r.negative_text, r.heading,
                r.sentiment, r.categories, r.reviewDate, r.[status], 
                p.platform_name as source
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            JOIN dbo.platform p ON s.platform_id = p.platform_id
            {"WHERE r.reviewDate >= CAST(:period_start AS DATE)" if period_days > 0 else ""}
            ORDER BY r.reviewDate DESC
        """
        
    rows = db.execute(text(query), params).fetchall()

    from app.core.db_utils import normalize_string_list
    results = []
    for row in rows:
        cat_list = normalize_string_list(row.categories)

        # Combine text fields — text may be NULL while content is in positive/negative/heading
        text_parts = []
        if row.heading:
            text_parts.append(row.heading)
        if row.reviewText:
            text_parts.append(row.reviewText)
        if row.positive_text:
            text_parts.append(row.positive_text)
        if row.negative_text:
            text_parts.append(row.negative_text)
        combined_text = "\n\n".join(text_parts) if text_parts else ""

        results.append({
            "id": row.id,
            "rating": row.rating,
            "userName": row.userName,
            "text": combined_text,
            "sentiment": row.sentiment,
            "categories": cat_list,
            "date": row.reviewDate.isoformat() if row.reviewDate else None,
            "status": row.status,
            "source": row.source,
        })
    return {"reviews": results}
