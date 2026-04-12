"""Pydantic schemas for review endpoints."""

import datetime
import uuid
from typing import List, Optional
from pydantic import BaseModel, AnyHttpUrl, Field, AliasChoices


class PhotoModel(BaseModel):
    src: str
    alt: str = ""


class ReviewModel(BaseModel):
    id: str
    scraper_review_id: Optional[str] = None
    rating: float
    reviewerName: str = Field(..., validation_alias=AliasChoices("reviewerName", "userName"))
    userName: str = Field(..., validation_alias=AliasChoices("userName", "reviewerName"))
    text: Optional[str] = Field(..., validation_alias=AliasChoices("text", "reviewText"))
    reviewText: Optional[str] = Field(..., validation_alias=AliasChoices("reviewText", "text"))
    heading: Optional[str] = None
    summary: Optional[str] = None
    sentiment: Optional[str] = "Neutral"
    language: Optional[str] = "English"

    categories: List[str] = []
    keyPhrases: List[str] = []
    photos: List[PhotoModel] = []

    source_id: Optional[uuid.UUID] = None
    date: Optional[datetime.date] = None

    status: str = "pending"
    
    # AI Processing Metadata
    positive_text: Optional[str] = None
    negative_text: Optional[str] = None
    error_message: Optional[str] = None
    retry_count: int = 0
    last_attempt: Optional[datetime.datetime] = None


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
