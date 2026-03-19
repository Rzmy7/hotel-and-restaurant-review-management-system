"""Group-domain ORM models: Group, GroupMember, GroupHotel."""

import uuid
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    DateTime,
    ForeignKey,
    CheckConstraint,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from sqlalchemy.sql import func

from app.core.database import Base
from app.constants.roles import GROUP_MANAGER, GROUP_MEMBER


class Group(Base):
    __tablename__ = "groups"

    group_id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    group_name = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
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

    creator = relationship("app.modules.auth.models.User", backref="created_groups")
    members = relationship(
        "GroupMember", back_populates="group", cascade="all, delete-orphan"
    )
    hotels = relationship(
        "GroupHotel", back_populates="group", cascade="all, delete-orphan"
    )


class GroupMember(Base):
    __tablename__ = "group_members"
    __table_args__ = (
        CheckConstraint(
            "group_role IN ('GROUP_MANAGER', 'GROUP_MEMBER')",
            name="ck_group_role",
        ),
    )

    group_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("groups.group_id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )
    user_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )
    group_role = Column(String(20), nullable=False, default=GROUP_MEMBER)
    joined_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
    )

    group = relationship("Group", back_populates="members")
    user = relationship("app.modules.auth.models.User", backref="group_memberships")



class GroupHotel(Base):
    __tablename__ = "group_hotels"

    hotel_id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    group_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("groups.group_id", ondelete="CASCADE"),
        nullable=False,
    )
    hotel_name = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    avg_rating = Column(Float, nullable=True, default=0)
    review_count = Column(Integer, nullable=True, default=0)
    status = Column(String(50), nullable=False, default="pending")
    added_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
    )

    group = relationship("Group", back_populates="hotels")
