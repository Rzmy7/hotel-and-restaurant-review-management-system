"""Admin insights and dashboard overview routes."""
from fastapi import APIRouter
from app.modules.admin.services.insights_service import get_dashboard_stats, generate_ai_insights

router = APIRouter()

@router.get("/admin/dashboard")
def admin_dashboard():
    return get_dashboard_stats()

@router.get("/admin/insights")
def admin_insights():
    return generate_ai_insights()
