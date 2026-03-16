"""Admin routes aggregator."""
from fastapi import APIRouter
from app.modules.admin.routes.users import router as users_router
from app.modules.admin.routes.organizations import router as organizations_router
from app.modules.admin.routes.insights import router as insights_router

router = APIRouter(tags=["Admin"])
router.include_router(users_router)
router.include_router(organizations_router)
router.include_router(insights_router)
