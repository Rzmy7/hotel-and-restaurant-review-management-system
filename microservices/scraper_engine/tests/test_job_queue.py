import time
import uuid
from core.scrape_pool import ScrapePool
from core.job_manager import JobStatus, job_manager
from core.throttler import throttler
from core.config import config

def dummy_task(job_id, duration, result_val):
    time.sleep(duration)
    job_manager.update_job(job_id, status=JobStatus.COMPLETED)
    return result_val

def test_fcfs_queueing():
    # Reset throttler and config delays to avoid interference from other tests
    throttler._last_run = {}
    orig_google = config.delay_google
    orig_agoda = config.delay_agoda
    orig_booking = config.delay_booking
    config.delay_google = 0
    config.delay_agoda = 0
    config.delay_booking = 0
    
    try:
        # Setup a pool with 1 worker to easily test queuing
        pool = ScrapePool(max_workers=1)
        
        # 1. Submit first job - should start immediately
        id1 = job_manager.create_job("agoda", "url1")
        pool.submit(id1, dummy_task, id1, 0.5, "res1", platform="agoda")

        # Wait for it to transition to RUNNING
        started = False
        for _ in range(30):
            if job_manager.get_job(id1)["status"] == JobStatus.RUNNING:
                started = True
                break
            time.sleep(0.1)

        assert started, f"Job 1 should be RUNNING, got {job_manager.get_job(id1)['status']}"
        assert pool.active_count == 1

        # 2. Submit second job - should be QUEUED
        id2 = job_manager.create_job("booking", "url2")
        pool.submit(id2, dummy_task, id2, 0.2, "res2", platform="booking")

        assert pool.queued_count == 1
        assert job_manager.get_job(id2)["status"] == JobStatus.QUEUED

        # 3. Submit third job - should also be QUEUED (FCFS)
        id3 = job_manager.create_job("google", "url3")
        pool.submit(id3, dummy_task, id3, 0.1, "res3", platform="google")

        assert pool.queued_count == 2
        assert pool.get_pool_status()["queue_ids"] == [id2, id3]

        # 4. Wait for first job to finish
        # After it finishes, it should pick id2
        finished = False
        for _ in range(50):
            if job_manager.get_job(id1)["status"] == JobStatus.COMPLETED:
                finished = True
                break
            time.sleep(0.1)

        assert finished, "Job 1 should be COMPLETED"

        # Wait for id2 to start (give the queue processor time)
        id2_started = False
        for _ in range(50):
            if job_manager.get_job(id2)["status"] == JobStatus.RUNNING:
                id2_started = True
                break
            time.sleep(0.1)
        
        assert id2_started, f"Job 2 should be RUNNING, got {job_manager.get_job(id2)['status']}"

        # 5. Wait for second job to finish
        for _ in range(50):
            if job_manager.get_job(id2)["status"] == JobStatus.COMPLETED:
                break
            time.sleep(0.1)

        assert job_manager.get_job(id2)["status"] == JobStatus.COMPLETED

        # Wait for id3 to start
        id3_started = False
        for _ in range(50):
            if job_manager.get_job(id3)["status"] == JobStatus.RUNNING:
                id3_started = True
                break
            time.sleep(0.1)
        assert id3_started

        # 6. Final cleanup
        for _ in range(50):
            if job_manager.get_job(id3)["status"] == JobStatus.COMPLETED:
                break
            time.sleep(0.1)
        assert job_manager.get_job(id3)["status"] == JobStatus.COMPLETED
        assert pool.active_count == 0
    finally:
        # Restore config
        config.delay_google = orig_google
        config.delay_agoda = orig_agoda
        config.delay_booking = orig_booking
        # Shutdown pool to stop background threads
        pool.shutdown(wait=False)
