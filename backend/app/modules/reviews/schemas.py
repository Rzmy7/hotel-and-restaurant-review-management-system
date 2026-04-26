"""
Pydantic schemas for review endpoints.
Enhanced with strict academic validation and field-level constraints.
"""

import datetime
import uuid
from typing import List, Optional
from pydantic import BaseModel, Field, AliasChoices, ConfigDict, field_validator


class PhotoModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: Optional[str] = None
    src: str = Field(..., min_length=5)
    alt: str = ""


class ReviewBase(BaseModel):
    """Common fields for all review representations."""
    rating: float = Field(..., ge=0, le=5)
    heading: Optional[str] = Field(None, max_length=500)
    sentiment: str = Field("Neutral", pattern="^(Positive|Negative|Neutral)$")
    language: str = "English"
    status: str = "pending"


class ReviewModel(ReviewBase):
    """Full detail model for a review, used in detail views."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    reviewerName: str = Field(..., validation_alias=AliasChoices("reviewerName", "userName"))
    userName: str = Field(..., validation_alias=AliasChoices("userName", "reviewerName"))
    
    text: Optional[str] = Field(None, validation_alias=AliasChoices("text", "reviewText"))
    reviewText: Optional[str] = Field(None, validation_alias=AliasChoices("reviewText", "text"))
    
    summary: Optional[str] = None
    sentiment_score: Optional[float] = None
    
    categories: List[str] = []
    keyPhrases: List[str] = []
    photos: List[PhotoModel] = []

    source_id: Optional[uuid.UUID] = None
    date: Optional[datetime.date] = Field(None, validation_alias=AliasChoices("date", "reviewDate"))
    reviewDate: Optional[datetime.date] = Field(None, validation_alias=AliasChoices("reviewDate", "date"))

    source: str = "Unknown"
    
    # AI Processing Metadata
    positive_text: Optional[str] = None
    negative_text: Optional[str] = None
    ai_reply: Optional[str] = None
    
    @field_validator('rating', mode='before')
    @classmethod
    def parse_rating(cls, v):
        if v is None: return 0.0
        return float(v)


class ReviewSummaryModel(BaseModel):
    """Minimized model for list view to reduce payload size."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    rating: float = Field(..., ge=0, le=5)
    reviewerName: str = Field(..., validation_alias=AliasChoices("reviewerName", "userName"))
    text: Optional[str] = Field(None, validation_alias=AliasChoices("text", "reviewText"))
    heading: Optional[str] = None
    sentiment: str = "Neutral"
    source: str = "Unknown"
    date: Optional[datetime.date] = Field(None, validation_alias=AliasChoices("date", "reviewDate"))
    status: str = "pending"
    photos: List[PhotoModel] = []
    categories: List[str] = []


class PaginatedReviewResponse(BaseModel):
    data: List[ReviewModel]
    total: int
    page: int
    limit: int
    totalPages: int


class ReplyGenerationRequest(BaseModel):
    reviewId: str | int
    tone: str = "standard"
    length: str = "standard"
    reviewText: str = Field(..., min_length=1)
    userName: str = "Guest"
    sentiment: str = "Neutral"
    source: Optional[str] = None
    language: Optional[str] = None
    sourceId: Optional[str] = None


class ReplyGenerationResponse(BaseModel):
    reply: str
    provider: str
    similarReviewsUsed: int
    rulesUsed: int
    providerError: Optional[str] = None
