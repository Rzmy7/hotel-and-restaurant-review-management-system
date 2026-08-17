"""Unified dashboard route — aggregating stats, activities, and trends."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
import logging

from app.database.session import get_db
from app.core.tenant_context import resolve_tenant_scope
from app.modules.dashboard.services.activity_service import get_alerts, get_activities, get_sentiment_counts
from app.modules.dashboard.services.trends_service import get_usage, get_recent_reviews
from app.modules.dashboard.services.metrics_service import get_dashboard_metrics
from app.modules.dashboard.services.charts_service import (
    get_sentiment_distribution,
    get_daily_review_trends,
    get_weekly_review_trends,
)
from app.modules.dashboard.services.categories_service import get_category_performance
from app.modules.dashboard.services.sources_service import get_source_comparison_metrics
from app.modules.auth.utils.auth_utils import get_current_user
from app.modules.dashboard.services.insights_service import get_keywords, generate_ai_actions
from app.core.redis_client import cache_get, cache_set

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Dashboard"])


def _build_ai_insights(metrics: dict, categories: list, org_id: str = "") -> dict:
    """
    Build the aiInsights payload for the main dashboard using the AI engine.
    Falls back to a template-based summary if the AI call fails.
    Cached per-org (key ai:unified:{org_id}) — invalidated by invalidate_ai_cache.
    """
    if org_id:
        # Trailing segment required so invalidate_ai_cache's "ai:*:{org_id}:*" pattern matches
        cache_key = f"ai:unified:{org_id}:dashboard"
        cached = cache_get(cache_key)
        if cached is not None:
            return cached

    try:
        actions = generate_ai_actions(metrics, categories, [], {"positiveKeywords": [], "negativeKeywords": []})
        if actions:
            strengths = []
            issues = []
            highlight = None
            for a in actions:
                item = {
                    "label": a.get("title", ""),
                    "impact": "High" if a.get("severity") == "critical" else "Medium",
                    "freq": "—",
                }
                if a.get("severity") == "info":
                    strengths.append(item)
                elif a.get("severity") in ("warning", "critical"):
                    issues.append(item)
                if highlight is None and a.get("severity") == "critical":
                    highlight = {
                        "text": a.get("body", ""),
                        "correlation": "Strong",
                    }

            if not strengths:
                strengths = [{"label": "Review Quality", "impact": "High", "freq": "100%"}]
            if not highlight:
                avg = metrics.get("avgRating", {}).get("value", "N/A")
                highlight = {
                    "text": f"Average rating stands at {avg} stars — keep up the quality.",
                    "correlation": "Moderate",
                }

            result = {"strengths": strengths, "issues": issues, "highlight": highlight}
            if org_id:
                cache_set(cache_key, result, ttl=600)
            return result
    except Exception as e:
        logger.warning(f"AI insights generation failed, using fallback: {e}")

    # Rule-based fallback
    avg = metrics.get("avgRating", {}).get("value", "N/A")
    neg = metrics.get("negativeReviews", {}).get("value", "0")
    result = {
        "strengths": [
            {"label": "Review Quality", "impact": "High", "freq": "100%"},
        ],
        "issues": [
            {"label": f"{neg} Negative Reviews", "impact": "Low", "freq": "—"},
        ] if int(str(neg).replace(",", "") or "0") > 0 else [],
        "highlight": {
            "text": f"Average rating stands at {avg} stars.",
            "correlation": "Moderate",
        },
    }
    if org_id:
        cache_set(cache_key, result, ttl=600)
    return result


@router.get("/organizations/{org_id}/dashboard", summary="Get unified organization dashboard")
def get_unified_dashboard(
    org_id: str,
    period: int = 0,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns a unified dashboard response matching the frontend DashboardResponse interface.
    """
    # Validate UUID format to prevent SQL conversion errors (e.g. from HOTEL-002)
    try:
        uuid.UUID(org_id)
    except ValueError:
        raise HTTPException(
            status_code=404,
            detail=f"Organization ID '{org_id}' is not a valid UUID format.",
        )

    # Validate org_id ownership using resolve_tenant_scope
    resolve_tenant_scope(user, db, org_id)

    try:
        # Aggregate all atomic data using the same db Session for performance
        metrics = get_dashboard_metrics(db, org_id, period)
        sentiment_charts = get_sentiment_distribution(
            db, org_id, period_days=period
        )
        daily_trends = get_daily_review_trends(db, org_id, days=period)
        weekly_trends = get_weekly_review_trends(db, org_id, period_days=period)
        category_performance = get_category_performance(
            db, org_id, period_days=period
        )
        source_comparison = get_source_comparison_metrics(
            db, org_id, period_days=period
        )

        recent_reviews = get_recent_reviews(db, org_id, period_days=period)["reviews"]
        alerts_data = get_alerts(db, org_id)["alerts"]

        return {
            "hotel": {
                "id": org_id,
                "name": "Organization Dashboard",
                "status": "Active",
            },
            "organizations": [
                {"id": org_id, "name": "Current Organization", "status": "Active"}
            ],
            "currentOrganizationId": org_id,
            "metrics": metrics,
            "charts": {
                "sentiment": sentiment_charts,
                "reviewsOverTime": daily_trends,
                "sentimentTrends": weekly_trends,
            },
            "latestReviews": [
                {
                    "id": str(r["id"]),
                    "reviewerName": r["userName"],
                    "heading": (r.get("text") or "No review text")[:80]
                    + ("..." if len(r.get("text") or "") > 80 else ""),
                    "source": r["source"],
                    "sentiment": r["sentiment"],
                    "time": "Recent",
                    "rating": r["rating"],
                    "date": r["date"],
                    "reviewText": r.get("text") or "",
                    "categories": r["categories"],
                }
                for r in recent_reviews[:5]
            ],
            "aiInsights": _build_ai_insights(metrics, category_performance, org_id),
            "alerts": alerts_data[:4],
            "sourceComparison": source_comparison,
            "categoryPerformance": category_performance,
        }
    except Exception as e:
        print(f"Error building unified dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))
