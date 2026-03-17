from fastapi import APIRouter

from app.modules.source.routers.source_router import router as source_router

router = APIRouter(prefix="/source", tags=["Source"])

router.include_router(source_router)
