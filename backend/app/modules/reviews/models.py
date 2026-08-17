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
    aspect_scores = relationship(
        "ReviewAspect", back_populates="review", cascade="all, delete-orphan"
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


class ReviewAspect(Base):
    """
    Per-aspect scores, mirroring review_category (dual-write kept in sync).
    Maps to dbo.review_aspects. Exists to satisfy the review_aspects
    table requirement of the Reviews/AI/Insights module; filters continue
    to read from dbo.review_category for backward compatibility.
    """

    __tablename__ = "review_aspects"

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

    review = relationship("ProcessedReview", back_populates="aspect_scores")


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


class AlertRule(Base):
    """
    Configurable alert rule — triggers notifications based on review conditions.
    Supports: low_rating, negative_sentiment_spike, response_overdue.
    """

    __tablename__ = "alert_rule"

    id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    organization_id = Column(
        "organization_id", UNIQUEIDENTIFIER, nullable=False, index=True
    )
    name = Column(String(200), nullable=False)
    description = Column(String(500), nullable=True)

    # Condition
    condition_type = Column("condition_type", String(50), nullable=False)
    threshold = Column(Float, nullable=False)
    lookback_hours = Column("lookback_hours", Integer, nullable=False, default=24)

    # Action
    action_type = Column("action_type", String(50), nullable=False, default="notification")

    # State
    is_enabled = Column(Boolean, nullable=False, default=True, server_default="1")
    last_triggered_at = Column("last_triggered_at", DateTime, nullable=True)
    trigger_count = Column("trigger_count", Integer, nullable=False, default=0)

    created_at = Column(
        "created_at", DateTime(timezone=False), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        "updated_at", DateTime(timezone=False), server_default=func.now(), nullable=False
    )
