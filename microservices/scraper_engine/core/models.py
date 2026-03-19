"""
Database Models — Scraper Engine Microservice
==============================================
Source-centric schema: no organizations. Sources are URLs provided by the
main backend. Each source maps to many reviews. Each review maps 1:1 to a
platform-specific detail table (agoda, booking, google, tripadvisor).

Column names are standardized across platforms wherever they store the same
type of data (e.g. stay_date, reviewer_nationality, traveler_type).
"""
from sqlalchemy import (
    Column, Integer, String, Float, ForeignKey, Unicode, UnicodeText,
    DateTime, Index, Numeric
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base


# =========================================================
#   SOURCES — each row is a unique scrape target URL
# =========================================================
class Source(Base):
    """
    Platform-specific URL registry.
    Both source_id and source_url are provided externally by API requests.
    """
    __tablename__ = 'sources'

    source_id   = Column(String(36), primary_key=True)
    source_url  = Column(Unicode(1000), nullable=False, unique=True)
    platform_name = Column(Unicode(100), nullable=False)  # agoda | booking | google | tripadvisor

    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index('IX_sources_platform', 'platform_name'),
        Index('IX_sources_url', 'source_url'),
    )

    # Relationships
    reviews = relationship("Review", back_populates="source", cascade="all, delete-orphan")


# =========================================================
#   REVIEWS — central ID hub linking source to platform detail
# =========================================================
class Review(Base):
    """
    Central review record. Holds the auto-generated review_id and links
    back to the source via source_id (1:M).
    """
    __tablename__ = 'reviews'

    review_id  = Column(Integer, primary_key=True, autoincrement=True)
    source_id  = Column(String(36), ForeignKey('sources.source_id', ondelete='CASCADE'), nullable=False)
    platform_review_id = Column(Unicode(255), nullable=True)

    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index('IX_reviews_source', 'source_id'),
        Index('IX_reviews_platform_id', 'source_id', 'platform_review_id'),
    )

    # Relationships
    source             = relationship("Source", back_populates="reviews")
    media              = relationship("ReviewMedia", back_populates="review", cascade="all, delete-orphan")
    agoda_detail       = relationship("AgodaReviewDetail", back_populates="review", uselist=False, cascade="all, delete-orphan")
    booking_detail     = relationship("BookingReviewDetail", back_populates="review", uselist=False, cascade="all, delete-orphan")
    google_detail      = relationship("GoogleReviewDetail", back_populates="review", uselist=False, cascade="all, delete-orphan")
    tripadvisor_detail = relationship("TripAdvisorReviewDetail", back_populates="review", uselist=False, cascade="all, delete-orphan")


# =========================================================
#   PLATFORM: Agoda
# =========================================================
class AgodaReviewDetail(Base):
    """Agoda-specific review columns. PK is FK to reviews."""
    __tablename__ = 'agoda_reviews'

    review_id            = Column(Integer, ForeignKey('reviews.review_id', ondelete='CASCADE'), primary_key=True)
    rating               = Column(Numeric(4, 2), nullable=True)
    review_heading       = Column(Unicode(500), nullable=True)
    author               = Column(Unicode(255), nullable=True)
    review_text          = Column(UnicodeText, nullable=True)
    review_date          = Column(Unicode(100), nullable=True)
    reviewer_nationality = Column(Unicode(100), nullable=True)
    stay_date            = Column(Unicode(255), nullable=True)
    num_of_nights        = Column(Integer, nullable=True)
    traveler_type        = Column(Unicode(255), nullable=True)
    room_type            = Column(Unicode(255), nullable=True)
    reply                = Column(UnicodeText, nullable=True)

    __table_args__ = (
        Index('IX_agoda_rating', 'rating'),
        Index('IX_agoda_review_date', 'review_date'),
    )

    review = relationship("Review", back_populates="agoda_detail")


# =========================================================
#   PLATFORM: Booking
# =========================================================
class BookingReviewDetail(Base):
    """Booking.com-specific review columns. PK is FK to reviews."""
    __tablename__ = 'booking_reviews'

    review_id            = Column(Integer, ForeignKey('reviews.review_id', ondelete='CASCADE'), primary_key=True)
    rating               = Column(Numeric(4, 2), nullable=True)
    review_heading       = Column(Unicode(500), nullable=True)
    author               = Column(Unicode(255), nullable=True)
    positive_text        = Column(UnicodeText, nullable=True)
    negative_text        = Column(UnicodeText, nullable=True)
    review_date          = Column(Unicode(100), nullable=True)
    stay_date            = Column(Unicode(100), nullable=True)
    num_of_nights        = Column(Integer, nullable=True)
    traveler_type        = Column(Unicode(255), nullable=True)
    room_type            = Column(Unicode(255), nullable=True)
    reviewer_nationality = Column(Unicode(100), nullable=True)
    reply                = Column(UnicodeText, nullable=True)

    __table_args__ = (
        Index('IX_booking_rating', 'rating'),
        Index('IX_booking_review_date', 'review_date'),
    )

    review = relationship("Review", back_populates="booking_detail")


