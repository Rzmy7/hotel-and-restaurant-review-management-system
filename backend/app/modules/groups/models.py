"""Group-domain ORM models: Group, GroupMember, GroupMemberRole."""

import uuid
from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    CheckConstraint,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from sqlalchemy.sql import func

from app.database.session import Base
from app.modules.auth.constants.roles import GROUP_MANAGER, GROUP_MEMBER


class GroupMemberRole(Base):
    __tablename__ = "group_member_role"
    __table_args__ = {'extend_existing': True}

    role_id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    role_name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)
    skills = Column(String, nullable=True)  # JSON stored as NVARCHAR(MAX)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
    )

    members = relationship("GroupMember", back_populates="member_role")


class Group(Base):
    __tablename__ = "group"
    __table_args__ = {'extend_existing': True}

    group_id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    group_name = Column(String(255), nullable=False)
    organization_id = Column(UNIQUEIDENTIFIER, nullable=True)
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

    creator = relationship("User", backref="created_groups")
    members = relationship(
        "GroupMember", back_populates="group", cascade="all, delete-orphan"
    )


class GroupMember(Base):
    __tablename__ = "group_member"
    __table_args__ = (
        CheckConstraint(
            "role IN ('GROUP_MANAGER', 'GROUP_MEMBER')",
            name="ck_group_member_role_valid",
        ),
        {'extend_existing': True}
    )

    # Composite primary key (group_id, user_id)
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
    role_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("group_member_role.role_id"),
        nullable=True,
    )
    joined_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
    )

    group = relationship("Group", back_populates="members")
    user = relationship("User", backref="group_memberships")
    member_role = relationship("GroupMemberRole", back_populates="members")
