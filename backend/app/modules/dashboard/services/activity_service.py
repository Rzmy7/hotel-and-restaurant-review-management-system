"""Dashboard activity service — alerts and activity feed."""

from datetime import datetime, timedelta

import pyodbc
from app.core.pyodbc_connection import get_connection_string


def get_alerts() -> dict:
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()
    alerts = []

    cursor.execute("SELECT COUNT(*) FROM dbo.ProcessedReviews WHERE [status] = 'Pending'")
    pending = cursor.fetchone()[0]
    if pending > 0:
        alerts.append({"type": "warning", "title": f"{pending} Pending Reviews", "message": "You have reviews that need attention."})

    seven_days_ago = (datetime.now() - timedelta(days=7)).date()
    cursor.execute("SELECT COUNT(*) FROM dbo.ProcessedReviews WHERE sentiment = 'Negative' AND reviewDate >= ?", seven_days_ago)
    neg_count = cursor.fetchone()[0]
    if neg_count > 0:
        alerts.append({"type": "error", "title": f"{neg_count} Negative Reviews This Week", "message": "New negative reviews require attention."})

    conn.close()
    return {"alerts": alerts}


def get_activities() -> dict:
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()
    cursor.execute("""
        SELECT TOP 15 id, userName, sentiment, rating, reviewDate, [status], source
        FROM dbo.ProcessedReviews ORDER BY reviewDate DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    activities = []
    for row in rows:
        activities.append({
            "id": row.id,
            "action": "Replied to review" if row.status == "Replied" else "New review",
            "userName": row.userName, "sentiment": row.sentiment,
            "rating": row.rating,
            "date": row.reviewDate.isoformat() if row.reviewDate else None,
            "source": row.source,
        })
    return {"activities": activities}
