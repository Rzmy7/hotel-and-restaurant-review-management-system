import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import get_session
from core.models import Source, Review, BookingReviewDetail, ReviewMedia
from platforms.booking.models import save_reviews_to_db

def test_booking_idempotency_with_media():
    session = get_session()
    source_id = "test-idempotency-source"
    try:
        # Cleanup
        session.query(Source).filter_by(source_id=source_id).delete()
        session.commit()

        # Create source
        source = Source(source_id=source_id, source_url="https://test.com", platform_name="booking")
        session.add(source)
        session.commit()

        review_data = {
            "author": "Linda",
            "review_title": "3 night relaxing stay",
            "review_date": "2026-04-25",
            "stay_date": "2026-04-01",
            "positive_text": "Lovely property",
            "negative_text": "Limited menu",
            "rating": 8,
            "images": ["https://img1.jpg", "https://img2.jpg"]
        }

        # 1. First save
        count1 = save_reviews_to_db([review_data], source_id)
        assert count1 == 1
        print("  - First save successful")

        # 2. Save exact same review again (should be skipped)
        count2 = save_reviews_to_db([review_data], source_id)
        assert count2 == 0
        print("  - Second save correctly skipped (duplicate)")

        # 3. Save review with DIFFERENT review_date but same everything else (SHOULD be skipped now!)
        review_diff_date = review_data.copy()
        review_diff_date["review_date"] = "2026-04-26"
        count3 = save_reviews_to_db([review_diff_date], source_id)
        assert count3 == 0
        print("  - Save with different review_date correctly skipped (duplicate detected by traits)")

        # 4. Save same text but DIFFERENT images (should be ALLOWED per user request)
        review_diff_media = review_data.copy()
        review_diff_media["images"] = ["https://img1.jpg"] # Different image set
        count4 = save_reviews_to_db([review_diff_media], source_id)
        assert count4 == 1
        print("  - Save with different media allowed")

        print("\nBooking Idempotency (Traits + Media) test passed!")
    finally:
        session.query(Source).filter_by(source_id=source_id).delete()
        session.commit()
        session.close()

def test_base_deduplication_logic():
    from core.deduplication.base import find_duplicate_review_ids
    session = get_session()
    source_id = "test-base-dedup-source"
    try:
        # Cleanup
        session.query(Source).filter_by(source_id=source_id).delete()
        session.commit()

        # Create source
        source = Source(source_id=source_id, source_url="https://test-dedup.com", platform_name="booking")
        session.add(source)
        session.commit()

        # Manual insertion of duplicates (bypass save_reviews_to_db check)
        r1 = Review(source_id=source_id)
        session.add(r1)
        session.flush()
        d1 = BookingReviewDetail(review_id=r1.review_id, author="Bob", review_heading="H", review_date="2024-01-01", stay_date="2023-12-25", positive_text="A", negative_text="B", rating=9)
        session.add(d1)
        
        # Duplicate of r1, but with DIFFERENT review_date (should still be found as duplicate)
        r2 = Review(source_id=source_id)
        session.add(r2)
        session.flush()
        d2 = BookingReviewDetail(review_id=r2.review_id, author="Bob", review_heading="H", review_date="2024-01-02", stay_date="2023-12-25", positive_text="A", negative_text="B", rating=9)
        session.add(d2)

        # Different media -> NOT a duplicate
        r3 = Review(source_id=source_id)
        session.add(r3)
        session.flush()
        d3 = BookingReviewDetail(review_id=r3.review_id, author="Bob", review_heading="H", review_date="2024-01-01", stay_date="2023-12-25", positive_text="A", negative_text="B", rating=9)
        session.add(d3)
        m3 = ReviewMedia(review_id=r3.review_id, media_url="https://img.jpg", media_type="image")
        session.add(m3)

        session.commit()

        grouping_cols = [
            BookingReviewDetail.author, 
            BookingReviewDetail.review_heading, 
            BookingReviewDetail.positive_text, 
            BookingReviewDetail.negative_text,
            BookingReviewDetail.stay_date,
            BookingReviewDetail.rating
        ]
        dups = find_duplicate_review_ids(session, BookingReviewDetail, source_id, grouping_cols)

        # Should only find r2 as duplicate of r1. r3 has different media.
        assert len(dups) == 1
        assert str(r2.review_id) in dups
        assert str(r3.review_id) not in dups

        print("Base Deduplication (Python-based with Media) test passed!")
    finally:
        session.query(Source).filter_by(source_id=source_id).delete()
        session.commit()
        session.close()

if __name__ == "__main__":
    print("Running Idempotency and Deduplication Tests...")
    test_booking_idempotency_with_media()
    test_base_deduplication_logic()
