"""Pydantic schemas for competitor endpoints."""

from pydantic import BaseModel


class AddCompetitorRequest(BaseModel):
    name: str
    location: str = ""
    bookingUrl: str = ""


class TrackCompetitorRequest(BaseModel):
    competitorId: int


class ScrapeCompetitorRequest(BaseModel):
    headless: bool = True
