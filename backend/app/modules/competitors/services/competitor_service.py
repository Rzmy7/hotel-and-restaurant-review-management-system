"""
Competitor service — CRUD business logic.
Extracted from modules/competitors/service.py (DB operations section).
AI client singleton, prompts, and scraping pipeline are in their own files.
"""

from datetime import datetime
from typing import List, Optional, Dict

import pyodbc

from app.core.pyodbc_connection import get_connection_string
from app.modules.admin.services.subscription_service import increment_feature_usage


def get_all_competitors() -> List[Dict]:
    """Return all competitors (both tracked and available)."""
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        rows = cursor.execute("""
            SELECT id, name, location, bookingUrl, avgRating, sentimentScore,
                   reviewCount, isTracked, status, createdAt
            FROM dbo.Competitors
            ORDER BY isTracked DESC, name ASC
        """).fetchall()

        return [
            {
                "id": r.id,
                "name": r.name,
                "location": r.location,
                "bookingUrl": r.bookingUrl,
                "avgRating": round(r.avgRating or 0, 2),
                "sentimentScore": round(r.sentimentScore or 0, 1),
                "reviewCount": r.reviewCount or 0,
                "isTracked": bool(r.isTracked),
                "status": r.status,
                "createdAt": r.createdAt.isoformat() if r.createdAt else None,
            }
            for r in rows
        ]


def get_tracked_competitors() -> List[Dict]:
    return [c for c in get_all_competitors() if c["isTracked"]]


def get_available_competitors() -> List[Dict]:
    return [c for c in get_all_competitors() if not c["isTracked"]]


def get_competitor_by_id(competitor_id: int) -> Optional[Dict]:
    """Return a single competitor by ID."""
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        row = cursor.execute("""
            SELECT id, name, location, bookingUrl, avgRating, sentimentScore,
                   reviewCount, isTracked, status, createdAt
            FROM dbo.Competitors WHERE id = ?
        """, competitor_id).fetchone()

        if not row:
            return None

        return {
            "id": row.id,
            "name": row.name,
            "location": row.location,
            "bookingUrl": row.bookingUrl,
            "avgRating": round(row.avgRating or 0, 2),
            "sentimentScore": round(row.sentimentScore or 0, 1),
            "reviewCount": row.reviewCount or 0,
            "isTracked": bool(row.isTracked),
            "status": row.status,
            "createdAt": row.createdAt.isoformat() if row.createdAt else None,
        }


def add_competitor(name: str, location: str, booking_url: str) -> Dict:
    """Add a new competitor to the available pool."""
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO dbo.Competitors (name, location, bookingUrl, isTracked, status)
            OUTPUT INSERTED.id
            VALUES (?, ?, ?, 0, 'Pending')
        """, name, location, booking_url)
        new_id = cursor.fetchone()[0]
        conn.commit()
    return get_competitor_by_id(new_id)


def track_competitor(competitor_id: int, user_id: str | None = None) -> Optional[Dict]:
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE dbo.Competitors SET isTracked = 1 WHERE id = ?", competitor_id)
        
        if user_id:
            try:
                increment_feature_usage(cursor, user_id, "competitors")
            except Exception as e:
                print(f"FAILED TO INCREMENT COMPETITOR USAGE: {e}")
        
        conn.commit()
    return get_competitor_by_id(competitor_id)


def untrack_competitor(competitor_id: int) -> bool:
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE dbo.Competitors SET isTracked = 0 WHERE id = ?", competitor_id)
        conn.commit()
    return True


def delete_competitor(competitor_id: int) -> bool:
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM dbo.Competitors WHERE id = ?", competitor_id)
        conn.commit()
    return True


def get_competitor_reviews(competitor_id: int) -> List[Dict]:
    """Get all processed reviews for a competitor."""
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        rows = cursor.execute("""
            SELECT id, competitorId, platformReviewId, rating, userName,
                   reviewText, summary, sentiment, categories, keyPhrases,
                   language, reviewDate, source
            FROM dbo.CompetitorReviews
            WHERE competitorId = ?
            ORDER BY reviewDate DESC
        """, competitor_id).fetchall()

        results = []
        for r in rows:
            try:
                cat_list = json.loads(r.categories) if r.categories else []
            except json.JSONDecodeError:
                cat_list = []
            try:
                phrase_list = json.loads(r.keyPhrases) if r.keyPhrases else []
            except json.JSONDecodeError:
                phrase_list = []

            results.append({
                "id": r.id,
                "competitorId": r.competitorId,
                "platformReviewId": r.platformReviewId,
                "rating": r.rating or 0,
                "userName": r.userName or "Anonymous",
                "reviewText": r.reviewText,
                "summary": r.summary,
                "sentiment": r.sentiment,
                "categories": cat_list,
                "keyPhrases": phrase_list,
                "language": r.language,
                "reviewDate": r.reviewDate.isoformat() if r.reviewDate else None,
                "source": r.source,
            })
        return results
