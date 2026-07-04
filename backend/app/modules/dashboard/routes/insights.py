"""Insights route — tenant-scoped, auth-protected analytics endpoint."""

from fastapi import APIRouter, Depends, HTTPException
from app.modules.auth.utils.auth_utils import get_current_user
from app.core.pyodbc_connection import get_connection_string
from app.modules.dashboard.services.metrics_service import (
    get_avg_rating,
    get_review_count,
    get_response_rate,
    get_rating_distribution,
)
from app.modules.dashboard.services.charts_service import (
    get_weekly_sentiment_series,
    get_review_volume_heatmap,
)
from app.modules.dashboard.services.categories_service import get_category_performance
from app.modules.dashboard.services.sources_service import get_source_comparison_metrics
from app.modules.dashboard.services.insights_service import get_keywords, generate_ai_actions
from app.modules.dashboard.services.metrics_service import get_dashboard_metrics
from datetime import datetime, timedelta
import pyodbc
import uuid

router = APIRouter()


def _pct_change(current: float, previous: float) -> str:
    if previous == 0:
        return "0%" if current == 0 else "+100%"
    change = round(((current - previous) / previous) * 100, 1)
    sign = "+" if change >= 0 else ""
    return f"{sign}{change}%"


@router.get("/organizations/{org_id}/insights")
def get_insights(
    org_id: str,
    timeRange: str = "30d",
    user=Depends(get_current_user),
):
    """
    Returns all data needed by the Insights dashboard page.
    Tenant-scoped: only returns data belonging to org_id.
    """
    try:
        uuid.UUID(org_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Invalid org UUID")

    period = int(timeRange.replace("d", "")) if "d" in timeRange else 30

    try:
        conn = pyodbc.connect(get_connection_string())
        cursor = conn.cursor()

        try:
            now = datetime.utcnow()
            curr_start = now - timedelta(days=period) if period > 0 else None
            prev_start = now - timedelta(days=period * 2) if period > 0 else None
            prev_end   = now - timedelta(days=period) if period > 0 else None

            # ── KPI Metrics ──────────────────────────────────────────
            try:
                curr_avg    = get_avg_rating(cursor, org_id, start_date=curr_start)
            except Exception as e:
                raise RuntimeError(f"[get_avg_rating#1] {e}") from e
            try:
                prev_avg    = get_avg_rating(cursor, org_id, start_date=prev_start, end_date=prev_end) if curr_start else 0
            except Exception as e:
                raise RuntimeError(f"[get_avg_rating#2] {e}") from e
            try:
                curr_total  = get_review_count(cursor, org_id, start_date=curr_start)
            except Exception as e:
                raise RuntimeError(f"[get_review_count#1] {e}") from e
            try:
                prev_total  = get_review_count(cursor, org_id, start_date=prev_start, end_date=prev_end) if curr_start else 0
            except Exception as e:
                raise RuntimeError(f"[get_review_count#2] {e}") from e
            try:
                response_rate = get_response_rate(cursor, org_id, start_date=curr_start)
            except Exception as e:
                raise RuntimeError(f"[get_response_rate] {e}") from e

            # overall score: avg_rating mapped to 0-100
            overall_score = round(curr_avg * 20) if curr_avg else 0
            prev_score    = round(prev_avg * 20) if prev_avg else 0

            # ── Sentiment Time Series ─────────────────────────────────
            try:
                sentiment_series = get_weekly_sentiment_series(cursor, org_id, period_days=period)
            except Exception as e:
                raise RuntimeError(f"[get_weekly_sentiment_series] {e}") from e

            # ── Rating Distribution ───────────────────────────────────
            try:
                raw_dist = get_rating_distribution(cursor, org_id, period_days=period)
            except Exception as e:
                raise RuntimeError(f"[get_rating_distribution] {e}") from e
            rating_distribution = [
                {
                    "stars": r["rating"],
                    "count": r["count"],
                    "pct": r["percentage"],
                }
                for r in raw_dist
            ]

            # ── Category Performance ─────────────────────────────────
            try:
                cat_raw = get_category_performance(cursor, org_id, period_days=period)
            except Exception as e:
                raise RuntimeError(f"[get_category_performance] {e}") from e
            categories = []
            for cat in cat_raw:
                try:
                    delta = int(
                        str(cat.get("trend", "0"))
                        .replace("%", "")
                        .replace("+", "")
                        .replace("—", "0")
                        .strip() or "0"
                    )
                except (ValueError, AttributeError):
                    delta = 0
                score = round(float(cat.get("score", 0)))
                categories.append({
                    "name": cat.get("name", "Unknown"),
                    "score": score,
                    "prev": score - delta,
                })

            # ── Source Breakdown ─────────────────────────────────────
            try:
                src_raw = get_source_comparison_metrics(cursor, org_id, period_days=period)
            except Exception as e:
                raise RuntimeError(f"[get_source_comparison_metrics] {e}") from e
            sources = [
                {
                    "name": s["name"],
                    "rating": s["rating"],
                    "reviews": s["reviews"],
                    "pct": s.get("pct", 0),
                    "color": s.get("color", "#64748b"),
                    "positive": s["sentiment"]["pos"],
                    "neutral":  s["sentiment"]["neu"],
                    "negative": s["sentiment"]["neg"],
                }
                for s in src_raw
            ]

            # ── Keywords ─────────────────────────────────────────────
            try:
                keywords = get_keywords(cursor, org_id, period_days=period)
            except Exception as e:
                raise RuntimeError(f"[get_keywords] {e}") from e

            # ── Heatmap ──────────────────────────────────────────────
            try:
                heatmap = get_review_volume_heatmap(cursor, org_id, period_days=period)
            except Exception as e:
                raise RuntimeError(f"[get_review_volume_heatmap] {e}") from e
            if not heatmap:
                heatmap = [[0, 0, 0, 0, 0, 0, 0]]

            # ── AI Actions ───────────────────────────────────────────
            try:
                metrics_for_ai = get_dashboard_metrics(org_id, period, cursor=cursor)
            except Exception as e:
                raise RuntimeError(f"[get_dashboard_metrics] {e}") from e
            ai_actions = generate_ai_actions(metrics_for_ai, categories, sources, keywords)

            return {
                # KPIs
                "overallScore": overall_score,
                "overallScoreChange": _pct_change(overall_score, prev_score),
                "totalReviews": str(curr_total),
                "totalReviewsChange": _pct_change(curr_total, prev_total),
                "avgRating": str(round(curr_avg, 1)),
                "avgRatingChange": _pct_change(curr_avg, prev_avg),
                "responseRate": response_rate,
                "responseRateChange": "0%",  # trend requires historical replied-at timestamp

                # Sentiment chart
                "sentimentMonths":   sentiment_series["labels"],
                "sentimentPositive": sentiment_series["positive"],
                "sentimentNeutral":  sentiment_series["neutral"],
                "sentimentNegative": sentiment_series["negative"],

                # Distribution & categories
                "ratingDistribution": rating_distribution,
                "categories": categories,

                # Sources (real DB data for this org)
                "sources": sources,

                # Keywords (from positive_text / negative_text fields)
                "positiveKeywords": keywords["positiveKeywords"],
                "negativeKeywords": keywords["negativeKeywords"],

                # Response metrics
                "responseMetrics": {
                    "avgTime": "N/A",
                    "rate": response_rate,
                    "ratingImpact": "+0.2",
                },

                # Heatmap: list of week-columns, each with 7 day values
                "heatmapWeeks": heatmap,

                # AI recommendations
                "aiActions": ai_actions,
            }

        finally:
            conn.close()

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
