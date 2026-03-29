import uuid
from typing import Literal

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.modules.auth.models import UserNotification
from app.repositories.notifications_repo import (
    create_notification,
    list_notifications_for_user,
    count_unread_notifications,
    mark_notification_as_read,
    mark_all_notifications_as_read,
)


class NotificationCreate(BaseModel):
    userId: uuid.UUID
    title: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=4000)
    type: Literal["info", "success", "warning", "error", "maintenance", "announcement"] = "info"


class NotificationResponse(BaseModel):
    id: str
    userId: str
    title: str
    message: str
    type: str
    isRead: bool
    createdAt: str
    readAt: str | None = None


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    unreadCount: int


class MarkAllReadResponse(BaseModel):
    updated: int


def _to_response(user_notification: UserNotification) -> NotificationResponse:
    content = user_notification.notification
    return NotificationResponse(
        id=str(user_notification.notification_id),
        userId=str(user_notification.user_id),
        title=content.title,
        message=content.message,
        type=content.notification_type,
        isRead=user_notification.is_read,
        createdAt=content.created_at.isoformat() if content.created_at else "",
        readAt=user_notification.read_at.isoformat() if user_notification.read_at else None,
    )


def create_user_notification(db: Session, payload: NotificationCreate) -> NotificationResponse:
    notification = create_notification(
        db=db,
        user_id=payload.userId,
        title=payload.title,
        message=payload.message,
        notification_type=payload.type,
    )
    return _to_response(notification)


def get_user_notifications(
    db: Session,
    user_id: uuid.UUID,
    limit: int = 50,
    offset: int = 0,
    unread_only: bool = False,
) -> NotificationListResponse:
    notifications = list_notifications_for_user(
        db=db,
        user_id=user_id,
        limit=limit,
        offset=offset,
        unread_only=unread_only,
    )
    unread_count = count_unread_notifications(db, user_id)
    return NotificationListResponse(
        items=[_to_response(item) for item in notifications],
        unreadCount=unread_count,
    )


def mark_user_notification_read(
    db: Session,
    notification_id: uuid.UUID,
    user_id: uuid.UUID,
) -> NotificationResponse | None:
    notification = mark_notification_as_read(db, notification_id, user_id)
    if not notification:
        return None
    return _to_response(notification)


def mark_user_notifications_read_all(db: Session, user_id: uuid.UUID) -> MarkAllReadResponse:
    updated = mark_all_notifications_as_read(db, user_id)
    return MarkAllReadResponse(updated=updated)


def get_unread_count(db: Session, user_id: uuid.UUID) -> dict:
    return {"unreadCount": count_unread_notifications(db, user_id)}
