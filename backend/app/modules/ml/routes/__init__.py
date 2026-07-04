"""ML routes aggregator."""
from fastapi import APIRouter
from app.modules.ml.routes.analyze import router as analyze_router
from app.modules.ml.routes.reply import router as reply_router

router = APIRouter(tags=["ML Service"])
router.include_router(analyze_router)
router.include_router(reply_router)
