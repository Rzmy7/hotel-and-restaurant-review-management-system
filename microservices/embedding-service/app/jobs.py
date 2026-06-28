"""
Job tracking for embedding service
"""
from datetime import datetime
from typing import List, Dict
from collections import deque
import json
import os

# Job storage file
JOBS_FILE = os.path.join(os.path.dirname(__file__), "..", "jobs.json")

# In-memory job storage (persist to file)
jobs_queue = deque(maxlen=500)  # Keep last 500 jobs

def _load_jobs():
    """Load jobs from file on startup"""
    global jobs_queue
    if os.path.exists(JOBS_FILE):
        try:
            with open(JOBS_FILE, 'r') as f:
                jobs_data = json.load(f)
                jobs_queue = deque(jobs_data, maxlen=500)
                print(f"Loaded {len(jobs_queue)} jobs from {JOBS_FILE}")
        except Exception as e:
            print(f"Failed to load jobs: {e}")

def _save_jobs():
    """Save jobs to file"""
    try:
        with open(JOBS_FILE, 'w') as f:
            json.dump(list(jobs_queue), f, indent=2)
    except Exception as e:
        print(f"Failed to save jobs: {e}")

# Load jobs on module import
_load_jobs()

def add_job(job_id: str, job_type: str, status: str = "Running", progress: int = 0):
    """Add a new job to the tracking queue"""
    job = {
        "id": job_id,
        "jobId": f"#job_{job_id}",
        "type": job_type,
        "status": status,
        "progress": progress,
        "duration": "-",
        "timestamp": datetime.now().isoformat(),
        "started_at": datetime.now().timestamp()
    }
    jobs_queue.append(job)
    _save_jobs()  # Persist to file
    return job

def update_job(job_id: str, status: str, progress: int = 100, duration: str = None):
    """Update an existing job"""
    for job in jobs_queue:
        if job["id"] == job_id:
            job["status"] = status
            job["progress"] = progress
            if duration:
                job["duration"] = duration
            elif status in ["Completed", "Failed"]:
                elapsed = datetime.now().timestamp() - job["started_at"]
                job["duration"] = f"{elapsed:.1f}s"
            break
    _save_jobs()  # Persist to file

def get_recent_jobs(page: int = 1, page_size: int = 10) -> Dict:
    """Get jobs with pagination. Returns {jobs, total, page, page_size, total_pages}."""
    from app.config import is_service_paused
    
    jobs_list = list(jobs_queue)
    jobs_list.reverse()  # Most recent first
    
    total = len(jobs_list)
    total_pages = max(1, (total + page_size - 1) // page_size)
    
    # Clamp page
    page = max(1, min(page, total_pages))
    
    # Slice for current page
    start = (page - 1) * page_size
    end = start + page_size
    page_jobs = jobs_list[start:end]
    
    # Check if service is paused
    service_paused = is_service_paused()
    
    # Create formatted copies for frontend (don't mutate originals)
    formatted_jobs = []
    for job in page_jobs:
        job_copy = job.copy()
        
        # If service is paused and job is running, show as paused
        if service_paused and job_copy["status"] == "Running":
            job_copy["status"] = "Paused"
        
        # Send the raw ISO timestamp - the frontend formatDateTime utility
        # will format it correctly in the user's timezone.
        # Ensure the timestamp field is always a valid ISO string.
        if "timestamp" not in job_copy or not job_copy["timestamp"]:
            job_copy["timestamp"] = datetime.now().isoformat()
        
        formatted_jobs.append(job_copy)
    
    return {
        "jobs": formatted_jobs,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }
