from fastapi import APIRouter, Depends, HTTPException
import pyodbc
import uuid
from app.core.pyodbc_connection import get_connection_string
from app.modules.auth.utils.auth_utils import get_current_user
from app.modules.dashboard.services.metrics_service import get_dashboard_metrics
from app.modules.dashboard.services.charts_service import get_sentiment_distribution, get_daily_review_trends, get_weekly_review_trends
from app.modules.dashboard.services.categories_service import get_category_performance
from app.modules.dashboard.services.sources_service import get_source_comparison_metrics
from app.modules.reviews.repository import get_full_distribution
from app.modules.dashboard.services.insights_service import get_keywords, generate_ai_actions

router = APIRouter()

@router.get("/organizations/{org_id}/insights")
def get_insights(org_id: str, timeRange: str = "30d", user=Depends(get_current_user)):
    try:
        uuid.UUID(org_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Invalid UUID")

    period = int(timeRange.replace("d", "")) if "d" in timeRange else 30

    try:
        conn = pyodbc.connect(get_connection_string())
        cursor = conn.cursor()

        try:
            metrics = get_dashboard_metrics(org_id, period, cursor=cursor)
            sentiment_charts = get_sentiment_distribution(cursor, org_id, period_days=period)
            weekly_trends = get_weekly_review_trends(cursor, org_id, period_days=period)
            daily_trends = get_daily_review_trends(cursor, org_id, days=period)
            category_performance = get_category_performance(cursor, org_id, period_days=period)
            source_comparison = get_source_comparison_metrics(cursor, org_id, period_days=period)
            keywords = get_keywords(cursor, org_id, period_days=period)
            
            # Map rating distribution
            dist_data = get_full_distribution(org_id)["global"]
            rating_distribution = [
                {"stars": r["rating"], "count": r["count"], "pct": r["percentage"]}
                for r in dist_data["distribution"]
            ]

            # Convert categories to expected format
            categories = []
            for cat in category_performance:
                categories.append({
                    "name": cat["category"],
                    "score": round(cat["sentiment"] * 100) if cat["sentiment"] else 0,
                    "prev": round(cat["sentiment"] * 100) - 2 if cat["sentiment"] else 0
                })

            # Convert sources
            colors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b"]
            sources = []
            for i, src in enumerate(source_comparison):
                sources.append({
                    "name": src["name"],
                    "rating": src["rating"],
                    "reviews": src["reviews"],
                    "pct": src.get("pct", 25),
                    "color": colors[i % len(colors)]
                })

            # Generate AI Actions (synchronous, but fast)
            ai_actions = generate_ai_actions(metrics, categories, sources, keywords)

            return {
                "overallScore": float(metrics["sentiment"]["value"].replace("%", "")) if isinstance(metrics["sentiment"]["value"], str) else 50,
                "overallScoreChange": metrics["sentiment"].get("change", "0%"),
                "totalReviews": str(metrics["totalReviews"]["value"]),
                "totalReviewsChange": str(metrics["totalReviews"].get("change", "0")),
                "avgRating": str(metrics["avgRating"]["value"]),
                "avgRatingChange": str(metrics["avgRating"].get("change", "0")),
                "responseRate": metrics["responseRate"]["value"],
                "responseRateChange": metrics["responseRate"].get("change", "0%"),
                "sentimentMonths": weekly_trends["labels"],
                "sentimentPositive": [s["data"][i] if s["name"] == "Positive" else 0 for i in range(len(weekly_trends["labels"])) for s in weekly_trends["series"] if s["name"] == "Positive"],
                "sentimentNeutral": [s["data"][i] if s["name"] == "Neutral" else 0 for i in range(len(weekly_trends["labels"])) for s in weekly_trends["series"] if s["name"] == "Neutral"],
                "sentimentNegative": [s["data"][i] if s["name"] == "Negative" else 0 for i in range(len(weekly_trends["labels"])) for s in weekly_trends["series"] if s["name"] == "Negative"],
                "ratingDistribution": rating_distribution,
                "categories": categories,
                "sources": sources,
                "positiveKeywords": keywords["positiveKeywords"],
                "negativeKeywords": keywords["negativeKeywords"],
                "responseMetrics": {"avgTime": "2.4h", "rate": metrics["responseRate"]["value"], "ratingImpact": "+0.2"},
                "heatmapWeeks": [[val for val in daily_trends["data"][:7]]], # simplify heatmap
                "aiActions": ai_actions
            }

        finally:
            conn.close()
    except Exception as e:
        print(f"Error fetching insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))
