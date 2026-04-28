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
        cursor.execute("""
            SELECT COUNT(*) 
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = ?
        """, org_id)
        total_reviews = cursor.fetchone()[0]

        cursor.execute("""
            SELECT AVG(CAST(r.rating AS FLOAT)) 
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = ?
        """, org_id)
        avg_rating_row = cursor.fetchone()[0]
        average_rating = round(avg_rating_row, 2) if avg_rating_row else 0

        conn.close()
        return {
            "totalReviews": total_reviews,
            "averageRating": average_rating
        }

    # Global Admin View
    cursor.execute("SELECT COUNT(*) FROM dbo.processed_review")
    total_reviews = cursor.fetchone()[0]

    cursor.execute("SELECT AVG(CAST(rating AS FLOAT)) FROM dbo.processed_review")
    avg_rating_row = cursor.fetchone()[0]
    average_rating = round(avg_rating_row, 2) if avg_rating_row else 0

    cursor.execute("SELECT COUNT(*) FROM dbo.processed_review WHERE [status] = 'Replied'")
    replied_count = cursor.fetchone()[0]
    response_rate = round((replied_count / total_reviews) * 100, 1) if total_reviews > 0 else 0

    cursor.execute("SELECT COUNT(*) FROM dbo.processed_review WHERE [status] = 'Pending'")
    pending = cursor.fetchone()[0]

    # Admin Dashboard Specifics
    total_orgs = 0
    active_orgs = 0
    if _table_exists(cursor, "organization"):
        cursor.execute("SELECT COUNT(*) FROM dbo.organization")
        total_orgs = cursor.fetchone()[0]
        # All organizations are active now
        active_orgs = total_orgs

    total_users = 0
    if _table_exists(cursor, "user"):
        cursor.execute("SELECT COUNT(*) FROM dbo.[user]")
        total_users = cursor.fetchone()[0]

    competitor_count = 0
    if _table_exists(cursor, "Competitors"):
        cursor.execute("SELECT COUNT(*) FROM dbo.Competitors WHERE isTracked = 1")
        competitor_count = cursor.fetchone()[0]

    conn.close()
    return {
        "totalReviews": total_reviews,
        "averageRating": average_rating,
        "responseRate": response_rate,
        "pendingReviews": pending,
        "competitorsTracked": competitor_count,
        "totalOrganizations": total_orgs,
        "totalUsers": total_users,
        "activeHotels": active_orgs,
        "organizationsGrowth": 0,
        "usersGrowth": 0,
        "hotelsGrowth": 0,
        "reviewsGrowth": 0,
        "activeUsersToday": 0,
        "reviewsCollectedToday": 0,
        "systemUptime": 100,
        "processedReviews": 0,
        "processedReviewsGrowth": 0
    }


def get_distribution(org_id: str = None) -> dict:
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()
    if org_id:
        cursor.execute("""
            SELECT ROUND(r.rating, 0) AS rounded_rating, COUNT(*) as cnt 
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = ? AND r.rating IS NOT NULL
            GROUP BY ROUND(r.rating, 0) ORDER BY ROUND(r.rating, 0)
        """, org_id)
    else:
        cursor.execute("SELECT ROUND(rating, 0) AS rounded_rating, COUNT(*) as cnt FROM dbo.processed_review WHERE rating IS NOT NULL GROUP BY ROUND(rating, 0) ORDER BY ROUND(rating, 0)")
    rows = cursor.fetchall()
    conn.close()
    distribution = {str(i): 0 for i in range(1, 6)}
    for row in rows:
        bucket = str(max(1, min(5, int(row.rounded_rating))))
        distribution[bucket] = distribution.get(bucket, 0) + row.cnt
    return {"distribution": distribution}
