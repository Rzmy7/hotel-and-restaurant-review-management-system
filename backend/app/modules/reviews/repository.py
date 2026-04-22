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
    # Check if review already exists by primary key ID (now unified with scraper)
    try:
        cursor.execute(
            "SELECT CAST(id AS VARCHAR(36)) FROM dbo.processed_review WHERE id = ?",
            str(review_data["id"]),
        )
        row = cursor.fetchone()
    except Exception as e:
        import os

        with open("db_error_dump.log", "a", encoding="utf-8") as f:
            f.write(
                f"SELECT FAILURE: {e}\nID: {review_data.get('id')}\n\n"
            )
        raise e

    if row:
        review_id = row[0]
        # Update existing record back to pending
        sql = """
            UPDATE dbo.processed_review
            SET rating = CAST(? AS FLOAT), 
                reviewerName = ?, 
                text = ?, 
                positive_text = ?, 
                negative_text = ?, 
                heading = ?,
                reviewDate = ?, 
                scrapedAt = ?, 
                status = 'pending',
                source_id = CAST(? AS UNIQUEIDENTIFIER)
            WHERE id = CAST(? AS UNIQUEIDENTIFIER)
        """
        args = [
            review_data["rating"],
            review_data["reviewerName"],
            review_data.get("text"),
            review_data.get("positive_text"),
            review_data.get("negative_text"),
            review_data.get("heading"),
            review_data["reviewDate"],
            review_data["scrapedAt"],
            review_data.get("source_id"),
            review_id,
        ]
        try:
            cursor.execute(sql, *args)
        except Exception as e:
            with open("db_error_dump.log", "a", encoding="utf-8") as f:
                f.write(f"UPDATE FAILURE: {e}\nARGS: {args}\n\n")
            raise e
        return review_id
    else:
        # Insert new record using the provided unified ID
        sql = """
            INSERT INTO dbo.processed_review (
                id, rating, 
                reviewerName, text, positive_text, negative_text, heading, 
                reviewDate, scrapedAt, status, source_id
            )
            VALUES (
                CAST(? AS UNIQUEIDENTIFIER), 
                CAST(? AS FLOAT), 
                ?, ?, ?, ?, ?, ?, ?, 'pending', 
                CAST(? AS UNIQUEIDENTIFIER)
            )
        """
        args = [
            str(review_data["id"]),
            review_data.get("rating"),
            review_data["reviewerName"],
            review_data.get("text"),
            review_data.get("positive_text"),
            review_data.get("negative_text"),
            review_data.get("heading"),
            review_data["reviewDate"],
            review_data["scrapedAt"],
            review_data.get("source_id"),
        ]

        try:
            cursor.execute(sql, *args)
        except Exception as e:
            # Emergency log on exact SQL failure
            with open("db_error_dump.log", "a", encoding="utf-8") as f:
                f.write(f"INSERT FAILURE: {e}\nARGS: {args}\n\n")
            raise e

        return str(review_data["id"])


def insert_review_media(
    cursor: pyodbc.Cursor, review_id: uuid.UUID, photos: List[dict]
) -> None:
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
            id, rating, reviewerName, text, 
            positive_text, negative_text, heading,
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


def fetch_all_reviews_enriched(
    organization_id: str,
    page: int = 0,
    limit: int = 50,
    filters: Optional[dict] = None
) -> Dict:
    """
    Fetch processed reviews with associated media, supporting pagination and filtering.
    Returns: { "data": List[dict], "total": int }
    """
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()

    # Base WHERE clause (only processed reviews)
    where_clauses = ["s.organization_id = ?", "r.status = 'processed'"]
    params = [organization_id]

    if filters:
        if filters.get("search"):
            where_clauses.append("(r.text LIKE ? OR r.positive_text LIKE ? OR r.negative_text LIKE ? OR r.reviewerName LIKE ? OR r.heading LIKE ?)")
            search_val = f"%{filters['search']}%"
            params.extend([search_val, search_val, search_val, search_val, search_val])
        
        if filters.get("rating"):
            ratings = filters["rating"]
            if isinstance(ratings, list) and len(ratings) > 0:
                placeholders = ",".join(["?"] * len(ratings))
                where_clauses.append(f"r.rating IN ({placeholders})")
                params.extend(ratings)
        
        if filters.get("sentiment"):
            sentiments = filters["sentiment"]
            if isinstance(sentiments, list) and len(sentiments) > 0:
                placeholders = ",".join(["?"] * len(sentiments))
                where_clauses.append(f"r.sentiment IN ({placeholders})")
                params.extend(sentiments)
        
        if filters.get("source"):
            sources = filters["source"]
            if isinstance(sources, list) and len(sources) > 0:
                # Joining with platform to filter by platform name
                # (Note: we already have JOIN dbo.source s)
                # We need to JOIN platform p
                pass # Will handle in SQL below

        # Date range
        if filters.get("dateFrom"):
            where_clauses.append("r.reviewDate >= ?")
            params.append(filters["dateFrom"])
        if filters.get("dateTo"):
            where_clauses.append("r.reviewDate <= ?")
            params.append(filters["dateTo"])

    where_sql = " AND ".join(where_clauses)

    # 1. Get Total Count
    count_sql = f"""
        SELECT COUNT(*)
        FROM dbo.processed_review r
        JOIN dbo.source s ON r.source_id = s.source_id
        WHERE {where_sql}
    """
    cursor.execute(count_sql, params)
    total_count = cursor.fetchone()[0]

    # 2. Fetch Paged Data
    # Adding platform join for source name filtering if needed
    fetch_sql = f"""
        SELECT
            r.id, r.rating, r.reviewerName,
            r.text, r.summary, r.sentiment, r.language, r.categories,
            r.keyPhrases, r.reviewDate, r.scrapedAt, r.status, r.ai_reply,
            r.source_id, r.positive_text, r.negative_text, r.heading,
            p.platform_name as source
        FROM dbo.processed_review r
        JOIN dbo.source s ON r.source_id = s.source_id
        JOIN dbo.platform p ON s.platform_id = p.platform_id
        WHERE {where_sql}
        ORDER BY r.reviewDate DESC
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    """
    
    # Add pagination params
    fetch_params = params + [page * limit, limit]
    
    cursor.execute(fetch_sql, fetch_params)
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

        # Map reviewDate to date for frontend compatibility
        row["date"] = row["reviewDate"]

        # Combine text fields for display if positive/negative texts are present
        text_parts = []
        if row.get("text"): text_parts.append(row["text"])
        if row.get("positive_text"): text_parts.append(row["positive_text"])
        if row.get("negative_text"): text_parts.append(row["negative_text"])
        if text_parts:
            row["text"] = "\n\n".join(text_parts)

        # Ensure sentiment/language/summary are never None for the Pydantic model
        if row.get("sentiment") is None:
            row["sentiment"] = "Neutral"
        if row.get("language") is None:
            row["language"] = "English"
        if row.get("summary") is None:
            row["summary"] = ""

        cursor.execute(
            "SELECT src, alt FROM dbo.review_media WHERE review_id = ?", rev_id
        )
        row["photos"] = [{"src": p[0], "alt": p[1]} for p in cursor.fetchall()]
        results.append(row)

    conn.close()
    return {"data": results, "total": total_count}


