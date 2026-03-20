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
from core.queue import job_queue
from core.job_manager import job_manager, JobStatus

logger = setup_logger("scrape_pool")

# Default max concurrent scrape jobs — change via set_max_workers()
DEFAULT_MAX_WORKERS = 7


class ScrapePool:
    """
    Centralized thread pool for all scraping operations.
    - Manages an explicit JobQueue for First-Come-First-Serve (FCFS).
    - Submits up to `max_workers` to the ThreadPoolExecutor.
    - Excess jobs stay in the queue until slots free up.
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
        
        # After resizing, we might have new slots available
        self._process_queue()

    def submit(self, job_id: str, fn: Callable, *args, **kwargs) -> str:
        """
        Submit a scrape job to the pool. 
        If slots are available, it runs immediately.
        Otherwise, it is added to the FCFS queue.
        """
        source_id = kwargs.get("source_id")
        with self._lock:
            # If we have free slots, submit immediately
            if self.active_count < self._max_workers:
                self._submit_to_executor(job_id, fn, *args, **kwargs)
                return job_id
        
        # Otherwise, add to the explicit queue
        job_manager.update_job(job_id, status=JobStatus.QUEUED, progress=f"Queued — position: {job_queue.size + 1}")
        job_queue.push(job_id, kwargs.get("platform", "unknown"), fn, *args, **kwargs)
        
        # Notify backend that job is QUEUED
        if source_id:
            from core.utils import notify_backend_sync_status
            notify_backend_sync_status(source_id, "QUEUED")
            
        logger.info(f"Job {job_id} added to queue (Pool busy: {self.active_count}/{self._max_workers})")
        return job_id

    def _submit_to_executor(self, job_id: str, fn: Callable, *args, **kwargs):
        """Internal helper to wrap and submit a job to the ThreadPoolExecutor."""
        job_manager.update_job(job_id, status=JobStatus.PENDING, progress="Preparing to run...")
        source_id = kwargs.get("source_id")

        def _wrapped():
            import asyncio
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.set_event_loop(asyncio.new_event_loop())
            except RuntimeError:
                pass

            try:
                job_manager.update_job(job_id, status=JobStatus.RUNNING, progress="Scraper starting...")
                
                # Notify backend that job is RUNNING
                if source_id:
                    from core.utils import notify_backend_sync_status
                    notify_backend_sync_status(source_id, "RUNNING")
                
                result = fn(*args, **kwargs)
                return result
            except BaseException as e:
                logger.error(f"Job {job_id} failed: {e}", exc_info=True)
                job_manager.update_job(job_id, status=JobStatus.FAILED, progress=f"Error: {type(e).__name__}")
                
                # Notify backend that job has FAILED
                if source_id:
                    from core.utils import notify_backend_sync_status
                    notify_backend_sync_status(source_id, "FAILED", error_message=str(e))
                
                raise
            finally:
                with self._lock:
                    self._futures.pop(job_id, None)
                self._process_queue()

        future = self._executor.submit(_wrapped)
        self._futures[job_id] = future
        logger.info(f"Job {job_id} started (Active: {self.active_count}/{self._max_workers})")

    def _process_queue(self):
        """Pick the next job from the queue and submit it if slots are available."""
        with self._lock:
            while self.active_count < self._max_workers:
                next_job = job_queue.pop()
                if not next_job:
                    break
                
                logger.info(f"Picking Job {next_job.job_id} from queue...")
                self._submit_to_executor(
                    next_job.job_id, 
                    next_job.fn, 
                    *next_job.args, 
                    **next_job.kwargs
                )

    @property
    def active_count(self) -> int:
        """Number of jobs currently running in the executor."""
        # Note: self._futures only contains jobs that have been submitted to the executor
        return sum(1 for f in self._futures.values() if not f.done())

    @property
    def queued_count(self) -> int:
        """Number of jobs waiting in the explicit queue."""
        return job_queue.size

    @property
    def total_pending(self) -> int:
        """Total jobs (running + queued)."""
        return self.active_count + self.queued_count

    def get_pool_status(self) -> dict:
        """Returns current pool and queue statistics."""
        return {
            "max_workers": self._max_workers,
            "active_jobs": self.active_count,
            "queued_jobs": self.queued_count,
            "total_pending": self.total_pending,
            "queue_ids": job_queue.get_all_queued_ids()
        }

    def shutdown(self, wait: bool = True):
        """Shut down the pool. If wait=True, waits for all jobs to finish."""
        logger.info(f"Shutting down ScrapePool (wait={wait})")
        self._executor.shutdown(wait=wait)


# Global singleton
scrape_pool = ScrapePool(max_workers=DEFAULT_MAX_WORKERS)
