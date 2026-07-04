"""
Sentiment analysis service — standalone module for review sentiment operations.

Provides:
- On-demand sentiment analysis for a single review
- Batch sentiment analysis via the LLM Gateway
- Sentiment statistics and trends
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Any, Optional

import pyodbc
from app.core.pyodbc_connection import get_connection_string
from app.modules.reviews.services.gemini_client import analyze_reviews_batch

logger = logging.getLogger(__name__)


def analyze_single_sentiment(
    review_text: str,
    rating: Optional[float] = None,
    reviewer_name: str = "",
    platform: str = "",
) -> dict[str, Any]:
    """
    Analyze sentiment for a single review text using the LLM Gateway.

    Returns a dict with:
        sentiment (Positive/Neutral/Negative),
        sentiment_score (1.0-5.0),
        categories (list of dicts with name/score),
        keyPhrases,
        summary
    """
    if not review_text or not review_text.strip():
        return {
            "sentiment": "Neutral",
            "sentiment_score": 3.0,
            "categories": [],
            "keyPhrases": [],
            "summary": "No review text provided.",
        }

    # Build a minimal review dict for the batch analyzer
    review = {
        "id": "single-analysis",
        "text": review_text,
        "rating": rating or 0,
        "reviewerName": reviewer_name,
        "platform": platform,
    }

    try:
        results = analyze_reviews_batch([review])
        if results and isinstance(results, dict):
            result = results.get("single-analysis", {})
            if result:
                return {
                    "sentiment": result.get("sentiment", "Neutral"),
                    "sentiment_score": float(result.get("sentiment_score", 3.0)),
                    "categories": result.get("categories", []),
                    "keyPhrases": result.get("keyPhrases", []),
                    "summary": result.get("summary", ""),
                }
    except Exception as e:
        logger.warning(f"Sentiment analysis failed, returning neutral fallback: {e}")

    return {
        "sentiment": "Neutral",
        "sentiment_score": 3.0,
        "categories": [],
        "keyPhrases": [],
        "summary": "",
    }


def get_sentiment_stats(
    org_id: str, period_days: int = 30
) -> dict[str, Any]:
    """
    Get sentiment distribution statistics for an organization over a time period.

    Returns counts and percentages for Positive, Neutral, and Negative sentiment,
    plus the average sentiment score.
    """
    conn = pyodbc.connect(get_connection_string())
    try:
        cursor = conn.cursor()

        if period_days > 0:
            start_date = (datetime.utcnow() - timedelta(days=period_days)).date()
            cursor.execute(
                """
                SELECT
                    r.sentiment,
                    COUNT(*) as cnt,
                    AVG(CAST(r.sentiment_score AS FLOAT)) as avg_score
                FROM dbo.processed_review r
                JOIN dbo.source s ON r.source_id = s.source_id
                WHERE s.organization_id = ? AND r.reviewDate >= CAST(? AS DATE)
                GROUP BY r.sentiment
                """,
                org_id, start_date,
            )
        else:
            cursor.execute(
                """
                SELECT
                    r.sentiment,
                    COUNT(*) as cnt,
                    AVG(CAST(r.sentiment_score AS FLOAT)) as avg_score
                FROM dbo.processed_review r
                JOIN dbo.source s ON r.source_id = s.source_id
                WHERE s.organization_id = ?
                GROUP BY r.sentiment
                """,
                org_id,
            )

        rows = cursor.fetchall()
    finally:
        conn.close()

    counts = {"Positive": 0, "Neutral": 0, "Negative": 0}
    scores = {"Positive": 0.0, "Neutral": 0.0, "Negative": 0.0}

    for row in rows:
        sentiment = row.sentiment or "Neutral"
        if sentiment in counts:
            counts[sentiment] = row.cnt
            scores[sentiment] = round(float(row.avg_score or 0), 2)

    total = sum(counts.values())

    return {
        "total": total,
        "positive": {
            "count": counts["Positive"],
            "percentage": round((counts["Positive"] / total) * 100, 1) if total > 0 else 0,
            "avgScore": scores["Positive"],
        },
        "neutral": {
            "count": counts["Neutral"],
            "percentage": round((counts["Neutral"] / total) * 100, 1) if total > 0 else 0,
            "avgScore": scores["Neutral"],
        },
        "negative": {
            "count": counts["Negative"],
            "percentage": round((counts["Negative"] / total) * 100, 1) if total > 0 else 0,
            "avgScore": scores["Negative"],
        },
        "overallAvgScore": round(
            sum(scores.values()) / 3, 2
        ) if total > 0 else 0.0,
    }


def get_sentiment_timeline(
    org_id: str, period_days: int = 90, bucket_days: int = 7
) -> list[dict[str, Any]]:
    """
    Get a timeline of sentiment changes over time, bucketed by week (default).

    Returns a list of {label, positivePct, negativePct, neutralPct, total, avgScore}.
    """
    conn = pyodbc.connect(get_connection_string())
    try:
        cursor = conn.cursor()

        start_date = (datetime.utcnow() - timedelta(days=period_days)).date()

        cursor.execute(
            """
            SELECT
                DATEDIFF(day, CAST(? AS DATE), r.reviewDate) / ? AS bucket_index,
                'Week ' + CAST(
                    DATEDIFF(day, CAST(? AS DATE), r.reviewDate) / ? + 1
                AS VARCHAR) AS label,
                SUM(CASE WHEN r.sentiment = 'Positive' THEN 1 ELSE 0 END) AS pos,
                SUM(CASE WHEN r.sentiment = 'Negative' THEN 1 ELSE 0 END) AS neg,
                SUM(CASE WHEN r.sentiment = 'Neutral'  THEN 1 ELSE 0 END) AS neu,
                COUNT(*) AS total,
                AVG(CAST(r.sentiment_score AS FLOAT)) AS avg_score
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = ?
              AND r.reviewDate >= CAST(? AS DATE)
            GROUP BY
                DATEDIFF(day, CAST(? AS DATE), r.reviewDate) / ?
            ORDER BY bucket_index ASC
            """,
            start_date, bucket_days,
            start_date, bucket_days,
            org_id, start_date,
            start_date, bucket_days,
        )

        rows = cursor.fetchall()
    finally:
        conn.close()

    result = []
    for row in rows:
        total = row.total or 1
        result.append({
            "label": row.label,
            "positivePct": round((row.pos or 0) / total * 100, 1),
            "negativePct": round((row.neg or 0) / total * 100, 1),
            "neutralPct": round((row.neu or 0) / total * 100, 1),
            "total": row.total,
            "avgScore": round(float(row.avg_score or 0), 2),
        })

    return result


def batch_analyze_sentiment(reviews: list[dict]) -> dict[str, Any]:
    """
    Run sentiment analysis on a batch of reviews.

    Accepts a list of review dicts (each must have at least 'text').
    Uses the LLM Gateway for AI-powered analysis.
    Returns a mapping of review index → analysis result.
    """
    if not reviews:
        return {"results": {}, "total": 0, "success": 0}

    # Tag each review with a synthetic ID for results mapping
    tagged = []
    for i, review in enumerate(reviews):
        tagged.append({
            "id": f"batch-{i}",
            "text": review.get("text", ""),
            "rating": review.get("rating", 0),
            "reviewerName": review.get("reviewerName", ""),
            "platform": review.get("platform", ""),
        })

    try:
        raw_results = analyze_reviews_batch(tagged)
    except Exception as e:
        logger.error(f"Batch sentiment analysis failed: {e}")
        return {"results": {}, "total": len(reviews), "success": 0, "error": str(e)}

    results = {}
    success = 0
    for i, review in enumerate(tagged):
        key = f"batch-{i}"
        analysis = raw_results.get(key, {}) if isinstance(raw_results, dict) else {}
        if analysis:
            success += 1
            results[str(i)] = {
                "sentiment": analysis.get("sentiment", "Neutral"),
                "sentiment_score": float(analysis.get("sentiment_score", 3.0)),
                "categories": analysis.get("categories", []),
                "keyPhrases": analysis.get("keyPhrases", []),
                "summary": analysis.get("summary", ""),
            }
        else:
            results[str(i)] = {
                "sentiment": "Neutral",
                "sentiment_score": 3.0,
                "categories": [],
                "keyPhrases": [],
                "summary": "",
            }

    return {
        "results": results,
        "total": len(reviews),
        "success": success,
    }
