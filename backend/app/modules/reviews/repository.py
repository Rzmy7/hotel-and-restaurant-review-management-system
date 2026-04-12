"""
Reviews repository — standardized SQL operations for the review processing pipeline.
"""

import uuid
from typing import List, Optional, Dict
from datetime import datetime

import pyodbc
from app.core.pyodbc_connection import get_connection_string


def upsert_review_pending(cursor: pyodbc.Cursor, review_data: dict) -> uuid.UUID:
    """
    Insert or update a review record from the scraper.
    Sets status to 'pending' to trigger the AI processing pipeline.
    Returns the internal primary key (UUID).
    """
    # Check if review already exists by platformReviewId
    cursor.execute(
       "SELECT id FROM dbo.processed_review WHERE platformReviewId = ?",
       review_data["platformReviewId"]
    )
    row = cursor.fetchone()
    
    if row:
        review_id = row[0]
        # Update existing record back to pending
        sql = """
            UPDATE dbo.processed_review
            SET rating = ?, reviewerName = ?, text = ?, 
                positive_text = ?, negative_text = ?,
                reviewDate = ?, scrapedAt = ?, status = 'pending',
                source_id = ?, organization_id = ?
            WHERE id = ?
        """
        cursor.execute(
            sql,
            review_data["rating"],
            review_data["reviewerName"],
            review_data.get("text"),
            review_data.get("positive_text"),
            review_data.get("negative_text"),
            review_data["reviewDate"],
            review_data["scrapedAt"],
            review_data.get("source_id"),
            review_data.get("organization_id"),
            review_id
        )
        return review_id
    else:
        # Insert new record
        new_id = uuid.uuid4()
        sql = """
            INSERT INTO dbo.processed_review (
                id, platformReviewId, platform_id, rating, reviewerName,
                text, positive_text, negative_text,
                reviewDate, scrapedAt, status, source_id, organization_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
        """
        cursor.execute(
            sql,
            new_id,
            review_data["platformReviewId"],
            review_data.get("platform_id"),
            review_data["rating"],
            review_data["reviewerName"],
            review_data.get("text"),
            review_data.get("positive_text"),
            review_data.get("negative_text"),
            review_data["reviewDate"],
            review_data["scrapedAt"],
            review_data.get("source_id"),
            review_data.get("organization_id")
        )
        return new_id


def insert_review_media(cursor: pyodbc.Cursor, review_id: uuid.UUID, photos: List[dict]) -> None:
    """Bulk insert photos for a processed review."""
    if not photos:
        return
        
    # We clear existing photos for this review to avoid duplicates on re-ingestion
    cursor.execute("DELETE FROM dbo.review_media WHERE review_id = ?", review_id)
    
    sql = "INSERT INTO dbo.review_media (media_id, review_id, src, alt) VALUES (?, ?, ?, ?)"
    for pic in photos:
        cursor.execute(sql, uuid.uuid4(), review_id, pic.get("src"), pic.get("alt", ""))


def get_pending_batch(cursor: pyodbc.Cursor, limit: int = 10) -> List[dict]:
    """Fetch a batch of reviews that need AI processing."""
    sql = f"""
        SELECT TOP {limit}
            id, platformReviewId, rating, reviewerName, text, 
            positive_text, negative_text,
            CAST(reviewDate AS VARCHAR) as reviewDate, 
            CAST(scrapedAt AS VARCHAR) as scrapedAt, 
            source_id
        FROM dbo.processed_review
        WHERE status = 'pending'
        ORDER BY scrapedAt ASC
    """
    cursor.execute(sql)
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def fetch_all_reviews_enriched(organization_id: str) -> List[dict]:
    """Fetch processed reviews with their associated media."""
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()

    sql = """
        SELECT
            r.id, r.platformReviewId, r.platform_id, r.rating, r.reviewerName,
            r.text, r.summary, r.sentiment, r.language, r.categories,
            r.keyPhrases, r.reviewDate, r.scrapedAt, r.status, r.ai_reply,
            r.source_id, r.positive_text, r.negative_text
        FROM dbo.processed_review r
        WHERE r.organization_id = ?
        ORDER BY r.reviewDate DESC
    """
    cursor.execute(sql, (organization_id,))
    columns = [column[0] for column in cursor.description]
    rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

    # Fetch photos for all results
    results = []
    import json
    for row in rows:
        rev_id = row["id"]
        
        # Parse JSON fields stored in DB as strings
        for field in ["categories", "keyPhrases"]:
            if row.get(field):
                try:
                    row[field] = json.loads(row[field])
                except Exception:
                    row[field] = []
            else:
                row[field] = []
        
        # Ensure sentiment/language/summary are never None for the Pydantic model
        if row.get("sentiment") is None:
            row["sentiment"] = "Neutral"
        if row.get("language") is None:
            row["language"] = "English"
        if row.get("summary") is None:
             row["summary"] = ""

        cursor.execute("SELECT src, alt FROM dbo.review_media WHERE review_id = ?", rev_id)
        row["photos"] = [{"src": p[0], "alt": p[1]} for p in cursor.fetchall()]
        results.append(row)

    conn.close()
    return results


def count_reviews_raw() -> int:
    """Return the total count of processed reviews."""
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM dbo.processed_review")
    count = cursor.fetchone()[0]
    conn.close()
    return count


def get_processing_metrics(cursor: pyodbc.Cursor, organization_id: Optional[str] = None) -> Dict[str, int]:
    """
    Returns counts of reviews grouped by status.
    If organization_id is provided, filters by that organization.
    """
    sql = "SELECT status, COUNT(*) FROM dbo.processed_review"
    params = []
    
    if organization_id:
        sql += " WHERE organization_id = ?"
        params.append(organization_id)
        
    sql += " GROUP BY status"
    
    cursor.execute(sql, params)
    rows = cursor.fetchall()
    
    # Initialize counts
    metrics = {
        "pending": 0,
        "processed": 0,
        "failed": 0,
        "total": 0
    }
    
    for status_str, count in rows:
        status_key = status_str.lower()
        if status_key in metrics:
            metrics[status_key] = count
        metrics["total"] += count
        
    return metrics


def get_review_by_id(cursor: pyodbc.Cursor, review_id: uuid.UUID) -> Optional[dict]:
    """Fetch a single review by its internal ID for AI processing."""
    sql = """
        SELECT
            id, platformReviewId, rating, reviewerName, text, 
            positive_text, negative_text,
            CAST(reviewDate AS VARCHAR) as reviewDate, 
            CAST(scrapedAt AS VARCHAR) as scrapedAt, 
            source_id, status
        FROM dbo.processed_review
        WHERE id = ?
    """
    cursor.execute(sql, (review_id,))
    row = cursor.fetchone()
    if not row:
        return None
        
    columns = [column[0] for column in cursor.description]
    return dict(zip(columns, row))
