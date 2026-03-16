"""Dashboard routes aggregator."""
from fastapi import APIRouter
from app.modules.dashboard.routes.stats import router as stats_router
from app.modules.dashboard.routes.activity import router as activity_router
from app.modules.dashboard.routes.trends import router as trends_router

router = APIRouter(tags=["Dashboard"])
router.include_router(stats_router)
router.include_router(activity_router)
router.include_router(trends_router)
