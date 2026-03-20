"""Broadcasting service for admin panel message broadcasting."""

from datetime import datetime
from typing import Literal, Optional
import uuid
import logging

from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.constants.roles import SYSTEM_ADMIN
from app.models import BroadcastEvent, Notification, Role, User, UserNotification, UserRole

logger = logging.getLogger(__name__)


class BroadcastCreate(BaseModel):
    subject: str = Field(..., min_length=1, max_length=120)
    body: str = Field(..., min_length=1, max_length=5000)
    channel: Literal["email", "notification", "both"]
    audienceType: Literal["all", "role", "plan"]
    audienceValue: Optional[str] = None
    messageType: Literal["info", "warning", "maintenance", "announcement"]
    scheduleType: Literal["now", "scheduled"]
    scheduledAt: Optional[str] = None


class BroadcastResponse(BaseModel):
    id: str
    subject: str
    body: str
    channel: str
    audienceType: str
    audienceLabel: str
    messageType: str
    recipientCount: int
    status: Literal["sent", "failed", "pending"]
    sentAt: str
    sentBy: str


class StatisticsResponse(BaseModel):
    total: int
    sent: int
    scheduled: int
    failed: int


class EstimatedRecipientsResponse(BaseModel):
    count: int


def _ensure_broadcast_events_table(db: Session) -> None:
    db.execute(
        text(
            """
            IF OBJECT_ID('dbo.broadcast_events', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.broadcast_events (
                    broadcast_id UNIQUEIDENTIFIER NOT NULL
                        CONSTRAINT PK_broadcast_events PRIMARY KEY
                        CONSTRAINT DF_broadcast_events_id DEFAULT NEWID(),
                    subject NVARCHAR(120) NOT NULL,
                    body NVARCHAR(MAX) NOT NULL,
                    channel NVARCHAR(20) NOT NULL,
                    audience_type NVARCHAR(20) NOT NULL,
                    audience_value NVARCHAR(100) NULL,
                    audience_label NVARCHAR(200) NOT NULL,
                    message_type NVARCHAR(30) NOT NULL,
                    recipient_count INT NOT NULL CONSTRAINT DF_broadcast_events_recipient_count DEFAULT 0,
                    status NVARCHAR(20) NOT NULL CONSTRAINT DF_broadcast_events_status DEFAULT 'sent',
                    schedule_type NVARCHAR(20) NOT NULL CONSTRAINT DF_broadcast_events_schedule_type DEFAULT 'now',
                    scheduled_at DATETIME2(7) NULL,
                    sent_at DATETIME2(7) NULL,
                    sent_by NVARCHAR(255) NULL,
                    created_at DATETIME2(7) NOT NULL
                        CONSTRAINT DF_broadcast_events_created_at DEFAULT SYSUTCDATETIME(),

                    CONSTRAINT CK_broadcast_events_channel_valid
                        CHECK (channel IN ('email', 'notification', 'both')),
                    CONSTRAINT CK_broadcast_events_audience_type_valid
                        CHECK (audience_type IN ('all', 'role', 'plan')),
                    CONSTRAINT CK_broadcast_events_message_type_valid
                        CHECK (message_type IN ('info', 'warning', 'maintenance', 'announcement')),
                    CONSTRAINT CK_broadcast_events_schedule_type_valid
                        CHECK (schedule_type IN ('now', 'scheduled')),
                    CONSTRAINT CK_broadcast_events_status_valid
                        CHECK (status IN ('sent', 'failed', 'pending'))
                );

                CREATE INDEX IX_broadcast_events_created_at
                    ON dbo.broadcast_events (created_at DESC);
            END;
            """
        )
    )
    db.commit()


def _parse_iso_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None

    candidate = value.strip()
    if not candidate:
        return None

    try:
        return datetime.fromisoformat(candidate.replace("Z", "+00:00"))
    except ValueError:
        return None


def _to_iso(value: Optional[datetime]) -> str:
    if not value:
        return ""
    return value.isoformat()


def _derive_plan_bucket(is_admin: bool, is_email_verified: bool, is_phone_verified: bool) -> str:
    if is_admin:
        return "enterprise"
    if is_email_verified and is_phone_verified:
        return "professional"
    if is_email_verified:
        return "starter"
    return "free"


def _get_admin_user_ids(db: Session) -> set[uuid.UUID]:
    rows = (
        db.query(UserRole.user_id)
        .join(Role, UserRole.role_id == Role.role_id)
        .filter(Role.role_name == SYSTEM_ADMIN)
        .all()
    )
    return {row[0] for row in rows}


