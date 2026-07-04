"""
ML Analyze endpoint — standalone review analysis microservice.

POST /ml/analyze — Analyze a single review or batch
GET  /ml/analyze/health — Health check
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.modules.reviews.services.sentiment_service import (
    analyze_single_sentiment,
    batch_analyze_sentiment,
)
from app.modules.reviews.services.gemini_client import analyze_reviews_batch

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ml/analyze", tags=["ML - Analyze"])


@router.get("/health", summary="ML analyze service health check")
def health_check():
    """Returns the health status of the ML analysis service."""
    return {"status": "healthy", "service": "ml-analyze", "version": "1.0.0"}


@router.post("", summary="Analyze review sentiment and extract insights")
def analyze_review(payload: dict):
    """
    Full AI analysis of a single review.

    Body: {
        "text": "The review text to analyze",
        "rating": 4.0 (optional),
        "reviewerName": "John" (optional),
        "platform": "Booking.com" (optional)
    }

    Returns: sentiment, sentiment_score, categories, keyPhrases, summary
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
        logger.error(f"ML analyze failed: {e}")
        raise HTTPException(status_code=500, detail="Analysis failed.")


@router.post("/batch", summary="Batch analyze multiple reviews")
def analyze_batch(payload: dict):
    """
    Analyze up to 10 reviews in a single request.

    Body: {
        "reviews": [
            {"text": "...", "rating": 4.0, "reviewerName": "John"},
            ...
        ]
    }

    Returns: mapping of index → analysis result, plus total/success counts
    """
    try:
        reviews = payload.get("reviews", [])
        if not reviews or not isinstance(reviews, list):
            raise HTTPException(status_code=400, detail="reviews array is required")

        if len(reviews) > 10:
            raise HTTPException(
                status_code=400, detail="Maximum 10 reviews per batch"
            )

        for i, r in enumerate(reviews):
            if not isinstance(r, dict) or not r.get("text"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Review at index {i} is missing required 'text' field",
                )

        result = batch_analyze_sentiment(reviews)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ML batch analyze failed: {e}")
        raise HTTPException(status_code=500, detail="Batch analysis failed.")


@router.post("/raw", summary="Raw LLM analysis — returns the full AI response")
def raw_analysis(payload: dict):
    """
    Pass a review directly to the LLM Gateway and return the raw response.
    For advanced use cases where structured parsing is handled client-side.

    Body: {
        "text": "The review text",
        "rating": 4.0 (optional)
    }
    """
    try:
        text = (payload.get("text") or "").strip()
        if not text:
            raise HTTPException(status_code=400, detail="text is required")

        review = {
            "id": "raw-analysis",
            "text": text,
            "rating": payload.get("rating", 0),
            "reviewerName": payload.get("reviewerName", ""),
            "platform": payload.get("platform", "Direct"),
        }

        result = analyze_reviews_batch([review])
        if isinstance(result, dict):
            raw = result.get("raw-analysis", {})
            return {"analysis": raw}
        return {"analysis": {}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ML raw analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Raw analysis failed.")
