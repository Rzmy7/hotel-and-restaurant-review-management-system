"""
Review endpoints: list, count, delete.

Extracted from test/main.py.
"""

import json
from typing import List

import pyodbc
from fastapi import APIRouter, HTTPException

from app.core.pyodbc_connection import get_connection_string
from app.schemas.review import ReviewModel

router = APIRouter(tags=["Reviews"])


def _get_all_reviews_from_db():
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


def _remove_all_reviews_from_db():
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


@router.get("/reviews", response_model=List[ReviewModel])
def read_reviews():
    """Fetch all processed reviews from the database."""
    try:
        reviews = _get_all_reviews_from_db()
        return reviews
    except Exception as e:
        print(f"API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reviews_count")
def count_reviews():
    """Returns the total number of reviews in the database."""
    try:
        conn = pyodbc.connect(get_connection_string())
        cursor = conn.cursor()

        query = "SELECT COUNT(*) FROM dbo.ProcessedReviews"
        cursor.execute(query)
        count = cursor.fetchone()[0]

        conn.close()
        return {"total_reviews": count}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/delete_reviews")
def delete_all_reviews():
    """Deletes all reviews from the database."""
    try:
        success = _remove_all_reviews_from_db()
        if success:
            return {"status": "success", "message": "All reviews deleted."}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete reviews.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
