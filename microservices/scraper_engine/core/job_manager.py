import uuid
import math
import datetime
import json
import os
import threading
from typing import Dict, Any, List

class JobStatus:
    PENDING = "pending"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class JobManager:
    def __init__(self, persistence_file="jobs_state.json"):
        self._lock = threading.RLock()
        self.persistence_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", persistence_file)
        self.jobs: Dict[str, Dict[str, Any]] = {}
        self._load()

    def _persist_job_to_db(self, job_dict: Dict[str, Any]):
        """Persists or updates a single scraping job record in SQL Server."""
        try:
            from core.database import get_session
            from core.models import ScrapingJob
            session = get_session()
            try:
                created_at_dt = None
                if job_dict.get("created_at"):
                    try:
                        created_at_str = str(job_dict["created_at"]).replace("Z", "+00:00")
                        created_at_dt = datetime.datetime.fromisoformat(created_at_str)
                    except Exception:
                        created_at_dt = None

                ended_at_dt = None
                if job_dict.get("ended_at"):
                    try:
                        ended_at_str = str(job_dict["ended_at"]).replace("Z", "+00:00")
                        ended_at_dt = datetime.datetime.fromisoformat(ended_at_str)
                    except Exception:
                        ended_at_dt = None

                db_job = session.query(ScrapingJob).filter_by(id=job_dict["id"]).first()
                if not db_job:
                    db_job = ScrapingJob(
                        id=job_dict["id"],
                        platform=job_dict.get("platform", "unknown"),
                        url=job_dict.get("url", ""),
                        status=job_dict.get("status", JobStatus.PENDING),
                        progress=job_dict.get("progress", ""),
                        current_page=int(job_dict.get("current_page") or 0),
                        total_pages=int(job_dict.get("total_pages") or 0),
                        reviews_extracted=int(job_dict.get("reviews_extracted") or 0),
                        total_reviews=int(job_dict.get("total_reviews") or 0),
                        percentage=float(job_dict.get("percentage") or 0.0),
                        created_at=created_at_dt or datetime.datetime.now(datetime.timezone.utc),
                        ended_at=ended_at_dt,
                    )
                    session.add(db_job)
                else:
                    if "platform" in job_dict: db_job.platform = job_dict["platform"]
                    if "url" in job_dict: db_job.url = job_dict["url"]
                    if "status" in job_dict: db_job.status = job_dict["status"]
                    if "progress" in job_dict: db_job.progress = job_dict["progress"]
                    if "current_page" in job_dict and job_dict["current_page"] is not None: db_job.current_page = int(job_dict["current_page"])
                    if "total_pages" in job_dict and job_dict["total_pages"] is not None: db_job.total_pages = int(job_dict["total_pages"])
                    if "reviews_extracted" in job_dict and job_dict["reviews_extracted"] is not None: db_job.reviews_extracted = int(job_dict["reviews_extracted"])
                    if "total_reviews" in job_dict and job_dict["total_reviews"] is not None: db_job.total_reviews = int(job_dict["total_reviews"])
                    if "percentage" in job_dict and job_dict["percentage"] is not None: db_job.percentage = float(job_dict["percentage"])
                    if ended_at_dt is not None:
                        db_job.ended_at = ended_at_dt
                session.commit()
            finally:
                session.close()
        except Exception as e:
            # Non-blocking if database is temporarily unavailable during startup/tests
            pass

    def _load(self):
        with self._lock:
            # 1. Primary source of truth: Load from SQL Server database table
            try:
                from core.database import get_session
                from core.models import ScrapingJob
                session = get_session()
                try:
                    db_jobs = session.query(ScrapingJob).order_by(ScrapingJob.created_at.asc()).all()
                    needs_commit = False
                    for dj in db_jobs:
                        job_dict = {
                            "id": dj.id,
                            "platform": dj.platform,
                            "url": dj.url,
                            "status": dj.status,
                            "progress": dj.progress,
                            "current_page": dj.current_page or 0,
                            "total_pages": dj.total_pages or 0,
                            "reviews_extracted": dj.reviews_extracted or 0,
                            "total_reviews": dj.total_reviews or 0,
                            "percentage": float(dj.percentage or 0.0),
                            "created_at": dj.created_at.isoformat() if dj.created_at else None,
                            "ended_at": dj.ended_at.isoformat() if dj.ended_at else None,
                        }
                        # Handle jobs that were interrupted when the server died/restarted
                        if job_dict.get("status") in [JobStatus.PENDING, JobStatus.QUEUED, JobStatus.RUNNING]:
                            job_dict["status"] = JobStatus.FAILED
                            job_dict["progress"] = "Job aborted due to engine restart."
                            if not job_dict.get("ended_at"):
                                job_dict["ended_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
                            dj.status = JobStatus.FAILED
                            dj.progress = "Job aborted due to engine restart."
                            dj.ended_at = datetime.datetime.now(datetime.timezone.utc)
                            needs_commit = True
                        self.jobs[dj.id] = job_dict
                    if needs_commit:
                        session.commit()
                finally:
                    session.close()
            except Exception as e:
                print(f"[JobManager] DB load failed or table not ready yet: {e}")

            # 2. Merge with persistence file (JSON fallback and cache)
            if os.path.exists(self.persistence_file):
                try:
                    with open(self.persistence_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        for jid, jdata in data.items():
                            if jid not in self.jobs:
                                if jdata.get("status") in [JobStatus.PENDING, JobStatus.QUEUED, JobStatus.RUNNING]:
                                    jdata["status"] = JobStatus.FAILED
                                    jdata["progress"] = "Job aborted due to engine restart."
                                    if not jdata.get("ended_at"):
                                        jdata["ended_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
                                self.jobs[jid] = jdata
                                self._persist_job_to_db(jdata)
                except Exception as e:
                    print(f"[JobManager] Failed to load jobs persistence file: {e}")

            self._save_file()

    def _save_file(self):
        try:
            with open(self.persistence_file, "w", encoding="utf-8") as f:
                json.dump(self.jobs, f)
        except Exception as e:
            print(f"[JobManager] Failed to save jobs persistence file: {e}")

    def create_job(self, platform: str, url: str) -> str:
        """Initializes a new background task state and returns a unique Job ID."""
        job_id = str(uuid.uuid4())
        with self._lock:
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
                "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "ended_at": None
            }
            self._persist_job_to_db(self.jobs[job_id])
            self._save_file()
        return job_id

    def create_job_with_id(self, job_id: str, platform: str, url: str) -> Dict[str, Any]:
        """Initializes a new background task state with a predefined Job ID."""
        with self._lock:
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
                "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "ended_at": None
            }
            self._persist_job_to_db(self.jobs[job_id])
            self._save_file()
            return self.jobs[job_id]

    def update_job(self, job_id: str, **kwargs):
        """
        Safely mutates the memory block and DB for a target job.
        Accepts: status, progress, reviews, current_page, total_pages, total_reviews
        Automatically recomputes the 'percentage' field after every update.
        """
        with self._lock:
            if job_id not in self.jobs:
                return
            
            job = self.jobs[job_id]
            
            # Ensure default keys are present to avoid KeyError
            for key, val in {
                "status": JobStatus.PENDING,
                "progress": "Initializing...",
                "current_page": 0,
                "total_pages": 0,
                "reviews_extracted": 0,
                "total_reviews": 0,
                "percentage": 0.0
            }.items():
                job.setdefault(key, val)
            
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
                pct = round(((job["current_page"] + 1) / job["total_pages"]) * 100, 1)
            elif job["total_reviews"] > 0 and job["reviews_extracted"] > 0:
                pct = round((job["reviews_extracted"] / job["total_reviews"]) * 100, 1)
            
            if job["status"] == JobStatus.RUNNING and pct < 1.0:
                pct = 1.0

            job["percentage"] = min(pct, 100.0)

            # Set ended_at when moving to a terminal state
            if job["status"] in [JobStatus.COMPLETED, JobStatus.FAILED] and not job.get("ended_at"):
                job["ended_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
            elif job["status"] not in [JobStatus.COMPLETED, JobStatus.FAILED]:
                job["ended_at"] = None

            self._persist_job_to_db(job)
            self._save_file()

    def get_job(self, job_id: str) -> Dict[str, Any]:
        with self._lock:
            return self.jobs.get(job_id)

    def get_all_jobs(self) -> List[Dict[str, Any]]:
        with self._lock:
            if not self.jobs:
                self._load()
            return list(self.jobs.values())

    def get_active_jobs(self) -> List[Dict[str, Any]]:
        with self._lock:
            return [j for j in self.jobs.values() if j["status"] in [JobStatus.QUEUED, JobStatus.PENDING, JobStatus.RUNNING]]

    def get_active_job_by_url(self, url: str) -> Dict[str, Any]:
        """Returns the first active job matching the target URL, if any."""
        with self._lock:
            for j in self.jobs.values():
                if j["url"] == url and j["status"] in [JobStatus.QUEUED, JobStatus.PENDING, JobStatus.RUNNING]:
                    return j
            return None

# Global singleton
job_manager = JobManager()

