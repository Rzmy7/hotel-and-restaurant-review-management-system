import time
import uuid
import threading
from core.scrape_pool import ScrapePool
from core.job_manager import JobStatus, job_manager
from core.queue import job_queue


def dummy_task(job_id, duration, result_val):
    time.sleep(duration)
    job_manager.update_job(job_id, status=JobStatus.COMPLETED)
    return result_val


def test_fcfs_queueing():
    print(f"DEBUG: test_fcfs_queueing using job_manager at {id(job_manager)}")
    # Setup a pool with 1 worker to easily test queuing
    pool = ScrapePool(max_workers=1)

    # 1. Submit first job - should start immediately
    id1 = job_manager.create_job("agoda", "url1")
    pool.submit(id1, dummy_task, id1, 0.5, "res1")

    # Wait for it to transition to RUNNING
    for _ in range(10):
        if job_manager.get_job(id1)["status"] == JobStatus.RUNNING:
            break
        time.sleep(0.1)

    assert pool.active_count == 1
    assert job_manager.get_job(id1)["status"] == JobStatus.RUNNING

    # 2. Submit second job - should be QUEUED
    id2 = job_manager.create_job("booking", "url2")
    pool.submit(id2, dummy_task, id2, 0.2, "res2")

    assert pool.queued_count == 1
    assert job_manager.get_job(id2)["status"] == JobStatus.QUEUED

    # 3. Submit third job - should also be QUEUED (FCFS)
    id3 = job_manager.create_job("google", "url3")
    pool.submit(id3, dummy_task, id3, 0.1, "res3")

    assert pool.queued_count == 2
    assert pool.get_pool_status()["queue_ids"] == [id2, id3]

    # 4. Wait for first job to finish
    # After it finishes, it should pick id2
    print("Waiting for id1 to finish...")
    for _ in range(20):
        if job_manager.get_job(id1)["status"] == JobStatus.COMPLETED:
            break
        time.sleep(0.1)

    print(f"Job 1 Status: {job_manager.get_job(id1)['status']}")
    print(f"Job 2 Status: {job_manager.get_job(id2)['status']}")
    assert job_manager.get_job(id1)["status"] == JobStatus.COMPLETED

    # Wait for id2 to start
    for _ in range(10):
        if job_manager.get_job(id2)["status"] == JobStatus.RUNNING:
            break
        time.sleep(0.1)
    assert job_manager.get_job(id2)["status"] == JobStatus.RUNNING

    # 5. Wait for second job to finish
    print("Waiting for id2 to finish...")
    for _ in range(15):
        if job_manager.get_job(id2)["status"] == JobStatus.COMPLETED:
            break
        time.sleep(0.1)

    assert job_manager.get_job(id2)["status"] == JobStatus.COMPLETED

    # Wait for id3 to start
    for _ in range(10):
        if job_manager.get_job(id3)["status"] == JobStatus.RUNNING:
            break
        time.sleep(0.1)
    assert job_manager.get_job(id3)["status"] == JobStatus.RUNNING

    # 6. Final cleanup
    print("Waiting for id3 to finish...")
    for _ in range(15):
        if job_manager.get_job(id3)["status"] == JobStatus.COMPLETED:
            break
        time.sleep(0.1)
    assert job_manager.get_job(id3)["status"] == JobStatus.COMPLETED
    assert pool.active_count == 0


if __name__ == "__main__":
    import pytest

    print("Running FCFS Queue test...")
    test_fcfs_queueing()
    print("Test passed!")
