"""
Test Suite — Scraper Engine API
================================
Tests for all API endpoints after the source-centric redesign.
Run with: pytest tests/ -v

These tests require a running server on http://127.0.0.1:8001.
Start the server with: uvicorn api.main:app --host 127.0.0.1 --port 8001
"""

import requests
import sys

BASE_URL = "http://127.0.0.1:8001/api"

# ── Helpers ──
passed = 0
failed = 0


def test(
    method: str, path: str, body: dict = None, expect_status: int = 200
) -> dict | None:
    """Fire an HTTP request and validate the status code."""
    global passed, failed
    url = f"{BASE_URL}{path}"
    label = f"{method.upper()} {path}"

    try:
        if method.upper() == "GET":
            resp = requests.get(url, timeout=10)
        elif method.upper() == "POST":
            resp = requests.post(url, json=body, timeout=10)
        elif method.upper() == "DELETE":
            resp = requests.delete(url, timeout=10)
        else:
            print(f"  ❌ Unknown HTTP method: {method}")
            failed += 1
            return None

        if resp.status_code == expect_status:
            print(f"  ✅ {label} → {resp.status_code}")
            passed += 1
            return resp.json() if resp.text else None
        else:
            print(f"  ❌ {label} → {resp.status_code} (expected {expect_status})")
            print(f"     Response: {resp.text[:300]}")
            failed += 1
            return None
    except requests.exceptions.ConnectionError:
        print(f"  ❌ {label} → Connection refused (is the server running?)")
        failed += 1
        return None


def run_all_tests():
    global passed, failed

    # ═══════════════════════════════════════════
    # 1. System Health
    # ═══════════════════════════════════════════
    print("\n═══ System Health ═══")
    test("GET", "/system/health")
    test("GET", "/system/metrics")
    test("GET", "/system/pool")
    test("GET", "/system/jobs")
    test("GET", "/system/jobs/all")

    # ═══════════════════════════════════════════
    # 2. Sources — create via scrape upsert
    # ═══════════════════════════════════════════
    print("\n═══ Scrape Triggers (Source Upsert) ═══")
    # Note: These tests will actually try to scrape, so we just validate the API response
    agoda_result = test(
        "POST",
        "/agoda/scrape",
        {
            "source_id": 9901,
            "source_url": "https://www.agoda.com/test-hotel",
            "headless": True,
            "pages": "1",
        },
    )

    booking_result = test(
        "POST",
        "/booking/scrape",
        {
            "source_id": 9902,
            "source_url": "https://www.booking.com/hotel/test",
            "headless": True,
            "pages": "1",
        },
    )

    google_result = test(
        "POST",
        "/google/scrape",
        {
            "source_id": 9903,
            "source_url": "https://maps.app.goo.gl/test123",
            "headless": True,
            "pages": "1",
        },
    )

    tripadvisor_result = test(
        "POST",
        "/tripadvisor/scrape",
        {
            "source_id": 9904,
            "source_url": "https://www.tripadvisor.com/Hotel-test",
            "headless": True,
            "pages": "1",
        },
    )

    # ═══════════════════════════════════════════
    # 3. Sources CRUD
    # ═══════════════════════════════════════════
    print("\n═══ Sources CRUD ═══")
    test("GET", "/sources")
    test("GET", "/sources/9901")
    test("GET", "/sources/99999", expect_status=404)  # Should not exist

    # ═══════════════════════════════════════════
    # 4. Reviews Retrieval
    # ═══════════════════════════════════════════
    print("\n═══ Reviews Retrieval ═══")
    test("GET", "/reviews/9901")
    test("GET", "/reviews/9902")
    test("GET", "/reviews/9903")
    test("GET", "/reviews/9904")
    test("GET", "/reviews/99999", expect_status=404)

    # ═══════════════════════════════════════════
    # 5. DB Admin
    # ═══════════════════════════════════════════
    print("\n═══ Database Admin ═══")
    test("GET", "/db/stats")

    # ═══════════════════════════════════════════
    # 6. Cleanup — delete test sources
    # ═══════════════════════════════════════════
    print("\n═══ Cleanup ═══")
    test("DELETE", "/sources/9901")
    test("DELETE", "/sources/9902")
    test("DELETE", "/sources/9903")
    test("DELETE", "/sources/9904")

    # Verify deletion
    test("GET", "/sources/9901", expect_status=404)

    # ═══════════════════════════════════════════
    # Summary
    # ═══════════════════════════════════════════
    print(f"\n{'═' * 40}")
    print(f"  Results: {passed} passed, {failed} failed")
    print(f"{'═' * 40}")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    exit_code = run_all_tests()
    sys.exit(exit_code)
