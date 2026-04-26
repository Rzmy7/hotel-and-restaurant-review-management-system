"""
Reviews repository — standardized ORM operations for the review processing pipeline.
Elevated to meet academic standards by removing raw SQL and enforcing layered architecture.
"""

import uuid
import json
import logging
from typing import List, Optional, Dict
from datetime import datetime

from sqlalchemy import select, func, and_, or_, case, text, Integer, Boolean
from sqlalchemy.orm import Session, joinedload, selectinload

from app.modules.reviews.models import ProcessedReview, ReviewMedia
from app.modules.source.models import Source, Platform
from app.modules.reviews.services.embedding_service import search_reviews_by_embedding

# Circular import prevention: ensure dependencies are in registry
try:
    import app.modules.auth.models.auth_models  # noqa
    import app.modules.organization.models.org_models  # noqa
except ImportError:
    pass

logger = logging.getLogger(__name__)

# --- Private Helper Methods ---

def _apply_review_filters(query, filters, organization_id: str, db: Session):
    """Internal helper to apply standardized filters to review queries."""
    if not filters:
        return query

    # 1. Semantic Search (Vector Search via Service)
    if filters.get("search"):
        search_val = filters["search"]
        if filters.get("embedding_search") in [True, "true", "True", "1", 1]:
            # Fetch source IDs for the organization to narrow down vector search
            source_ids = [
                str(sid[0])
                for sid in db.query(Source.source_id)
                .filter(Source.organization_id == organization_id)
                .all()
            ]
            
            matching_ids = search_reviews_by_embedding(
                query=search_val,
                source_ids=source_ids,
                top_k=50
            )

            if not matching_ids:
                query = query.filter(ProcessedReview.id == None)
            else:
                query = query.filter(ProcessedReview.id.in_(matching_ids))
        else:
            # Traditional ILIKE search
            search_pattern = f"%{search_val}%"
            query = query.filter(
                or_(
                    ProcessedReview.text.ilike(search_pattern),
                    ProcessedReview.positive_text.ilike(search_pattern),
                    ProcessedReview.negative_text.ilike(search_pattern),
                    ProcessedReview.reviewerName.ilike(search_pattern),
                    ProcessedReview.heading.ilike(search_pattern),
                )
            )

    # 2. Basic Attribute Filters
    if filters.get("rating"):
        query = query.filter(ProcessedReview.rating.in_(filters["rating"]))
    
    if filters.get("sentiment"):
        query = query.filter(ProcessedReview.sentiment.in_(filters["sentiment"]))
        
    if filters.get("source"):
        query = query.filter(Platform.platform_name.in_(filters["source"]))
        
    if filters.get("category"):
        cat_filters = [
            ProcessedReview.categories.ilike(f'%"{cat}"%')
            for cat in filters["category"]
        ]
        query = query.filter(and_(*cat_filters))
        
    if filters.get("dateFrom"):
        query = query.filter(ProcessedReview.reviewDate >= filters["dateFrom"])
        
    if filters.get("dateTo"):
        query = query.filter(ProcessedReview.reviewDate <= filters["dateTo"])

    return query


# --- Public Repository Interface ---

def upsert_review_pending(db: Session, review_data: dict) -> uuid.UUID:
    """Insert or update a review record from the scraper using SQLAlchemy ORM."""
    review_id = uuid.UUID(str(review_data["id"]))
    
    review = db.query(ProcessedReview).filter(ProcessedReview.id == review_id).first()

    if review:
        review.rating = float(review_data["rating"])
        review.reviewerName = review_data["reviewerName"]
        review.text = review_data.get("text")
        review.positive_text = review_data.get("positive_text")
        review.negative_text = review_data.get("negative_text")
        review.heading = review_data.get("heading")
        review.reviewDate = review_data["reviewDate"]
        review.scrapedAt = review_data["scrapedAt"]
        review.status = "pending"
        review.source_id = uuid.UUID(str(review_data["source_id"]))
    else:
        review = ProcessedReview(
            id=review_id,
            rating=float(review_data["rating"]),
            reviewerName=review_data["reviewerName"],
            text=review_data.get("text"),
            positive_text=review_data.get("positive_text"),
            negative_text=review_data.get("negative_text"),
            heading=review_data.get("heading"),
            reviewDate=review_data["reviewDate"],
            scrapedAt=review_data["scrapedAt"],
            status="pending",
            source_id=uuid.UUID(str(review_data["source_id"]))
        )
        db.add(review)

    db.commit()
    return review_id


