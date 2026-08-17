"""
Sentiment analysis routes — standalone sentiment endpoints.

Provides:
- Single-review sentiment analysis
- Sentiment statistics for an organization
- Sentiment timeline/chart data
- Batch sentiment analysis
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.auth.utils.auth_utils import get_current_user
from app.core.tenant_context import resolve_tenant_scope
from app.core.redis_client import cache_get, cache_set
from app.modules.reviews.services.sentiment_service import (
    analyze_single_sentiment,
    get_sentiment_stats,
    get_sentiment_timeline,
    batch_analyze_sentiment,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reviews/sentiment", tags=["Sentiment"])


@router.get("/stats/{org_id}", summary="Get sentiment distribution statistics")
def sentiment_stats(
    org_id: str,
    period_days: int = Query(30, ge=0, description="Number of days to analyze (0 = all-time)"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Returns sentiment distribution (Positive/Neutral/Negative) with counts,
    percentages, and average sentiment scores for an organization.
    """
    try:
        resolve_tenant_scope(current_user, db, org_id)
        cache_key = f"insights:sentiment-stats:{org_id}:{period_days}"
        cached = cache_get(cache_key)
        if cached is not None:
            return cached

        stats = get_sentiment_stats(org_id, period_days=period_days)
        cache_set(cache_key, stats, ttl=300)
        return stats
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get sentiment stats for org {org_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve sentiment statistics.")


@router.get("/timeline/{org_id}", summary="Get sentiment timeline data")
def sentiment_timeline(
    org_id: str,
    period_days: int = Query(90, ge=1, description="Total days to cover"),
    bucket_days: int = Query(7, ge=1, le=30, description="Days per data point"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Returns sentiment changes over time, bucketed by week (default 7 days).
    Each data point has positivePct, negativePct, neutralPct, total, and avgScore.
    """
    try:
        resolve_tenant_scope(current_user, db, org_id)
        cache_key = f"insights:sentiment-timeline:{org_id}:{period_days}:{bucket_days}"
        cached = cache_get(cache_key)
        if cached is not None:
            return cached

        timeline = get_sentiment_timeline(
            org_id, period_days=period_days, bucket_days=bucket_days
        )
        result = {
            "org_id": org_id,
            "period_days": period_days,
            "bucket_days": bucket_days,
            "data": timeline,
        }
        cache_set(cache_key, result, ttl=300)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get sentiment timeline for org {org_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve sentiment timeline.")


@router.post("/analyze", summary="Analyze sentiment for a single review text")
def analyze_sentiment(
    payload: dict,
    current_user=Depends(get_current_user),
):
    """
    On-demand sentiment analysis for arbitrary review text.
    Does NOT require a review_id — useful for testing or pre-ingestion analysis.

    Body: {
        "text": "The review text to analyze",
        "rating": 4.0 (optional),
        "reviewerName": "John" (optional),
        "platform": "Booking.com" (optional)
    }
    """
    try:
        text = (payload.get("text") or "").strip()
        if not text:
            raise HTTPException(status_code=400, detail="text is required")

        result = analyze_single_sentiment(
            review_text=text,
            rating=payload.get("rating"),
            reviewer_name=payload.get("reviewerName", ""),
            platform=payload.get("platform", ""),
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Sentiment analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Sentiment analysis failed.")


@router.post("/batch-analyze", summary="Batch analyze sentiment for multiple reviews")
def batch_sentiment(
    payload: dict,
    current_user=Depends(get_current_user),
):
    """
    Run sentiment analysis on up to 10 review texts in a single request.

    Body: {
        "reviews": [
            {"text": "...", "rating": 4.0, "reviewerName": "John"},
            ...
        ]
    }
    """
    try:
        reviews = payload.get("reviews", [])
        if not reviews or not isinstance(reviews, list):
            raise HTTPException(status_code=400, detail="reviews array is required")

        if len(reviews) > 10:
            raise HTTPException(status_code=400, detail="Maximum 10 reviews per batch request")

        for i, r in enumerate(reviews):
            if not r.get("text"):
                raise HTTPException(status_code=400, detail=f"Review at index {i} is missing 'text'")

        result = batch_analyze_sentiment(reviews)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch sentiment analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Batch sentiment analysis failed.")
