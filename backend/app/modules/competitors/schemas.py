"""Pydantic schemas for competitor endpoints."""

from pydantic import BaseModel


class AddCompetitorRequest(BaseModel):
    """
    New competitor registration.
    The system will look up the source_url to find an existing organization.
    If not found, it auto-creates an ownerless organization and triggers scraping.
    """
    name: str
    source_url: str           # e.g. Booking.com hotel page URL
    platform_id: int = 2     # Default: 2 = Booking.com
    organization_type_id: int = 1  # Default: 1 = Hotel/Resort


class TrackCompetitorRequest(BaseModel):
    competitorId: str


class ScrapeCompetitorRequest(BaseModel):
    headless: bool = True
