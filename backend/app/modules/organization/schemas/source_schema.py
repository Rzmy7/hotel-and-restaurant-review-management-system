from pydantic import BaseModel, Field, HttpUrl
from typing import Optional


class SetupSourcesQuery(BaseModel):
    organization_id: Optional[str] = None


class SourceConnectRequest(BaseModel):
    source_name: str = Field(..., min_length=1, max_length=100)
    organization_id: Optional[str] = None
    source_url: Optional[str] = None


class CustomSourceConnectRequest(BaseModel):
    source_url: HttpUrl
    organization_id: Optional[str] = None
    source_name: Optional[str] = Field(
        default="Custom Source", min_length=1, max_length=100
    )


class SourceDisconnectRequest(BaseModel):
    source_name: str = Field(..., min_length=1, max_length=100)
    organization_id: Optional[str] = None
    source_url: Optional[str] = None
