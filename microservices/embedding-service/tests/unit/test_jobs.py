"""
Unit tests for app.jobs — job tracking (add, update, get_recent).

Uses a temporary jobs file to avoid writing to the real jobs.json.
"""

import json
import time
from datetime import datetime, timedelta
from unittest.mock import patch

import pytest

from app.jobs import add_job, update_job, get_recent_jobs, jobs_queue


# ── Helper: reset jobs_queue before each test ────────────────────────

@pytest.fixture(autouse=True)
def clear_jobs_queue(temp_jobs_file):
    """Clear in-memory queue and redirect file to temp path."""
    jobs_queue.clear()
    with patch("app.jobs.JOBS_FILE", str(temp_jobs_file)):
        yield


# ── add_job() ────────────────────────────────────────────────────────


class TestAddJob:
    """Tests for add_job()."""

    def test_returns_job_dict(self, temp_jobs_file):
        with patch("app.jobs.JOBS_FILE", str(temp_jobs_file)):
            job = add_job("j1", "Review")
            assert isinstance(job, dict)
            assert job["id"] == "j1"
            assert job["type"] == "Review"
            assert job["status"] == "Running"
            assert job["progress"] == 0

    def test_job_has_timestamp(self, temp_jobs_file):
        with patch("app.jobs.JOBS_FILE", str(temp_jobs_file)):
            job = add_job("j2", "Regulation")
            assert "timestamp" in job
            # Should be ISO format
            datetime.fromisoformat(job["timestamp"])

    def test_job_has_started_at(self, temp_jobs_file):
        with patch("app.jobs.JOBS_FILE", str(temp_jobs_file)):
            job = add_job("j3", "Review")
            assert "started_at" in job
            assert isinstance(job["started_at"], float)

    def test_job_id_formatted(self, temp_jobs_file):
        with patch("app.jobs.JOBS_FILE", str(temp_jobs_file)):
            job = add_job("abc123", "Review")
            assert job["jobId"] == "#job_abc123"

    def test_default_duration_is_dash(self, temp_jobs_file):
        with patch("app.jobs.JOBS_FILE", str(temp_jobs_file)):
            job = add_job("j4", "Review")
            assert job["duration"] == "-"

    def test_custom_initial_status(self, temp_jobs_file):
        with patch("app.jobs.JOBS_FILE", str(temp_jobs_file)):
            job = add_job("j5", "Review", "Queued", 50)
            assert job["status"] == "Queued"
            assert job["progress"] == 50

    def test_persists_to_file(self, temp_jobs_file):
        with patch("app.jobs.JOBS_FILE", str(temp_jobs_file)):
            add_job("j6", "Review")
            data = json.loads(temp_jobs_file.read_text())
            assert len(data) == 1
            assert data[0]["id"] == "j6"

    def test_multiple_jobs_accumulate(self, temp_jobs_file):
        with patch("app.jobs.JOBS_FILE", str(temp_jobs_file)):
            add_job("j7", "Review")
            add_job("j8", "Regulation")
            add_job("j9", "Re-index")
            assert len(jobs_queue) == 3


# ── update_job() ─────────────────────────────────────────────────────


class TestUpdateJob:
    """Tests for update_job()."""

    def test_updates_status(self, temp_jobs_file):
        with patch("app.jobs.JOBS_FILE", str(temp_jobs_file)):
            add_job("j10", "Review")
            update_job("j10", "Completed", 100, "2.5s")
            job = list(jobs_queue)[-1]
            assert job["status"] == "Completed"
            assert job["progress"] == 100
            assert job["duration"] == "2.5s"

    def test_updates_progress(self, temp_jobs_file):
        with patch("app.jobs.JOBS_FILE", str(temp_jobs_file)):
            add_job("j11", "Review")
            update_job("j11", "Running", 50)
            job = list(jobs_queue)[-1]
            assert job["progress"] == 50

    def test_auto_calculates_duration_on_complete(self, temp_jobs_file):
        with patch("app.jobs.JOBS_FILE", str(temp_jobs_file)):
            add_job("j12", "Review")
            # Small sleep to get a non-zero duration
            update_job("j12", "Completed")
            job = list(jobs_queue)[-1]
            assert job["duration"] != "-"
            assert "s" in job["duration"]

    def test_auto_calculates_duration_on_failure(self, temp_jobs_file):
        with patch("app.jobs.JOBS_FILE", str(temp_jobs_file)):
            add_job("j13", "Review")
            update_job("j13", "Failed")
            job = list(jobs_queue)[-1]
            assert job["duration"] != "-"

    def test_nonexistent_job_id_no_crash(self, temp_jobs_file):
        """Updating a non-existent job should not raise."""
        with patch("app.jobs.JOBS_FILE", str(temp_jobs_file)):
            update_job("nonexistent", "Completed", 100)  # No exception


