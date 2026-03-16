"""
Reviews repository — raw SQL queries for the reviews module.
Extracted from modules/reviews/service.py.
"""

from typing import List, Tuple, Dict

import pyodbc

from app.core.pyodbc_connection import get_connection_string


def fetch_all_reviews_raw() -> Tuple[list, Dict[str, list]]:
    """Fetch raw review rows and a photo map from the database."""
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()

    sql_reviews = """
        SELECT
            id, platformReviewId, rating, userName, reviewerName,
            reviewText, summary, sentiment, language, categories,
            keyPhrases, reviewDate, status, replyStatus, hasReply, source
        FROM dbo.ProcessedReviews
    """
    rows = cursor.execute(sql_reviews).fetchall()

    # Build a map for photos using platformReviewId
    original_ids = []
    id_map = {}
    for r in rows:
        try:
            if r.platformReviewId and "-" in r.platformReviewId:
                orig_id = int(r.platformReviewId.split('-')[1])
                original_ids.append(orig_id)
                id_map[orig_id] = r.id
        except (ValueError, IndexError):
            continue

    photo_map: Dict[str, list] = {}
    if original_ids:
        placeholders = ','.join('?' * len(original_ids))
        pics = cursor.execute(
            f"SELECT review_id, src, alt FROM review_photos WHERE review_id IN ({placeholders})",
            original_ids,
        ).fetchall()
        for pid, src, alt in pics:
            sys_id = id_map.get(pid)
            if sys_id:
                photo_map.setdefault(sys_id, []).append({"src": src, "alt": alt})

    conn.close()
    return rows, photo_map


def delete_all_reviews_raw() -> None:
    """Hard-delete all review data from all three tables."""
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()
    cursor.execute("DELETE FROM dbo.reviews")
    conn.commit()
    cursor.execute("DELETE FROM dbo.review_photos")
    conn.commit()
    cursor.execute("DELETE FROM dbo.ProcessedReviews")
    conn.commit()
    conn.close()


def count_reviews_raw() -> int:
    """Return the total count of processed reviews."""
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM dbo.ProcessedReviews")
    count = cursor.fetchone()[0]
    conn.close()
    return count
