"""
Review Management Routes — API endpoints for listing, deleting, and AI reply generation.
"""

import uuid
import logging
from typing import List, Optional

import pyodbc
from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.db_utils import get_connection_string
from app.modules.auth.utils.auth_utils import get_current_user
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

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


@router.get("/", response_model=PaginatedReviewResponse)
def read_reviews(
    organization_id: uuid.UUID = Query(...),
    page: int = Query(0, ge=0),
    limit: int = Query(15, gt=0),
    search: Optional[str] = Query(None),
    embedding_search: bool = Query(False),
    rating: List[int] = Query(None),
    sentiment: List[str] = Query(None),
    source: List[str] = Query(None),
    category: List[str] = Query(None),
    dateFrom: Optional[str] = Query(None),
    dateTo: Optional[str] = Query(None),
):
    """Fetch processed reviews with pagination and filtering."""
    try:
        filters = {
            "search": search,
            "embedding_search": embedding_search,
            "rating": rating,
            "sentiment": sentiment,
            "source": source,
            "category": category,
            "dateFrom": dateFrom,
            "dateTo": dateTo,
        }
        result = get_all_reviews_from_db(
            str(organization_id), page=page, limit=limit, filters=filters
        )

        # Calculate total pages
        total = result["total"]
        total_pages = (total + limit - 1) // limit if limit > 0 else 1

        return {
            "data": result["data"],
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": total_pages,
        }
    except Exception as e:
        logger.error(f"Read reviews error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch reviews.")


@router.get("/meta/options")
def get_options(organization_id: uuid.UUID = Query(...)):
    """Fetch available filter options (sources, categories)."""
    try:
        return get_review_options(str(organization_id))
    except Exception as e:
        logger.error(f"Failed to fetch options: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch filter options.")


@router.get("/meta/stats")
def get_stats(
    organization_id: uuid.UUID = Query(...),
    search: Optional[str] = Query(None),
    embedding_search: bool = Query(False),
    rating: List[int] = Query(None),
    sentiment: List[str] = Query(None),
    source: List[str] = Query(None),
    category: List[str] = Query(None),
    dateFrom: Optional[str] = Query(None),
    dateTo: Optional[str] = Query(None),
):
    """Fetch aggregated review statistics, respecting all active filters."""
    try:
        filters = {
            "search": search,
            "embedding_search": embedding_search,
            "rating": rating,
            "sentiment": sentiment,
            "source": source,
            "category": category,
            "dateFrom": dateFrom,
            "dateTo": dateTo,
        }
        return get_review_stats(str(organization_id), filters=filters)
    except Exception as e:
        logger.error(f"Failed to fetch stats: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to fetch review statistics."
        )


@router.get("/meta/distribution")
def get_distribution_details(organization_id: uuid.UUID = Query(...)):
    """Fetch the full rating distribution broken down by source platform."""
    try:
        return get_full_distribution(str(organization_id))
    except Exception as e:
        logger.error(f"Failed to fetch distribution: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch distribution data.")


@router.get("/{organization_id}", response_model=List[ReviewModel], deprecated=True)
def read_reviews_legacy(organization_id: uuid.UUID):
    """Legacy endpoint for fetching reviews. Use GET / instead."""
    try:
        result = get_all_reviews_from_db(str(organization_id))
        return result["data"]
    except Exception as e:
        logger.error(f"Read reviews error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch reviews.")


@router.post("/trigger/{source_id}")
async def trigger_review_sync(source_id: uuid.UUID, background_tasks: BackgroundTasks):
    """Manually trigger the full ingestion and processing flow for a source."""
    background_tasks.add_task(start_ingestion_and_processing_flow, source_id)
    return {"message": "Processing flow started in background."}


@router.post("/ingest/{source_id}")
async def trigger_ingest_only(source_id: uuid.UUID, db: Session = Depends(get_db)):
    """
    Triggers only the ingestion of reviews from the scraper engine.
    Reviews are saved with 'pending' status. AI analysis is NOT triggered.
    """
    try:
        source = get_source_by_id(db, source_id)
        if not source:
            raise HTTPException(status_code=404, detail="Source not found.")

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
def get_total_review_count():
    """Returns the total number of reviews across the entire platform."""
    try:
        count = count_all_reviews()
        return {"total_reviews": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/processing/status")
def get_processing_status(organization_id: uuid.UUID = Query(None)):
    """
    Get the current processing status of reviews.
    Optional organization_id filter.
    """
    try:
        return get_processing_report(str(organization_id) if organization_id else None)
    except Exception as e:
        logger.error(f"Failed to fetch processing status: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to fetch processing status."
        )


@router.post("/process/{review_id}")
async def trigger_single_review_processing(review_id: uuid.UUID):
    """
    Manually trigger AI analysis for a specific review.
    This will analyze/re-analyze the review and update its analytical columns.
    """
    try:
        result = await process_single_review(review_id)
        return {
            "message": "Review processed successfully",
            "review_id": str(review_id),
            "analysis": result,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Single review processing failed for {review_id}: {e}")
        raise HTTPException(
            status_code=500, detail="Internal server error during processing."
        )


@router.post("/generate-reply", response_model=ReplyGenerationResponse)
def generate_reply(
    payload: ReplyGenerationRequest, current_user=Depends(get_current_user)
):
    """Generate an AI reply for a specific review."""
    try:
        # ── Check reply_generations limit ──
        user_id = (
            str(current_user.user_id)
            if hasattr(current_user, "user_id")
            else str(current_user.id)
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


@router.delete("/source/{source_id}")
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
