"""
ML Reply endpoint — AI reply generation microservice.

POST /ml/reply        — Generate an AI reply for a review
POST /ml/reply/batch  — Batch generate replies for multiple reviews
GET  /ml/reply/health — Health check
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from app.modules.auth.utils.internal_auth import verify_internal_api_key
from app.modules.reviews.services.reply_generation_service import generate_review_reply

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ml/reply", tags=["ML - Reply"])


@router.get("/health", summary="ML reply service health check")
def health_check():
    """Returns the health status of the ML reply service."""
    return {"status": "healthy", "service": "ml-reply", "version": "1.0.0"}


@router.post("", summary="Generate an AI reply for a review")
def generate_reply(
    payload: dict,
    internal: bool = Depends(verify_internal_api_key),
):
    """
    Generate a context-aware AI reply for a single review.

    Body: {
        "reviewText": "The guest review to respond to",
        "userName": "John" (optional),
        "sentiment": "Positive" (optional),
        "source": "Booking.com" (optional),
        "tone": "professional" (optional, default: standard),
        "length": "standard" (optional, default: standard),
        "language": "English" (optional)
    }

    Returns: { reply: "...", provider: "...", similarReviewsUsed: N, rulesUsed: N }
    """
    try:
        review_text = (payload.get("reviewText") or "").strip()
        if not review_text:
            raise HTTPException(status_code=400, detail="reviewText is required")

        # Build a minimal ReplyGenerationRequest-compatible payload
        request_payload = type(
            "ReplyRequest",
            (),
            {
                "reviewId": "ml-direct",
                "reviewText": review_text,
                "userName": payload.get("userName", "Guest"),
                "sentiment": payload.get("sentiment", "Neutral"),
                "source": payload.get("source", "Unknown"),
                "tone": payload.get("tone", "standard"),
                "length": payload.get("length", "standard"),
                "language": payload.get("language", "English"),
                "sourceId": payload.get("sourceId") or payload.get("organizationId") or None,
            },
        )()

        result = generate_review_reply(request_payload)
        return {
            "reply": result.get("reply", ""),
            "provider": result.get("provider", "unknown"),
            "similarReviewsUsed": result.get("similarReviewsUsed", 0),
            "rulesUsed": result.get("rulesUsed", 0),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ML reply generation failed: {e}")
        raise HTTPException(status_code=500, detail="Reply generation failed.")


@router.post("/batch", summary="Batch generate AI replies for multiple reviews")
def generate_reply_batch(
    payload: dict,
    internal: bool = Depends(verify_internal_api_key),
):
    """
    Generate replies for up to 5 reviews in a single request.

    Body: {
        "reviews": [
            {"reviewText": "...", "userName": "John", "sentiment": "Positive"},
            ...
        ],
        "tone": "standard" (optional),
        "length": "standard" (optional)
    }

    Returns: { results: [{reply, index}], total, success }
    """
    try:
        reviews = payload.get("reviews", [])
        if not reviews or not isinstance(reviews, list):
            raise HTTPException(status_code=400, detail="reviews array is required")

        if len(reviews) > 5:
            raise HTTPException(
                status_code=400, detail="Maximum 5 reviews per batch"
            )

        tone = payload.get("tone", "standard")
        length = payload.get("length", "standard")
        batch_source_id = payload.get("sourceId") or payload.get("organizationId") or None
        results = []
        success = 0

        for i, r in enumerate(reviews):
            text = (r.get("reviewText") or "").strip()
            if not text:
                results.append({"index": i, "reply": None, "error": "Missing reviewText"})
                continue

            try:
                request_payload = type(
                    "ReplyRequest",
                    (),
                    {
                        "reviewId": f"ml-batch-{i}",
                        "reviewText": text,
                        "userName": r.get("userName", "Guest"),
                        "sentiment": r.get("sentiment", "Neutral"),
                        "source": r.get("source", "Unknown"),
                        "tone": tone,
                        "length": length,
                        "language": r.get("language", "English"),
                        "sourceId": r.get("sourceId") or batch_source_id,
                    },
                )()
                result = generate_review_reply(request_payload)
                results.append({
                    "index": i,
                    "reply": result.get("reply", ""),
                    "provider": result.get("provider", "unknown"),
                })
                success += 1
            except Exception as inner_err:
                results.append({
                    "index": i,
                    "reply": None,
                    "error": str(inner_err),
                })

        return {
            "results": results,
            "total": len(reviews),
            "success": success,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ML batch reply failed: {e}")
        raise HTTPException(status_code=500, detail="Batch reply generation failed.")
