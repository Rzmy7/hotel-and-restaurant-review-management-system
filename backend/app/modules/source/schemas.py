import enum
from typing import List, Optional
from pydantic import BaseModel, HttpUrl, field_validator
from datetime import datetime
import uuid


class SourceType(str, enum.Enum):
    API = "API"
    SCRAPING = "SCRAPING"
    BOTH = "BOTH"


class SourceStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    ERROR = "error"
    QUEUED = "queued"
    RUNNING = "running"
    VERIFY_DUPLICATION = "verify duplication"


class PlatformStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


# --- Sync Frequency Schemas ---
class SyncFrequencyRead(BaseModel):
    frq_id: int
    name: str
    info: Optional[str] = None
    description: Optional[str] = None

    class Config:
        from_attributes = True


# --- Platform Schemas ---
class PlatformRead(BaseModel):
    platform_id: int
    platform_name: str
    base_url: Optional[str]
    fetching_type: SourceType
    platform_status: PlatformStatus
    num_of_syncs: int
    success_sync_count: int
    success_rate: float
    created_at: datetime

    class Config:
        from_attributes = True

    @field_validator("platform_status", mode="before")
    @classmethod
    def lowercase_status(cls, v):
        if isinstance(v, str):
            return v.lower()
        return v


# --- Source Schemas ---
class SourceCreate(BaseModel):
    organization_id: uuid.UUID
    platform_id: int
    source_url: str
    source_status: SourceStatus = SourceStatus.ACTIVE
    fetching_frequency: int = 1


class SourceUpdate(BaseModel):
    source_url: Optional[str] = None
    source_status: Optional[SourceStatus] = None
    fetching_frequency: Optional[int] = None


class SourceRead(BaseModel):
    source_id: uuid.UUID
    organization_id: uuid.UUID
    platform_id: int
    platform_name: str
    platform_status: PlatformStatus
    source_url: str
    source_status: SourceStatus
    fetching_frequency: int
    last_synced_at: Optional[datetime]
    next_synced_at: Optional[datetime]
    num_of_syncs: int
    success_sync_count: int
    platform_num_of_syncs: int
    platform_success_sync_count: int
    success_rate: float
    last_error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

    @field_validator("source_status", mode="before")
    @classmethod
    def lowercase_status(cls, v):
        if isinstance(v, str):
            return v.lower()
        return v


# --- Stats and Bulk Responses ---
class SourceStats(BaseModel):
    total_sources: int
    active_sources: int
    paused_sources: int
    sync_error_count: int


class OrganizationSourceDetails(BaseModel):
    organization_id: uuid.UUID
    organization_name: str
    sources: List[SourceRead]
    stats: SourceStats


class OrganizationRead(BaseModel):
    organization_id: uuid.UUID
    organization_name: str
    tenant_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True


# --- Sync Log Schemas ---
class SyncLogRead(BaseModel):
    id: uuid.UUID
    sourceId: uuid.UUID
    platform: str
    status: str
    timestamp: datetime
    durationMs: int
    reviewsFetched: int
    errorMessage: Optional[str] = None
    activityType: Optional[str] = None
    isImportant: bool = False
    activityDetails: Optional[str] = None

    class Config:
        from_attributes = True


class SyncLogBulk(BaseModel):
    logs: List[SyncLogRead]
    total: int


class SyncStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    VERIFY_DUPLICATION = "VERIFY_DUPLICATION"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class SyncStatusRequest(BaseModel):
    status: SyncStatus
    new_review_count: int = 0
    error_message: Optional[str] = None
