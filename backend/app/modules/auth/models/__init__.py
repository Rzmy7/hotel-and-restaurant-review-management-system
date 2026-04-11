"""User-domain ORM models: User, Role, UserRole, Session, PasswordResetToken, Notification etc."""

import uuid
from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    Boolean,
    Integer,
    ForeignKey,
    UniqueConstraint,
    CheckConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from sqlalchemy.sql import func

from app.database.session import Base

# Import hansi modularized models to re-export them for temp branch compatibility
try:
    from app.modules.user.models.user_models import User
except ImportError:
    pass

try:
    from app.modules.auth.models.auth_models import Role, Session, PasswordResetToken
except ImportError:
    pass

try:
    from app.modules.organization.models.org_models import Group, GroupMember
except ImportError:
    pass

class Notification(Base):
    __tablename__ = "notification"
    __table_args__ = (
        CheckConstraint(
            "notification_type IN ('info', 'success', 'warning', 'error', 'maintenance', 'announcement', 'group_invite')",
            name="ck_notification_type_valid",
        ),
        {'extend_existing': True}
    )

    notification_id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    title = Column(String(200), nullable=False)
    message = Column(String, nullable=False)
    notification_type = Column(String(30), nullable=False, default="info")
    extra_data = Column(Text, nullable=True)  # JSON string for group_invite payload
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
    )

    recipients = relationship(
        "UserNotification",
        back_populates="notification",
        cascade="all, delete-orphan",
    )


class UserNotification(Base):
    __tablename__ = "user_notification"
    __table_args__ = {'extend_existing': True}

    notification_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("notification.notification_id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("user.user_id", ondelete="CASCADE"),
        primary_key=True,
    )
    is_read = Column(Boolean, nullable=False, default=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
    )

    user = relationship("User", back_populates="notifications")
    notification = relationship("Notification", back_populates="recipients")


class BroadcastEvent(Base):
    __tablename__ = "broadcast_event"
    __table_args__ = (
        CheckConstraint(
            "channel IN ('email', 'notification', 'both')",
            name="ck_broadcast_event_channel_valid",
        ),
        CheckConstraint(
            "audience_type IN ('all', 'role', 'plan')",
            name="ck_broadcast_event_audience_type_valid",
        ),
        CheckConstraint(
            "message_type IN ('info', 'warning', 'maintenance', 'announcement')",
            name="ck_broadcast_event_message_type_valid",
        ),
        CheckConstraint(
            "schedule_type IN ('now', 'scheduled')",
            name="ck_broadcast_event_schedule_type_valid",
        ),
        CheckConstraint(
            "status IN ('sent', 'failed', 'pending')",
            name="ck_broadcast_event_status_valid",
        ),
        {'extend_existing': True}
    )

    broadcast_id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    subject = Column(String(120), nullable=False)
    body = Column(String, nullable=False)
    channel = Column(String(20), nullable=False)
    audience_type = Column(String(20), nullable=False)
    audience_value = Column(String(100), nullable=True)
    audience_label = Column(String(200), nullable=False)
    message_type = Column(String(30), nullable=False)
    recipient_count = Column(Integer, nullable=False, default=0)
    status = Column(String(20), nullable=False, default="sent")
    schedule_type = Column(String(20), nullable=False, default="now")
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    sent_by = Column(String(255), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
    )
