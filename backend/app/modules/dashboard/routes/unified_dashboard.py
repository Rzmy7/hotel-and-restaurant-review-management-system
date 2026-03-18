"""Unified dashboard route — aggregating stats, activities, and trends."""
from fastapi import APIRouter, HTTPException
from app.modules.dashboard.services.stats_service import get_stats, get_distribution
from app.modules.dashboard.services.activity_service import get_alerts, get_activities
from app.modules.dashboard.services.trends_service import get_usage, get_recent_reviews

router = APIRouter()

@router.get("/organizations/{org_id}/dashboard")
def get_unified_dashboard(org_id: str):
    """
    Returns a unified dashboard response matching the frontend DashboardResponse interface.
    """
    try:
        stats = get_stats()
        dist = get_distribution()
        alerts = get_alerts()
        recent_reviews = get_recent_reviews()
        
        # Mapping logic to match frontend DashboardResponse
        # Note: Some fields are still using mocked trends/changes for now
        
        rating_dist = []
        total_dist_count = sum(dist["distribution"].values())
        for r, count in dist["distribution"].items():
            percentage = round((count / total_dist_count) * 100, 1) if total_dist_count > 0 else 0
            rating_dist.append({
                "rating": int(r),
                "count": count,
                "percentage": percentage
            })

        return {
            "hotel": {"id": org_id, "name": "Luxe Hotel & Spa", "status": "Active"},
            "organizations": [
                {"id": org_id, "name": "Luxe Hotel & Spa", "status": "Active"},
                {"id": "COMP-001", "name": "Grand Palace", "status": "Active"}
            ],
            "currentOrganizationId": org_id,
            "metrics": {
                "avgRating": {
                    "value": str(stats["averageRating"]),
                    "change": "+0.2",
                    "changeType": "up",
                    "colorScheme": "blue"
                },
                "activeSources": {
                    "value": "8",
                    "change": "Stable",
                    "changeType": "neutral",
                    "colorScheme": "amber"
                },
                "totalReviews": {
                    "value": str(stats["totalReviews"]),
                    "change": "+12%",
                    "changeType": "up",
                    "colorScheme": "indigo"
                },
                "negativeReviews": {
                    "value": str(total_dist_count - dist["distribution"].get("4", 0) - dist["distribution"].get("5", 0)),
                    "change": "-5%",
                    "changeType": "down",
                    "colorScheme": "rose"
                },
                "ratingDistribution": rating_dist
            },
            "charts": {
                "sentiment": {
                    "positive": {"count": 650, "percentage": 65},
                    "neutral": {"count": 200, "percentage": 20},
                    "negative": {"count": 150, "percentage": 15}
                },
                "reviewsOverTime": [
                    {"label": "Mon", "volume": 45, "sentiment": 80},
                    {"label": "Tue", "volume": 52, "sentiment": 75},
                    {"label": "Wed", "volume": 38, "sentiment": 85},
                    {"label": "Thu", "volume": 65, "sentiment": 70},
                    {"label": "Fri", "volume": 85, "sentiment": 90},
                    {"label": "Sat", "volume": 95, "sentiment": 85},
                    {"label": "Sun", "volume": 70, "sentiment": 80}
                ],
                "sentimentTrends": []
            },
            "latestReviews": [
                {
                    "id": str(r["id"]),
                    "reviewerName": r["userName"],
                    "title": "Stay Experience",
                    "source": r["source"],
                    "sentiment": r["sentiment"],
                    "time": "2h ago",
                    "rating": r["rating"],
                    "date": r["date"],
                    "reviewText": r["text"],
                    "categories": r["categories"]
                } for r in recent_reviews[:5]
            ],
            "aiInsights": {
                "strengths": [
                    {"label": "Room Cleanliness", "impact": "High", "freq": "85%"},
                    {"label": "Staff Politeness", "impact": "Med", "freq": "72%"}
                ],
                "issues": [
                    {"label": "Slow Check-in", "impact": "Med", "freq": "12%"},
                    {"label": "Breakfast Variety", "impact": "Low", "freq": "8%"}
                ],
                "highlight": {
                    "text": "Positive sentiment has increased by 15% following the new breakfast menu rollout.",
                    "correlation": "Strong"
                }
            },
            "alerts": alerts[:4],
            "sourceComparison": [
                {
                    "name": "Google", "rating": 4.8, "trend": "up", "trendType": "up", "reviews": 1280, "pct": 85,
                    "color": "#4285F4", "bgColor": "bg-blue-50/50", "borderColor": "border-blue-100",
                    "sentiment": {"pos": 82, "neu": 10, "neg": 8}, "lastSync": "10m ago"
                },
                {
                    "name": "Booking.com", "rating": 4.5, "trend": "stable", "trendType": "neutral", "reviews": 850, "pct": 72,
                    "color": "#003580", "bgColor": "bg-indigo-50/50", "borderColor": "border-indigo-100",
                    "sentiment": {"pos": 75, "neu": 15, "neg": 10}, "lastSync": "1h ago"
                }
            ]
        }
    except Exception as e:
        print(f"Error building unified dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))
