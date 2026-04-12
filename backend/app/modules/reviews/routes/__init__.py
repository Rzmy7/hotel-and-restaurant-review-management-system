"""
Reviews routes package — aggregates review logic.
"""

from fastapi import APIRouter
from app.modules.reviews.routes.reviews import router as reviews_api_router

router = APIRouter()

router.include_router(reviews_api_router)
