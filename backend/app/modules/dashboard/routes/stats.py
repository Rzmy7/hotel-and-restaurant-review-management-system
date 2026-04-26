"""Dashboard routes — stats and distribution."""

from fastapi import APIRouter, Depends, HTTPException
from app.modules.dashboard.services.stats_service import get_stats, get_distribution
from app.modules.auth.utils.auth_utils import get_current_user

router = APIRouter()


@router.get("/dashboard/stats")
def stats(org_id: str | None = None, user=Depends(get_current_user)):
    try:
        return get_stats(org_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard/distribution")
def distribution(org_id: str | None = None, user=Depends(get_current_user)):
    try:
        return get_distribution(org_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
