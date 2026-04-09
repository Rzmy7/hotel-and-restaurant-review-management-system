"""
ORM models for the review data domain: ProcessedReview, ReviewMedia.

Previously managed by raw SQL only — now fully ORM-integrated for
automatic table creation via Base.metadata.create_all().
"""

import uuid
from sqlalchemy import (
    Column,
    String,
    DateTime,
    Integer,
    Float,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from sqlalchemy.sql import func

from app.database.session import Base


class ProcessedReview(Base):
    __tablename__ = "processed_review"

    id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)

    # External identifiers
    platformReviewId = Column("platformReviewId", String(100), nullable=True)
    organization_id = Column(UNIQUEIDENTIFIER, nullable=True)
    platform_id = Column(Integer, nullable=True)
    source_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("source.source_id", ondelete="CASCADE"),
        nullable=True,
    )

    # Review content
    rating = Column(Integer, nullable=True)
    reviewerName = Column("reviewerName", String(255), nullable=True)
    text = Column(String, nullable=True)
    summary = Column(String, nullable=True)

    # AI analysis
    sentiment = Column(String(20), nullable=True)
    sentiment_score = Column(Float, nullable=True)
    language = Column(String(50), nullable=True)
    categories = Column(String, nullable=True)    # JSON stored as NVARCHAR(MAX)
    keyPhrases = Column("keyPhrases", String, nullable=True)  # JSON stored as NVARCHAR(MAX)
    
    # AI assessment & Error tracking
    positive_text = Column(String, nullable=True)
    negative_text = Column(String, nullable=True)
    error_message = Column(String, nullable=True)
    retry_count = Column(Integer, default=0)
    last_attempt = Column(DateTime, nullable=True)

    # Dates
    reviewDate = Column("reviewDate", DateTime(timezone=False), nullable=True)
    scrapedAt = Column("scrapedAt", DateTime(timezone=False), nullable=True)

    # Status
    status = Column(String(20), nullable=True, default="pending")
    ai_reply = Column(String, nullable=True)

    # Relationships
    media = relationship(
        "ReviewMedia", back_populates="review", cascade="all, delete-orphan"
    )


class ReviewMedia(Base):
    __tablename__ = "review_media"

    media_id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    review_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("processed_review.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    src = Column(String(1000), nullable=True)
    alt = Column(String(500), nullable=True)

    review = relationship("ProcessedReview", back_populates="media")
