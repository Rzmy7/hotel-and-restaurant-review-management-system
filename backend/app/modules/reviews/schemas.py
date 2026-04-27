"""Pydantic schemas for review endpoints."""

import datetime
import uuid
from typing import List, Optional
from pydantic import BaseModel, AnyHttpUrl, Field, AliasChoices


class PhotoModel(BaseModel):
    id: Optional[str] = None
    src: str
    alt: str = ""


class ReviewModel(BaseModel):
    id: str
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
    date: Optional[datetime.date] = Field(None, validation_alias=AliasChoices("date", "reviewDate"))
    reviewDate: Optional[datetime.date] = Field(None, validation_alias=AliasChoices("reviewDate", "date"))

    status: str = "pending"
    source: Optional[str] = "Unknown"
    
    # AI Processing Metadata
    positive_text: Optional[str] = None
    negative_text: Optional[str] = None
    error_message: Optional[str] = None
    retry_count: int = 0
    last_attempt: Optional[datetime.datetime] = None

class PaginatedReviewResponse(BaseModel):
    data: List[ReviewModel]
    total: int
    page: int
    limit: int
    totalPages: int


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
    sourceId: Optional[str] = None
    hotelName: Optional[str] = None
    rating: Optional[float] = None


class ReplyGenerationResponse(BaseModel):
    reply: str
    provider: str
    similarReviewsUsed: int
    rulesUsed: int
    providerError: Optional[str] = None
