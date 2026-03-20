import threading
from collections import deque
from typing import Dict, Any, List, Optional, Callable

class QueuedJob:
    """Represents a job waiting in the queue."""
    def __init__(self, job_id: str, platform: str, fn: Callable, args: tuple, kwargs: dict):
        self.job_id = job_id
        self.platform = platform
        self.fn = fn
        self.args = args
        self.kwargs = kwargs

class JobQueue:
    """
    Thread-safe FCFS Queue for scraping jobs.
    Manages jobs that exceed the scrape pool's max concurrency.
    """
    def __init__(self):
        self._queue = deque()
        self._lock = threading.Lock()

    def push(self, job_id: str, platform: str, fn: Callable, *args, **kwargs):
        """Adds a job to the end of the queue."""
        with self._lock:
            self._queue.append(QueuedJob(job_id, platform, fn, args, kwargs))

    def pop(self) -> Optional[QueuedJob]:
        """Removes and returns the first job in the queue."""
        with self._lock:
            if not self._queue:
                return None
            return self._queue.popleft()

    def peek(self) -> Optional[QueuedJob]:
        """Returns the first job without removing it."""
        with self._lock:
            if not self._queue:
                return None
            return self._queue[0]

    @property
    def size(self) -> int:
        """Current number of items in the queue."""
        with self._lock:
            return len(self._queue)

    def get_all_queued_ids(self) -> List[str]:
        """Returns a list of all job IDs currently in the queue."""
        with self._lock:
            return [job.job_id for job in self._queue]

    def remove(self, job_id: str) -> bool:
        """Removes a specific job from the queue (e.g. if cancelled)."""
        with self._lock:
            for i, job in enumerate(self._queue):
                if job.job_id == job_id:
                    del self._queue[i]
                    return True
        return False

# Global singleton
job_queue = JobQueue()
