from fastapi import APIRouter

from app.modules.source.routers.source_router import router as source_router
from app.modules.source.routers.sync_task_router import router as sync_task_router

router = APIRouter(prefix="/source", tags=["Sources"])

router.include_router(source_router)
router.include_router(sync_task_router, prefix="/tasks")
