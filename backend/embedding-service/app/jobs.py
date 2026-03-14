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
jobs_queue = deque(maxlen=100)  # Keep last 100 jobs

def _load_jobs():
    """Load jobs from file on startup"""
    global jobs_queue
    if os.path.exists(JOBS_FILE):
        try:
            with open(JOBS_FILE, 'r') as f:
                jobs_data = json.load(f)
                jobs_queue = deque(jobs_data, maxlen=100)
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

def get_recent_jobs(limit: int = 10) -> List[Dict]:
    """Get recent jobs, limited to specified number"""
    from app.config import is_service_paused
    
    jobs_list = list(jobs_queue)
    jobs_list.reverse()  # Most recent first
    
    # Check if service is paused
    service_paused = is_service_paused()
    
    # Create formatted copies for frontend (don't mutate originals)
    formatted_jobs = []
    for job in jobs_list[:limit]:  # Ensure we only return 'limit' number of jobs
        job_copy = job.copy()
        
        # If service is paused and job is running, show as paused
        if service_paused and job_copy["status"] == "Running":
            job_copy["status"] = "Paused"
        
        job_time = datetime.fromisoformat(job_copy["timestamp"])
        now = datetime.now()
        diff = (now - job_time).total_seconds()
        
        if diff < 60:
            job_copy["timestamp"] = "Just now"
        elif diff < 3600:
            mins = int(diff / 60)
            job_copy["timestamp"] = f"{mins} mins ago" if mins > 1 else "1 min ago"
        elif diff < 86400:
            hours = int(diff / 3600)
            job_copy["timestamp"] = f"{hours} hours ago" if hours > 1 else "1 hour ago"
        else:
            days = int(diff / 86400)
            job_copy["timestamp"] = f"{days} days ago" if days > 1 else "1 day ago"
        
        formatted_jobs.append(job_copy)
    
    return formatted_jobs
