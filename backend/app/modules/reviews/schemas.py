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


class ReplyGenerationRequest(BaseModel):
    reviewId: str | int
    tone: Optional[str] = "standard"
    length: Optional[str] = "standard"
    reviewText: str = Field(..., min_length=1)
    userName: str = Field(default="Guest")
    sentiment: Optional[str] = "Neutral"
    source: Optional[str] = None
    language: Optional[str] = None
    hotelId: Optional[int] = 1


class ReplyGenerationResponse(BaseModel):
    reply: str
    provider: str
    similarReviewsUsed: int
    rulesUsed: int
    providerError: Optional[str] = None
