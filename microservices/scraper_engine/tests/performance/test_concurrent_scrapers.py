import pytest
import concurrent.futures
from platforms.tripadvisor.logic import scrape_tripadvisor
from tests.performance.resource_monitor import ResourceMonitor

def run_single_scrape(url, source_id):
    return scrape_tripadvisor(
        url=url,
        headless=True,
        pages="1",
        source_id=source_id
    )

def test_concurrent_scraper_load(mock_server):
    """Test system stability under concurrent scraper load."""
    concurrency = 3 # Start small for local testing
    monitor = ResourceMonitor(interval=0.2)
    monitor.start()
    
    urls = [f"{mock_server}/tripadvisor/sample_reviews.html" for _ in range(concurrency)]
    source_ids = [f"perf-test-{i}" for i in range(concurrency)]
    
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        future_to_id = {executor.submit(run_single_scrape, urls[i], source_ids[i]): source_ids[i] for i in range(concurrency)}
        for future in concurrent.futures.as_completed(future_to_id):
            results.append(future.result())
    
    stats = monitor.stop()
    
    # Assertions
    assert len(results) == concurrency
    assert all(r["status"] == "success" for r in results)
    
    print(f"\n--- Concurrency Level: {concurrency} ---")
    print(f"Peak Memory: {stats['peak_memory_mb']:.2f} MB")
    print(f"Peak CPU: {stats['peak_cpu_percent']:.2f}%")
    print(f"Average Memory: {stats['avg_memory_mb']:.2f} MB")
    
    # Heuristic: Each chromium instance + python overhead should be < 500MB (very conservative)
    # Adjust based on your machine's capabilities
    assert stats["peak_memory_mb"] < 1500 # 1.5GB total for 3 instances
