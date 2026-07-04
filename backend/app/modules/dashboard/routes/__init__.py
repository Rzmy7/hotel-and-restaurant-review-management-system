"""Dashboard routes aggregator."""
from fastapi import APIRouter
from app.modules.dashboard.routes.unified_dashboard import router as unified_router
from app.modules.dashboard.routes.granular_dashboard import router as granular_router

router = APIRouter(tags=["Dashboard"])
router.include_router(unified_router)
router.include_router(granular_router)


