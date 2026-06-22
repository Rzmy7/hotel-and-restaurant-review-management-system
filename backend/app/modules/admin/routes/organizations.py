"""Admin organization routes."""
from fastapi import APIRouter
from app.modules.admin.services.organization_service import get_organizations

router = APIRouter(tags=["Admin - Organizations"])

@router.get("/organizations")
def list_organizations():
    return get_organizations()
