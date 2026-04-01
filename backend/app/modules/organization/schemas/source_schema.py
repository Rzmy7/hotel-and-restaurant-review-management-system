from pydantic import BaseModel, Field, HttpUrl
from typing import Optional
import enum


class SetupSourcesQuery(BaseModel):
    organization_id: Optional[str] = None


class SetupFetchingFrequency(str, enum.Enum):
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"


class SourceConnectRequest(BaseModel):
    source_name: str = Field(..., min_length=1, max_length=100)
    organization_id: Optional[str] = None
    source_url: Optional[str] = None
    fetching_frequency: SetupFetchingFrequency = SetupFetchingFrequency.DAILY


class CustomSourceConnectRequest(BaseModel):
    source_url: HttpUrl
    organization_id: Optional[str] = None
    source_name: Optional[str] = Field(default="Custom Source", min_length=1, max_length=100)
    fetching_frequency: SetupFetchingFrequency = SetupFetchingFrequency.DAILY


class SourceDisconnectRequest(BaseModel):
    source_name: str = Field(..., min_length=1, max_length=100)
    organization_id: Optional[str] = None
    source_url: Optional[str] = None


class FinalizeSetupScheduleRequest(BaseModel):
    selected_schedule: SetupFetchingFrequency
    organization_id: Optional[str] = None


class FinalizeSetupScheduleResponse(BaseModel):
    message: str
    organization_id: str
    selected_schedule: SetupFetchingFrequency
    updated_count: int
