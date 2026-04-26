"""
Review Management Routes — API endpoints for listing, deleting, and AI reply generation.
Refactored to use SQLAlchemy ORM for all domain operations.
"""

import uuid
import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.modules.auth.utils.auth_utils import get_current_user
from app.core.dependencies import get_optional_user
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
from app.modules.source.models import Organization

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


def _resolve_org_id(user, organization_id_param, db: Session):
    """Resolve organization_id: prefer JWT, fall back to query param with ownership check via ORM."""
    jwt_org_id = user.organization_id if hasattr(user, 'organization_id') else (
        user.get("organization_id") if isinstance(user, dict) else None
    )
    if jwt_org_id:
        return str(jwt_org_id)
    
    if organization_id_param:
        user_id = user.user_id if hasattr(user, 'user_id') else (
            user.get("user_id") if isinstance(user, dict) else None
        )
        if user_id:
            org = db.query(Organization).filter(
                Organization.organization_id == str(organization_id_param),
                Organization.tenant_id == str(user_id)
            ).first()
            if not org:
                raise HTTPException(
                    status_code=403,
                    detail="You do not have access to this organization.",
                )
        return str(organization_id_param)
    
    raise HTTPException(status_code=400, detail="organization_id is required.")


@router.get(
    "/",
    response_model=PaginatedReviewResponse,
    summary="List processed reviews",
    description="Fetch a paginated list of processed reviews with advanced filtering by rating, sentiment, source, and AI categories.",
    status_code=200,
    responses={
        401: {"description": "Unauthorized - Missing or invalid token"},
        403: {"description": "Forbidden - User does not have access to organization"},
        500: {"description": "Internal Server Error - Database or pipeline failure"}
    }
)
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
    dateFrom: Optional[str] = Query(None),
    dateTo: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Fetch processed reviews with pagination and filtering."""
    try:
        resolved_org_id = _resolve_org_id(current_user, organization_id, db)
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
            resolved_org_id, page=page, limit=limit, filters=filters, db=db
        )

        total = result["total"]
        total_pages = (total + limit - 1) // limit if limit > 0 else 1

        return {
            "data": result["reviews"],
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": total_pages,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Read reviews error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch reviews.")


@router.get(
    "/meta/options",
    summary="Get filter options",
    description="Retrieves unique platform names and review categories available for the specified organization to populate filter menus.",
    responses={
        200: {"description": "Successfully retrieved filter options"},
        403: {"description": "Access denied to organization"}
    }
)
def get_options(
    organization_id: Optional[uuid.UUID] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Fetch available filter options (sources, categories)."""
    try:
        resolved_org_id = _resolve_org_id(current_user, organization_id, db)
        return get_review_options(resolved_org_id, db=db)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch options: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch filter options.")


@router.get(
    "/meta/stats",
    summary="Get review statistics",
    description="Aggregates review counts, average ratings, and sentiment scores based on active filters.",
)
def get_stats(
    organization_id: Optional[uuid.UUID] = Query(None),
    search: Optional[str] = Query(None),
    embedding_search: bool = Query(False),
    rating: List[int] = Query(None),
    sentiment: List[str] = Query(None),
    source: List[str] = Query(None),
    category: List[str] = Query(None),
    dateFrom: Optional[str] = Query(None),
    dateTo: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Fetch aggregated review statistics, respecting all active filters."""
    try:
        resolved_org_id = _resolve_org_id(current_user, organization_id, db)
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
        resolved_org_id = _resolve_org_id(current_user, organization_id, db)
        return get_full_distribution(resolved_org_id, db=db)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch distribution: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch distribution data.")


@router.post("/trigger/{source_id}")
async def trigger_review_sync(
    source_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_optional_user),
):
    """Manually trigger the full ingestion and processing flow for a source."""
    background_tasks.add_task(start_ingestion_and_processing_flow, source_id)
    return {"message": "Processing flow started in background."}


@router.post("/ingest/{source_id}")
async def trigger_ingest_only(
    source_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    """Triggers only the ingestion of reviews from the scraper engine."""
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
def get_total_review_count(db: Session = Depends(get_db), current_user=Depends(get_optional_user)):
    """Returns the total number of reviews across the entire platform."""
    try:
        count = count_all_reviews(db)
        return {"total_reviews": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/processing/status")
def get_processing_status(
    organization_id: uuid.UUID = Query(None),
    current_user=Depends(get_optional_user),
):
    """Get the current processing status of reviews."""
    try:
        return get_processing_report(str(organization_id) if organization_id else None)
    except Exception as e:
        logger.error(f"Failed to fetch processing status: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to fetch processing status."
        )


@router.post("/process/{review_id}")
async def trigger_single_review_processing(
    review_id: uuid.UUID,
    current_user=Depends(get_optional_user),
):
    """Manually trigger AI analysis for a specific review."""
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


@router.post(
    "/generate-reply",
    response_model=ReplyGenerationResponse,
    summary="Generate AI Review Reply",
    description="Uses Gemini AI to draft a professional response based on the review sentiment, rating, and user instructions. Checks subscription limits before execution.",
    responses={
        200: {"description": "Reply generated successfully"},
        403: {"description": "Limit reached or unauthorized access"},
        500: {"description": "AI service failure"}
    }
)
def generate_reply(
    payload: ReplyGenerationRequest, current_user=Depends(get_current_user)
):
    """Generate an AI reply for a specific review."""
    try:
        user_id = (
            str(current_user.user_id)
            if hasattr(current_user, "user_id")
            else str(current_user.id)
        )
        # Subscription limit check (keeping pyodbc for now for cross-module compatibility)
        import pyodbc
        from app.core.pyodbc_connection import get_connection_string
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
                        detail=f"Reply generation limit reached. Used {limit_info['used']}/{limit_info['limit']}.",
                    )
        except HTTPException:
            raise
        except Exception as limit_err:
            logger.warning(f"Limit check failed: {limit_err}")

        result = generate_review_reply(payload)

        # Increment usage
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
    except Exception as exc:
        logger.error(f"Reply generation failed: {exc}")
        raise HTTPException(status_code=500, detail="Failed to generate AI reply.")


@router.delete(
    "/source/{source_id}",
    summary="Delete source reviews",
    description="Permanently deletes all processed reviews and their vector embeddings for a specific source. This action cannot be undone.",
    responses={
        200: {"description": "Data purged successfully"},
        404: {"description": "Source not found"}
    }
)
def delete_reviews_by_source(
    source_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Delete all reviews associated with a specific source ID."""
    try:
        source = get_source_by_id(db, source_id)
        if not source:
            raise HTTPException(status_code=404, detail="Source not found.")

        deleted_count = delete_reviews_by_source_id(db, str(source_id))
        delete_embeddings_for_source(str(source_id))

        return {
            "message": "Reviews deleted successfully",
            "source_id": str(source_id),
            "deleted_count": deleted_count,
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Failed to delete reviews: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete reviews.")
