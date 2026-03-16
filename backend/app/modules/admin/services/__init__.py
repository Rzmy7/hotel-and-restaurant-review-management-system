"""Admin services sub-package."""
from app.modules.admin.services.user_service import get_admin_users, create_admin_user, update_admin_user, delete_admin_user
from app.modules.admin.services.organization_service import get_organizations
from app.modules.admin.services.insights_service import get_dashboard_stats, generate_ai_insights

__all__ = ["get_admin_users", "create_admin_user", "update_admin_user", "delete_admin_user", "get_organizations", "get_dashboard_stats", "generate_ai_insights"]
