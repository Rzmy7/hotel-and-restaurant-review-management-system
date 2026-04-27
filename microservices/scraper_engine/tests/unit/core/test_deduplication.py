import pytest
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from core.database import Base
from core.models import Source, Review, TripAdvisorReviewDetail
from core.deduplication.base import find_duplicate_review_ids, remove_duplicate_reviews
from datetime import datetime, timedelta

@pytest.fixture
def db_session():
    # Use SQLite in-memory for testing
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(engine)

def test_find_duplicate_review_ids(db_session):
    # Setup source
    source_id = "test-source-id"
    source = Source(source_id=source_id, source_url="http://test.com", platform_name="tripadvisor")
    db_session.add(source)
    db_session.commit()
    
    # Add an "original" review
    rid1 = uuid.uuid4()
    rev1 = Review(review_id=rid1, source_id=source_id, platform_review_id="P1", created_at=datetime.now() - timedelta(days=1))
    det1 = TripAdvisorReviewDetail(review_id=rid1, author="User A", review_text="Good")
    
    # Add a "duplicate" review (same platform_review_id, newer)
    rid2 = uuid.uuid4()
    rev2 = Review(review_id=rid2, source_id=source_id, platform_review_id="P1", created_at=datetime.now())
    det2 = TripAdvisorReviewDetail(review_id=rid2, author="User A", review_text="Good duplicate")
    
    db_session.add_all([rev1, det1, rev2, det2])
    db_session.commit()
    
    # Find duplicates grouping by author (since platform_review_id is on Review, not Detail)
    dupes = find_duplicate_review_ids(db_session, TripAdvisorReviewDetail, source_id, [TripAdvisorReviewDetail.author])
    
    assert len(dupes) == 1
    assert str(rid2) in dupes # rid2 is newer, so it should be the dupe
    assert str(rid1) not in dupes
    
    # Test removal with UUID objects (SQLite/SQLAlchemy fix)
    dupes_uuid = [uuid.UUID(d) for d in dupes]
    count = remove_duplicate_reviews(db_session, dupes_uuid)
    assert count == 1

def test_remove_duplicate_reviews(db_session):
    source_id = "test-source-id"
    source = Source(source_id=source_id, source_url="http://test.com", platform_name="tripadvisor")
    db_session.add(source)
    
    rid1 = uuid.uuid4()
    rev1 = Review(review_id=rid1, source_id=source_id)
    db_session.add(rev1)
    db_session.commit()
    
    # Use UUID object directly for removal
    count = remove_duplicate_reviews(db_session, [rid1])
    assert count == 1
    
    # Verify it's gone
    remaining = db_session.query(Review).count()
    assert remaining == 0
