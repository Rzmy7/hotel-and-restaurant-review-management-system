import uuid
from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    Integer,
    Float,
    CheckConstraint,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from sqlalchemy.sql import func

from app.database.session import Base


class Tenant(Base):
    __tablename__ = "tenant"

    tenant_id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    tenant_name = Column(String(255), nullable=False)
    tenant_owner_id = Column(UNIQUEIDENTIFIER, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
    )

    organizations = relationship(
        "Organization", back_populates="tenant", cascade="all, delete-orphan"
    )


class Organization(Base):
    __tablename__ = "organization"

    organization_id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("tenant.tenant_id", ondelete="CASCADE"),
        nullable=False,
    )
    organization_name = Column(String(255), nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
    )

    tenant = relationship("Tenant", back_populates="organizations")
    sources = relationship(
        "Source", back_populates="organization", cascade="all, delete-orphan"
    )


class Platform(Base):
    __tablename__ = "platform"
    __table_args__ = (
        CheckConstraint(
            "fetching_type IN ('API', 'SCRAPING', 'BOTH')",
            name="ck_platform_fetching_type",
        ),
        CheckConstraint(
            "platform_status IN ('active', 'inactive')",
            name="ck_platform_platform_status",
        )
    )

    platform_id = Column(Integer, primary_key=True, autoincrement=True)
    platform_name = Column(String(100), unique=True, nullable=False)
    base_url = Column(String(500), nullable=True)
    fetching_type = Column(String(20), nullable=False)
    platform_status = Column(String(20), nullable=False, default="active")
    num_of_syncs = Column(Integer, nullable=False, default=0)
    success_sync_count = Column(Integer, nullable=False, default=0)
    success_rate = Column(Float, nullable=False, default=0.0)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        onupdate=func.sysutcdatetime(),
        nullable=True,
    )

    sources = relationship("Source", back_populates="platform")


class Source(Base):
    __tablename__ = "source"
    __table_args__ = (
        UniqueConstraint(
            "organization_id", "platform_id",
            name="uq_source_org_platform"
        ),
        CheckConstraint(
            "source_status IN ('active', 'paused', 'error', 'queued', 'running')",
            name="ck_source_source_status",
        ),
        CheckConstraint(
            "fetching_frequency IN ('hourly', 'daily', 'weekly')",
            name="ck_source_fetching_frequency",
        )
    )

    source_id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)

    organization_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("organization.organization_id", ondelete="CASCADE"),
        nullable=False,
    )
    platform_id = Column(
        Integer,
        ForeignKey("platform.platform_id", ondelete="CASCADE"),
        nullable=False,
    )
    source_url = Column(String(1000), nullable=False)
    source_status = Column(String(20), nullable=False, default="active")
    fetching_frequency = Column(String(20), nullable=False, default="daily")
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    next_synced_at = Column(DateTime(timezone=True), nullable=True)
    num_of_syncs = Column(Integer, nullable=False, default=0)
    success_sync_count = Column(Integer, nullable=False, default=0)
    success_rate = Column(Float, nullable=False, default=0.0)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
    )


    organization = relationship("Organization", back_populates="sources")
    platform = relationship("Platform", back_populates="sources")
    sync_logs = relationship(
        "SyncLog", back_populates="source", cascade="all, delete-orphan"
    )


class SyncLog(Base):
    __tablename__ = "sync_log"
    __table_args__ = (
        CheckConstraint(
            "status IN ('Success', 'Failed', 'In Progress')",
            name="ck_sync_log_status",
        ),
    )

    log_id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    source_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("source.source_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status = Column(String(20), nullable=False)
    timestamp = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
        index=True,
    )
    duration_ms = Column(Integer, nullable=False, default=0)
    reviews_fetched = Column(Integer, nullable=False, default=0)
    error_message = Column(String(1000), nullable=True)

    source = relationship("Source", back_populates="sync_logs")
