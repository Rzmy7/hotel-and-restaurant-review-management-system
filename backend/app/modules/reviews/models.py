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
    Boolean,
    ForeignKey,
    func,
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER

from app.database.session import Base


class ProcessedReview(Base):
    __tablename__ = "processed_review"

    id = Column(UNIQUEIDENTIFIER, primary_key=True)

    source_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("source.source_id", ondelete="CASCADE"),
        nullable=True,
    )

    # Review content
    rating = Column(Float, nullable=True)
    reviewerName = Column("reviewerName", String(255), nullable=True)
    text = Column(String, nullable=True)
    heading = Column(String, nullable=True)
    summary = Column(String, nullable=True)

    # AI analysis
    sentiment = Column(String(20), nullable=True)
    sentiment_score = Column(Float, nullable=True)
    language = Column(String(50), nullable=True)
    categories = Column(String, nullable=True)  # JSON stored as NVARCHAR(MAX)
    keyPhrases = Column(
        "keyPhrases", String, nullable=True
    )  # JSON stored as NVARCHAR(MAX)

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

    # Embedding tracking — False until the embedding service processes this review
    is_embedded = Column(Boolean, nullable=False, default=False, server_default='0')

    # Relationships
    media = relationship(
        "ReviewMedia", back_populates="review", cascade="all, delete-orphan"
    )
    category_scores = relationship(
        "ReviewCategory", back_populates="review", cascade="all, delete-orphan"
    )
    replies = relationship(
        "ReviewReply", back_populates="review", cascade="all, delete-orphan"
    )
    source = relationship("Source")


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


class ReviewCategory(Base):
    """
    Detailed numeric scores per category (Cleanliness, Staff, etc.).
    Maps to dbo.review_category.
    """

    __tablename__ = "review_category"

    id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    review_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("processed_review.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(100), nullable=False)
    score = Column(Float, nullable=True)
    created_at = Column("created_at", DateTime, server_default=func.now())

    review = relationship("ProcessedReview", back_populates="category_scores")


class ReviewReply(Base):
    """
    Dedicated reply history table.
    Each row represents one version of a reply to a review.
    Supports edit history tracking and response-time calculation.
    """

    __tablename__ = "review_reply"

    id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    review_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("processed_review.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reply_text = Column(String, nullable=False)
    tone = Column(String(20), nullable=True)  # professional | casual | standard
    created_at = Column(
        "created_at", DateTime(timezone=False), server_default=func.now(), nullable=False
    )
    updated_at = Column("updated_at", DateTime(timezone=False), nullable=True)
    created_by = Column("created_by", UNIQUEIDENTIFIER, nullable=True)
    is_edited = Column(Boolean, nullable=False, default=False, server_default="0")

    review = relationship("ProcessedReview", back_populates="replies")
