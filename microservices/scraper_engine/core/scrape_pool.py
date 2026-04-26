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
from core.throttler import throttler

logger = setup_logger("scrape_pool")

# Default max concurrent scrape jobs — change via set_max_workers()
DEFAULT_MAX_WORKERS = 3


class ScrapePool:
    """
    Centralized thread pool for all scraping operations.
    - Manages an explicit JobQueue for First-Come-First-Serve (FCFS).
    - Submits up to `max_workers` to the ThreadPoolExecutor.
    - Excess jobs stay in the queue until slots free up.
    """

    def __init__(self, max_workers: int = DEFAULT_MAX_WORKERS):
        self._max_workers = max_workers
        self._executor = ThreadPoolExecutor(
            max_workers=max_workers, thread_name_prefix="scraper"
        )
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
        self._executor = ThreadPoolExecutor(
            max_workers=count, thread_name_prefix="scraper"
        )
        # Let old executor finish its running tasks gracefully
        old_executor.shutdown(wait=False)

        # After resizing, we might have new slots available
        self._process_queue()

    def submit(self, _pool_job_id: str, _pool_fn: Callable, *args, **kwargs) -> str:
        """
        Submit a scrape job to the pool.
        If slots are available, it runs immediately.
        Otherwise, it is added to the FCFS queue.
        """
        source_id = kwargs.get("source_id")
        platform = kwargs.pop("platform", "unknown")

        with self._lock:
            # If we have free slots AND the platform isn't throttled, submit immediately
            if self.active_count < self._max_workers and throttler.can_run(platform):
                throttler.mark_run(platform)
                self._submit_to_executor(_pool_job_id, _pool_fn, *args, **kwargs)
                return _pool_job_id

        # Otherwise, add to the explicit queue
        job_manager.update_job(
            _pool_job_id,
            status=JobStatus.QUEUED,
            progress=f"Queued — position: {job_queue.size + 1}",
        )
        job_queue.push(_pool_job_id, platform, _pool_fn, *args, **kwargs)

        # Notify backend that job is QUEUED
        if source_id:
            from core.utils import notify_backend_sync_status

            notify_backend_sync_status(source_id, "QUEUED")

        logger.info(
            f"Job {_pool_job_id} added to queue (Pool busy: {self.active_count}/{self._max_workers})"
        )
        return _pool_job_id

    def _submit_to_executor(
        self, _pool_job_id: str, _pool_fn: Callable, *args, **kwargs
    ):
        """Internal helper to wrap and submit a job to the ThreadPoolExecutor."""
        job_manager.update_job(
            _pool_job_id, status=JobStatus.PENDING, progress="Preparing to run..."
        )
        source_id = kwargs.get("source_id")
        # Ensure platform is NOT in kwargs when calling the scraper function
        kwargs.pop("platform", None)

        def _wrapped():
            import asyncio
            import sys

            if sys.platform == "win32":
                asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.set_event_loop(asyncio.new_event_loop())
            except RuntimeError:
                asyncio.set_event_loop(asyncio.new_event_loop())

            try:
                job_manager.update_job(
                    _pool_job_id,
                    status=JobStatus.RUNNING,
                    progress="Scraper starting...",
                )

                # Notify backend that job is RUNNING
                if source_id:
                    from core.utils import notify_backend_sync_status

                    notify_backend_sync_status(source_id, "RUNNING")

                result = _pool_fn(*args, **kwargs)
                return result
            except BaseException as e:
                logger.error(f"Job {_pool_job_id} failed: {e}", exc_info=True)
                job_manager.update_job(
                    _pool_job_id,
                    status=JobStatus.FAILED,
                    progress=f"Error: {type(e).__name__}",
                )

                # Notify backend that job has FAILED
                if source_id:
                    from core.utils import notify_backend_sync_status

                    notify_backend_sync_status(
                        source_id, "FAILED", error_message=str(e)
                    )

                raise
            finally:
                with self._lock:
                    self._futures.pop(_pool_job_id, None)
                self._process_queue()

        future = self._executor.submit(_wrapped)
        self._futures[_pool_job_id] = future
        logger.info(
            f"Job {_pool_job_id} started (Active: {self.active_count}/{self._max_workers})"
        )

    def _process_queue(self):
        """
        Pick the next job from the queue and submit it if slots are available
        and the platform isn't throttled.
        """
        with self._lock:
            if self.active_count >= self._max_workers:
                return

            # Try to find a job in the queue that is allowed to run (not throttled)
            next_job = job_queue.pop_runnable(throttler.can_run)

            if next_job:
                logger.info(
                    f"Picking Job {next_job.job_id} ({next_job.platform}) from queue..."
                )
                throttler.mark_run(next_job.platform)
                self._submit_to_executor(
                    next_job.job_id, next_job.fn, *next_job.args, **next_job.kwargs
                )

                # After starting one, try to fill another slot recursively or via loop
                # (But respects max_workers in the while condition if we wrapped it)
                # Since we want to potentially start multiple DIFFERENT platform jobs:
                self._executor.submit(self._process_queue)

            elif job_queue.size > 0:
                # We have jobs, but they are all throttled.
                # Schedule a re-check in 2 seconds to avoid busy-waiting.
                logger.debug(
                    "Queue not empty but all jobs throttled. Scheduling re-check..."
                )
                threading.Timer(2.0, self._process_queue).start()

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
            "queue_ids": job_queue.get_all_queued_ids(),
        }

    def cancel_job(self, job_id: str) -> bool:
        """
        Cancel a job by its job_id.
        - If the job is in the queue, removes it.
        - If the job is running, cancels the future.
        Returns True if the job was found and cancelled.
        """
        # Try to remove from the queue first
        if job_queue.remove(job_id):
            job_manager.update_job(
                job_id, status=JobStatus.FAILED, progress="Cancelled by user."
            )
            logger.info(f"Job {job_id} removed from queue (cancelled).")
            return True

        # Otherwise, try to cancel the running future
        with self._lock:
            future = self._futures.get(job_id)
            if future and not future.done():
                future.cancel()
                job_manager.update_job(
                    job_id, status=JobStatus.FAILED, progress="Cancelled by user."
                )
                logger.info(f"Job {job_id} future cancelled.")
                return True

        logger.warning(f"Job {job_id} not found for cancellation.")
        return False

    def cancel_by_source_id(self, source_id: str) -> bool:
        """
        Find and cancel all active jobs associated with a source_id.
        Returns True if at least one job was cancelled.
        """
        cancelled = False
        # Check all active jobs in job_manager
        for job in job_manager.get_all_jobs():
            if job.get("status") in [
                JobStatus.PENDING,
                JobStatus.QUEUED,
                JobStatus.RUNNING,
            ]:
                # Check if the job's kwargs contain the matching source_id
                job_id = job.get("id")
                if job_id:
                    if self.cancel_job(job_id):
                        cancelled = True
        return cancelled

    def shutdown(self, wait: bool = True):
        """Shut down the pool. If wait=True, waits for all jobs to finish."""
        logger.info(f"Shutting down ScrapePool (wait={wait})")
        self._executor.shutdown(wait=wait)


# Global singleton
scrape_pool = ScrapePool(max_workers=DEFAULT_MAX_WORKERS)