# ── get_recent_jobs() ────────────────────────────────────────────────


class TestGetRecentJobs:
    """Tests for get_recent_jobs()."""

    def test_empty_queue_returns_empty(self, temp_jobs_file):
        with patch("app.jobs.JOBS_FILE", str(temp_jobs_file)):
            result = get_recent_jobs()
            assert result["jobs"] == []
            assert result["total"] == 0
            assert result["total_pages"] == 1

    def test_returns_most_recent_first(self, temp_jobs_file):
        with patch("app.jobs.JOBS_FILE", str(temp_jobs_file)):
            add_job("first", "Review")
            add_job("second", "Regulation")
            add_job("third", "Re-index")
            result = get_recent_jobs()
            assert result["jobs"][0]["id"] == "third"
            assert result["jobs"][-1]["id"] == "first"

    def test_respects_page_size(self, temp_jobs_file):
        with patch("app.jobs.JOBS_FILE", str(temp_jobs_file)):
            for i in range(10):
                add_job(f"j{i}", "Review")
            result = get_recent_jobs(page=1, page_size=3)
            assert len(result["jobs"]) == 3
            assert result["total"] == 10
            assert result["total_pages"] == 4

    def test_formats_timestamp_just_now(self, temp_jobs_file):
        """Recent jobs should show 'Just now'."""
        with patch("app.jobs.JOBS_FILE", str(temp_jobs_file)):
            add_job("recent", "Review")
            result = get_recent_jobs()
            assert result["jobs"][0]["timestamp"] == "Just now"

    def test_paused_service_shows_paused_status(self, temp_jobs_file, temp_config_file):
        """Running jobs should show 'Paused' when service is paused."""
        with patch("app.jobs.JOBS_FILE", str(temp_jobs_file)), \
             patch("app.config.CONFIG_FILE", temp_config_file):
            from app.config import set_service_paused
            add_job("running_job", "Review", "Running", 50)
            set_service_paused(True)
            result = get_recent_jobs()
            assert result["jobs"][0]["status"] == "Paused"

    def test_completed_jobs_not_affected_by_pause(self, temp_jobs_file, temp_config_file):
        """Completed jobs should stay Completed even when paused."""
        with patch("app.jobs.JOBS_FILE", str(temp_jobs_file)), \
             patch("app.config.CONFIG_FILE", temp_config_file):
            from app.config import set_service_paused
            add_job("done_job", "Review")
            update_job("done_job", "Completed", 100, "1.0s")
            set_service_paused(True)
            result = get_recent_jobs()
            assert result["jobs"][0]["status"] == "Completed"

    def test_does_not_mutate_originals(self, temp_jobs_file):
        """get_recent_jobs should return copies, not mutate originals."""
        with patch("app.jobs.JOBS_FILE", str(temp_jobs_file)):
            add_job("orig", "Review")
            original_timestamp = list(jobs_queue)[-1]["timestamp"]
            get_recent_jobs()  # This formats timestamps
            assert list(jobs_queue)[-1]["timestamp"] == original_timestamp

    def test_pagination_second_page(self, temp_jobs_file):
        """Page 2 should return the correct slice of jobs."""
        with patch("app.jobs.JOBS_FILE", str(temp_jobs_file)):
            for i in range(5):
                add_job(f"j{i}", "Review")
            result = get_recent_jobs(page=2, page_size=2)
            assert len(result["jobs"]) == 2
            assert result["page"] == 2
