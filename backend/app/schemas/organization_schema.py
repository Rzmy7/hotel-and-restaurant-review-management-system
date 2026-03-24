from pydantic import BaseModel
from typing import Optional

class OrganizationCreate(BaseModel):
    organization_name: str
    organization_type: str  # hotel / restaurant / other