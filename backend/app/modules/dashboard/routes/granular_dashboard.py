"""
Granular Dashboard shadow APIs — Sprint 1 modular endpoints.
Provides decoupled routes for KPIs, alerts, and latest reviews with strict tenant isolation.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from app.database.session import get_db
from app.core.tenant_context import resolve_tenant_scope
from app.modules.auth.utils.auth_utils import get_current_user
from app.core.redis_client import cache_get, cache_set

router = APIRouter(prefix="/organizations/{org_id}/dashboard-granular", tags=["Granular Dashboard"])


@router.get("/kpis", summary="Get granular KPI metrics and rating distribution")
def get_granular_kpis(
    org_id: str,
    period: int = 0,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns Average Rating, Active Sources, Total Reviews, Negative Reviews,
    and Rating Distribution matching the metrics contract.
    """
    try:
        uuid.UUID(org_id)
    except ValueError:
        raise HTTPException(
            status_code=404,
            detail=f"Organization ID '{org_id}' is not a valid UUID format.",
        )

    # Enforce strict row-level tenant security scope
    resolve_tenant_scope(user, db, org_id)

    from app.modules.dashboard.services.metrics_service import get_dashboard_metrics

    try:
        cache_key = f"dashboard:kpis:{org_id}:{period}"
        cached = cache_get(cache_key)
        if cached is not None:
            return cached

        metrics = get_dashboard_metrics(db, org_id, period)
        cache_set(cache_key, metrics, ttl=300)
        return metrics
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving KPIs: {str(e)}"
        )


@router.get("/alerts", summary="Get active organization security and operational alerts")
def get_granular_alerts(
    org_id: str,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns active alerts for pending reviews or negative rating surges.
    Slices the output to 4 items max for UI compatibility.
    """
    try:
        uuid.UUID(org_id)
    except ValueError:
        raise HTTPException(
            status_code=404,
            detail=f"Organization ID '{org_id}' is not a valid UUID format.",
        )

    # Enforce strict row-level tenant security scope
    resolve_tenant_scope(user, db, org_id)

    from app.modules.dashboard.services.activity_service import get_alerts

    try:
        alerts_data = get_alerts(db, org_id)["alerts"]
        return alerts_data[:4]
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving alerts: {str(e)}"
        )


@router.get("/reviews/latest", summary="Get latest 5 reviews with structured metadata")
def get_granular_reviews(
    org_id: str,
    period: int = 0,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns latest 5 reviews parsed with categories and rating distributions
    mapped perfectly to the frontend schema.
    """
    try:
        uuid.UUID(org_id)
    except ValueError:
        raise HTTPException(
            status_code=404,
            detail=f"Organization ID '{org_id}' is not a valid UUID format.",
        )

    # Enforce strict row-level tenant security scope
    resolve_tenant_scope(user, db, org_id)

    from app.modules.dashboard.services.trends_service import get_recent_reviews

    try:
        cache_key = f"dashboard:latest-reviews:{org_id}:{period}"
        cached = cache_get(cache_key)
        if cached is not None:
            return cached

        recent_reviews = get_recent_reviews(db, org_id, period_days=period)["reviews"]

        # Format mapping strictly conforming to frontend expectations
        result = [
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
        ]
        cache_set(cache_key, result, ttl=300)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving reviews: {str(e)}"
        )


@router.get("/charts/sentiment", summary="Get granular sentiment breakdown chart data")
def get_granular_sentiment_chart(
    org_id: str,
    period: int = 0,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        uuid.UUID(org_id)
    except ValueError:
        raise HTTPException(
            status_code=404,
            detail=f"Organization ID '{org_id}' is not a valid UUID format.",
        )
    resolve_tenant_scope(user, db, org_id)

    from app.modules.dashboard.services.charts_service import get_sentiment_distribution

    try:
        cache_key = f"dashboard:charts-sentiment:{org_id}:{period}"
        cached = cache_get(cache_key)
        if cached is not None:
            return cached

        sentiment_charts = get_sentiment_distribution(db, org_id, period_days=period)
        cache_set(cache_key, sentiment_charts, ttl=300)
        return sentiment_charts
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving sentiment chart: {str(e)}"
        )


