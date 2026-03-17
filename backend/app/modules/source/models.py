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

from app.core.database import Base


class TenantSource(Base):
    __tablename__ = "tenants_source"

    tenant_id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    tenant_name = Column(String(255), nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
    )

    organizations = relationship(
        "OrganizationSource", back_populates="tenant", cascade="all, delete-orphan"
    )
    sources = relationship(
        "SourceSource", back_populates="tenant", cascade="all, delete-orphan"
    )


class OrganizationSource(Base):
    __tablename__ = "organizations_source"

    organization_id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("tenants_source.tenant_id", ondelete="CASCADE"),
        nullable=False,
    )
    organization_name = Column(String(255), nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
    )

    tenant = relationship("TenantSource", back_populates="organizations")
    sources = relationship(
        "SourceSource", back_populates="organization", cascade="all, delete-orphan"
    )


class PlatformSource(Base):
    __tablename__ = "platforms_source"
    __table_args__ = (
        CheckConstraint(
            "fetching_type IN ('API', 'SCRAPING', 'BOTH')",
            name="ck_platforms_source_fetching_type",
        ),
        CheckConstraint(
            "platform_status IN ('active', 'inactive')",
            name="ck_platforms_source_platform_status",
        ),
        CheckConstraint(
            "success_rate >= 0 AND success_rate <= 1",
            name="ck_platforms_source_success_rate",
        )
    )

    platform_id = Column(Integer, primary_key=True, autoincrement=True)
    platform_name = Column(String(100), unique=True, nullable=False)
    base_url = Column(String(500), nullable=True)
    fetching_type = Column(String(20), nullable=False)
    platform_status = Column(String(20), nullable=False, default="active")
    success_rate = Column(Float, nullable=False, default=0.0)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
    )

    sources = relationship("SourceSource", back_populates="platform")


class SourceSource(Base):
    __tablename__ = "sources_source"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id", "organization_id", "platform_id",
            name="uq_sources_source_tenant_org_platform"
        ),
        CheckConstraint(
            "source_status IN ('active', 'paused', 'error')",
            name="ck_sources_source_source_status",
        ),
        CheckConstraint(
            "fetching_frequency IN ('hourly', 'daily', 'weekly')",
            name="ck_sources_source_fetching_frequency",
        ),
        CheckConstraint(
            "success_rate >= 0 AND success_rate <= 1",
            name="ck_sources_source_success_rate",
        )
    )

    source_id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("tenants_source.tenant_id", ondelete="NO ACTION"),
        nullable=False,
    )
    organization_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("organizations_source.organization_id", ondelete="CASCADE"),
        nullable=False,
    )
    platform_id = Column(
        Integer,
        ForeignKey("platforms_source.platform_id", ondelete="CASCADE"),
        nullable=False,
    )
    source_url = Column(String(1000), nullable=False)
    source_status = Column(String(20), nullable=False, default="active")
    fetching_frequency = Column(String(20), nullable=False, default="daily")
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    next_synced_at = Column(DateTime(timezone=True), nullable=True)
    success_rate = Column(Float, nullable=False, default=0.0)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
    )

    tenant = relationship("TenantSource", back_populates="sources")
    organization = relationship("OrganizationSource", back_populates="sources")
    platform = relationship("PlatformSource", back_populates="sources")
