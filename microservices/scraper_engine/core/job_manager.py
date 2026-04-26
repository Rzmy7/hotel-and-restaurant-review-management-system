import uuid
import math
import datetime
import json
import os
from typing import Dict, Any, List


class JobStatus:
    PENDING = "pending"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class JobManager:
    def __init__(self, persistence_file="jobs_state.json"):
        # In-memory dictionary to hold live job states
        self.persistence_file = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "..", persistence_file
        )
        self.jobs: Dict[str, Dict[str, Any]] = {}
        self._load()

    def _load(self):
        if os.path.exists(self.persistence_file):
            try:
                with open(self.persistence_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    # Handle jobs that were active when the server died
                    for jid, jdata in data.items():
                        if jdata.get("status") in [
                            JobStatus.PENDING,
                            JobStatus.QUEUED,
                            JobStatus.RUNNING,
                        ]:
                            jdata["status"] = JobStatus.FAILED
                            jdata["progress"] = "Job aborted due to engine restart."
                    self.jobs = data
            except Exception as e:
                print(f"[JobManager] Failed to load jobs persistence: {e}")

    def _save(self):
        try:
            with open(self.persistence_file, "w", encoding="utf-8") as f:
                json.dump(self.jobs, f)
        except Exception as e:
            print(f"[JobManager] Failed to save jobs persistence: {e}")

    def create_job(self, platform: str, url: str) -> str:
        """Initializes a new background task state and returns a unique Job ID."""
        job_id = str(uuid.uuid4())
        self.jobs[job_id] = {
            "id": job_id,
            "platform": platform,
            "url": url,
            "status": JobStatus.PENDING,
            "progress": "Initializing browser...",
            "current_page": 0,
            "total_pages": 0,
            "reviews_extracted": 0,
            "total_reviews": 0,
            "percentage": 0.0,
            "created_at": datetime.datetime.now().isoformat(),
            "ended_at": None,
        }
        self._save()
        return job_id

    def update_job(self, job_id: str, **kwargs):
        """
        Safely mutates the memory block for a target job.
        Accepts: status, progress, reviews, current_page, total_pages, total_reviews
        Automatically recomputes the 'percentage' field after every update.
        """
        if job_id not in self.jobs:
            return

        job = self.jobs[job_id]

        if "status" in kwargs and kwargs["status"]:
            job["status"] = kwargs["status"]
        if "progress" in kwargs and kwargs["progress"]:
            job["progress"] = kwargs["progress"]
        if "reviews" in kwargs and kwargs["reviews"] is not None:
            job["reviews_extracted"] = kwargs["reviews"]
        if "current_page" in kwargs and kwargs["current_page"] is not None:
            job["current_page"] = kwargs["current_page"]
        if "total_pages" in kwargs and kwargs["total_pages"] is not None:
            job["total_pages"] = kwargs["total_pages"]
        if "total_reviews" in kwargs and kwargs["total_reviews"] is not None:
            job["total_reviews"] = kwargs["total_reviews"]

        # Auto-compute percentage from whichever dimension is available
        pct = 0.0

        if job["status"] == JobStatus.COMPLETED:
            pct = 100.0
        elif job["total_pages"] > 0:
            # Page-based progress is the most reliable indicator
            # current_page starts at 0, so (current_page + 1) / total_pages gives current progress
            pct = round(((job["current_page"] + 1) / job["total_pages"]) * 100, 1)
        elif job["total_reviews"] > 0 and job["reviews_extracted"] > 0:
            # Fallback to review-count-based progress
            pct = round((job["reviews_extracted"] / job["total_reviews"]) * 100, 1)

        # Give a tiny baseline progress if running so the bar shows up
        if job["status"] == JobStatus.RUNNING and pct < 1.0:
            pct = 1.0

        job["percentage"] = min(pct, 100.0)

        # Set ended_at when moving to a terminal state
        if job["status"] in [JobStatus.COMPLETED, JobStatus.FAILED] and not job.get(
            "ended_at"
        ):
            job["ended_at"] = datetime.datetime.now().isoformat()
        elif job["status"] not in [JobStatus.COMPLETED, JobStatus.FAILED]:
            # Reset ended_at if for some reason a job moves back to non-terminal
            job["ended_at"] = None

        self._save()

    def get_job(self, job_id: str) -> Dict[str, Any]:
        return self.jobs.get(job_id)

    def get_all_jobs(self) -> List[Dict[str, Any]]:
        return list(self.jobs.values())

    def get_active_jobs(self) -> List[Dict[str, Any]]:
        return [
            j
            for j in self.jobs.values()
            if j["status"] in [JobStatus.QUEUED, JobStatus.PENDING, JobStatus.RUNNING]
        ]

    def get_active_job_by_url(self, url: str) -> Dict[str, Any]:
        """Returns the first active job matching the target URL, if any."""
        for j in self.jobs.values():
            if j["url"] == url and j["status"] in [
                JobStatus.QUEUED,
                JobStatus.PENDING,
                JobStatus.RUNNING,
            ]:
                return j
        return None


# Global singleton
job_manager = JobManager()
