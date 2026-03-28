import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.auth_permissions import require_admin, require_admin_or_tenant
from app.services.notifications_service import (
    NotificationCreate,
    NotificationResponse,
    NotificationListResponse,
    MarkAllReadResponse,
    create_user_notification,
    get_user_notifications,
    mark_user_notification_read,
    mark_user_notifications_read_all,
    get_unread_count,
)


router = APIRouter(prefix="/api/notifications", tags=["notifications"])


def _get_current_user_uuid(current_user: dict) -> uuid.UUID:
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing user id")

    try:
        return uuid.UUID(str(user_id))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user id format")


@router.post("", response_model=NotificationResponse)
def create_notification_endpoint(
    payload: NotificationCreate,
    db: Session = Depends(get_db),
    admin_user: dict = Depends(require_admin),
):
    return create_user_notification(db, payload)


@router.get("/me", response_model=NotificationListResponse)
def get_my_notifications(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    unreadOnly: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_tenant),
):
    user_id = _get_current_user_uuid(current_user)
    return get_user_notifications(
        db=db,
        user_id=user_id,
        limit=limit,
        offset=offset,
        unread_only=unreadOnly,
    )


@router.get("/me/unread-count")
def get_my_unread_count(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_tenant),
):
    user_id = _get_current_user_uuid(current_user)
    return get_unread_count(db, user_id)


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_my_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_tenant),
):
    user_id = _get_current_user_uuid(current_user)

    try:
        parsed_id = uuid.UUID(notification_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid notification id")

    updated = mark_user_notification_read(db, parsed_id, user_id)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    return updated


@router.patch("/me/read-all", response_model=MarkAllReadResponse)
def mark_my_notifications_read_all(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin_or_tenant),
):
    user_id = _get_current_user_uuid(current_user)
    return mark_user_notifications_read_all(db, user_id)
