"""Group-domain ORM models: Group, GroupMember, GroupInvite."""

import uuid
from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    CheckConstraint,
    Boolean,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from sqlalchemy.sql import func

from app.database.session import Base
from app.modules.auth.constants.roles import GROUP_OWNER, GROUP_MEMBER


class Group(Base):
    __tablename__ = "group"
    __table_args__ = {"extend_existing": True}

    group_id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    group_name = Column(String(255), nullable=False)
    description = Column(String(1000), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    is_private = Column(Boolean, default=True, nullable=False, server_default="1")
    # JSON string: {"can_members_invite": bool, "show_members_to_members": bool, "show_analytics_to_members": bool}
    settings = Column(Text, nullable=True)
    invite_link_token = Column(String(64), nullable=True)
    invite_link_expires_at = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("user.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
    )

    creator = relationship("User", backref="created_groups", foreign_keys=[created_by])
    members = relationship(
        "GroupMember", back_populates="group", cascade="all, delete-orphan"
    )
    invites = relationship(
        "GroupInvite", back_populates="group", cascade="all, delete-orphan"
    )


class GroupMember(Base):
    __tablename__ = "group_member"
    __table_args__ = (
        CheckConstraint(
            "role IN ('GROUP_OWNER', 'GROUP_MEMBER')",
            name="ck_group_member_role_valid",
        ),
        {"extend_existing": True},
    )

    group_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("group.group_id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )
    user_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("user.user_id"),
        primary_key=True,
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


class GroupInvite(Base):
    __tablename__ = "group_invite"
    __table_args__ = (
        CheckConstraint(
            "invite_type IN ('user', 'link')",
            name="ck_group_invite_type_valid",
        ),
        CheckConstraint(
            "status IN ('pending', 'accepted', 'rejected', 'expired', 'cancelled')",
            name="ck_group_invite_status_valid",
        ),
        {"extend_existing": True},
    )

    invite_id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    group_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("group.group_id", ondelete="CASCADE"),
        nullable=False,
    )
    invited_by = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("user.user_id"),
        nullable=False,
    )
    invited_user_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("user.user_id"),
        nullable=True,
    )
    invite_type = Column(String(20), nullable=False, default="user")
    status = Column(String(20), nullable=False, default="pending")
    message = Column(String(500), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
    )

    group = relationship("Group", back_populates="invites")
    inviter = relationship("User", foreign_keys=[invited_by])
    invited_user = relationship("User", foreign_keys=[invited_user_id])
