# app/models.py
import uuid
from sqlalchemy import (
    Column,
    String,
    DateTime,
    Boolean,
    Integer,
    ForeignKey,
    CheckConstraint,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from sqlalchemy.sql import func
from app.db import Base


class User(Base):
    __tablename__ = "users"

    user_id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    full_name = Column(String(200), nullable=True)
    phone = Column(String(30), nullable=True)
    profile_image_url = Column(String(500), nullable=True)

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
    role = relationship("Role")


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


# ---------------------------------------------------------------
# FIX 1: Group role constants MUST be defined BEFORE GroupMember
# so default=GROUP_MEMBER doesn't raise NameError at import time
# ---------------------------------------------------------------
GROUP_MANAGER = "GROUP_MANAGER"
GROUP_MEMBER = "GROUP_MEMBER"
VALID_GROUP_ROLES = {GROUP_MANAGER, GROUP_MEMBER}


class Group(Base):
    __tablename__ = "groups"

    group_id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    group_name = Column(String(255), nullable=False)
    created_by = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
    )

    creator = relationship("User", backref="created_groups")
    members = relationship(
        "GroupMember", back_populates="group", cascade="all, delete-orphan"
    )


class GroupMember(Base):
    __tablename__ = "group_members"
    __table_args__ = (
        UniqueConstraint(
            "group_id", "user_id", name="uq_group_members_group_user"
        ),
        CheckConstraint(
            "role IN ('GROUP_MANAGER', 'GROUP_MEMBER')",
            name="ck_group_members_role_valid",
        ),
    )

    membership_id = Column(
        UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4
    )
    group_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("groups.group_id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    role = Column(String(30), nullable=False, default=GROUP_MEMBER)
    joined_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
    )

    group = relationship("Group", back_populates="members")
    user = relationship("User", backref="group_memberships")
