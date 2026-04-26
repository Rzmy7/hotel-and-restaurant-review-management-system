import pytest
import time
from platforms.tripadvisor.logic import scrape_tripadvisor
from tests.performance.resource_monitor import ResourceMonitor

def test_headless_vs_headful_efficiency(mock_server):
    """Compare resource consumption between headless and headful modes."""
    url = f"{mock_server}/tripadvisor/sample_reviews.html"
    
    # Headless Run
    monitor_headless = ResourceMonitor(interval=0.1)
    monitor_headless.start()
    start_time = time.time()
    scrape_tripadvisor(url=url, headless=True, pages="1", source_id="perf-headless")
    end_time = time.time()
    stats_headless = monitor_headless.stop()
    duration_headless = end_time - start_time
    
    # Headful Run
    monitor_headful = ResourceMonitor(interval=0.1)
    monitor_headful.start()
    start_time = time.time()
    scrape_tripadvisor(url=url, headless=False, pages="1", source_id="perf-headful")
    end_time = time.time()
    stats_headful = monitor_headful.stop()
    duration_headful = end_time - start_time
    
    print("\n--- Headless vs Headful Comparison ---")
    print(f"Mode      | Duration | Peak RAM  | Peak CPU")
    print(f"----------|----------|-----------|---------")
    print(f"Headless  | {duration_headless:8.2f}s | {stats_headless['peak_memory_mb']:8.2f}MB | {stats_headless['peak_cpu_percent']:7.1f}%")
    print(f"Headful   | {duration_headful:8.2f}s | {stats_headful['peak_memory_mb']:8.2f}MB | {stats_headful['peak_cpu_percent']:7.1f}%")
    
    # Expectation: Headless is generally faster and lighter
    # We won't assert strictly on duration as it's jittery, but we check RAM
    assert stats_headless["peak_memory_mb"] <= stats_headful["peak_memory_mb"] * 1.2 
