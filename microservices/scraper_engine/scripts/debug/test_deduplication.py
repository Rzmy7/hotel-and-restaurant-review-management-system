import sys
import os

# Add the parent directory to sys.path to allow importing from core
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from core.database import get_session
from core.models import Source, Review
from core.utils import identify_new_reviews
from platforms.google.models import save_reviews_to_db

class MockReview:
    def __init__(self, id, author, text, rating=5.0):
        self.id = id
        self.author = author
        self.text = text
        self.rating = rating

def test_deduplication():
    session = get_session()
    source_id = "test-dedup-uuid-1234"
    
    try:
        # 1. Ensure source exists
        source = session.query(Source).filter_by(source_id=source_id).first()
        if not source:
            source = Source(source_id=source_id, source_url="https://test.com/dedup", platform_name="google")
            session.add(source)
            session.commit()
            print(f"Created test source: {source_id}")

        # 2. Define mock scraped reviews
        mock_reviews = [
            MockReview("google_id_111", "User A", "Great place!"),
            MockReview("google_id_222", "User B", "Not bad."),
            MockReview("google_id_333", "User C", "Excellent!"),
        ]

        # 3. Identify new reviews (should be 3)
        count, new_ids = identify_new_reviews(session, source_id, mock_reviews)
        print(f"Initial check: Found {count} new reviews. IDs: {new_ids}")

        # 4. Save them
        print("Saving reviews to DB...")
        save_reviews_to_db(mock_reviews, source_id)

        # 5. Identify again (should be 0)
        # Refresh session to see new data
        session.expire_all()
        count, new_ids = identify_new_reviews(session, source_id, mock_reviews)
        print(f"Second check (after save): Found {count} new reviews. IDs: {new_ids}")

        # 6. Add one more new review
        mock_reviews.append(MockReview("google_id_444", "User D", "New review!"))
        count, new_ids = identify_new_reviews(session, source_id, mock_reviews)
        print(f"Third check (with one new): Found {count} new reviews. IDs: {new_ids}")

    except Exception as e:
        print(f"Test failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Cleanup test data
        print("Cleaning up test data...")
        session.query(Review).filter_by(source_id=source_id).delete()
        session.query(Source).filter_by(source_id=source_id).delete()
        session.commit()
        session.close()

if __name__ == "__main__":
    test_deduplication()