def insert_review_media(db: Session, review_id: uuid.UUID, photos: List[dict]) -> None:
    """Bulk insert photos for a processed review using SQLAlchemy ORM."""
    if not photos:
        return

    db.query(ReviewMedia).filter(ReviewMedia.review_id == review_id).delete()

    for pic in photos:
        m_id = pic.get("media_id")
        m_id = uuid.UUID(str(m_id)) if m_id else uuid.uuid4()
            
        media = ReviewMedia(
            media_id=m_id,
            review_id=review_id,
            src=pic.get("src"),
            alt=pic.get("alt", "")
        )
        db.add(media)
    db.commit()


def get_pending_batch(db: Session, limit: int = 10) -> List[ProcessedReview]:
    """Fetch a batch of reviews that need AI processing."""
    return (
        db.query(ProcessedReview)
        .filter(ProcessedReview.status == "pending")
        .order_by(ProcessedReview.scrapedAt.asc())
        .limit(limit)
        .all()
    )


def fetch_all_reviews_enriched(
    organization_id: str,
    page: int = 0,
    limit: int = 50,
    filters: Optional[dict] = None,
    db: Session = None,
) -> Dict:
    """Standardized entry point for fetching paginated reviews for UI."""
    query = db.query(ProcessedReview).join(Source).join(Platform)
    query = query.filter(Source.organization_id == organization_id)

    query = _apply_review_filters(query, filters, organization_id, db)

    total_count = query.count()

    # Optimized data loading
    query = query.options(selectinload(ProcessedReview.media))
    query = query.order_by(ProcessedReview.reviewDate.desc())
    query = query.offset(page * limit).limit(limit)
    db_reviews = query.all()

    results = []
    for rev in db_reviews:
        row = {
            "id": str(rev.id),
            "rating": rev.rating,
            "reviewerName": rev.reviewerName,
            "userName": rev.reviewerName,  # Explicitly set for schema compatibility
            "text": rev.text,
            "reviewText": rev.text,  # Explicitly set for schema compatibility
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
            "photos": [{"id": str(m.media_id), "src": m.src, "alt": m.alt} for m in rev.media],
        }

        # Parse JSON fields
        for field in ["categories", "keyPhrases"]:
            val = getattr(rev, field)
            if val:
                try:
                    parsed = json.loads(val)
                    row[field] = [
                        str(item["name"]) if isinstance(item, dict) and "name" in item else str(item)
                        for item in parsed
                    ] if isinstance(parsed, list) else []
                except:
                    row[field] = []
            else:
                row[field] = []
        
        results.append(row)

    return {
        "reviews": results,
        "total": total_count,
        "page": page,
        "limit": limit
    }


def get_review_stats(organization_id: str, filters: Optional[dict] = None, db: Session = None) -> Dict:
    """Calculate aggregated stats using ORM and Case expressions."""
    query = db.query(ProcessedReview).join(Source).join(Platform)
    query = query.filter(Source.organization_id == organization_id)
    
    query = _apply_review_filters(query, filters, organization_id, db)

    stats = query.with_entities(
        func.count(ProcessedReview.id),
        func.avg(ProcessedReview.rating),
        func.sum(case((ProcessedReview.sentiment == "Positive", 1), (ProcessedReview.sentiment == "Negative", -1), else_=0)),
        func.sum(case((or_(ProcessedReview.status == "pending", ProcessedReview.ai_reply.is_(None)), 1), else_=0))
    ).one()

    total = stats[0] or 0
    avg_rating = round(float(stats[1] or 0), 1)
    sentiment_sum = stats[2] or 0
    pending = stats[3] or 0
    sentiment_score = round(((sentiment_sum / total) + 1) * 50) if total > 0 else 50

    return {
        "totalReviews": total,
        "averageRating": avg_rating,
        "pendingReplies": pending,
        "sentimentScore": sentiment_score,
    }