def _get_recipient_ids(
    db: Session,
    audience_type: str,
    audience_value: Optional[str] = None,
) -> list[uuid.UUID]:
    active_user_ids = [
        row[0]
        for row in db.query(User.user_id)
        .filter(User.is_active.is_(True))
        .all()
    ]

    if audience_type == "all":
        return active_user_ids

    if audience_type == "role":
        admin_ids = _get_admin_user_ids(db)
        if audience_value == "admin":
            return [user_id for user_id in active_user_ids if user_id in admin_ids]
        if audience_value == "user":
            return [user_id for user_id in active_user_ids if user_id not in admin_ids]
        return []

    if audience_type == "plan":
        requested_plan = (audience_value or "").lower()
        if requested_plan not in {"free", "starter", "professional", "enterprise"}:
            return []

        admin_ids = _get_admin_user_ids(db)
        users = (
            db.query(User.user_id, User.is_email_verified, User.is_phone_verified)
            .filter(User.is_active.is_(True))
            .all()
        )

        matched: list[uuid.UUID] = []
        for user_id, is_email_verified, is_phone_verified in users:
            plan_bucket = _derive_plan_bucket(
                is_admin=user_id in admin_ids,
                is_email_verified=bool(is_email_verified),
                is_phone_verified=bool(is_phone_verified),
            )
            if plan_bucket == requested_plan:
                matched.append(user_id)

        return matched

    return []


def get_estimated_recipients(
    audience_type: str,
    audience_value: Optional[str] = None,
    db: Optional[Session] = None,
) -> int:
    if db is None:
        return 0
    return len(_get_recipient_ids(db, audience_type, audience_value))


def get_audience_label(audience_type: str, audience_value: Optional[str] = None) -> str:
    if audience_type == "all":
        return "All Users"
    if audience_type == "role":
        role_labels = {"admin": "Admins only", "user": "Users (non-admin)"}
        return f"Role: {role_labels.get(audience_value, 'Unknown')}"
    if audience_type == "plan":
        plan_labels = {
            "free": "Free plan",
            "starter": "Starter plan",
            "professional": "Professional plan",
            "enterprise": "Enterprise plan",
        }
        return f"Plan: {plan_labels.get(audience_value, 'Unknown')}"
    return "Unknown"


def _event_to_record(event: BroadcastEvent) -> dict:
    sent_at = event.sent_at or event.scheduled_at or event.created_at
    return {
        "id": str(event.broadcast_id),
        "subject": event.subject,
        "body": event.body,
        "channel": event.channel,
        "audienceType": event.audience_type,
        "audienceLabel": event.audience_label,
        "messageType": event.message_type,
        "recipientCount": int(event.recipient_count or 0),
        "status": event.status,
        "sentAt": _to_iso(sent_at),
        "sentBy": event.sent_by or "Admin User",
    }


def _create_notifications_for_recipients(
    db: Session,
    recipient_ids: list[uuid.UUID],
    subject: str,
    body: str,
    message_type: str,
    created_at: datetime,
) -> None:
    if not recipient_ids:
        return

    notification = Notification(
        title=subject,
        message=body,
        notification_type=message_type,
        created_at=created_at,
    )
    db.add(notification)
    db.flush()

    user_notifications = [
        UserNotification(
            notification_id=notification.notification_id,
            user_id=user_id,
            is_read=False,
            delivered_at=created_at,
        )
        for user_id in recipient_ids
    ]
    db.add_all(user_notifications)


async def send_broadcast(
    broadcast_data: BroadcastCreate,
    admin_user: str,
    db: Optional[Session] = None,
) -> dict:
    if db is None:
        return {
            "success": False,
            "message": "Database session unavailable",
        }

    try:
        _ensure_broadcast_events_table(db)

        recipient_ids = _get_recipient_ids(
            db,
            broadcast_data.audienceType,
            broadcast_data.audienceValue,
        )
        recipient_count = len(recipient_ids)
        audience_label = get_audience_label(
            broadcast_data.audienceType,
            broadcast_data.audienceValue,
        )

        now_utc = datetime.utcnow()
        scheduled_at = _parse_iso_datetime(broadcast_data.scheduledAt)
        status = "pending" if broadcast_data.scheduleType == "scheduled" else "sent"
        sent_at = scheduled_at if status == "pending" else now_utc

        event = BroadcastEvent(
            subject=broadcast_data.subject,
            body=broadcast_data.body,
            channel=broadcast_data.channel,
            audience_type=broadcast_data.audienceType,
            audience_value=broadcast_data.audienceValue,
            audience_label=audience_label,
            message_type=broadcast_data.messageType,
            recipient_count=recipient_count,
            status=status,
            schedule_type=broadcast_data.scheduleType,
            scheduled_at=scheduled_at,
            sent_at=sent_at,
            sent_by=admin_user,
        )
        db.add(event)

        if status == "sent" and broadcast_data.channel in {"notification", "both"}:
            _create_notifications_for_recipients(
                db,
                recipient_ids,
                broadcast_data.subject,
                broadcast_data.body,
                broadcast_data.messageType,
                now_utc,
            )

        if broadcast_data.channel in {"email", "both"}:
            logger.info(
                "Broadcast includes email delivery; email transport not yet integrated. "
                "broadcast_subject='%s', recipients=%s",
                broadcast_data.subject,
                recipient_count,
            )

        db.commit()
        db.refresh(event)

        return {
            "success": True,
            "broadcastId": str(event.broadcast_id),
            "message": f"Broadcast {status} for {recipient_count} recipients",
        }
    except Exception as exc:
        db.rollback()
        logger.error("Error sending broadcast: %s", exc)
        return {
            "success": False,
            "message": f"Error sending broadcast: {exc}",
        }


