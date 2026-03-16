"""Dashboard routes — stats and distribution."""
from fastapi import APIRouter, HTTPException
from app.modules.dashboard.services.stats_service import get_stats, get_distribution

router = APIRouter()

@router.get("/dashboard/stats")
def stats():
    try:
        return get_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard/distribution")
def distribution():
    try:
        return get_distribution()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
