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
        # Preserving original media_id if provided by the scraper for better tracking
        m_id = pic.get("media_id") or uuid.uuid4()
        cursor.execute(sql, m_id, review_id, pic.get("src"), pic.get("alt", ""))


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

    # Base WHERE clause (we show all reviews regardless of AI processing status so users can see failed/pending ones)
    where_clauses = ["s.organization_id = ?"]
    params = [organization_id]

    if filters:
        if filters.get("search"):
            if filters.get("embedding_search") in [True, "true", "True", "1", 1]:
                import httpx
                from app.modules.source.services.embedding_client import EMBEDDING_SERVICE_URL
                
                cursor.execute("SELECT CAST(source_id AS VARCHAR(36)) FROM dbo.source WHERE organization_id = ?", organization_id)
                source_ids = [row[0] for row in cursor.fetchall()]
                
                matching_review_ids = []
                if source_ids:
                    try:
                        resp = httpx.post(
                            f"{EMBEDDING_SERVICE_URL}/search", 
                            json={"query": filters["search"], "source_ids": source_ids, "top_k": 50}, 
                            timeout=10.0
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            for review in data.get("reviews", []):
                                r_id = review.get("review_id") or review.get("id")
                                if r_id:
                                    matching_review_ids.append(r_id)
                    except Exception as e:
                        print(f"Embedding search error: {e}")
                
                if not matching_review_ids:
                    where_clauses.append("1 = 0")
                else:
                    placeholders = ",".join(["CAST(? AS UNIQUEIDENTIFIER)"] * len(matching_review_ids))
                    where_clauses.append(f"r.id IN ({placeholders})")
                    params.extend(matching_review_ids)
            else:
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
                placeholders = ",".join(["?"] * len(sources))
                where_clauses.append(f"p.platform_name IN ({placeholders})")
                params.extend(sources)

        if filters.get("category"):
            categories = filters["category"]
            if isinstance(categories, list) and len(categories) > 0:
                cat_clauses = []
                for cat in categories:
                    # Categories are stored as JSON arrays, e.g., ["Food", "Service"]
                    cat_clauses.append("r.categories LIKE ?")
                    params.append(f'%"{cat}"%')
                where_clauses.append(f"({' AND '.join(cat_clauses)})")

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
        JOIN dbo.platform p ON s.platform_id = p.platform_id
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

    # 3. Batch fetch photos for all results to avoid N+1 queries
    results = []
    if rows:
        review_ids = [row["id"] for row in rows]
        placeholders = ",".join(["?"] * len(review_ids))
        media_sql = f"SELECT CAST(review_id AS VARCHAR(36)) as rid, CAST(media_id AS VARCHAR(36)) as mid, src, alt FROM dbo.review_media WHERE review_id IN ({placeholders})"
        cursor.execute(media_sql, review_ids)
        
        media_map = {}
        for m_row in cursor.fetchall():
            rid = str(m_row[0])
            if rid not in media_map:
                media_map[rid] = []
            media_map[rid].append({"id": m_row[1], "src": m_row[2], "alt": m_row[3]})

        import json
        for row in rows:
            rev_id = str(row["id"])

            # Parse JSON fields stored in DB as strings
            for field in ["categories", "keyPhrases"]:
                if row.get(field):
                    try:
                        parsed = json.loads(row[field])
                        if isinstance(parsed, list):
                            sanitized = []
                            for item in parsed:
                                if isinstance(item, dict) and "name" in item:
                                    sanitized.append(str(item["name"]))
                                elif isinstance(item, str):
                                    sanitized.append(item)
                            row[field] = sanitized
                        else:
                            row[field] = []
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

            # Ensure sentiment/language/summary are never None
            if row.get("sentiment") is None: row["sentiment"] = "Neutral"
            if row.get("language") is None: row["language"] = "English"
            if row.get("summary") is None: row["summary"] = ""

            # Assign pre-fetched photos
            row["photos"] = media_map.get(rev_id, [])
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

    # Get categories using native SQL Server JSON parsing (OPENJSON)
    # This is significantly faster than fetching all strings and parsing in Python.
    cursor.execute("""
        SELECT DISTINCT 
            COALESCE(JSON_VALUE(c.value, '$.name'), c.value) as category_name
        FROM dbo.processed_review r
        JOIN dbo.source s ON r.source_id = s.source_id
        CROSS APPLY OPENJSON(r.categories) AS c
        WHERE s.organization_id = ? AND r.status = 'processed'
    """, organization_id)
    
    all_categories = [row[0] for row in cursor.fetchall() if row[0]]

    conn.close()
    return {
        "sources": sorted(list(sources)),
        "categories": sorted(list(all_categories))
    }


def get_review_stats(organization_id: str, filters: Optional[dict] = None) -> Dict:
    """Calculate aggregated stats for an organization's reviews, respecting all active filters."""
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()

    # Include all reviews so stats reflect the raw data even if AI processing is pending or failed
    where_clauses = ["s.organization_id = ?"]
    params = [organization_id]

    if filters:
        if filters.get("search"):
            if filters.get("embedding_search") in [True, "true", "True", "1", 1]:
                import httpx
                from app.modules.source.services.embedding_client import EMBEDDING_SERVICE_URL
                
                cursor.execute("SELECT CAST(source_id AS VARCHAR(36)) FROM dbo.source WHERE organization_id = ?", organization_id)
                source_ids = [row[0] for row in cursor.fetchall()]
                
                matching_review_ids = []
                if source_ids:
                    try:
                        resp = httpx.post(
                            f"{EMBEDDING_SERVICE_URL}/search", 
                            json={"query": filters["search"], "source_ids": source_ids, "top_k": 50}, 
                            timeout=10.0
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            for review in data.get("reviews", []):
                                r_id = review.get("review_id") or review.get("id")
                                if r_id:
                                    matching_review_ids.append(r_id)
                    except Exception as e:
                        print(f"Embedding search error: {e}")
                
                if not matching_review_ids:
                    where_clauses.append("1 = 0")
                else:
                    placeholders = ",".join(["CAST(? AS UNIQUEIDENTIFIER)"] * len(matching_review_ids))
                    where_clauses.append(f"r.id IN ({placeholders})")
                    params.extend(matching_review_ids)
            else:
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
                placeholders = ",".join(["?"] * len(sources))
                where_clauses.append(f"p.platform_name IN ({placeholders})")
                params.extend(sources)

        if filters.get("category"):
            categories = filters["category"]
            if isinstance(categories, list) and len(categories) > 0:
                cat_clauses = []
                for cat in categories:
                    cat_clauses.append("r.categories LIKE ?")
                    params.append(f'%"{cat}"%')
                where_clauses.append(f"({' AND '.join(cat_clauses)})")

        if filters.get("dateFrom"):
            where_clauses.append("r.reviewDate >= ?")
            params.append(filters["dateFrom"])
        if filters.get("dateTo"):
            where_clauses.append("r.reviewDate <= ?")
            params.append(filters["dateTo"])

    where_sql = " AND ".join(where_clauses)

    sql = f"""
        SELECT
            COUNT(*) as totalReviews,
            AVG(CAST(rating AS FLOAT)) as averageRating,
            SUM(CASE WHEN sentiment = 'Positive' THEN 1 WHEN sentiment = 'Negative' THEN -1 ELSE 0 END) as sentimentSum,
            SUM(CASE WHEN r.status = 'pending' OR ai_reply IS NULL THEN 1 ELSE 0 END) as pendingReplies
        FROM dbo.processed_review r
        JOIN dbo.source s ON r.source_id = s.source_id
        JOIN dbo.platform p ON s.platform_id = p.platform_id
        WHERE {where_sql}
    """
    cursor.execute(sql, params)
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


def get_full_distribution(organization_id: str) -> Dict:
    """
    Returns the full rating distribution (1-5 stars) with per-source breakdowns.
    Used by the "See Details" distribution modal.
    """
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()

    # Get distribution grouped by source platform and rounded rating
    cursor.execute("""
        SELECT 
            p.platform_name AS source_name,
            CAST(ROUND(r.rating, 0) AS INT) AS rounded_rating,
            COUNT(*) AS cnt
        FROM dbo.processed_review r
        JOIN dbo.source s ON r.source_id = s.source_id
        JOIN dbo.platform p ON s.platform_id = p.platform_id
        WHERE s.organization_id = ? AND r.rating IS NOT NULL
        GROUP BY p.platform_name, CAST(ROUND(r.rating, 0) AS INT)
        ORDER BY p.platform_name, CAST(ROUND(r.rating, 0) AS INT) DESC
    """, organization_id)

    rows = cursor.fetchall()
    conn.close()

    # Build per-source and global stats
    source_map: Dict[str, Dict[int, int]] = {}
    global_dist: Dict[int, int] = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}

    for row in rows:
        source_name = row.source_name or "Unknown"
        bucket = max(1, min(5, row.rounded_rating))
        count = row.cnt

        if source_name not in source_map:
            source_map[source_name] = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        
        source_map[source_name][bucket] += count
        global_dist[bucket] += count

    global_total = sum(global_dist.values())

    def build_distribution(dist: Dict[int, int], total: int):
        return [
            {
                "rating": r,
                "count": dist[r],
                "percentage": round((dist[r] / total) * 100) if total > 0 else 0
            }
            for r in [5, 4, 3, 2, 1]
        ]

    sources = []
    for name, dist in sorted(source_map.items()):
        total = sum(dist.values())
        avg = sum(r * c for r, c in dist.items()) / total if total > 0 else 0
        sources.append({
            "name": name,
            "total": total,
            "average": round(avg, 1),
            "distribution": build_distribution(dist, total)
        })

    return {
        "global": {
            "total": global_total,
            "average": round(sum(r * c for r, c in global_dist.items()) / global_total, 1) if global_total > 0 else 0,
            "distribution": build_distribution(global_dist, global_total)
        },
        "sources": sources
    }


def delete_reviews_by_source_id(source_id: str) -> int:
    """
    Delete all reviews and associated media for a specific source.
    Returns the number of reviews deleted.
    """
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()
    try:
        # 1. Delete associated media
        # We join with processed_review to find media belonging to this source
        media_sql = """
            DELETE rm
            FROM dbo.review_media rm
            INNER JOIN dbo.processed_review r ON rm.review_id = r.id
            WHERE r.source_id = CAST(? AS UNIQUEIDENTIFIER)
        """
        cursor.execute(media_sql, source_id)

        # 2. Delete processed reviews
        reviews_sql = "DELETE FROM dbo.processed_review WHERE source_id = CAST(? AS UNIQUEIDENTIFIER)"
        cursor.execute(reviews_sql, source_id)
        
        deleted_count = cursor.rowcount
        conn.commit()
        return deleted_count
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()
