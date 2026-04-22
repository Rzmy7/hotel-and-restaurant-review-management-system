
from core.database import get_session
from core.models import Source
from core.utils import notify_backend_sync_status, setup_logger, identify_new_reviews
from platforms.booking.storage import save_to_json # Used for backup replication

logger = setup_logger("source_service")

class SourceService:
    """
    Centralized service to handle source lifecycle management,
    including status broadcasting and data replication for shared URLs.
    """

    @staticmethod
    def broadcast_running(url: str):
        """Notifies the backend that all sources for a URL are now RUNNING."""
        session = get_session()
        try:
            sources = session.query(Source).filter_by(source_url=url).all()
            for source in sources:
                notify_backend_sync_status(source.source_id, "RUNNING")
        except Exception as e:
            logger.error(f"Error broadcasting RUNNING status for {url}: {e}")
        finally:
            session.close()

    @staticmethod
    def broadcast_failed(url: str, error_message: str):
        """Notifies the backend that all sources for a URL have FAILED."""
        session = get_session()
        try:
            sources = session.query(Source).filter_by(source_url=url).all()
            for source in sources:
                notify_backend_sync_status(source.source_id, "FAILED", error_message=error_message)
        except Exception as e:
            logger.error(f"Error broadcasting FAILED status for {url}: {e}")
        finally:
            session.close()

    @staticmethod
    def notify_single(source_id: str, status: str, new_review_count: int = 0, error_message: str = None):
        """Helper for single-source status updates (e.g. when attaching)."""
        notify_backend_sync_status(source_id, status, new_review_count, error_message)

    @staticmethod
    def finalize_and_replicate(url: str, primary_source_id: str, reviews: list, save_db_func, deduplicator_func=None):
        """
        Saves reviews for the primary source, replicates to all companion sources,
        performs deduplication for each, and notifies the backend of completion.
        """
        if not reviews:
            # Notify everyone of zero results
            StatusService.broadcast_completed_no_data(url)
            return

        session = get_session()
        try:
            # 1. Broadly find all sources for this URL
            all_sources = session.query(Source).filter_by(source_url=url).all()
            
            for source in all_sources:
                sid = str(source.source_id)
                logger.info(f"Finalizing data for source {sid}")
                
                try:
                    # Notify Verification phase
                    notify_backend_sync_status(sid, "VERIFY_DUPLICATION")
                    
                    # Save DB rows
                    save_db_func(reviews, sid)
                    
                    # Save JSON backup
                    save_to_json(reviews, sid)
                    
                    # Per-source Deduplication
                    sub_session = get_session()
                    new_count = 0
                    try:
                        if deduplicator_func:
                            deduplicator_func(sub_session, sid)
                        
                        # Identify new reviews
                        new_count, _ = identify_new_reviews(sub_session, sid, reviews)
                    finally:
                        sub_session.close()
                    
                    # Notify Completion
                    notify_backend_sync_status(sid, "COMPLETED", new_review_count=new_count)
                    
                except Exception as inner_e:
                    logger.error(f"Shared finalization failed for source {sid}: {inner_e}")
                    notify_backend_sync_status(sid, "FAILED", error_message=str(inner_e))

        except Exception as e:
            logger.error(f"Global finalization failure for {url}: {e}")
        finally:
            session.close()

    @staticmethod
    def broadcast_completed_no_data(url: str):
        """Helper for when a scrape finishes but zero reviews were found."""
        session = get_session()
        try:
            sources = session.query(Source).filter_by(source_url=url).all()
            for source in sources:
                notify_backend_sync_status(source.source_id, "COMPLETED", new_review_count=0)
        except Exception as e:
            logger.error(f"Error broadcasting COMPLETED (0) for {url}: {e}")
        finally:
            session.close()

class StatusService(SourceService): 
    """Alias for backwards compatibility if needed during refactor."""
    pass
