"""
Review Management Routes — API endpoints for listing, deleting, and AI reply generation.
"""

import json
import uuid
import logging
from typing import List, Optional

import pyodbc
from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.core.db_utils import get_connection_string
from app.modules.auth.utils.auth_utils import get_current_user
from app.core.dependencies import get_optional_user
from app.core.tenant_context import resolve_tenant_scope
from app.core.redis_client import cache_get, cache_set, invalidate_review_cache
from app.modules.admin.services.subscription_service import increment_feature_usage
from app.modules.reviews.schemas import (
    ReviewModel,
    PaginatedReviewResponse,
    ReplyGenerationRequest,
    ReplyGenerationResponse,
)
from app.modules.reviews.services.review_service import (
    get_all_reviews_from_db,
    count_all_reviews,
    start_ingestion_and_processing_flow,
    get_processing_report,
    ingest_from_scraper,
)
from app.modules.reviews.services.processor import process_single_review
from app.modules.reviews.repository import (
    get_review_options,
    get_review_stats,
    get_full_distribution,
    delete_reviews_by_source_id,
)
from app.modules.source.services.source_service import get_source_by_id
from app.modules.source.services.embedding_client import delete_embeddings_for_source
from app.modules.reviews.services.reply_generation_service import generate_review_reply

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reviews", tags=["Reviews"])


