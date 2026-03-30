"""Unified dashboard route — aggregating stats, activities, and trends."""
from fastapi import APIRouter, HTTPException
from app.modules.dashboard.services.activity_service import get_alerts, get_activities, get_sentiment_counts
from app.modules.dashboard.services.trends_service import get_usage, get_recent_reviews
from app.modules.dashboard.services.metrics_service import get_dashboard_metrics
from app.modules.dashboard.services.charts_service import (
    get_sentiment_distribution,
    get_daily_review_trends,
    get_weekly_review_trends
)
from app.core.pyodbc_connection import get_connection_string
import pyodbc

router = APIRouter()

@router.get("/organizations/{org_id}/dashboard")
def get_unified_dashboard(org_id: str, period: int = 30):
    """
    Returns a unified dashboard response matching the frontend DashboardResponse interface.
    """
    try:
        conn = pyodbc.connect(get_connection_string())
        cursor = conn.cursor()
        
        try:
            # Aggregate all atomic data using the same cursor for performance
            metrics = get_dashboard_metrics(org_id, period, cursor=cursor)
            sentiment_charts = get_sentiment_distribution(cursor, org_id)
            daily_trends = get_daily_review_trends(cursor, org_id, days=period)
            weekly_trends = get_weekly_review_trends(cursor, org_id, period_days=period)
            
            # These still use internal connections (can be refactored later)
            recent_reviews = get_recent_reviews(org_id)["reviews"]
            alerts_data = get_alerts(org_id)["alerts"]

            return {
                "hotel": {"id": org_id, "name": "Organization Dashboard", "status": "Active"},
                "organizations": [
                    {"id": org_id, "name": "Current Organization", "status": "Active"}
                ],
                "currentOrganizationId": org_id,
                "metrics": metrics,
                "charts": {
                    "sentiment": sentiment_charts,
                    "reviewsOverTime": daily_trends,
                    "sentimentTrends": weekly_trends
                },
                "latestReviews": [
                    {
                        "id": str(r["id"]),
                        "reviewerName": r["userName"],
                        "title": "Review Entry",
                        "source": r["source"],
                        "sentiment": r["sentiment"],
                        "time": "Recent",
                        "rating": r["rating"],
                        "date": r["date"],
                        "reviewText": r["text"],
                        "categories": r["categories"]
                    } for r in recent_reviews[:5]
                ],
                "aiInsights": {
                    "strengths": [
                        {"label": "Review Quality", "impact": "High", "freq": "100%"},
                    ],
                    "issues": [],
                    "highlight": {
                        "text": f"Positive reviews stand at {metrics['avgRating']['value']} stars average.",
                        "correlation": "Strong"
                    }
                },
                "alerts": alerts_data[:4],
                "sourceComparison": []
            }
        finally:
            conn.close()
    except Exception as e:
        print(f"Error building unified dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))
