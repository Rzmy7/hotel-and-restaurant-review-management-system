"""Admin Backend routes aggregator — combines all sub-routers."""

from fastapi import APIRouter

from app.modules.admin_backend.routes.admin_routes import router as admin_router
from app.modules.admin_backend.routes.broadcasting_routes import router as broadcasting_router
from app.modules.admin_backend.routes.dashboard_routes import router as dashboard_router
from app.modules.admin_backend.routes.monitoring_routes import router as monitoring_router
from app.modules.admin_backend.routes.notifications_routes import router as notifications_router

router = APIRouter()
router.include_router(dashboard_router)
router.include_router(admin_router)
router.include_router(monitoring_router)
router.include_router(broadcasting_router)
router.include_router(notifications_router)