def get_org_sources_and_categories(organization_id: str, db: Session) -> Dict:
    """Fetch distinct sources and categories for an organization's filter menu."""
    sources = db.query(Platform.platform_name).join(Source).filter(Source.organization_id == organization_id).distinct().all()
    source_list = [s[0] for s in sources]

    # OPENJSON remains a native T-SQL requirement for efficiency with JSON columns
    cat_sql = text("""
        SELECT DISTINCT COALESCE(JSON_VALUE(c.value, '$.name'), c.value) as cat
        FROM dbo.processed_review r
        JOIN dbo.source s ON r.source_id = s.source_id
        CROSS APPLY OPENJSON(r.categories) AS c
        WHERE s.organization_id = :org_id AND r.status = 'processed'
    """)
    categories = db.execute(cat_sql, {"org_id": organization_id}).fetchall()
    cat_list = [c[0] for c in categories if c[0]]

    return {"sources": sorted(source_list), "categories": sorted(cat_list)}


def get_review_options(organization_id: str, db: Session) -> Dict:
    """Alias for get_org_sources_and_categories for backward compatibility."""
    return get_org_sources_and_categories(organization_id, db)


def get_review_by_id(db: Session, review_id: uuid.UUID) -> Optional[ProcessedReview]:
    """Fetch a single review by its internal ID."""
    return db.query(ProcessedReview).filter(ProcessedReview.id == review_id).first()


def get_full_distribution(organization_id: str, db: Session) -> Dict:
    """Calculate rating distribution breakdowns per source."""
    rows = db.query(
        Platform.platform_name,
        func.cast(func.round(ProcessedReview.rating, 0), Integer).label("bucket"),
        func.count(ProcessedReview.id)
    ).join(Source, ProcessedReview.source_id == Source.source_id)\
     .join(Platform, Source.platform_id == Platform.platform_id)\
     .filter(Source.organization_id == organization_id, ProcessedReview.rating != None)\
     .group_by(Platform.platform_name, text("bucket"))\
     .all()

    source_map = {}
    global_dist = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}

    for row in rows:
        name, bucket, count = row[0], max(1, min(5, row[1])), row[2]
        if name not in source_map:
            source_map[name] = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        source_map[name][bucket] += count
        global_dist[bucket] += count

    def build_dist_list(dist, total):
        return [
            {"rating": r, "count": dist[r], "percentage": round((dist[r] / total) * 100) if total > 0 else 0}
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
            "distribution": build_dist_list(dist, total)
        })

    global_total = sum(global_dist.values())
    return {
        "global": {
            "total": global_total,
            "average": round(sum(r * c for r, c in global_dist.items()) / global_total, 1) if global_total > 0 else 0,
            "distribution": build_dist_list(global_dist, global_total),
        },
        "sources": sources,
    }


def delete_reviews_by_source_id(db: Session, source_id: str) -> int:
    """Delete all reviews and media for a specific source via ORM."""
    sid = uuid.UUID(source_id)
    # Media deletion (cascade usually handles this if configured, but explicit is safer for now)
    db.query(ReviewMedia).filter(ReviewMedia.review_id.in_(
        db.query(ProcessedReview.id).filter(ProcessedReview.source_id == sid)
    )).delete(synchronize_session=False)
    
    deleted_count = db.query(ProcessedReview).filter(ProcessedReview.source_id == sid).delete()
    db.commit()
    return deleted_count


def get_processing_metrics(db: Session, organization_id: Optional[str] = None) -> Dict[str, int]:
    """Calculate processing pipeline metrics using ORM grouping."""
    query = db.query(ProcessedReview.status, func.count(ProcessedReview.id))
    if organization_id:
        query = query.join(Source).filter(Source.organization_id == organization_id)
    
    rows = query.group_by(ProcessedReview.status).all()
    metrics = {"pending": 0, "processed": 0, "failed": 0, "total": 0}
    for status, count in rows:
        status_key = status.lower()
        if status_key in metrics:
            metrics[status_key] = count
        metrics["total"] += count
    return metrics


def count_reviews_raw(db: Session) -> int:
    """Return the total count of processed reviews via ORM."""
    return db.query(func.count(ProcessedReview.id)).scalar() or 0
