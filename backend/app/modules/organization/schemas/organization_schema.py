from pydantic import BaseModel
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