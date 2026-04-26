"""
Unit tests for the reviews repository.
Verifies ORM operations in isolation.
"""

import uuid
from datetime import datetime
from app.modules.reviews.repository import upsert_review_pending, get_review_by_id
from app.modules.reviews.models import ProcessedReview
from app.modules.source.models import Source, Platform

def test_upsert_review_pending(db_session):
    # Setup: Create a platform and source
    platform = Platform(platform_name="TestPlatform", fetching_type="SCRAPING")
    db_session.add(platform)
    db_session.commit()
    
    source = Source(
        source_id=uuid.uuid4(),
        organization_id=uuid.uuid4(),
        platform_id=platform.platform_id,
        source_url="http://example.com"
    )
    db_session.add(source)
    db_session.commit()

    review_id = uuid.uuid4()
    review_data = {
        "id": review_id,
        "rating": 4.5,
        "reviewerName": "Test User",
        "text": "Great place!",
        "reviewDate": datetime.now(),
        "scrapedAt": datetime.now(),
        "source_id": source.source_id
    }

    # Execute
    returned_id = upsert_review_pending(db_session, review_data)

    # Verify
    assert returned_id == review_id
    db_review = get_review_by_id(db_session, review_id)
    assert db_review is not None
    assert db_review.rating == 4.5
    assert db_review.reviewerName == "Test User"
    assert db_review.status == "pending"
