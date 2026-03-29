"""Group-domain ORM models: Group, GroupMember."""

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

from app.core.database import Base
from app.modules.auth.constants.roles import GROUP_MANAGER, GROUP_MEMBER


class Group(Base):
    __tablename__ = "groups"
    __table_args__ = {'extend_existing': True}

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
        {'extend_existing': True}
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
