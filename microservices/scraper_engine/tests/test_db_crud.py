import pytest
import uuid
from core.models import (
    Source,
    Review,
    AgodaReviewDetail,
    BookingReviewDetail,
    ReviewMedia,
)

def test_source_insert_and_read(db_session):
    """Test creating and reading a source."""
    source_id = str(uuid.uuid4())
    # Insert
    source = Source(
        source_id=source_id, source_url="https://test.com/hotel", platform_name="agoda"
    )
    db_session.add(source)
    db_session.commit()

    # Read back
    fetched = db_session.query(Source).filter_by(source_id=source_id).first()
    assert fetched is not None, "Source not found after insert"
    assert fetched.platform_name == "agoda"
    assert fetched.source_url == "https://test.com/hotel"

def test_review_with_detail_insert(db_session):
    """Test creating a review linked to a source with platform detail."""
    source_id = str(uuid.uuid4())
    # Create source
    source = Source(
        source_id=source_id, source_url="https://test2.com/hotel", platform_name="agoda"
    )
    db_session.add(source)
    db_session.flush()

    # Create review
    review = Review(source_id=source_id)
    db_session.add(review)
    db_session.flush()

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
    db_session.add(detail)

    # Create media
    media = ReviewMedia(
        review_id=review.review_id,
        media_url="https://example.com/img1.jpg",
        media_type="image",
    )
    db_session.add(media)
    db_session.commit()

    # Read back with relationships
    fetched_review = (
        db_session.query(Review).filter_by(review_id=review.review_id).first()
    )
    assert fetched_review is not None
    assert fetched_review.agoda_detail is not None
    assert float(fetched_review.agoda_detail.rating) == 9.5
    assert fetched_review.agoda_detail.review_heading == "Test Review"
    assert len(fetched_review.media) == 1

def test_cascade_delete(db_session):
    """Test that deleting a source cascades to reviews, details, and media."""
    source_id = str(uuid.uuid4())
    # Create source → review → detail + media
    source = Source(
        source_id=source_id,
        source_url="https://cascade-test.com",
        platform_name="booking",
    )
    db_session.add(source)
    db_session.flush()

    review = Review(source_id=source_id)
    db_session.add(review)
    db_session.flush()

    detail = BookingReviewDetail(
        review_id=review.review_id, rating=8.0, review_heading="Good Stay"
    )
    db_session.add(detail)

    media = ReviewMedia(
        review_id=review.review_id,
        media_url="https://example.com/cascade.jpg",
        media_type="image",
    )
    db_session.add(media)
    db_session.commit()

    review_id = review.review_id

    # Delete the source
    db_session.delete(source)
    db_session.commit()

    # Verify cascade
    assert (
        db_session.query(Review).filter_by(review_id=review_id).first() is None
    ), "Review not cascade deleted"
    assert (
        db_session.query(BookingReviewDetail).filter_by(review_id=review_id).first()
        is None
    ), "Detail not cascade deleted"
    assert (
        db_session.query(ReviewMedia).filter_by(review_id=review_id).first() is None
    ), "Media not cascade deleted"