# =========================================================
#   PLATFORM: Google
# =========================================================
class GoogleReviewDetail(Base):
    """Google Maps review columns. PK is FK to reviews."""
    __tablename__ = 'google_reviews'

    review_id    = Column(Integer, ForeignKey('reviews.review_id', ondelete='CASCADE'), primary_key=True)
    rating       = Column(Numeric(4, 2), nullable=True)
    author       = Column(Unicode(255), nullable=True)
    review_text  = Column(UnicodeText, nullable=True)
    review_date  = Column(Unicode(100), nullable=True)
    author_badge = Column(Unicode(500), nullable=True)
    reply        = Column(UnicodeText, nullable=True)

    __table_args__ = (
        Index('IX_google_rating', 'rating'),
        Index('IX_google_review_date', 'review_date'),
    )

    review = relationship("Review", back_populates="google_detail")


# =========================================================
#   PLATFORM: TripAdvisor
# =========================================================
class TripAdvisorReviewDetail(Base):
    """TripAdvisor review columns with granular sub-ratings (out of 5)."""
    __tablename__ = 'tripadvisor_reviews'

    review_id            = Column(Integer, ForeignKey('reviews.review_id', ondelete='CASCADE'), primary_key=True)
    rating               = Column(Numeric(4, 2), nullable=True)
    review_heading       = Column(Unicode(500), nullable=True)
    author               = Column(Unicode(255), nullable=True)
    review_text          = Column(UnicodeText, nullable=True)
    review_date          = Column(Unicode(100), nullable=True)
    reviewer_nationality = Column(Unicode(255), nullable=True)
    stay_date            = Column(Unicode(100), nullable=True)
    traveler_type        = Column(Unicode(255), nullable=True)

    # Granular Sub-Ratings (out of 5)
    rating_value         = Column(Numeric(3, 1), nullable=True)
    rating_rooms         = Column(Numeric(3, 1), nullable=True)
    rating_location      = Column(Numeric(3, 1), nullable=True)
    rating_cleanliness   = Column(Numeric(3, 1), nullable=True)
    rating_service       = Column(Numeric(3, 1), nullable=True)
    rating_sleep_quality = Column(Numeric(3, 1), nullable=True)

    __table_args__ = (
        Index('IX_tripadvisor_rating', 'rating'),
        Index('IX_tripadvisor_review_date', 'review_date'),
    )

    review = relationship("Review", back_populates="tripadvisor_detail")


# =========================================================
#   REVIEW MEDIA (1:N from reviews)
# =========================================================
class ReviewMedia(Base):
    """Images/videos attached to any review."""
    __tablename__ = 'review_media'

    media_id  = Column(Integer, primary_key=True, autoincrement=True)
    review_id = Column(Integer, ForeignKey('reviews.review_id', ondelete='CASCADE'), nullable=False)

    media_url     = Column(Unicode(1000), nullable=False)
    thumbnail_url = Column(Unicode(1000), nullable=True)
    media_type    = Column(Unicode(20), nullable=True)  # image | video

    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index('IX_media_review', 'review_id'),
    )

    review = relationship("Review", back_populates="media")


# =========================================================
#   SYSTEM AUDIT LOG
# =========================================================
class AuditLog(Base):
    """Comprehensive system audit log for API calls, scrape events, and errors."""
    __tablename__ = 'audit_log'

    id          = Column(Integer, primary_key=True, autoincrement=True)
    level       = Column(Unicode(20), nullable=False, default='INFO')        # INFO | WARNING | ERROR | CRITICAL
    category    = Column(Unicode(50), nullable=False)                        # API | SCRAPE | DATABASE | SYSTEM
    action      = Column(Unicode(100), nullable=False)                       # e.g. SCRAPE_START, API_ERROR
    target_type = Column(Unicode(50), nullable=True)                         # e.g. SOURCE, REVIEW
    target_id   = Column(Unicode(255), nullable=True)
    details     = Column(UnicodeText, nullable=True)                         # JSON payload
    error_trace = Column(UnicodeText, nullable=True)
    ip_address  = Column(Unicode(50), nullable=True)
    user_agent  = Column(Unicode(255), nullable=True)
    performed_by = Column(Unicode(255), nullable=True, default='system')
    timestamp   = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index('IX_audit_timestamp', 'timestamp'),
        Index('IX_audit_category', 'category'),
        Index('IX_audit_level', 'level'),
        Index('IX_audit_action', 'action'),
    )
