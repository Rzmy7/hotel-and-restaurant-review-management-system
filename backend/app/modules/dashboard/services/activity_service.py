"""Dashboard activity service — alerts and activity feed."""

import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List

from sqlalchemy.orm import Session
from sqlalchemy import text


def get_alerts(db: Session, org_id: str = None) -> dict:
    alerts = []

    if org_id:
        sql = """
            SELECT COUNT(*) 
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE r.[status] = 'Pending' AND s.organization_id = :org_id
        """
        params = {"org_id": org_id}
    else:
        sql = "SELECT COUNT(*) FROM dbo.processed_review WHERE [status] = 'Pending'"
        params = {}

    pending = db.execute(text(sql), params).scalar() or 0
    if pending > 0:
        alerts.append(
            {
                "id": str(uuid.uuid4()),
                "type": "warning",
                "title": f"{pending} Pending Reviews",
                "message": "You have reviews that need attention.",
                "timestamp": datetime.utcnow().isoformat(),
                "isRead": False,
            }
        )

    seven_days_ago = (datetime.utcnow() - timedelta(days=7)).date()

    if org_id:
        sql_neg = """
            SELECT COUNT(*) 
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE r.sentiment = 'Negative' AND r.reviewDate >= :seven_days_ago AND s.organization_id = :org_id
        """
        params_neg = {"seven_days_ago": seven_days_ago, "org_id": org_id}
    else:
        sql_neg = "SELECT COUNT(*) FROM dbo.processed_review WHERE sentiment = 'Negative' AND reviewDate >= :seven_days_ago"
        params_neg = {"seven_days_ago": seven_days_ago}

    neg_count = db.execute(text(sql_neg), params_neg).scalar() or 0
    if neg_count > 0:
        alerts.append(
            {
                "id": str(uuid.uuid4()),
                "type": "error",
                "title": f"{neg_count} Negative Reviews This Week",
                "message": "New negative reviews require attention.",
                "timestamp": datetime.utcnow().isoformat(),
                "isRead": False,
            }
        )

    return {"alerts": alerts}


def get_activities(db: Session, org_id: str = None) -> dict:
    if org_id:
        sql = """
            SELECT TOP 15 
                r.id, r.reviewerName as userName, r.sentiment, r.rating, 
                r.reviewDate, r.[status], p.platform_name as platform_id
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            JOIN dbo.platform p ON s.platform_id = p.platform_id
            WHERE s.organization_id = :org_id
            ORDER BY r.reviewDate DESC
        """
        params = {"org_id": org_id}
    else:
        sql = """
            SELECT TOP 15 
                r.id, r.reviewerName as userName, r.sentiment, r.rating, 
                r.reviewDate, r.[status], p.platform_name as platform_id
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            JOIN dbo.platform p ON s.platform_id = p.platform_id
            ORDER BY r.reviewDate DESC
        """
        params = {}
        
    rows = db.execute(text(sql), params).fetchall()

    activities = []
    for row in rows:
        activities.append(
            {
                "id": str(row.id),
                "type": "scrape_completed" if row.status == "Replied" else "user_joined",
                "title": "Reply sent" if row.status == "Replied" else "New Review",
                "description": f"By {row.userName} on {row.platform_id}",
                "timestamp": row.reviewDate.isoformat() if row.reviewDate else datetime.utcnow().isoformat(),
                "user": row.userName,
            }
        )
    return {"activities": activities}


def get_negative_reviews_for_org(db: Session, org_id: str) -> dict:
    # Get count
    sql_count = """
        SELECT COUNT(*) 
        FROM dbo.processed_review r
        JOIN dbo.source s ON r.source_id = s.source_id
        WHERE s.organization_id = :org_id AND r.sentiment = 'Negative'
    """
    count = db.execute(text(sql_count), {"org_id": org_id}).scalar() or 0

    # Get detailed reviews
    sql_reviews = """
        SELECT 
            r.id, r.reviewerName, r.rating, r.text as reviewText, 
            r.reviewDate, p.platform_name as platform_id, r.sentiment
        FROM dbo.processed_review r
        JOIN dbo.source s ON r.source_id = s.source_id
        JOIN dbo.platform p ON s.platform_id = p.platform_id
        WHERE s.organization_id = :org_id AND r.sentiment = 'Negative'
        ORDER BY r.reviewDate DESC
    """
    rows = db.execute(text(sql_reviews), {"org_id": org_id}).fetchall()

    reviews = []
    for row in rows:
        reviews.append(
            {
                "id": row.id,
                "reviewerName": row.reviewerName,
                "rating": row.rating,
                "reviewText": row.reviewText,
                "date": row.reviewDate.isoformat() if row.reviewDate else None,
                "source": row.platform_id,
                "sentiment": row.sentiment,
            }
        )

    return {"count": count, "reviews": reviews}


def get_sentiment_counts(db: Session, org_id: str) -> dict:
    sql = """
        SELECT r.sentiment, COUNT(*) as cnt 
        FROM dbo.processed_review r
        JOIN dbo.source s ON r.source_id = s.source_id
        WHERE s.organization_id = :org_id
        GROUP BY r.sentiment
    """
    rows = db.execute(text(sql), {"org_id": org_id}).fetchall()

    counts = {"Positive": 0, "Negative": 0, "Neutral": 0}
    for row in rows:
        if row.sentiment in counts:
            counts[row.sentiment] = row.cnt

    total_cnt = sum(counts.values())
    pos_percentage = (
        round((counts["Positive"] / total_cnt) * 100, 1) if total_cnt > 0 else 0
    )

    return {
        "positive": counts["Positive"],
        "negative": counts["Negative"],
        "neutral": counts["Neutral"],
        "total": total_cnt,
        "positivePercentage": pos_percentage,
    }
