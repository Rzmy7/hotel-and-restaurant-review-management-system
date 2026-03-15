"""Pydantic schemas for review endpoints."""

import datetime
from typing import List, Optional
from pydantic import BaseModel, AnyHttpUrl, Field


class PhotoModel(BaseModel):
    src: str
    alt: str = ""


class ReviewModel(BaseModel):
    id: str
    platformReviewId: Optional[str] = None
    rating: int
    userName: str
    reviewerName: Optional[str] = None
    reviewText: Optional[str] = Field(..., validation_alias="text")
    summary: Optional[str] = None
    sentiment: str
    language: Optional[str] = "English"

    categories: List[str] = []
    keyPhrases: List[str] = []
    photos: List[PhotoModel] = []

    source: str
    date: Optional[datetime.date] = None

    status: str
    replyStatus: Optional[str] = "Pending"
    hasReply: Optional[str] = "No"


class BookingScrapeRequest(BaseModel):
    url: AnyHttpUrl
    headless: bool = True
