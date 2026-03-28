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


def get_all_reviews_from_db(organization_id: str) -> List[dict]:
    """Fetch all processed reviews and enrich with photos."""
    try:
        rows, photo_map = fetch_all_reviews_raw(organization_id)
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
                "id": str(row.id),
                "platformReviewId": None,
                "rating": row.rating or 0,
                "userName": row.reviewerName or "Anonymous",
                "reviewerName": row.reviewerName,
                "text": row.text,
                "summary": row.summary,
                "sentiment": row.sentiment or "Neutral",
                "language": row.language,
                "categories": cat_list,
                "keyPhrases": phrase_list,
                "date": row.reviewDate,
                "status": row.status or "active",
                "replyStatus": row.replyStatus or "Pending",
                "hasReply": "Yes" if row.ai_reply else "No",
                "source": row.source or "Unknown",
                "photos": photo_map.get(str(row.id).upper(), []),
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
