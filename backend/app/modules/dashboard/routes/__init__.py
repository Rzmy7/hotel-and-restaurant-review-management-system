"""Dashboard routes aggregator."""
from fastapi import APIRouter
from app.modules.dashboard.routes.unified_dashboard import router as unified_router

router = APIRouter(tags=["Dashboard"])
router.include_router(unified_router)

