"""
Scrape Pool — Thread Pool Executor for Concurrent Scraping
===========================================================
All scrape jobs go through this centralized pool. The pool has a configurable
max concurrency (default 7). Jobs beyond the limit are queued automatically
by the ThreadPoolExecutor and executed as slots free up.
"""
import threading
from concurrent.futures import ThreadPoolExecutor, Future
from typing import Dict, Callable, Any
from core.config import setup_logger
from core.job_manager import job_manager, JobStatus

logger = setup_logger("scrape_pool")

# Default max concurrent scrape jobs — change via set_max_workers()
DEFAULT_MAX_WORKERS = 7


class ScrapePool:
    """
    Centralized thread pool for all scraping operations.
    - Processes up to `max_workers` jobs simultaneously
    - Excess jobs are automatically queued by the executor
    - Tracks futures for status reporting
    """

    def __init__(self, max_workers: int = DEFAULT_MAX_WORKERS):
        self._max_workers = max_workers
        self._executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="scraper")
        self._futures: Dict[str, Future] = {}
        self._lock = threading.Lock()
        logger.info(f"ScrapePool initialized with max_workers={max_workers}")

    @property
    def max_workers(self) -> int:
        return self._max_workers

    def set_max_workers(self, count: int):
        """
        Resize the pool. Creates a new executor (existing running jobs
        continue to completion in the old pool).
        """
        logger.info(f"Resizing ScrapePool: {self._max_workers} → {count}")
        old_executor = self._executor
        self._max_workers = count
        self._executor = ThreadPoolExecutor(max_workers=count, thread_name_prefix="scraper")
        # Let old executor finish its running tasks gracefully
        old_executor.shutdown(wait=False)

    def submit(self, job_id: str, fn: Callable, *args, **kwargs) -> str:
        """
        Submit a scrape job to the pool. Returns the job_id.
        The job will execute immediately if a slot is available,
        otherwise it is queued and will run when a slot frees up.
        """
        job_manager.update_job(job_id, status=JobStatus.PENDING, progress="Queued — waiting for available slot...")

        def _wrapped():
            try:
                job_manager.update_job(job_id, status=JobStatus.RUNNING, progress="Scraper starting...")
                result = fn(*args, **kwargs)
                return result
            except Exception as e:
                logger.error(f"Job {job_id} failed: {e}", exc_info=True)
                job_manager.update_job(job_id, status=JobStatus.FAILED, progress=f"Error: {str(e)}")
                raise
            finally:
                with self._lock:
                    self._futures.pop(job_id, None)

        future = self._executor.submit(_wrapped)

        with self._lock:
            self._futures[job_id] = future

        logger.info(f"Job {job_id} submitted to pool ({self.active_count}/{self._max_workers} slots busy, {self.queued_count} queued)")
        return job_id

    @property
    def active_count(self) -> int:
        """Number of jobs currently running."""
        with self._lock:
            return sum(1 for f in self._futures.values() if f.running())

    @property
    def queued_count(self) -> int:
        """Number of jobs waiting in queue."""
        with self._lock:
            return sum(1 for f in self._futures.values() if not f.running() and not f.done())

    @property
    def total_pending(self) -> int:
        """Total jobs in the pool (running + queued)."""
        with self._lock:
            return sum(1 for f in self._futures.values() if not f.done())

    def get_pool_status(self) -> dict:
        """Returns current pool statistics."""
        return {
            "max_workers": self._max_workers,
            "active_jobs": self.active_count,
            "queued_jobs": self.queued_count,
            "total_pending": self.total_pending
        }

    def shutdown(self, wait: bool = True):
        """Shut down the pool. If wait=True, waits for all jobs to finish."""
        logger.info(f"Shutting down ScrapePool (wait={wait})")
        self._executor.shutdown(wait=wait)


# Global singleton
scrape_pool = ScrapePool(max_workers=DEFAULT_MAX_WORKERS)
