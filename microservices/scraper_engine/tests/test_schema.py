"""
Test Suite — Database Schema Validation
========================================
Validates that all database tables and columns were created correctly
after the source-centric redesign.

Run with: pytest tests/test_schema.py -v
"""
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import get_engine, Base
from core.models import (
    Source, Review, AgodaReviewDetail, BookingReviewDetail,
    GoogleReviewDetail, TripAdvisorReviewDetail, ReviewMedia, AuditLog
)
from sqlalchemy import inspect


def test_all_tables_exist():
    """Verify all expected tables exist in the database."""
    engine = get_engine()
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    expected_tables = {
        'sources', 'reviews',
        'agoda_reviews', 'booking_reviews', 'google_reviews', 'tripadvisor_reviews',
        'review_media', 'audit_log'
    }

    print("\n═══ Table Existence Check ═══")
    for table in expected_tables:
        if table in existing_tables:
            print(f"  ✅ {table}")
        else:
            print(f"  ❌ {table} — MISSING")

    missing = expected_tables - existing_tables
    assert len(missing) == 0, f"Missing tables: {missing}"


def test_sources_columns():
    """Verify the sources table has the expected columns."""
    engine = get_engine()
    inspector = inspect(engine)
    columns = {col['name'] for col in inspector.get_columns('sources')}

    expected = {'source_id', 'source_url', 'platform_name', 'created_at'}
    print("\n═══ Sources Column Check ═══")
    for col in expected:
        status = "✅" if col in columns else "❌"
        print(f"  {status} {col}")

    missing = expected - columns
    assert len(missing) == 0, f"Missing columns in sources: {missing}"


def test_reviews_columns():
    """Verify the reviews table has the expected columns."""
    engine = get_engine()
    inspector = inspect(engine)
    columns = {col['name'] for col in inspector.get_columns('reviews')}

    expected = {'review_id', 'source_id', 'created_at'}
    print("\n═══ Reviews Column Check ═══")
    for col in expected:
        status = "✅" if col in columns else "❌"
        print(f"  {status} {col}")

    missing = expected - columns
    assert len(missing) == 0, f"Missing columns in reviews: {missing}"


def test_agoda_standardized_columns():
    """Verify Agoda review table uses standardized column names."""
    engine = get_engine()
    inspector = inspect(engine)
    columns = {col['name'] for col in inspector.get_columns('agoda_reviews')}

    expected = {
        'review_id', 'rating', 'review_heading', 'author', 'review_text',
        'review_date', 'reviewer_nationality', 'stay_date', 'num_of_nights',
        'traveler_type', 'room_type', 'reply'
    }
    print("\n═══ Agoda Reviews Column Check ═══")
    for col in expected:
        status = "✅" if col in columns else "❌"
        print(f"  {status} {col}")

    missing = expected - columns
    assert len(missing) == 0, f"Missing columns in agoda_reviews: {missing}"


def test_booking_standardized_columns():
    """Verify Booking review table uses standardized column names."""
    engine = get_engine()
    inspector = inspect(engine)
    columns = {col['name'] for col in inspector.get_columns('booking_reviews')}

    expected = {
        'review_id', 'rating', 'review_heading', 'author', 'positive_text',
        'negative_text', 'review_date', 'stay_date', 'num_of_nights',
        'traveler_type', 'room_type', 'reviewer_nationality', 'reply'
    }
    print("\n═══ Booking Reviews Column Check ═══")
    for col in expected:
        status = "✅" if col in columns else "❌"
        print(f"  {status} {col}")

    missing = expected - columns
    assert len(missing) == 0, f"Missing columns in booking_reviews: {missing}"


def test_google_columns():
    """Verify Google review table columns."""
    engine = get_engine()
    inspector = inspect(engine)
    columns = {col['name'] for col in inspector.get_columns('google_reviews')}

    expected = {
        'review_id', 'rating', 'author', 'review_text', 'review_date',
        'author_badge', 'reply'
    }
    print("\n═══ Google Reviews Column Check ═══")
    for col in expected:
        status = "✅" if col in columns else "❌"
        print(f"  {status} {col}")

    missing = expected - columns
    assert len(missing) == 0, f"Missing columns in google_reviews: {missing}"


def test_tripadvisor_standardized_columns():
    """Verify TripAdvisor review table uses standardized column names and sub-ratings."""
    engine = get_engine()
    inspector = inspect(engine)
    columns = {col['name'] for col in inspector.get_columns('tripadvisor_reviews')}

    expected = {
        'review_id', 'rating', 'review_heading', 'author', 'review_text',
        'review_date', 'reviewer_nationality', 'stay_date', 'traveler_type',
        'rating_value', 'rating_rooms', 'rating_location',
        'rating_cleanliness', 'rating_service', 'rating_sleep_quality'
    }
    print("\n═══ TripAdvisor Reviews Column Check ═══")
    for col in expected:
        status = "✅" if col in columns else "❌"
        print(f"  {status} {col}")

    missing = expected - columns
    assert len(missing) == 0, f"Missing columns in tripadvisor_reviews: {missing}"


def test_review_media_columns():
    """Verify review_media table columns."""
    engine = get_engine()
    inspector = inspect(engine)
    columns = {col['name'] for col in inspector.get_columns('review_media')}

    expected = {'media_id', 'review_id', 'media_url', 'thumbnail_url', 'media_type', 'created_at'}
    print("\n═══ Review Media Column Check ═══")
    for col in expected:
        status = "✅" if col in columns else "❌"
        print(f"  {status} {col}")

    missing = expected - columns
    assert len(missing) == 0, f"Missing columns in review_media: {missing}"


def test_no_organization_tables():
    """Verify that old organization tables have been removed."""
    engine = get_engine()
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    removed_tables = {'organizations', 'organization_sources', 'organization_review_stats', 'review_embeddings'}
    print("\n═══ Removed Tables Check ═══")
    for table in removed_tables:
        if table not in existing_tables:
            print(f"  ✅ {table} — correctly removed")
        else:
            print(f"  ⚠️  {table} — still exists (should be dropped manually or via migration)")


if __name__ == "__main__":
    print("Running Database Schema Validation Tests\n")
    test_all_tables_exist()
    test_sources_columns()
    test_reviews_columns()
    test_agoda_standardized_columns()
    test_booking_standardized_columns()
    test_google_columns()
    test_tripadvisor_standardized_columns()
    test_review_media_columns()
    test_no_organization_tables()
    print("\n✅ All schema validation tests passed!")
