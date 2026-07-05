"""
Test Suite — URL Verification
==============================
Validates pre-scrape URL verification logic (domain mismatches, dead DNS, 404s).
Run with: python tests/test_url_verification.py
"""
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.endpoints.scrape import validate_source_url

def test_url_verification():
    print("Running URL verification unit tests...")

    # Case 1: Valid URLs (Note: We assume google.com is active, we just check domain logic & no-exception)
    is_valid, msg = validate_source_url("google", "https://www.google.com")
    assert is_valid is True, f"Failed on valid booking URL: {msg}"
    print("  [OK] Passed valid URL check.")

    # Case 2: Domain mismatch
    is_valid, msg = validate_source_url("booking", "https://www.agoda.com/test-hotel")
    assert is_valid is False
    assert "does not match expected platform" in msg
    print("  [OK] Correctly caught domain mismatch.")

    # Case 3: Completely invalid / unparseable
    is_valid, msg = validate_source_url("agoda", "not-even-a-url")
    assert is_valid is False
    assert "Invalid URL format" in msg
    print("  [OK] Correctly caught malformed URL.")

    # Case 4: Reachability DNS failure
    is_valid, msg = validate_source_url("agoda", "https://www.this-is-not-a-real-domain-agoda-1234567.com")
    assert is_valid is False
    assert "Unreachable domain or DNS failure" in msg
    print("  [OK] Correctly caught dead DNS.")

    # Case 5: 404 Not Found (using google platform as booking.com returns 200 on nonexistent links due to anti-bot challenges)
    is_valid, msg = validate_source_url("google", "https://www.google.com/nonexistent-hotel-page-999999")
    assert is_valid is False
    assert "HTTP 404" in msg
    print("  [OK] Correctly caught HTTP 404 Not Found.")

    print("\nAll URL verification unit tests passed successfully!")

if __name__ == "__main__":
    test_url_verification()
