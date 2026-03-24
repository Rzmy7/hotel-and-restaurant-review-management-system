"""User-domain ORM models: User, Role, UserRole, Session, PasswordResetToken."""

import uuid
from sqlalchemy import (
    Column,
    String,
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

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    user_id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    full_name = Column(String(200), nullable=True)
    phone = Column(String(30), nullable=True)
    profile_image_url = Column(String(500), nullable=True)
    google_id = Column(String, nullable=True)

    is_active = Column(Boolean, nullable=False, default=True)
    is_email_verified = Column(Boolean, nullable=False, default=False)
    is_phone_verified = Column(Boolean, nullable=False, default=False)

    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
    )

    roles = relationship(
        "UserRole", back_populates="user", cascade="all, delete-orphan"
    )
    sessions = relationship(
        "Session", back_populates="user", cascade="all, delete-orphan"
    )
    password_reset_tokens = relationship(
        "PasswordResetToken",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    notifications = relationship(
        "UserNotification",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class Role(Base):
    __tablename__ = "roles"

    role_id = Column(Integer, primary_key=True, autoincrement=True)
    role_name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
    )

    users = relationship("UserRole", back_populates="role")


class UserRole(Base):
    __tablename__ = "user_roles"

    user_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        primary_key=True,
    )
    role_id = Column(
        Integer,
        ForeignKey("roles.role_id", ondelete="CASCADE"),
        primary_key=True,
    )
    assigned_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
    )

    user = relationship("User", back_populates="roles")
    role = relationship("Role", back_populates="users")


class Session(Base):
    __tablename__ = "sessions"

    session_id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
    )

    refresh_token_hash = Column(String(255), nullable=False)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)

    is_revoked = Column(Boolean, nullable=False, default=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
    )
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="sessions")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    token_id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    token_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
    )

    user = relationship("User", back_populates="password_reset_tokens")



class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        CheckConstraint(
            "notification_type IN ('info', 'success', 'warning', 'error', 'maintenance', 'announcement')",
            name="ck_notifications_type_valid",
        ),
    )

    notification_id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    title = Column(String(200), nullable=False)
    message = Column(String, nullable=False)
    notification_type = Column(String(30), nullable=False, default="info")
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
    __tablename__ = "user_notifications"

    notification_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("notifications.notification_id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("users.user_id", ondelete="CASCADE"),
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
    __tablename__ = "broadcast_events"
    __table_args__ = (
        CheckConstraint(
            "channel IN ('email', 'notification', 'both')",
            name="ck_broadcast_events_channel_valid",
        ),
        CheckConstraint(
            "audience_type IN ('all', 'role', 'plan')",
            name="ck_broadcast_events_audience_type_valid",
        ),
        CheckConstraint(
            "message_type IN ('info', 'warning', 'maintenance', 'announcement')",
            name="ck_broadcast_events_message_type_valid",
        ),
        CheckConstraint(
            "schedule_type IN ('now', 'scheduled')",
            name="ck_broadcast_events_schedule_type_valid",
        ),
        CheckConstraint(
            "status IN ('sent', 'failed', 'pending')",
            name="ck_broadcast_events_status_valid",
        ),
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
