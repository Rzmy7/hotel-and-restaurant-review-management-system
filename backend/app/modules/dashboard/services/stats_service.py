"""Dashboard stats service — core KPIs and rating distribution."""

import pyodbc
from app.core.pyodbc_connection import get_connection_string


def _table_exists(cursor, table_name: str) -> bool:
    cursor.execute("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = ?", table_name)
    return cursor.fetchone()[0] > 0


def get_stats(org_id: str = None) -> dict:
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()

    if org_id:
        cursor.execute("SELECT COUNT(*) FROM dbo.ProcessedReviews WHERE organization_id = ?", org_id)
        total_reviews = cursor.fetchone()[0]

        cursor.execute("SELECT AVG(CAST(rating AS FLOAT)) FROM dbo.ProcessedReviews WHERE organization_id = ?", org_id)
        avg_rating_row = cursor.fetchone()[0]
        average_rating = round(avg_rating_row, 2) if avg_rating_row else 0

        conn.close()
        return {
            "totalReviews": total_reviews, 
            "averageRating": average_rating
        }

    cursor.execute("SELECT COUNT(*) FROM dbo.ProcessedReviews")
    total_reviews = cursor.fetchone()[0]

    cursor.execute("SELECT AVG(CAST(rating AS FLOAT)) FROM dbo.ProcessedReviews")
    avg_rating_row = cursor.fetchone()[0]
    average_rating = round(avg_rating_row, 2) if avg_rating_row else 0

    cursor.execute("SELECT COUNT(*) FROM dbo.ProcessedReviews WHERE [status] = 'Replied'")
    replied_count = cursor.fetchone()[0]
    response_rate = round((replied_count / total_reviews) * 100, 1) if total_reviews > 0 else 0

    cursor.execute("SELECT COUNT(*) FROM dbo.ProcessedReviews WHERE [status] = 'Pending'")
    pending = cursor.fetchone()[0]

    competitor_count = 0
    if _table_exists(cursor, "Competitors"):
        cursor.execute("SELECT COUNT(*) FROM dbo.Competitors WHERE isTracked = 1")
        competitor_count = cursor.fetchone()[0]

    conn.close()
    return {
        "totalReviews": total_reviews, "averageRating": average_rating,
        "responseRate": response_rate, "pendingReviews": pending,
        "competitorsTracked": competitor_count,
    }


def get_distribution(org_id: str = None) -> dict:
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()
    if org_id:
        cursor.execute("SELECT rating, COUNT(*) as cnt FROM dbo.ProcessedReviews WHERE organization_id = ? GROUP BY rating ORDER BY rating", org_id)
    else:
        cursor.execute("SELECT rating, COUNT(*) as cnt FROM dbo.ProcessedReviews GROUP BY rating ORDER BY rating")
    rows = cursor.fetchall()
    conn.close()
    distribution = {str(i): 0 for i in range(1, 6)}
    for row in rows:
        distribution[str(row.rating)] = row.cnt
    return {"distribution": distribution}
