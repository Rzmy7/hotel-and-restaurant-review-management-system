"""Admin insights and dashboard overview routes."""
from fastapi import APIRouter
from app.modules.admin.services.insights_service import get_dashboard_stats, generate_ai_insights

router = APIRouter(tags=["Admin - Dashboard"])

@router.get("/admin/dashboard", summary="Retrieve admin KPI dashboard stats")
def admin_dashboard():
    return get_dashboard_stats()

@router.get("/admin/insights", summary="Generate AI-powered platform insights")
def admin_insights():
    return generate_ai_insights()