def get_review_options(organization_id: str) -> Dict[str, List[str]]:
    """Fetch distinct sources and categories for an organization."""
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()

    # Get sources
    cursor.execute("""
        SELECT DISTINCT p.platform_name
        FROM dbo.source s
        JOIN dbo.platform p ON s.platform_id = p.platform_id
        WHERE s.organization_id = ?
    """, organization_id)
    sources = [row[0] for row in cursor.fetchall()]

    # Get categories (requires parsing JSON from all reviews)
    cursor.execute("""
        SELECT categories
        FROM dbo.processed_review r
        JOIN dbo.source s ON r.source_id = s.source_id
        WHERE s.organization_id = ? AND r.status = 'processed'
    """, organization_id)
    
    all_categories = set()
    import json
    for row in cursor.fetchall():
        if row[0]:
            try:
                cats = json.loads(row[0])
                if isinstance(cats, list):
                    for c in cats:
                        all_categories.add(c)
            except:
                pass

    conn.close()
    return {
        "sources": sorted(list(sources)),
        "categories": sorted(list(all_categories))
    }


def get_review_stats(organization_id: str) -> Dict:
    """Calculate aggregated stats for an organization's reviews."""
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()

    sql = """
        SELECT
            COUNT(*) as totalReviews,
            AVG(CAST(rating AS FLOAT)) as averageRating,
            SUM(CASE WHEN sentiment = 'Positive' THEN 1 WHEN sentiment = 'Negative' THEN -1 ELSE 0 END) as sentimentSum,
            SUM(CASE WHEN status = 'pending' OR ai_reply IS NULL THEN 1 ELSE 0 END) as pendingReplies
        FROM dbo.processed_review r
        JOIN dbo.source s ON r.source_id = s.source_id
        WHERE s.organization_id = ? AND r.status = 'processed'
    """
    cursor.execute(sql, organization_id)
    row = cursor.fetchone()
    
    total = row[0] or 0
    avg_rating = round(float(row[1] or 0), 1)
    sentiment_sum = row[2] or 0
    pending = row[3] or 0

    # Normalized sentiment score (0-100)
    sentiment_score = 50
    if total > 0:
        sentiment_score = round(((sentiment_sum / total) + 1) * 50)

    conn.close()
    return {
        "totalReviews": total,
        "averageRating": avg_rating,
        "pendingReplies": pending,
        "sentimentScore": sentiment_score
    }


def count_reviews_raw() -> int:
    """Return the total count of processed reviews."""
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM dbo.processed_review")
    count = cursor.fetchone()[0]
    conn.close()
    return count


def get_processing_metrics(
    cursor: pyodbc.Cursor, organization_id: Optional[str] = None
) -> Dict[str, int]:
    """
    Returns counts of reviews grouped by status.
    If organization_id is provided, filters by that organization.
    """
    sql = "SELECT r.status, COUNT(*) FROM dbo.processed_review r"
    params = []

    if organization_id:
        sql += " JOIN dbo.source s ON r.source_id = s.source_id"
        sql += " WHERE s.organization_id = ?"
        params.append(organization_id)

    sql += " GROUP BY r.status"

    cursor.execute(sql, params)
    rows = cursor.fetchall()

    # Initialize counts
    metrics = {"pending": 0, "processed": 0, "failed": 0, "total": 0}

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
            id, rating, reviewerName, text, 
            positive_text, negative_text, heading,
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
