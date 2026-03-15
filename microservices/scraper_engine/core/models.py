"""
Unified Database Models — Review Microservice
==============================================
Lean schema: organizations are minimal (PK + name only, details live in
a separate master-data microservice). This DB owns ALL review data.
"""
from sqlalchemy import (
    Column, Integer, String, Float, ForeignKey, Unicode, UnicodeText,
    DateTime, UniqueConstraint, Index, LargeBinary, Numeric
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base


# =========================================================
#   ORGANIZATIONS (minimal — master data lives elsewhere)
# =========================================================
class Organization(Base):
    __tablename__ = 'organizations'

    organization_id = Column(Integer, primary_key=True, autoincrement=True)
    organization_name = Column(Unicode(255), nullable=False)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, nullable=True, onupdate=func.now())

    # Relationships
    sources = relationship("OrganizationSource", back_populates="organization", cascade="all, delete-orphan")


# =========================================================
#   SOURCES (Booking / Agoda / Google)
# =========================================================
class Source(Base):
    __tablename__ = 'sources'

    source_id = Column(Integer, primary_key=True, autoincrement=True)
    platform_name = Column(Unicode(100), nullable=False, unique=True)
    base_url = Column(Unicode(500), nullable=True)

    created_at = Column(DateTime, server_default=func.now())

    organization_sources = relationship("OrganizationSource", back_populates="source")


# =========================================================
#   ORGANIZATION_SOURCES (M:N Junction)
# =========================================================
class OrganizationSource(Base):
    __tablename__ = 'organization_sources'

    organization_source_id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey('organizations.organization_id', ondelete='CASCADE'), nullable=False)
    source_id = Column(Integer, ForeignKey('sources.source_id', ondelete='CASCADE'), nullable=False)

    external_url = Column(Unicode(1000), nullable=True)
    last_synced_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint('organization_id', 'source_id', name='UQ_org_source'),
    )

    organization = relationship("Organization", back_populates="sources")
    source = relationship("Source", back_populates="organization_sources")
    reviews = relationship("Review", back_populates="organization_source", cascade="all, delete-orphan")
    stats = relationship("OrganizationReviewStats", back_populates="organization_source", uselist=False, cascade="all, delete-orphan")


# =========================================================
#   REVIEWS (Supertype)
# =========================================================
class Review(Base):
    __tablename__ = 'reviews'

    review_id = Column(Integer, primary_key=True, autoincrement=True)
    organization_source_id = Column(Integer, ForeignKey('organization_sources.organization_source_id', ondelete='CASCADE'), nullable=False)
    external_review_id = Column(Unicode(255), nullable=True)

    rating = Column(Numeric(4, 2), nullable=True)
    author = Column(Unicode(255), nullable=True)

    review_text = Column(UnicodeText, nullable=True)
    review_title = Column(Unicode(500), nullable=True)
    review_date = Column(Unicode(100), nullable=True)
    reply_text = Column(UnicodeText, nullable=True)

    sentiment_score = Column(Float, nullable=True)
    sentiment_label = Column(Unicode(50), nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, nullable=True, onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index('IX_reviews_orgsrc', 'organization_source_id'),
        Index('IX_reviews_rating', 'rating'),
        Index('IX_reviews_sentiment', 'sentiment_label'),
        Index('IX_reviews_created_at', 'created_at'),
    )

    organization_source = relationship("OrganizationSource", back_populates="reviews")
    media = relationship("ReviewMedia", back_populates="review", cascade="all, delete-orphan")
    agoda_detail = relationship("AgodaReviewDetail", back_populates="review", uselist=False, cascade="all, delete-orphan")
    booking_detail = relationship("BookingReviewDetail", back_populates="review", uselist=False, cascade="all, delete-orphan")
    google_detail = relationship("GoogleReviewDetail", back_populates="review", uselist=False, cascade="all, delete-orphan")
    tripadvisor_detail = relationship("TripAdvisorReviewDetail", back_populates="review", uselist=False, cascade="all, delete-orphan")
    embeddings = relationship("ReviewEmbedding", back_populates="review", cascade="all, delete-orphan")


# =========================================================
#   SUBTYPE: Agoda
# =========================================================
class AgodaReviewDetail(Base):
    __tablename__ = 'agoda_reviews'

    review_id = Column(Integer, ForeignKey('reviews.review_id', ondelete='CASCADE'), primary_key=True)
    reviewer_nationality = Column(Unicode(100), nullable=True)
    stayed_dates = Column(Unicode(255), nullable=True)
    traveler_type = Column(Unicode(255), nullable=True)
    room_type = Column(Unicode(255), nullable=True)
    review_date = Column(DateTime, nullable=True)

    review = relationship("Review", back_populates="agoda_detail")


# =========================================================
#   SUBTYPE: Booking
# =========================================================
class BookingReviewDetail(Base):
    __tablename__ = 'booking_reviews'

    review_id = Column(Integer, ForeignKey('reviews.review_id', ondelete='CASCADE'), primary_key=True)
    reviewer_nationality = Column(Unicode(100), nullable=True)
    positive_txt = Column(UnicodeText, nullable=True)
    negative_txt = Column(UnicodeText, nullable=True)
    reviewer_stay_date = Column(Unicode(100), nullable=True)
    num_of_nights = Column(Integer, nullable=True)
    traveler_type = Column(Unicode(255), nullable=True)
    room_name = Column(Unicode(255), nullable=True)
    posted_date = Column(Unicode(100), nullable=True)

    review = relationship("Review", back_populates="booking_detail")


