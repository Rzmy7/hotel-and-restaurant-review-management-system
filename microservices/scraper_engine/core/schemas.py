from pydantic import BaseModel, Field, field_validator, HttpUrl
from typing import List, Optional, Dict, Any
from datetime import datetime
import re

class BaseReviewSchema(BaseModel):
    """Common structure for all reviews across platforms."""
    external_review_id: str = Field(..., description="The unique ID from the source platform")
    author: str = Field(..., min_length=1)
    rating: float = Field(..., ge=0, le=10, description="Normalized rating (usually 0-5 or 0-10)")
    review_text: str = Field(..., min_length=1)
    review_date: str = Field(..., description="Raw date string from platform")
    review_title: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    reply_text: Optional[str] = None
    
    @field_validator("rating", mode="before")
    @classmethod
    def normalize_rating(cls, v: Any) -> Any:
        """Normalize rating if it comes as a string or larger scale."""
        if isinstance(v, str):
            match = re.search(r"(\d+(\.\d+)?)", v)
            if match:
                v = float(match.group(1))
            else:
                # If no digits found, let pydantic raise type error naturally
                return v
        
        # Now v should be numeric if it was meant to be
        if isinstance(v, (int, float)):
            if v > 10:
                return float(v) / 10.0
            return float(v)
        return v

class TripAdvisorReviewSchema(BaseReviewSchema):
    """TripAdvisor specific fields."""
    reviewer_origin: Optional[str] = None
    trip_date: Optional[str] = None
    traveler_type: Optional[str] = None
    likes_count: Optional[int] = 0
    
    # Sub-ratings (usually 1-5)
    rating_value: Optional[float] = None
    rating_rooms: Optional[float] = None
    rating_location: Optional[float] = None
    rating_cleanliness: Optional[float] = None
    rating_service: Optional[float] = None
    rating_sleep_quality: Optional[float] = None
    
    @field_validator("rating_value", "rating_rooms", "rating_location", 
                     "rating_cleanliness", "rating_service", "rating_sleep_quality", mode="before")
    @classmethod
    def normalize_sub_ratings(cls, v: Any) -> Any:
        if v is None:
            return None
        if isinstance(v, str):
            match = re.search(r"(\d+)", v)
            if match:
                v = float(match.group(1))
            else:
                return v
        
        if isinstance(v, (int, float)):
            if v > 10: # Likely 0-50 scale
                return float(v) / 10.0
            return float(v)
        return v
