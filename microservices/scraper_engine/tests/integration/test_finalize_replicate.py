import pytest
from core.models import Source, Review, TripAdvisorReviewDetail
from services.source_service import SourceService
from platforms.tripadvisor.models import save_reviews_to_db
from core.deduplication.tripadvisor_deduplicator import clean_tripadvisor_duplicates
import uuid
from unittest.mock import patch, MagicMock

def test_finalize_and_replicate_logic(db_session):
    """
    Test that finalize_and_replicate correctly:
    1. Saves reviews to the primary source.
    2. Replicates them to companion sources sharing the same URL.
    3. Handles deduplication correctly.
    """
    # Prevent session from being closed by the service logic
    db_session.close = MagicMock()
    
    # Mock backend notification and session factory in all used modules
    with patch("services.source_service.notify_backend_sync_status"), \
         patch("services.source_service.get_session", return_value=db_session), \
         patch("platforms.tripadvisor.models.get_session", return_value=db_session), \
         patch("core.database.get_session", return_value=db_session):
        
        url = "https://www.tripadvisor.com/Hotel_Review-g297628-d300581-Reviews-The_Park_Hyderabad-Hyderabad_Hyderabad_District_Telangana.html"
        
        # 1. Create multiple sources with same URL
        primary_id = str(uuid.uuid4())
        companion_id = str(uuid.uuid4())
        
        primary_source = Source(source_id=primary_id, source_url=url, platform_name="tripadvisor")
        companion_source = Source(source_id=companion_id, source_url=url, platform_name="tripadvisor")
        
        db_session.add(primary_source)
        db_session.add(companion_source)
        db_session.commit()
        
        # 2. Prepare sample reviews
        sample_reviews = [
            {
                "external_review_id": "rev1",
                "author": "User One",
                "rating": 5.0,
                "review_text": "Amazing stay!",
                "review_date": "2024-01-01",
                "review_title": "Great"
            },
            {
                "external_review_id": "rev2",
                "author": "User Two",
                "rating": 4.0,
                "review_text": "Good stay.",
                "review_date": "2024-01-02",
                "review_title": "Good"
            }
        ]
        
        # 3. Call finalize_and_replicate
        SourceService.finalize_and_replicate(
            url=url,
            primary_source_id=primary_id,
            reviews=sample_reviews,
            save_db_func=save_reviews_to_db,
            deduplicator_func=clean_tripadvisor_duplicates,
            leftover_reviews=[]
        )
        
        # 4. Verify primary source has reviews
        primary_reviews = db_session.query(Review).filter(Review.source_id == primary_id).all()
        assert len(primary_reviews) == 2
        
        # 5. Verify companion source has reviews (Replication check)
        companion_reviews = db_session.query(Review).filter(Review.source_id == companion_id).all()
        assert len(companion_reviews) == 2
        
        # 6. Verify details are saved
        details = db_session.query(TripAdvisorReviewDetail).all()
        assert len(details) == 4
    
def test_finalize_and_replicate_with_duplicates(db_session):
    """
    Verify that replication doesn't create duplicates if a companion already has the review.
    """
    db_session.close = MagicMock()
    
    with patch("services.source_service.notify_backend_sync_status"), \
         patch("services.source_service.get_session", return_value=db_session), \
         patch("platforms.tripadvisor.models.get_session", return_value=db_session), \
         patch("core.database.get_session", return_value=db_session):
             
        url = "https://www.tripadvisor.com/Duplicate_Test"
        primary_id = str(uuid.uuid4())
        companion_id = str(uuid.uuid4())
        
        db_session.add(Source(source_id=primary_id, source_url=url, platform_name="tripadvisor"))
        db_session.add(Source(source_id=companion_id, source_url=url, platform_name="tripadvisor"))
        db_session.commit()
        
        # Pre-insert one review for companion
        existing_review = Review(source_id=companion_id, platform_review_id="shared_rev")
        db_session.add(existing_review)
        db_session.commit()
        
        sample_reviews = [{
            "external_review_id": "shared_rev",
            "author": "Dup Author",
            "rating": 3.0,
            "review_text": "Duplicate me?",
            "review_date": "2024-01-01"
        }]
        
        # Run finalize
        SourceService.finalize_and_replicate(
            url=url,
            primary_source_id=primary_id,
            reviews=sample_reviews,
            save_db_func=save_reviews_to_db,
            deduplicator_func=clean_tripadvisor_duplicates
        )
        
        # Verify primary got it
        assert db_session.query(Review).filter(Review.source_id == primary_id).count() == 1
        
        # Verify companion still has only 1 (didn't add another)
        assert db_session.query(Review).filter(Review.source_id == companion_id).count() == 1