# =========================================================
#   SUBTYPE: Google
# =========================================================
class GoogleReviewDetail(Base):
    __tablename__ = 'google_reviews'

    review_id = Column(Integer, ForeignKey('reviews.review_id', ondelete='CASCADE'), primary_key=True)
    author_badge = Column(Unicode(500), nullable=True)
    place_url = Column(Unicode(1000), nullable=True)

    review = relationship("Review", back_populates="google_detail")


# =========================================================
#   SUBTYPE: TripAdvisor
# =========================================================
class TripAdvisorReviewDetail(Base):
    __tablename__ = 'tripadvisor_reviews'

    review_id = Column(Integer, ForeignKey('reviews.review_id', ondelete='CASCADE'), primary_key=True)
    reviewer_origin = Column(Unicode(255), nullable=True)   # e.g. "Dubai, UAE"
    traveler_type  = Column(Unicode(255), nullable=True)   # e.g. "Traveled with family"
    trip_date      = Column(Unicode(100), nullable=True)   # e.g. "September 2025"
    place_url       = Column(Unicode(1000), nullable=True)
    
    # Granular Sub-ratings & Stats
    contribution_count = Column(Integer, nullable=True)
    rating_value       = Column(Numeric(3, 1), nullable=True)
    rating_service     = Column(Numeric(3, 1), nullable=True)
    rating_location    = Column(Numeric(3, 1), nullable=True)
    rating_cleanliness = Column(Numeric(3, 1), nullable=True)
    rating_rooms       = Column(Numeric(3, 1), nullable=True)
    rating_sleep_quality = Column(Numeric(3, 1), nullable=True)
    rating_food        = Column(Numeric(3, 1), nullable=True)
    rating_atmosphere  = Column(Numeric(3, 1), nullable=True)

    review = relationship("Review", back_populates="tripadvisor_detail")


# =========================================================
#   REVIEW MEDIA (1:N)
# =========================================================
class ReviewMedia(Base):
    __tablename__ = 'review_media'

    media_id = Column(Integer, primary_key=True, autoincrement=True)
    review_id = Column(Integer, ForeignKey('reviews.review_id', ondelete='CASCADE'), nullable=False)

    media_url = Column(Unicode(1000), nullable=False)
    thumbnail_url = Column(Unicode(1000), nullable=True)
    media_type = Column(Unicode(20), nullable=True)

    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index('IX_media_review', 'review_id'),
    )

    review = relationship("Review", back_populates="media")


# =========================================================
#   VECTOR EMBEDDINGS
# =========================================================
class ReviewEmbedding(Base):
    __tablename__ = 'review_embeddings'

    embedding_id = Column(Integer, primary_key=True, autoincrement=True)
    review_id = Column(Integer, ForeignKey('reviews.review_id', ondelete='CASCADE'), nullable=False)

    embedding_vector = Column(LargeBinary, nullable=False)
    model_name = Column(Unicode(100), nullable=True)

    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index('IX_embeddings_review', 'review_id'),
    )

    review = relationship("Review", back_populates="embeddings")


# =========================================================
#   AGGREGATED STATS
# =========================================================
class OrganizationReviewStats(Base):
    __tablename__ = 'organization_review_stats'

    organization_source_id = Column(Integer, ForeignKey('organization_sources.organization_source_id', ondelete='CASCADE'), primary_key=True)

    total_reviews = Column(Integer, default=0)
    average_rating = Column(Numeric(4, 2), nullable=True)
    positive_count = Column(Integer, default=0)
    neutral_count = Column(Integer, default=0)
    negative_count = Column(Integer, default=0)

    last_updated = Column(DateTime, server_default=func.now())

    organization_source = relationship("OrganizationSource", back_populates="stats")


# =========================================================
#   SYSTEM AUDIT LOG (Comprehensive)
# =========================================================
class AuditLog(Base):
    __tablename__ = 'audit_log'

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Severity: INFO, WARNING, ERROR, CRITICAL
    level = Column(Unicode(20), nullable=False, default=u'INFO')
    
    # Category: API, SCRAPE, DATABASE, SYSTEM, WEBSOCKET
    category = Column(Unicode(50), nullable=False)
    
    # Action: e.g., "CREATE_ORGANIZATION", "SCRAPE_START", "API_ERROR", "REVIEW_DELETED"
    action = Column(Unicode(100), nullable=False)
    
    # Target Information
    target_type = Column(Unicode(50), nullable=True) # e.g., "ORGANIZATION", "REVIEW", "SCRAPE_JOB"
    target_id = Column(Unicode(255), nullable=True)  # Generic ID (could be UUID or INT string)
    
    # Contextual Details (Full JSON payload or description)
    details = Column(UnicodeText, nullable=True)
    
    # Error Traceback (if applicable)
    error_trace = Column(UnicodeText, nullable=True)
    
    # Origin Info
    ip_address = Column(Unicode(50), nullable=True)
    user_agent = Column(Unicode(255), nullable=True)
    performed_by = Column(Unicode(255), nullable=True, default=u'system')
    
    timestamp = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index('IX_audit_log_timestamp', 'timestamp'),
        Index('IX_audit_log_category', 'category'),
        Index('IX_audit_log_level', 'level'),
        Index('IX_audit_log_action', 'action'),
    )
