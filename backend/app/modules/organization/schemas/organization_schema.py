from pydantic import BaseModel
from typing import Optional, List

class SourceCreateNested(BaseModel):
    source_url: str
    platform_id: int
    fetching_frequency: int = 1

class OrganizationCreate(BaseModel):
    organization_name: str
    organization_type_id: int = 1
    sources: Optional[List[SourceCreateNested]] = None

class OrganizationUpdate(BaseModel):
    organization_name: Optional[str] = None
    organization_type_id: Optional[int] = None