from pydantic import BaseModel
from typing import Optional, List


class SourceCreateNested(BaseModel):
    source_url: str
    platform_id: int
    fetching_frequency: int = 2


class OrganizationCreate(BaseModel):
    organization_name: str
    organization_type_id: int = 1
    location_url: str
    sources: Optional[List[SourceCreateNested]] = None


class OrganizationTypeRead(BaseModel):
    type_code: int
    type_name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class OrganizationUpdate(BaseModel):
    organization_name: Optional[str] = None
    organization_type_id: Optional[int] = None
    website_url: Optional[str] = None
    primary_email: Optional[str] = None
    phone_number: Optional[str] = None
    logo_url: Optional[str] = None
    location_url: Optional[str] = None

class LogoUploadResponse(BaseModel):
    message: str
    logo_url: str
