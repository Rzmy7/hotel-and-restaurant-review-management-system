"""Admin routes aggregator."""

from fastapi import APIRouter, Depends
from app.middleware.permissions import require_admin
from app.modules.admin.routes.insights import router as insights_router
from app.modules.admin.routes.dashboard_routes import router as dashboard_router
from app.modules.admin.routes.admin_routes import router as admin_ops_router
from app.modules.admin.routes.settings_routes import router as settings_router
from app.modules.admin.routes.broadcasting_routes import router as broadcasting_router
from app.modules.admin.routes.notifications_routes import router as notifications_router
from app.modules.admin.routes.maintenance_routes import router as maintenance_router
from app.modules.admin.routes.monitoring_routes import router as monitoring_router
from app.modules.admin.routes.subscription_routes import router as subscription_router

router = APIRouter(
    prefix="/admin", tags=["Admin"], dependencies=[Depends(require_admin)]
)
router.include_router(insights_router)
router.include_router(dashboard_router)
router.include_router(admin_ops_router)
router.include_router(monitoring_router)
router.include_router(broadcasting_router)
router.include_router(notifications_router)
router.include_router(settings_router)
router.include_router(maintenance_router)
router.include_router(subscription_router)
