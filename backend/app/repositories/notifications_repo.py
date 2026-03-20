import uuid
from datetime import datetime
from sqlalchemy.orm import Session

from app.models import Notification, UserNotification


def create_notification(
    db: Session,
    user_id: uuid.UUID,
    title: str,
    message: str,
    notification_type: str = "info",
) -> UserNotification:
    notification = Notification(
        title=title,
        message=message,
        notification_type=notification_type,
    )
    db.add(notification)

    db.flush()

    user_notification = UserNotification(
        notification_id=notification.notification_id,
        user_id=user_id,
        is_read=False,
    )
    db.add(user_notification)

    db.commit()
    db.refresh(user_notification)

    return (
        db.query(UserNotification)
        .join(Notification, UserNotification.notification_id == Notification.notification_id)
        .filter(
            UserNotification.notification_id == notification.notification_id,
            UserNotification.user_id == user_id,
        )
        .first()
    )


def list_notifications_for_user(
    db: Session,
    user_id: uuid.UUID,
    limit: int = 50,
    offset: int = 0,
    unread_only: bool = False,
) -> list[UserNotification]:
    query = (
        db.query(UserNotification)
        .join(Notification, UserNotification.notification_id == Notification.notification_id)
        .filter(UserNotification.user_id == user_id)
    )

    if unread_only:
        query = query.filter(UserNotification.is_read.is_(False))

    return (
        query.order_by(Notification.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def count_unread_notifications(db: Session, user_id: uuid.UUID) -> int:
    return (
        db.query(UserNotification)
        .filter(
            UserNotification.user_id == user_id,
            UserNotification.is_read.is_(False),
        )
        .count()
    )


def mark_notification_as_read(
    db: Session,
    notification_id: uuid.UUID,
    user_id: uuid.UUID,
) -> UserNotification | None:
    notification = (
        db.query(UserNotification)
        .filter(
            UserNotification.notification_id == notification_id,
            UserNotification.user_id == user_id,
        )
        .first()
    )

    if not notification:
        return None

    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        db.commit()
        db.refresh(notification)

    return notification


def mark_all_notifications_as_read(db: Session, user_id: uuid.UUID) -> int:
    unread = (
        db.query(UserNotification)
        .filter(
            UserNotification.user_id == user_id,
            UserNotification.is_read.is_(False),
        )
        .all()
    )

    if not unread:
        return 0

    now = datetime.utcnow()
    for notification in unread:
        notification.is_read = True
        notification.read_at = now

    db.commit()
    return len(unread)
