from pydantic import BaseModel, Field
from typing import Optional


class SetupSubscriptionFinalizeRequest(BaseModel):
    organization_id: str
    plan_id: Optional[str] = None


class SetupSubscriptionFinalizeResponse(BaseModel):
    message: str
    user_id: str
    organization_id: str
    plan_id: str
    plan_name: str
    defaulted_to_free: bool

class OrganizationCreate(BaseModel):
    organization_name: str
    organization_type: str  # hotel / restaurant / other


class OrganizationGeneralSettingsResponse(BaseModel):
    propertyName: str
    timeZone: str
    themePreference: str


class OrganizationGeneralSettingsPayload(BaseModel):
    propertyName: str = Field(..., min_length=1, max_length=255)
    timeZone: str = Field(..., min_length=1, max_length=100)
    themePreference: Optional[str] = Field(default=None, max_length=16)