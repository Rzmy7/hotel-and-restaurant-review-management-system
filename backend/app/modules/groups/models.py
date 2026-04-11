"""Group-domain ORM models: Group, GroupMember, GroupMemberRole, GroupInvitation."""

import uuid
from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    CheckConstraint,
    Text,
)
from sqlalchemy.orm import relationship, backref
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from sqlalchemy.sql import func

from app.database.session import Base
from app.modules.auth.constants.roles import GROUP_MANAGER, GROUP_MEMBER


GROUP_OWNER = "GROUP_OWNER"


class GroupMemberRole(Base):
    __tablename__ = "group_member_role"
    __table_args__ = {'extend_existing': True}

    role_id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    role_name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)
    skills = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.sysutcdatetime(), nullable=False)

    members = relationship("GroupMember", back_populates="member_role")


class Group(Base):
    __tablename__ = "group"
    __table_args__ = {'extend_existing': True}

    group_id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    group_name = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
    organization_id = Column(UNIQUEIDENTIFIER, nullable=True)
    parent_group_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("group.group_id"),
        nullable=True,
    )
    created_by = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("user.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.sysutcdatetime(), nullable=False)

    creator = relationship("User", backref="created_groups", foreign_keys=[created_by])
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")
    invitations = relationship("GroupInvitation", back_populates="group", cascade="all, delete-orphan")
    subgroups = relationship("Group", backref=backref("parent_group", remote_side="Group.group_id"))


class GroupMember(Base):
    __tablename__ = "group_member"
    __table_args__ = (
        CheckConstraint(
            "role IN ('GROUP_OWNER', 'GROUP_MANAGER', 'GROUP_MEMBER')",
            name="ck_group_member_role_valid",
        ),
        {'extend_existing': True}
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
    role_id = Column(UNIQUEIDENTIFIER, ForeignKey("group_member_role.role_id"), nullable=True)
    joined_at = Column(DateTime(timezone=True), server_default=func.sysutcdatetime(), nullable=False)

    group = relationship("Group", back_populates="members")
    user = relationship("User", backref="group_memberships")
    member_role = relationship("GroupMemberRole", back_populates="members")


class GroupInvitation(Base):
    __tablename__ = "group_invitation"
    __table_args__ = {'extend_existing': True}

    invitation_id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    group_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("group.group_id", ondelete="CASCADE"),
        nullable=False,
    )
    invited_email = Column(String(255), nullable=False)
    invited_user_id = Column(UNIQUEIDENTIFIER, ForeignKey("user.user_id"), nullable=True)
    invited_by = Column(UNIQUEIDENTIFIER, ForeignKey("user.user_id"), nullable=False)
    status = Column(String(20), nullable=False, default="pending")  # pending/accepted/rejected
    role = Column(String(30), nullable=False, default=GROUP_MEMBER)
    created_at = Column(DateTime(timezone=True), server_default=func.sysutcdatetime(), nullable=False)
    responded_at = Column(DateTime(timezone=True), nullable=True)
    notification_id = Column(UNIQUEIDENTIFIER, nullable=True)

    group = relationship("Group", back_populates="invitations")
    invited_user = relationship("User", foreign_keys=[invited_user_id], backref="received_invitations")
    inviter = relationship("User", foreign_keys=[invited_by], backref="sent_invitations")
