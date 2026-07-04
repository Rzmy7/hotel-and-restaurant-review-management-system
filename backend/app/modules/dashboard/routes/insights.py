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


def _get_response_metrics(cursor, org_id: str, curr_start, prev_start, prev_end):
    """
    Calculate real response rate trend and average response time
    using the review_replies table (or falling back to ai_reply column).
    """
    # Response rate: current period
    cursor.execute(
        """
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN r.ai_reply IS NOT NULL AND LEN(r.ai_reply) > 0 THEN 1 ELSE 0 END) AS replied
        FROM dbo.processed_review r
        JOIN dbo.source s ON r.source_id = s.source_id
        WHERE s.organization_id = ? AND r.reviewDate >= CAST(? AS DATE)
        """,
        org_id, curr_start,
    )
    row = cursor.fetchone()
    curr_total = row.total or 0
    curr_replied = row.replied or 0
    curr_rate = round((curr_replied / curr_total) * 100) if curr_total > 0 else 0

    # Response rate: previous period
    cursor.execute(
        """
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN r.ai_reply IS NOT NULL AND LEN(r.ai_reply) > 0 THEN 1 ELSE 0 END) AS replied
        FROM dbo.processed_review r
        JOIN dbo.source s ON r.source_id = s.source_id
        WHERE s.organization_id = ? AND r.reviewDate >= CAST(? AS DATE) AND r.reviewDate < CAST(? AS DATE)
        """,
        org_id, prev_start, prev_end,
    )
    row = cursor.fetchone()
    prev_total = row.total or 0
    prev_replied = row.replied or 0
    prev_rate = round((prev_replied / prev_total) * 100) if prev_total > 0 else 0

    rate_change = _pct_change(curr_rate, prev_rate) if prev_total > 0 else "0%"

    # Average response time (hours) from review_replies table or ai_reply presence
    try:
        cursor.execute(
            """
            SELECT AVG(
                DATEDIFF(hour, r.reviewDate, rr.created_at) * 1.0
            ) AS avg_hours
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            LEFT JOIN dbo.review_reply rr ON rr.review_id = r.id
            WHERE s.organization_id = ?
              AND r.reviewDate >= CAST(? AS DATE)
              AND rr.created_at IS NOT NULL
            """,
            org_id, curr_start,
        )
        row = cursor.fetchone()
        avg_hours = row.avg_hours if row and row.avg_hours else None
        if avg_hours is not None and avg_hours > 0:
            if avg_hours < 1:
                avg_time = f"{round(avg_hours * 60)}m"
            elif avg_hours < 24:
                avg_time = f"{round(avg_hours)}h"
            else:
                avg_time = f"{round(avg_hours / 24, 1)}d"
        else:
            avg_time = "N/A"
    except Exception:
        avg_time = "N/A"

    return {
        "rate": f"{curr_rate}%",
        "rateChange": rate_change,
        "avgTime": avg_time,
    }


def _compute_rating_impact(cursor, org_id: str, curr_start) -> str:
    """
    Compare average rating of reviews WITH replies vs WITHOUT replies
    to estimate the positive impact of responding.
    """
    try:
        cursor.execute(
            """
            SELECT
                AVG(CASE WHEN r.ai_reply IS NOT NULL AND LEN(r.ai_reply) > 0
                    THEN CAST(r.rating AS FLOAT) END) AS replied_avg,
                AVG(CASE WHEN r.ai_reply IS NULL OR LEN(r.ai_reply) = 0
                    THEN CAST(r.rating AS FLOAT) END) AS unreplied_avg
            FROM dbo.processed_review r
            JOIN dbo.source s ON r.source_id = s.source_id
            WHERE s.organization_id = ?
              AND r.reviewDate >= CAST(? AS DATE)
              AND r.rating IS NOT NULL
            """,
            org_id, curr_start,
        )
        row = cursor.fetchone()
        replied = float(row.replied_avg or 0)
        unreplied = float(row.unreplied_avg or 0)

        if replied > 0 and unreplied > 0:
            diff = round(replied - unreplied, 1)
            sign = "+" if diff >= 0 else ""
            return f"{sign}{diff}"
    except Exception:
        pass
    return "N/A"


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
            sentiment_series = {"labels": [], "positive": [], "neutral": [], "negative": []}
            try:
                sentiment_series = get_weekly_sentiment_series(cursor, org_id, period_days=period)
            except Exception as e:
                import traceback
                traceback.print_exc()
                print(f"[WARN] get_weekly_sentiment_series failed (returning empty): {e}")

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
            heatmap = [[0, 0, 0, 0, 0, 0, 0]]
            try:
                heatmap_result = get_review_volume_heatmap(cursor, org_id, period_days=period)
                if heatmap_result:
                    heatmap = heatmap_result
            except Exception as e:
                import traceback
                traceback.print_exc()
                print(f"[WARN] get_review_volume_heatmap failed (returning empty): {e}")

            # ── AI Actions ───────────────────────────────────────────
            try:
                metrics_for_ai = get_dashboard_metrics(org_id, period, cursor=cursor)
            except Exception as e:
                raise RuntimeError(f"[get_dashboard_metrics] {e}") from e
            ai_actions = generate_ai_actions(metrics_for_ai, categories, sources, keywords)

            # ── Response Metrics (real data from review_replies) ────
            resp_metrics = _get_response_metrics(
                cursor, org_id, curr_start, prev_start, prev_end
            )

            return {
                # KPIs
                "overallScore": overall_score,
                "overallScoreChange": _pct_change(overall_score, prev_score),
                "totalReviews": str(curr_total),
                "totalReviewsChange": _pct_change(curr_total, prev_total),
                "avgRating": str(round(curr_avg, 1)),
                "avgRatingChange": _pct_change(curr_avg, prev_avg),
                "responseRate": resp_metrics["rate"],
                "responseRateChange": resp_metrics["rateChange"],

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

                # Response metrics (real data)
                "responseMetrics": {
                    "avgTime": resp_metrics["avgTime"],
                    "rate": resp_metrics["rate"],
                    "ratingImpact": _compute_rating_impact(cursor, org_id, curr_start),
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
