"""Dashboard activity service — alerts and activity feed."""

from datetime import datetime, timedelta

import pyodbc
from app.core.pyodbc_connection import get_connection_string


def get_alerts(org_id: str = None) -> dict:
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()
    alerts = []

    if org_id:
        cursor.execute("SELECT COUNT(*) FROM dbo.processed_review WHERE [status] = 'Pending' AND organization_id = ?", org_id)
    else:
        cursor.execute("SELECT COUNT(*) FROM dbo.processed_review WHERE [status] = 'Pending'")
    
    pending = cursor.fetchone()[0]
    if pending > 0:
        alerts.append({
            "id": str(uuid.uuid4()),
            "type": "warning",
            "title": f"{pending} Pending Reviews",
            "message": "You have reviews that need attention.",
            "timestamp": datetime.now().isoformat(),
            "isRead": False
        })

    seven_days_ago = (datetime.now() - timedelta(days=7)).date()
    
    if org_id:
        cursor.execute("SELECT COUNT(*) FROM dbo.processed_review WHERE sentiment = 'Negative' AND reviewDate >= ? AND organization_id = ?", seven_days_ago, org_id)
    else:
        cursor.execute("SELECT COUNT(*) FROM dbo.processed_review WHERE sentiment = 'Negative' AND reviewDate >= ?", seven_days_ago)
        
    neg_count = cursor.fetchone()[0]
    if neg_count > 0:
        alerts.append({
            "id": str(uuid.uuid4()),
            "type": "error",
            "title": f"{neg_count} Negative Reviews This Week",
            "message": "New negative reviews require attention.",
            "timestamp": datetime.now().isoformat(),
            "isRead": False
        })

    conn.close()
    return {"alerts": alerts}


def get_activities(org_id: str = None) -> dict:
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()
    if org_id:
        cursor.execute("""
            SELECT TOP 15 id, reviewerName as userName, sentiment, rating, reviewDate, [status], platform_id
            FROM dbo.processed_review 
            WHERE organization_id = ?
            ORDER BY reviewDate DESC
        """, org_id)
    else:
        cursor.execute("""
            SELECT TOP 15 id, reviewerName as userName, sentiment, rating, reviewDate, [status], platform_id
            FROM dbo.processed_review ORDER BY reviewDate DESC
        """)
    rows = cursor.fetchall()
    conn.close()

    activities = []
    for row in rows:
        activities.append({
            "id": str(row.id),
            "type": "scrape_completed" if row.status == "Replied" else "user_joined", # Mocking types to match RecentActivity
            "title": "Reply sent" if row.status == "Replied" else "New Review",
            "description": f"By {row.userName} on {row.platform_id}",
            "timestamp": row.reviewDate.isoformat() if row.reviewDate else datetime.now().isoformat(),
            "user": row.userName
        })
    return {"activities": activities}


def get_negative_reviews_for_org(org_id: str) -> dict:
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()

    # Get count
    cursor.execute(
        "SELECT COUNT(*) FROM dbo.processed_review WHERE organization_id = ? AND sentiment = 'Negative'", 
        org_id
    )
    count = cursor.fetchone()[0]

    # Get detailed reviews
    cursor.execute("""
        SELECT id, reviewerName, rating, text as reviewText, reviewDate, platform_id, sentiment
        FROM dbo.processed_review 
        WHERE organization_id = ? AND sentiment = 'Negative'
        ORDER BY reviewDate DESC
    """, org_id)
    
    rows = cursor.fetchall()
    conn.close()

    reviews = []
    for row in rows:
        reviews.append({
            "id": row.id,
            "reviewerName": row.reviewerName,
            "rating": row.rating,
            "reviewText": row.reviewText,
            "date": row.reviewDate.isoformat() if row.reviewDate else None,
            "source": row.platform_id,
            "sentiment": row.sentiment
        })

    return {
        "count": count,
        "reviews": reviews
    }


def get_sentiment_counts(org_id: str) -> dict:
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()

    cursor.execute("""
        SELECT sentiment, COUNT(*) as cnt 
        FROM dbo.processed_review 
        WHERE organization_id = ?
        GROUP BY sentiment
    """, org_id)
    
    rows = cursor.fetchall()
    conn.close()

    counts = {"Positive": 0, "Negative": 0, "Neutral": 0}
    for row in rows:
        if row.sentiment in counts:
            counts[row.sentiment] = row.cnt

    total_cnt = sum(counts.values())
    pos_percentage = round((counts["Positive"] / total_cnt) * 100, 1) if total_cnt > 0 else 0

    return {
        "positive": counts["Positive"],
        "negative": counts["Negative"],
        "neutral": counts["Neutral"],
        "total": total_cnt,
        "positivePercentage": pos_percentage
    }
