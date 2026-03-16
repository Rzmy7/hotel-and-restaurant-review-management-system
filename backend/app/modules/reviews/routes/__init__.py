"""
Reviews routes package — aggregates review and scraping sub-routers.
"""

from fastapi import APIRouter

from app.modules.reviews.routes.reviews import router as reviews_router
from app.modules.reviews.routes.scraping import router as scraping_router

router = APIRouter(tags=["Reviews"])

router.include_router(reviews_router)
router.include_router(scraping_router)
