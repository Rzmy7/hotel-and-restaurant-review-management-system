"""
Reviews repository — raw SQL queries for the reviews module.
Extracted from modules/reviews/service.py.
"""

from typing import List, Tuple, Dict

import pyodbc

from app.core.pyodbc_connection import get_connection_string


def fetch_all_reviews_raw(organization_id: str) -> Tuple[list, Dict[str, list]]:
    """Fetch raw review rows and a photo map from the database."""
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()

    sql_reviews = """
        SELECT
            r.id, r.rating, r.reviewerName,
            r.text, r.summary, r.sentiment, r.language, r.categories,
            r.keyPhrases, r.reviewDate, r.status, r.replyStatus, p.platform_name AS source,
            r.ai_reply
        FROM dbo.processed_review r
        LEFT JOIN dbo.platform p ON r.platform_id = p.platform_id
        WHERE r.organization_id = ?
    """
    rows = cursor.execute(sql_reviews, (organization_id,)).fetchall()

    original_ids = [str(r.id) for r in rows]

    photo_map: Dict[str, list] = {}
    if original_ids:
        # Fetch up to 2000 at a time to prevent SQL max parameters exception
        for i in range(0, len(original_ids), 2000):
            chunk = original_ids[i:i + 2000]
            placeholders = ','.join('?' * len(chunk))
            pics = cursor.execute(
                f"SELECT review_id, src, alt FROM dbo.review_media WHERE review_id IN ({placeholders})",
                chunk,
            ).fetchall()
            for review_id, src, alt in pics:
                pid = str(review_id).upper() if review_id else ""
                photo_map.setdefault(pid, []).append({"src": src, "alt": alt})

    # For mapping photos correctly if row.id casing differs, we'll ensure consistent casing
    photo_map_normalized = {k.upper(): v for k, v in photo_map.items()}
        
    conn.close()
    return rows, photo_map_normalized


def delete_all_reviews_raw() -> None:
    """Hard-delete all review data from all three tables."""
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()
    cursor.execute("DELETE FROM dbo.reviews")
    conn.commit()
    cursor.execute("DELETE FROM dbo.review_media")
    conn.commit()
    cursor.execute("DELETE FROM dbo.processed_review")
    conn.commit()
    conn.close()


def count_reviews_raw() -> int:
    """Return the total count of processed reviews."""
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM dbo.processed_review")
    count = cursor.fetchone()[0]
    conn.close()
    return count
