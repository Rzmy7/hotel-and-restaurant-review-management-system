"""
Review service — database operations and business logic for reviews.

Extracted from modules/reviews/service.py.
"""

import json
from typing import List

import pyodbc

from app.core.pyodbc_connection import get_connection_string
from app.modules.reviews.repository import (
    fetch_all_reviews_raw,
    delete_all_reviews_raw,
    count_reviews_raw,
)


def get_all_reviews_from_db() -> List[dict]:
    """Fetch all processed reviews and enrich with photos."""
    try:
        rows, photo_map = fetch_all_reviews_raw()
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
        return results
    except Exception as e:
        print(f"Database Error: {e}")
        raise e


def remove_all_reviews_from_db() -> bool:
    """Delete all reviews from the database."""
    try:
        delete_all_reviews_raw()
        return True
    except Exception as e:
        print(f"Database Error: {e}")
        raise e


def count_all_reviews() -> int:
    """Returns the total number of reviews in the database."""
    try:
        return count_reviews_raw()
    except Exception as e:
        print(f"Database Error: {e}")
        raise e
