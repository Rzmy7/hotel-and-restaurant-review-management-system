import pytest
from platforms.tripadvisor.logic import scrape_tripadvisor
from tests.performance.resource_monitor import ResourceMonitor
import gc

def test_scraper_memory_stability(mock_server):
    """Run scraper multiple times to check for memory leaks."""
    url = f"{mock_server}/tripadvisor/sample_reviews.html"
    iterations = 5
    monitor = ResourceMonitor(interval=0.5)
    monitor.start()
    
    baseline_mem = monitor.process.memory_info().rss / (1024 * 1024)
    mem_readings = []
    
    for i in range(iterations):
        scrape_tripadvisor(url=url, headless=True, pages="1", source_id=f"leak-test-{i}")
        # Force garbage collection
        gc.collect()
        current_mem = monitor.process.memory_info().rss / (1024 * 1024)
        mem_readings.append(current_mem)
        print(f"Iteration {i+1}: {current_mem:.2f} MB")
        
    stats = monitor.stop()
    
    # Check if memory at the end is significantly higher than at the start
    # Allow some growth for internal caches but should not double/triple
    final_mem = mem_readings[-1]
    growth = final_mem - baseline_mem
    
    print(f"\n--- Memory Leak Test ({iterations} iterations) ---")
    print(f"Baseline: {baseline_mem:.2f} MB")
    print(f"Final: {final_mem:.2f} MB")
    print(f"Growth: {growth:.2f} MB")
    
    # Threshold: Growth should be less than 100MB over 5 runs (conservative)
    assert growth < 100