async def get_broadcast_history(db: Optional[Session] = None) -> list[dict]:
    if db is None:
        return []

    _ensure_broadcast_events_table(db)
    events = db.query(BroadcastEvent).order_by(BroadcastEvent.created_at.desc()).all()
    return [_event_to_record(event) for event in events]


async def get_broadcast_by_id(
    broadcast_id: str,
    db: Optional[Session] = None,
) -> Optional[dict]:
    if db is None:
        return None

    _ensure_broadcast_events_table(db)
    try:
        parsed_id = uuid.UUID(str(broadcast_id))
    except ValueError:
        return None

    event = (
        db.query(BroadcastEvent)
        .filter(BroadcastEvent.broadcast_id == parsed_id)
        .first()
    )
    if not event:
        return None

    return _event_to_record(event)


async def resend_broadcast(
    broadcast_id: str,
    db: Optional[Session] = None,
) -> dict:
    if db is None:
        return {
            "success": False,
            "message": "Database session unavailable",
        }

    _ensure_broadcast_events_table(db)
    try:
        parsed_id = uuid.UUID(str(broadcast_id))
    except ValueError:
        return {
            "success": False,
            "message": "Invalid broadcast id",
        }

    event = (
        db.query(BroadcastEvent)
        .filter(BroadcastEvent.broadcast_id == parsed_id)
        .first()
    )
    if not event:
        return {
            "success": False,
            "message": "Broadcast not found",
        }

    recipient_ids = _get_recipient_ids(db, event.audience_type, event.audience_value)
    now_utc = datetime.utcnow()

    if event.channel in {"notification", "both"}:
        _create_notifications_for_recipients(
            db,
            recipient_ids,
            event.subject,
            event.body,
            event.message_type,
            now_utc,
        )

    event.status = "sent"
    event.sent_at = now_utc
    event.recipient_count = len(recipient_ids)
    event.schedule_type = "now"

    db.commit()
    db.refresh(event)

    return {
        "success": True,
        "message": f"Broadcast resent to {len(recipient_ids)} recipients",
    }


async def cancel_broadcast(
    broadcast_id: str,
    db: Optional[Session] = None,
) -> dict:
    if db is None:
        return {
            "success": False,
            "message": "Database session unavailable",
        }

    _ensure_broadcast_events_table(db)
    try:
        parsed_id = uuid.UUID(str(broadcast_id))
    except ValueError:
        return {
            "success": False,
            "message": "Invalid broadcast id",
        }

    event = (
        db.query(BroadcastEvent)
        .filter(BroadcastEvent.broadcast_id == parsed_id)
        .first()
    )
    if not event:
        return {
            "success": False,
            "message": "Broadcast not found",
        }

    if event.status != "pending":
        return {
            "success": False,
            "message": "Only scheduled broadcasts can be cancelled",
        }

    event.status = "failed"
    db.commit()
    db.refresh(event)

    return {
        "success": True,
        "message": "Scheduled broadcast cancelled",
    }


async def get_broadcast_statistics(db: Optional[Session] = None) -> dict:
    if db is None:
        return {
            "total": 0,
            "sent": 0,
            "scheduled": 0,
            "failed": 0,
        }

    _ensure_broadcast_events_table(db)
    total = db.query(BroadcastEvent).count()
    sent = db.query(BroadcastEvent).filter(BroadcastEvent.status == "sent").count()
    scheduled = db.query(BroadcastEvent).filter(BroadcastEvent.status == "pending").count()
    failed = db.query(BroadcastEvent).filter(BroadcastEvent.status == "failed").count()

    return {
        "total": total,
        "sent": sent,
        "scheduled": scheduled,
        "failed": failed,
    }
