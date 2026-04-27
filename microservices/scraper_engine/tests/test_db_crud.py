"""
Test Suite — Database CRUD Operations
======================================
Validates direct database operations: insert, read, cascade delete.
Run with: pytest tests/test_db_crud.py -v
"""

import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import get_session, init_db
from core.models import (
    Source,
    Review,
    AgodaReviewDetail,
    BookingReviewDetail,
    GoogleReviewDetail,
    ReviewMedia,
)


def setup():
    """Initialize database tables before testing."""
    init_db()


def test_source_insert_and_read():
    """Test creating and reading a source."""
    session = get_session()
    try:
        # Clean up any leftover test data
        session.query(Source).filter_by(source_id=88888).delete()
        session.commit()

        # Insert
        source = Source(
            source_id=88888, source_url="https://test.com/hotel", platform_name="agoda"
        )
        session.add(source)
        session.commit()

        # Read back
        fetched = session.query(Source).filter_by(source_id=88888).first()
        assert fetched is not None, "Source not found after insert"
        assert fetched.platform_name == "agoda"
        assert fetched.source_url == "https://test.com/hotel"
        print("  ✅ Source insert and read")
    finally:
        # Cleanup
        session.query(Source).filter_by(source_id=88888).delete()
        session.commit()
        session.close()


def test_review_with_detail_insert():
    """Test creating a review linked to a source with platform detail."""
    session = get_session()
    try:
        # Create source
        source = Source(
            source_id=88889, source_url="https://test2.com/hotel", platform_name="agoda"
        )
        session.add(source)
        session.flush()

        # Create review
        review = Review(source_id=88889)
        session.add(review)
        session.flush()

        # Create agoda detail
        detail = AgodaReviewDetail(
            review_id=review.review_id,
            rating=9.5,
            review_heading="Test Review",
            author="Test Author",
            review_text="Great hotel!",
            review_date="2024-01-15",
            reviewer_nationality="Sri Lanka",
            stay_date="2024-01-10",
            num_of_nights=3,
            traveler_type="Couple",
            room_type="Deluxe",
            reply="Thank you!",
        )
        session.add(detail)

        # Create media
        media = ReviewMedia(
            review_id=review.review_id,
            media_url="https://example.com/img1.jpg",
            media_type="image",
        )
        session.add(media)
        session.commit()

        # Read back with relationships
        fetched_review = (
            session.query(Review).filter_by(review_id=review.review_id).first()
        )
        assert fetched_review is not None
        assert fetched_review.agoda_detail is not None
        assert float(fetched_review.agoda_detail.rating) == 9.5
        assert fetched_review.agoda_detail.review_heading == "Test Review"
        assert len(fetched_review.media) == 1
        print("  ✅ Review with detail and media insert")
    finally:
        session.query(Source).filter_by(source_id=88889).delete()
        session.commit()
        session.close()


def test_cascade_delete():
    """Test that deleting a source cascades to reviews, details, and media."""
    session = get_session()
    try:
        # Create source → review → detail + media
        source = Source(
            source_id=88890,
            source_url="https://cascade-test.com",
            platform_name="booking",
        )
        session.add(source)
        session.flush()

        review = Review(source_id=88890)
        session.add(review)
        session.flush()

        detail = BookingReviewDetail(
            review_id=review.review_id, rating=8.0, review_heading="Good Stay"
        )
        session.add(detail)

        media = ReviewMedia(
            review_id=review.review_id,
            media_url="https://example.com/cascade.jpg",
            media_type="image",
        )
        session.add(media)
        session.commit()

        review_id = review.review_id

        # Delete the source
        session.delete(source)
        session.commit()

        # Verify cascade
        assert (
            session.query(Review).filter_by(review_id=review_id).first() is None
        ), "Review not cascade deleted"
        assert (
            session.query(BookingReviewDetail).filter_by(review_id=review_id).first()
            is None
        ), "Detail not cascade deleted"
        assert (
            session.query(ReviewMedia).filter_by(review_id=review_id).first() is None
        ), "Media not cascade deleted"
        print("  ✅ Cascade delete (source → reviews → detail + media)")
    finally:
        # Extra cleanup just in case
        session.query(Source).filter_by(source_id=88890).delete()
        session.commit()
        session.close()


if __name__ == "__main__":
    print("Running Database CRUD Tests\n")
    setup()
    test_source_insert_and_read()
    test_review_with_detail_insert()
    test_cascade_delete()
    print("\n✅ All CRUD tests passed!")
