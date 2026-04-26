from core.database import get_session
from core.models import Source
from core.utils import notify_backend_sync_status, setup_logger

logger = setup_logger("status_service")


class StatusService:
    """
    Centralized service to handle sync status updates and broadcasting
    to all sources sharing a specific URL.
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
    def broadcast_completed(url: str, new_review_count: int):
        """Notifies the backend that all sources for a URL have COMPLETED."""
        session = get_session()
        try:
            sources = session.query(Source).filter_by(source_url=url).all()
            for source in sources:
                notify_backend_sync_status(
                    source.source_id, "COMPLETED", new_review_count
                )
        except Exception as e:
            logger.error(f"Error broadcasting COMPLETED status for {url}: {e}")
        finally:
            session.close()

    @staticmethod
    def broadcast_failed(url: str, error_message: str):
        """Notifies the backend that all sources for a URL have FAILED."""
        session = get_session()
        try:
            sources = session.query(Source).filter_by(source_url=url).all()
            for source in sources:
                notify_backend_sync_status(
                    source.source_id, "FAILED", error_message=error_message
                )
        except Exception as e:
            logger.error(f"Error broadcasting FAILED status for {url}: {e}")
        finally:
            session.close()

    @staticmethod
    def notify_single(
        source_id: str,
        status: str,
        new_review_count: int = 0,
        error_message: str = None,
    ):
        """Helper for single-source status updates (e.g. when attaching)."""
        notify_backend_sync_status(source_id, status, new_review_count, error_message)
