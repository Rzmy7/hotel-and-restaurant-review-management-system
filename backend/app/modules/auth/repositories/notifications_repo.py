import uuid
from datetime import datetime
from sqlalchemy.orm import Session

from app.modules.auth.models import Notification, UserNotification, User
from app.modules.auth.services.email_service import send_notification_email


def create_notification(
    db: Session,
    user_id: uuid.UUID,
    title: str,
    message: str,
    notification_type: str = "info",
    send_email: bool = True,
) -> UserNotification:
    # 1. Create Notification record
    notification = Notification(
        title=title,
        message=message,
        notification_type=notification_type,
    )
    db.add(notification)

    db.flush()   # Get ID without committing


    # 2. Create UserNotification (link user to notification)
    user_notification = UserNotification(
        notification_id=notification.notification_id,
        user_id=user_id,
        is_read=False,
    )
    db.add(user_notification)

    db.commit()
    db.refresh(user_notification)

    # Check if the user has email notifications enabled and send email
    try:
        user = db.query(User).filter(User.user_id == user_id).first()
        print(f"[email-notif] user={user.email if user else 'NOT FOUND'}, "
            f"has_flag={hasattr(user, 'is_email_notifications_enabled') if user else 'N/A'}, "
            f"flag_value={getattr(user, 'is_email_notifications_enabled', 'MISSING') if user else 'N/A'}")
        if send_email and user and getattr(user, 'is_email_notifications_enabled', False):
            print(f"[email-notif] Sending email to {user.email} - title: {title}")
            send_notification_email(user.email, title, message, notification_type=notification_type)
            print(f"[email-notif] Email sent successfully to {user.email}")
        else:
            print(f"[email-notif] Skipping email - notifications disabled or user not found")
    except Exception as e:
        print(f"[email-notif] ERROR sending email: {e}")

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
        query = query.filter(UserNotification.is_read == False)

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
            UserNotification.is_read == False,
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
            UserNotification.is_read == False,
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
