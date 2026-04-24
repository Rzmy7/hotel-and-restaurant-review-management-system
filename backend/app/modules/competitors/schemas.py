"""Pydantic schemas for competitor endpoints."""

from typing import List

from pydantic import BaseModel


class CompetitorSourceInput(BaseModel):
    platform_id: int
    source_url: str


class AddCompetitorRequest(BaseModel):
    """
    Register a competitor as an ownerless organization.
    If any provided source_url already exists in dbo.source, reuse that org
    (and add any additional URLs for platforms the existing org doesn't have yet).
    Otherwise create a new tenant_id=NULL organization with location + type + sources,
    and let the normal scheduler pipeline scrape / process / embed them.
    """
    name: str
    organization_type_id: int = 1
    city: str
    country: str
    sources: List[CompetitorSourceInput]


class TrackCompetitorRequest(BaseModel):
    competitorId: str


class AddFromOrganizationRequest(BaseModel):
    organization_id: str


class ScrapeCompetitorRequest(BaseModel):
    headless: bool = True


class EditCompetitorRequest(BaseModel):
    name: str
    city: str
    country: str
