"""
Review service — handles database operations for reviews.

Extracted from routers/reviews.py to separate concerns.
"""

import json
from typing import List

import pyodbc

from app.core.pyodbc_connection import get_connection_string


def get_all_reviews_from_db() -> List[dict]:
    """Fetch all processed reviews from the database."""
    try:
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

        # Fetch photos
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

        photo_map = {}
        if original_ids:
            placeholders = ','.join('?' * len(original_ids))
            sql_photos = f"SELECT review_id, src, alt FROM review_photos WHERE review_id IN ({placeholders})"
            pics = cursor.execute(sql_photos, original_ids).fetchall()

            for pid, src, alt in pics:
                sys_id = id_map.get(pid)
                if sys_id:
                    photo_map.setdefault(sys_id, []).append({"src": src, "alt": alt})

        results = []
        for row in rows:
            try:
                cat_list = json.loads(row.categories) if row.categories else []
            except json.JSONDecodeError:
                cat_list = []

            try:
                phrase_list = json.loads(row.keyPhrases) if row.keyPhrases else []
            except json.JSONDecodeError:
                phrase_list = []

            results.append({
                "id": row.id,
                "platformReviewId": row.platformReviewId,
                "rating": row.rating or 0,
                "userName": row.userName or "Anonymous",
                "reviewerName": row.reviewerName,
                "text": row.reviewText,
                "summary": row.summary,
                "sentiment": row.sentiment,
                "language": row.language,
                "categories": cat_list,
                "keyPhrases": phrase_list,
                "date": row.reviewDate,
                "status": row.status,
                "replyStatus": row.replyStatus,
                "hasReply": row.hasReply,
                "source": row.source,
                "photos": photo_map.get(row.id, []),
            })

        conn.close()
        return results

    except Exception as e:
        print(f"Database Error: {e}")
        raise e


def remove_all_reviews_from_db() -> bool:
    """Delete all reviews from the database."""
    try:
        conn = pyodbc.connect(get_connection_string())
        cursor = conn.cursor()

        cursor.execute("DELETE FROM dbo.reviews")
        conn.commit()

        cursor.execute("DELETE FROM dbo.review_photos")
        conn.commit()

        cursor.execute("DELETE FROM dbo.ProcessedReviews")
        conn.commit()

        conn.close()
        return True
    except Exception as e:
        print(f"Database Error: {e}")
        raise e


def count_all_reviews() -> int:
    """Returns the total number of reviews in the database."""
    try:
        conn = pyodbc.connect(get_connection_string())
        cursor = conn.cursor()

        query = "SELECT COUNT(*) FROM dbo.ProcessedReviews"
        cursor.execute(query)
        count = cursor.fetchone()[0]

        conn.close()
        return count
    except Exception as e:
        print(f"Database Error: {e}")
        raise e
