"""
Auth routes package — aggregates all sub-routers into one APIRouter.

Import this `router` from `main.py` (or wherever).
"""

from fastapi import APIRouter

from app.modules.auth.routes.signup import router as signup_router
from app.modules.auth.routes.login import router as login_router
from app.modules.auth.routes.oauth import router as oauth_router
from app.modules.auth.routes.password import router as password_router
from app.modules.auth.routes.session import router as session_router

router = APIRouter(tags=["Auth"])

router.include_router(signup_router)
router.include_router(login_router)
router.include_router(oauth_router)
router.include_router(password_router)
router.include_router(session_router)