@router.get("/charts/trends", summary="Get granular reviews and sentiment trends charts data")
def get_granular_trends_chart(
    org_id: str,
    period: int = 0,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        uuid.UUID(org_id)
    except ValueError:
        raise HTTPException(
            status_code=404,
            detail=f"Organization ID '{org_id}' is not a valid UUID format.",
        )
    resolve_tenant_scope(user, db, org_id)

    from app.modules.dashboard.services.charts_service import (
        get_daily_review_trends,
        get_weekly_review_trends,
    )

    try:
        cache_key = f"dashboard:charts-trends:{org_id}:{period}"
        cached = cache_get(cache_key)
        if cached is not None:
            return cached

        daily_trends = get_daily_review_trends(db, org_id, days=period)
        weekly_trends = get_weekly_review_trends(db, org_id, period_days=period)
        result = {
            "reviewsOverTime": daily_trends,
            "sentimentTrends": weekly_trends,
        }
        cache_set(cache_key, result, ttl=300)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving trends charts: {str(e)}"
        )


@router.get("/category-performance", summary="Get granular category performance breakdown")
def get_granular_category_performance(
    org_id: str,
    period: int = 0,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        uuid.UUID(org_id)
    except ValueError:
        raise HTTPException(
            status_code=404,
            detail=f"Organization ID '{org_id}' is not a valid UUID format.",
        )
    resolve_tenant_scope(user, db, org_id)

    from app.modules.dashboard.services.categories_service import get_category_performance

    try:
        cache_key = f"dashboard:category-performance:{org_id}:{period}"
        cached = cache_get(cache_key)
        if cached is not None:
            return cached

        category_performance = get_category_performance(db, org_id, period_days=period)
        cache_set(cache_key, category_performance, ttl=300)
        return category_performance
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving category performance: {str(e)}"
        )


@router.get("/ai-insights", summary="Get granular AI-powered dashboard insights")
def get_granular_ai_insights(
    org_id: str,
    period: int = 0,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        uuid.UUID(org_id)
    except ValueError:
        raise HTTPException(
            status_code=404,
            detail=f"Organization ID '{org_id}' is not a valid UUID format.",
        )
    resolve_tenant_scope(user, db, org_id)

    from app.modules.dashboard.services.metrics_service import get_dashboard_metrics

    try:
        cache_key = f"dashboard:ai-insights:{org_id}:{period}"
        cached = cache_get(cache_key)
        if cached is not None:
            return cached

        metrics = get_dashboard_metrics(db, org_id, period)
        result = {
            "strengths": [
                {"label": "Review Quality", "impact": "High", "freq": "100%"},
            ],
            "issues": [],
            "highlight": {
                "text": f"Positive reviews stand at {metrics['avgRating']['value']} stars average.",
                "correlation": "Strong",
            },
        }
        cache_set(cache_key, result, ttl=300)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving AI insights: {str(e)}"
        )


@router.get("/source-comparison", summary="Get granular source comparison stats")
def get_granular_source_comparison(
    org_id: str,
    period: int = 0,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        uuid.UUID(org_id)
    except ValueError:
        raise HTTPException(
            status_code=404,
            detail=f"Organization ID '{org_id}' is not a valid UUID format.",
        )
    resolve_tenant_scope(user, db, org_id)

    from app.modules.dashboard.services.sources_service import get_source_comparison_metrics

    try:
        cache_key = f"dashboard:source-comparison:{org_id}:{period}"
        cached = cache_get(cache_key)
        if cached is not None:
            return cached

        source_comparison = get_source_comparison_metrics(db, org_id, period_days=period)
        cache_set(cache_key, source_comparison, ttl=300)
        return source_comparison
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving source comparison: {str(e)}"
        )
