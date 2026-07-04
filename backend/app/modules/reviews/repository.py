"""
Reviews repository — standardized SQL operations for the review processing pipeline.
"""

import uuid
from typing import List, Optional, Dict
from datetime import datetime

import pyodbc
from sqlalchemy import select, func, and_, or_, case
from sqlalchemy.orm import Session, joinedload
from app.core.pyodbc_connection import get_raw_connection


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
        ORDER BY scrapedAt ASC, id ASC
    """
    cursor.execute(sql)
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def fetch_all_reviews_enriched(
    organization_id: str,
    page: int = 0,
    limit: int = 50,
    filters: Optional[dict] = None,
    db: Session = None
) -> Dict:
    """
    Fetch processed reviews with associated media using SQLAlchemy ORM.
    """
    # Ensure dependencies are in the registry to avoid 'User not found' errors in joins
    try:
        import app.modules.auth.models.auth_models  # noqa
        import app.modules.organization.models.org_models  # noqa
    except ImportError:
        pass

    from app.modules.reviews.models import ProcessedReview
    from app.modules.source.models import Source, Platform

    if db is None:
        from app.database.session import SessionLocal
        db = SessionLocal()
        should_close = True
    else:
        should_close = False

    try:
        # Base query with optimized joins
        query = db.query(ProcessedReview).join(Source).join(Platform)
        query = query.filter(Source.organization_id == organization_id)

        # Apply Filters
        if filters:
            if filters.get("search"):
                search_val = f"%{filters['search']}%"
                if filters.get("embedding_search") in [True, "true", "True", "1", 1]:
                    import httpx
                    import logging
                    from app.modules.source.services.embedding_client import EMBEDDING_SERVICE_URL, _AUTH_HEADERS
                    _logger = logging.getLogger(__name__)
                    
                    # Uppercase source_ids to match ChromaDB metadata (SQL Server CAST produces uppercase UUIDs)
                    source_ids = [str(sid[0]).upper() for sid in db.query(Source.source_id).filter(Source.organization_id == organization_id).all()]
                    matching_ids = []
                    if source_ids:
                        try:
                            resp = httpx.post(f"{EMBEDDING_SERVICE_URL}/search", json={"query": filters["search"], "source_ids": source_ids, "top_k": 50}, headers=_AUTH_HEADERS, timeout=10.0)
                            if resp.status_code == 200:
                                data = resp.json()
                                _logger.info(f"Embedding search returned {len(data.get('reviews', []))} results for query '{filters['search']}'")
                                matching_ids = [(r.get("review_id") or r.get("id")).upper() for r in data.get("reviews", []) if r.get("review_id") or r.get("id")]
                            else:
                                _logger.warning(f"Embedding search returned status {resp.status_code}: {resp.text[:200]}")
                        except Exception as emb_err:
                            _logger.error(f"Embedding search failed: {emb_err}")
                    
                    if not matching_ids:
                        query = query.filter(ProcessedReview.id == None)
                    else:
                        query = query.filter(ProcessedReview.id.in_(matching_ids))
                else:
                    query = query.filter(or_(
                        ProcessedReview.text.ilike(search_val),
                        ProcessedReview.positive_text.ilike(search_val),
                        ProcessedReview.negative_text.ilike(search_val),
                        ProcessedReview.reviewerName.ilike(search_val),
                        ProcessedReview.heading.ilike(search_val)
                    ))
            
            if filters.get("rating"):
                rating_filters = []
                for r in filters["rating"]:
                    # Handle integer ratings as ranges to include floats (e.g. 4.0 matches 3.5 to 4.49)
                    # Standard rounding: r=5 matches >=4.5, r=4 matches 3.5-4.5, etc.
                    rating_filters.append(and_(ProcessedReview.rating >= r - 0.5, ProcessedReview.rating < r + 0.5))
                query = query.filter(or_(*rating_filters))

            if filters.get("sentiment"):
                query = query.filter(ProcessedReview.sentiment.in_(filters["sentiment"]))

            if filters.get("source"):
                query = query.filter(Platform.platform_name.in_(filters["source"]))

            if filters.get("category"):
                cat_filters = [ProcessedReview.categories.ilike(f'%"{cat}"%') for cat in filters["category"]]
                query = query.filter(or_(*cat_filters))

            if filters.get("status"):
                status_filters = []
                for s in filters["status"]:
                    if s == "Pending":
                        status_filters.append(ProcessedReview.status == 'pending')
                    elif s == "Replied":
                        status_filters.append(ProcessedReview.ai_reply.isnot(None))
                    elif s == "AI Draft":
                        status_filters.append(and_(ProcessedReview.status == 'processed', ProcessedReview.ai_reply.is_(None)))
                if status_filters:
                    query = query.filter(or_(*status_filters))

            if filters.get("dateFrom"):
                try:
                    from dateutil import parser as date_parser
                    df = date_parser.parse(filters["dateFrom"])
                    query = query.filter(ProcessedReview.reviewDate >= df)
                except:
                    query = query.filter(ProcessedReview.reviewDate >= filters["dateFrom"])

            if filters.get("dateTo"):
                try:
                    from dateutil import parser as date_parser
                    dt = date_parser.parse(filters["dateTo"])
                    query = query.filter(ProcessedReview.reviewDate <= dt)
                except:
                    query = query.filter(ProcessedReview.reviewDate <= filters["dateTo"])

        total_count = query.count()

        # Fetch Data
        from sqlalchemy.orm import selectinload
        query = query.options(selectinload(ProcessedReview.media))
        query = query.order_by(ProcessedReview.reviewDate.desc())
        query = query.offset(page * limit).limit(limit)
        db_reviews = query.all()

        import json
        results = []
        for rev in db_reviews:
            row = {
                "id": str(rev.id),
                "rating": rev.rating,
                "reviewerName": rev.reviewerName,
                "summary": rev.summary or "",
                "sentiment": rev.sentiment or "Neutral",
                "language": rev.language or "English",
                "reviewDate": rev.reviewDate,
                "scrapedAt": rev.scrapedAt,
                "status": rev.status,
                "ai_reply": rev.ai_reply,
                "source_id": str(rev.source_id),
                "positive_text": rev.positive_text,
                "negative_text": rev.negative_text,
                "heading": rev.heading,
                "source": rev.source.platform.platform_name if rev.source and rev.source.platform else "Unknown",
                "date": rev.reviewDate,
                "photos": [{"id": str(m.media_id), "src": m.src, "alt": m.alt} for m in rev.media]
            }

            from app.core.db_utils import normalize_string_list
            for field in ["categories", "keyPhrases"]:
                row[field] = normalize_string_list(getattr(rev, field))


            text_parts = [rev.text, rev.positive_text, rev.negative_text]
            row["text"] = "\n\n".join([p for p in text_parts if p]) if any(text_parts) else ""
            results.append(row)

        return {"data": results, "total": total_count}
    finally:
        if should_close: db.close()


def get_review_options(organization_id: str, db: Session = None) -> Dict[str, List[str]]:
    """Fetch distinct sources and categories for an organization using ORM."""
    try:
        import app.modules.auth.models.auth_models  # noqa
        import app.modules.organization.models.org_models  # noqa
    except ImportError:
        pass

    from app.modules.source.models import Source, Platform
    from app.modules.reviews.models import ProcessedReview

    if db is None:
        from app.database.session import SessionLocal
        db = SessionLocal()
        should_close = True
    else:
        should_close = False

    try:
        # 1. Get Sources
        sources = db.query(Platform.platform_name).join(Source).filter(
            Source.organization_id == organization_id
        ).distinct().all()
        source_list = [s[0] for s in sources]

        # 2. Get Categories (Using native OPENJSON for performance)
        # SQLAlchemy doesn't natively support OPENJSON well, so we use a text query for this specific part
        from sqlalchemy import text
        cat_sql = text("""
            SELECT DISTINCT 
                COALESCE(JSON_VALUE(c.value, '$.name'), c.value) as category_name
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            CROSS APPLY OPENJSON(r.categories) AS c
            WHERE s.organization_id = :org_id AND r.status = 'processed'
        """)
        categories = db.execute(cat_sql, {"org_id": organization_id}).fetchall()
        cat_list = [c[0] for c in categories if c[0]]

        return {
            "sources": sorted(source_list),
            "categories": sorted(cat_list)
        }
    finally:
        if should_close: db.close()


def get_review_stats(organization_id: str, filters: Optional[dict] = None, db: Session = None) -> Dict:
    """Calculate aggregated stats for an organization's reviews using ORM."""
    try:
        import app.modules.auth.models.auth_models  # noqa
        import app.modules.organization.models.org_models  # noqa
    except ImportError:
        pass

    from app.modules.reviews.models import ProcessedReview
    from app.modules.source.models import Source, Platform

    if db is None:
        from app.database.session import SessionLocal
        db = SessionLocal()
        should_close = True
    else:
        should_close = False

    try:
        query = db.query(ProcessedReview).join(Source).join(Platform)
        query = query.filter(Source.organization_id == organization_id)

        # Apply same filters as fetch (Reuse logic would be better but keeping it contained for now)
        if filters:
            if filters.get("search"):
                search_val = f"%{filters['search']}%"
                if filters.get("embedding_search") in [True, "true", "True", "1", 1]:
                    import httpx
                    import logging
                    from app.modules.source.services.embedding_client import EMBEDDING_SERVICE_URL, _AUTH_HEADERS
                    _logger = logging.getLogger(__name__)
                    # Uppercase source_ids to match ChromaDB metadata (SQL Server CAST produces uppercase UUIDs)
                    source_ids = [str(sid[0]).upper() for sid in db.query(Source.source_id).filter(Source.organization_id == organization_id).all()]
                    matching_ids = []
                    if source_ids:
                        try:
                            resp = httpx.post(f"{EMBEDDING_SERVICE_URL}/search", json={"query": filters["search"], "source_ids": source_ids, "top_k": 50}, headers=_AUTH_HEADERS, timeout=10.0)
                            if resp.status_code == 200:
                                matching_ids = [(r.get("review_id") or r.get("id")).upper() for r in resp.json().get("reviews", []) if r.get("review_id") or r.get("id")]
                            else:
                                _logger.warning(f"Embedding stats search returned status {resp.status_code}")
                        except Exception as emb_err:
                            _logger.error(f"Embedding stats search failed: {emb_err}")
                    query = query.filter(ProcessedReview.id.in_(matching_ids)) if matching_ids else query.filter(ProcessedReview.id == None)
                else:
                    query = query.filter(or_(
                        ProcessedReview.text.ilike(search_val),
                        ProcessedReview.positive_text.ilike(search_val),
                        ProcessedReview.negative_text.ilike(search_val),
                        ProcessedReview.reviewerName.ilike(search_val),
                        ProcessedReview.heading.ilike(search_val)
                    ))
            if filters.get("rating"):
                rating_filters = []
                for r in filters["rating"]:
                    rating_filters.append(and_(ProcessedReview.rating >= r - 0.5, ProcessedReview.rating < r + 0.5))
                query = query.filter(or_(*rating_filters))

            if filters.get("sentiment"):
                query = query.filter(ProcessedReview.sentiment.in_(filters["sentiment"]))

            if filters.get("source"):
                query = query.filter(Platform.platform_name.in_(filters["source"]))

            if filters.get("category"):
                cat_filters = [ProcessedReview.categories.ilike(f'%"{cat}"%') for cat in filters["category"]]
                query = query.filter(or_(*cat_filters))

            if filters.get("status"):
                status_filters = []
                for s in filters["status"]:
                    if s == "Pending":
                        status_filters.append(ProcessedReview.status == 'pending')
                    elif s == "Replied":
                        status_filters.append(ProcessedReview.ai_reply.isnot(None))
                    elif s == "AI Draft":
                        status_filters.append(and_(ProcessedReview.status == 'processed', ProcessedReview.ai_reply.is_(None)))
                if status_filters:
                    query = query.filter(or_(*status_filters))

            if filters.get("dateFrom"):
                try:
                    from dateutil import parser as date_parser
                    df = date_parser.parse(filters["dateFrom"])
                    query = query.filter(ProcessedReview.reviewDate >= df)
                except:
                    query = query.filter(ProcessedReview.reviewDate >= filters["dateFrom"])

            if filters.get("dateTo"):
                try:
                    from dateutil import parser as date_parser
                    dt = date_parser.parse(filters["dateTo"])
                    query = query.filter(ProcessedReview.reviewDate <= dt)
                except:
                    query = query.filter(ProcessedReview.reviewDate <= filters["dateTo"])

        # Aggregations
        # Apply the same filters to aggregation query by reusing the query object
        stats_row = query.with_entities(
            func.count(ProcessedReview.id),
            func.avg(ProcessedReview.rating),
            func.sum(case((ProcessedReview.sentiment == 'Positive', 1), (ProcessedReview.sentiment == 'Negative', -1), else_=0)),
            func.sum(case((or_(ProcessedReview.status == 'pending', ProcessedReview.ai_reply.is_(None)), 1), else_=0))
        ).one()

        total = stats_row[0] or 0
        avg_rating = round(float(stats_row[1] or 0), 1)
        sentiment_sum = stats_row[2] or 0
        pending = stats_row[3] or 0
        
        sentiment_score = round(((sentiment_sum / total) + 1) * 50) if total > 0 else 50

        return {
            "totalReviews": total,
            "averageRating": avg_rating,
            "pendingReplies": pending,
            "sentimentScore": sentiment_score
        }
    finally:
        if should_close: db.close()


def count_reviews_raw() -> int:
    """Return the total count of processed reviews."""
    with get_raw_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM dbo.processed_review")
        count = cursor.fetchone()[0]
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
    with get_raw_connection() as conn:
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
    with get_raw_connection() as conn:
        cursor = conn.cursor()
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
        return deleted_count
