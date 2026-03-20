import uuid
import math
import datetime
from typing import Dict, Any, List

class JobStatus:
    PENDING = "pending"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class JobManager:
    def __init__(self):
        # In-memory dictionary to hold live job states
        self.jobs: Dict[str, Dict[str, Any]] = {}

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
            "created_at": datetime.datetime.now().isoformat()
        }
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
        elif job["total_pages"] > 0 and job["current_page"] > 0:
            # Page-based progress is the most reliable indicator
            pct = round((job["current_page"] / job["total_pages"]) * 100, 1)
        elif job["total_reviews"] > 0 and job["reviews_extracted"] > 0:
            # Fallback to review-count-based progress
            pct = round((job["reviews_extracted"] / job["total_reviews"]) * 100, 1)
        
        job["percentage"] = min(pct, 100.0)

    def get_job(self, job_id: str) -> Dict[str, Any]:
        return self.jobs.get(job_id)

    def get_all_jobs(self) -> List[Dict[str, Any]]:
        return list(self.jobs.values())

    def get_active_jobs(self) -> List[Dict[str, Any]]:
        return [j for j in self.jobs.values() if j["status"] in [JobStatus.QUEUED, JobStatus.PENDING, JobStatus.RUNNING]]

# Global singleton
job_manager = JobManager()