@router.get("/", response_model=PaginatedReviewResponse)
def read_reviews(
    organization_id: Optional[uuid.UUID] = Query(None),
    page: int = Query(0, ge=0),
    limit: int = Query(15, gt=0),
    search: Optional[str] = Query(None),
    embedding_search: bool = Query(False),
    rating: List[int] = Query(None),
    sentiment: List[str] = Query(None),
    source: List[str] = Query(None),
    category: List[str] = Query(None),
    status: List[str] = Query(None),
    dateFrom: Optional[str] = Query(None),
    dateTo: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Fetch processed reviews with pagination and filtering."""
    try:
        resolved_org_id = resolve_tenant_scope(current_user, db, str(organization_id) if organization_id else None)
        filters = {
            "search": search,
            "embedding_search": embedding_search,
            "rating": rating,
            "sentiment": sentiment,
            "source": source,
            "category": category,
            "status": status,
            "dateFrom": dateFrom,
            "dateTo": dateTo,
        }

        # Redis cache: skip for embedding search or filtered queries
        cache_key = None
        if not embedding_search and not search and page == 0:
            cache_key = (
                f"reviews:list:{resolved_org_id}:"
                f"{limit}:{dateFrom or 'any'}:{dateTo or 'any'}"
            )
            cached = cache_get(cache_key)
            if cached:
                return cached

        result = get_all_reviews_from_db(
            resolved_org_id, page=page, limit=limit, filters=filters, db=db
        )

        # Calculate total pages
        total = result["total"]
        total_pages = (total + limit - 1) // limit if limit > 0 else 1

        response = {
            "data": result["data"],
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": total_pages,
        }

        # Cache the result (60s TTL for review lists)
        if cache_key and response["data"]:
            cache_set(cache_key, response, ttl=60)

        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Read reviews error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch reviews.")


@router.get("/meta/options")
def get_options(
    organization_id: Optional[uuid.UUID] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Fetch available filter options (sources, categories)."""
    try:
        resolved_org_id = resolve_tenant_scope(current_user, db, str(organization_id) if organization_id else None)
        return get_review_options(resolved_org_id, db=db)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch options: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch filter options.")


@router.get("/meta/stats")
def get_stats(
    organization_id: Optional[uuid.UUID] = Query(None),
    search: Optional[str] = Query(None),
    embedding_search: bool = Query(False),
    rating: List[int] = Query(None),
    sentiment: List[str] = Query(None),
    source: List[str] = Query(None),
    category: List[str] = Query(None),
    status: List[str] = Query(None),
    dateFrom: Optional[str] = Query(None),
    dateTo: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Fetch aggregated review statistics, respecting all active filters."""
    try:
        resolved_org_id = resolve_tenant_scope(current_user, db, str(organization_id) if organization_id else None)
        filters = {
            "search": search,
            "embedding_search": embedding_search,
            "rating": rating,
            "sentiment": sentiment,
            "source": source,
            "category": category,
            "status": status,
            "dateFrom": dateFrom,
            "dateTo": dateTo,
        }
        return get_review_stats(resolved_org_id, filters=filters, db=db)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch stats: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to fetch review statistics."
        )


@router.get("/meta/distribution")
def get_distribution_details(
    organization_id: Optional[uuid.UUID] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Fetch the full rating distribution broken down by source platform."""
    try:
        resolved_org_id = resolve_tenant_scope(current_user, db, str(organization_id) if organization_id else None)
        return get_full_distribution(resolved_org_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch distribution: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch distribution data.")


@router.get("/{organization_id}", response_model=List[ReviewModel], deprecated=True)
def read_reviews_legacy(
    organization_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Legacy endpoint for fetching reviews. Use GET / instead."""
    try:
        resolved_org_id = resolve_tenant_scope(current_user, db, str(organization_id))
        result = get_all_reviews_from_db(resolved_org_id)
        return result["data"]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Read reviews error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch reviews.")


@router.post("/trigger/{source_id}", summary="Trigger full ingestion and processing for a source")
async def trigger_review_sync(
    source_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Manually trigger the full ingestion and processing flow for a source."""
    source = get_source_by_id(db, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found.")
    resolve_tenant_scope(current_user, db, str(source.organization_id))
    invalidate_review_cache(str(source.organization_id))  # Clear Redis cache
    background_tasks.add_task(start_ingestion_and_processing_flow, source_id)
    return {"message": "Processing flow started in background."}


@router.post("/ingest/{source_id}", summary="Ingest reviews from scraper (no AI processing)")
async def trigger_ingest_only(
    source_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Triggers only the ingestion of reviews from the scraper engine.
    Reviews are saved with 'pending' status. AI analysis is NOT triggered.
    """
    try:
        source = get_source_by_id(db, source_id)
        if not source:
            raise HTTPException(status_code=404, detail="Source not found.")

        resolve_tenant_scope(current_user, db, str(source.organization_id))

        count = await ingest_from_scraper(
            source_id, source.organization_id, source.platform_id
        )
        return {
            "message": "Ingestion successful",
            "source_id": str(source_id),
            "reviews_ingested": count,
            "status": "pending",
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Ingest-only failed for {source_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to ingest reviews.")


@router.get("/meta/count")
def get_total_review_count(current_user=Depends(get_current_user)):
    """Returns the total number of reviews across the entire platform."""
    try:
        count = count_all_reviews()
        return {"total_reviews": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{review_id}", summary="Get a single review by ID")
def get_single_review(
    review_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Fetch a single review by its ID with full tenant-scope validation.
    """
    try:
        row = db.execute(
            text("""
                SELECT
                    CAST(r.id AS VARCHAR(36)) AS id,
                    s.organization_id,
                    r.rating,
                    r.reviewerName AS reviewerName,
                    r.text AS reviewText,
                    r.heading,
                    r.summary,
                    r.sentiment,
                    r.sentiment_score,
                    r.categories,
                    r.keyPhrases,
                    r.positive_text AS positiveText,
                    r.negative_text AS negativeText,
                    r.ai_reply,
                    r.[status],
                    r.reviewDate,
                    r.scrapedAt,
                    p.platform_name AS source
                FROM dbo.processed_review r
                JOIN dbo.source s ON r.source_id = s.source_id
                JOIN dbo.platform p ON s.platform_id = p.platform_id
                WHERE r.id = :review_id
            """),
            {"review_id": str(review_id)},
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Review not found.")

        resolve_tenant_scope(current_user, db, str(row.organization_id))

        # Parse JSON columns
        categories = None
        if row.categories:
            try:
                categories = json.loads(row.categories)
            except Exception:
                categories = []

        keyPhrases = None
        if row.keyPhrases:
            try:
                keyPhrases = json.loads(row.keyPhrases)
            except Exception:
                keyPhrases = []

        return {
            "id": row.id,
            "rating": float(row.rating) if row.rating else 0,
            "reviewerName": row.reviewerName,
            "reviewText": row.reviewText,
            "heading": row.heading,
            "summary": row.summary,
            "sentiment": row.sentiment or "Neutral",
            "sentimentScore": float(row.sentiment_score) if row.sentiment_score else 3.0,
            "categories": categories or [],
            "keyPhrases": keyPhrases or [],
            "positiveText": row.positiveText,
            "negativeText": row.negativeText,
            "aiReply": row.ai_reply,
            "status": row.status or "Pending",
            "date": row.reviewDate.isoformat() if row.reviewDate else None,
            "scrapedAt": row.scrapedAt.isoformat() if row.scrapedAt else None,
            "source": row.source or "Unknown",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch review {review_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch review.")


@router.get("/processing/status")
def get_processing_status(
    organization_id: uuid.UUID = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Get the current processing status of reviews.
    Optional organization_id filter.
    """
    try:
        resolved_org_id = resolve_tenant_scope(current_user, db, str(organization_id) if organization_id else None)
        return get_processing_report(resolved_org_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch processing status: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to fetch processing status."
        )


@router.post("/process/{review_id}", summary="Manually trigger AI analysis for a single review")
async def trigger_single_review_processing(
    review_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Manually trigger AI analysis for a specific review.
    This will analyze/re-analyze the review and update its analytical columns.
    """
    try:
        from sqlalchemy import text
        review_row = db.execute(
            text("""
                SELECT s.organization_id
                FROM dbo.processed_review r
                JOIN dbo.source s ON r.source_id = s.source_id
                WHERE r.id = :review_id
            """),
            {"review_id": str(review_id)}
        ).fetchone()
        
        if not review_row:
            raise HTTPException(status_code=404, detail="Review not found.")
            
        resolve_tenant_scope(current_user, db, str(review_row[0]))

        result = await process_single_review(review_id)
        return {
            "message": "Review processed successfully",
            "review_id": str(review_id),
            "analysis": result,
        }
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Single review processing failed for {review_id}: {e}")
        raise HTTPException(
            status_code=500, detail="Internal server error during processing."
        )


@router.post("/generate-reply", response_model=ReplyGenerationResponse, summary="Generate an AI reply for a review")
def generate_reply(
    payload: ReplyGenerationRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Generate an AI reply for a specific review."""
    try:
        from sqlalchemy import text
        review_row = db.execute(
            text("""
                SELECT s.organization_id
                FROM dbo.processed_review r
                JOIN dbo.source s ON r.source_id = s.source_id
                WHERE r.id = :review_id
            """),
            {"review_id": str(payload.reviewId)}
        ).fetchone()
        
        if not review_row:
            raise HTTPException(status_code=404, detail="Review not found.")
            
        resolve_tenant_scope(current_user, db, str(review_row[0]))

        # ── Check reply_generations limit ──
        user_id = (
            str(current_user.user_id)
            if hasattr(current_user, "user_id")
            else str(current_user.get("user_id") or current_user.get("id"))
        )
        try:
            with pyodbc.connect(get_connection_string()) as conn:
                cursor = conn.cursor()
                from app.modules.admin.services.subscription_service import (
                    check_feature_limit,
                    send_limit_reached_notification,
                )
                limit_info = check_feature_limit(cursor, user_id, "reply_generations")
                if not limit_info["allowed"]:
                    send_limit_reached_notification(user_id, limit_info["feature_name"])
                    raise HTTPException(
                        status_code=403,
                        detail=f"Reply generation limit reached for your current plan. "
                               f"You have used {limit_info['used']}/{limit_info['limit']}. "
                               f"Please upgrade your subscription plan to generate more replies.",
                    )
        except HTTPException:
            raise
        except Exception as limit_err:
            logger.warning(f"LIMIT CHECK WARNING (reply_generations): {limit_err}")

        result = generate_review_reply(payload)

        # Increment usage tracker
        try:
            with pyodbc.connect(get_connection_string()) as conn:
                cursor = conn.cursor()
                increment_feature_usage(cursor, user_id, "reply_generations")
                conn.commit()
        except Exception as e:
            logger.warning(f"Failed to increment usage: {e}")

        return ReplyGenerationResponse(**result)
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error(f"Reply generation failed: {exc}")
        raise HTTPException(status_code=500, detail="Failed to generate AI reply.")


@router.put("/{review_id}/status", summary="Update the status of a review")
def update_review_status(
    review_id: uuid.UUID,
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Update the status of a specific review (e.g., mark as "Replied", "Pending").
    Body: { "status": "Replied" }
    """
    try:
        from sqlalchemy import text

        valid_statuses = {"Pending", "Replied", "AI Draft", "processed", "failed"}
        new_status = payload.get("status", "")

        if not new_status or new_status not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Must be one of: {', '.join(sorted(valid_statuses))}"
            )

        # Verify the review exists and belongs to the user's organization
        review_row = db.execute(
            text("""
                SELECT s.organization_id
                FROM dbo.processed_review r
                JOIN dbo.source s ON r.source_id = s.source_id
                WHERE r.id = :review_id
            """),
            {"review_id": str(review_id)}
        ).fetchone()

        if not review_row:
            raise HTTPException(status_code=404, detail="Review not found.")

        resolve_tenant_scope(current_user, db, str(review_row[0]))

        # Update the status
        db.execute(
            text("""
                UPDATE dbo.processed_review
                SET [status] = :status
                WHERE id = :review_id
            """),
            {"status": new_status, "review_id": str(review_id)}
        )
        db.commit()

        return {
            "message": "Status updated successfully",
            "review_id": str(review_id),
            "status": new_status,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update status for review {review_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update review status.")


@router.delete("/source/{source_id}", summary="Delete all reviews for a source")
def delete_reviews_by_source(
    source_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Delete all reviews associated with a specific source ID.
    Also clears associated media and embeddings.
    """
    try:
        # 1. Verify existence of source
        source = get_source_by_id(db, source_id)
        if not source:
            raise HTTPException(status_code=404, detail="Source not found.")

        resolve_tenant_scope(current_user, db, str(source.organization_id))

        # 2. Delete reviews and media from database
        deleted_count = delete_reviews_by_source_id(str(source_id))

        # 3. Clear embeddings for this source
        delete_embeddings_for_source(str(source_id))

        return {
            "message": "Reviews deleted successfully",
            "source_id": str(source_id),
            "deleted_count": deleted_count,
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Failed to delete reviews for source {source_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete reviews.")
