"""
Competitors routes package — aggregates all sub-routers.
Note: analytics router must be included BEFORE crud to ensure /rankings
is matched before /{competitor_id}.
"""

from fastapi import APIRouter

from app.modules.competitors.routes.analytics import router as analytics_router
from app.modules.competitors.routes.crud import router as crud_router
from app.modules.competitors.routes.scraping import router as scraping_router

router = APIRouter(prefix="/competitors", tags=["Competitors"])

router.include_router(analytics_router)
router.include_router(crud_router)
router.include_router(scraping_router)
