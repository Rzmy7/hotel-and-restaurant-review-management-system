import enum
from typing import List, Optional
from pydantic import BaseModel, HttpUrl
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

class PlatformStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"

class FetchingFrequency(str, enum.Enum):
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"

# --- Platform Schemas ---
class PlatformRead(BaseModel):
    platform_id: int
    platform_name: str
    base_url: Optional[str]
    fetching_type: SourceType
    platform_status: PlatformStatus
    success_rate: float
    created_at: datetime

    class Config:
        from_attributes = True

# --- Source Schemas ---
class SourceCreate(BaseModel):
    tenant_id: uuid.UUID
    organization_id: uuid.UUID
    platform_id: int
    source_url: str
    source_status: SourceStatus = SourceStatus.ACTIVE
    fetching_frequency: FetchingFrequency = FetchingFrequency.DAILY

class SourceUpdate(BaseModel):
    source_url: Optional[str] = None
    source_status: Optional[SourceStatus] = None
    fetching_frequency: Optional[FetchingFrequency] = None

class SourceRead(BaseModel):
    source_id: uuid.UUID
    tenant_id: uuid.UUID
    organization_id: uuid.UUID
    platform_id: int
    platform_name: str
    source_url: str
    source_status: SourceStatus
    fetching_frequency: FetchingFrequency
    last_synced_at: Optional[datetime]
    next_synced_at: Optional[datetime]
    success_rate: float
    created_at: datetime

    class Config:
        from_attributes = True

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

    class Config:
        from_attributes = True

class SyncLogBulk(BaseModel):
    logs: List[SyncLogRead]
    total: int


