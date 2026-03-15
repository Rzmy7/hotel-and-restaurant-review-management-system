"""Comprehensive test for all API endpoints."""
import urllib.request
import json

BASE = "http://127.0.0.1:8000"

def test(method, path, body=None):
    url = f"{BASE}{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method)
    if body:
        req.add_header("Content-Type", "application/json")
    try:
        resp = urllib.request.urlopen(req)
        result = json.loads(resp.read())
        summary = json.dumps(result, indent=2, ensure_ascii=False)[:400]
        print(f"  OK  {method} {path}")
        print(f"       {summary}\n")
        return result
    except Exception as e:
        body_text = getattr(e, 'read', lambda: b'')().decode()[:200]
        print(f"  FAIL {method} {path} -> {e}")
        print(f"       {body_text}\n")
        return None

print("=" * 60)
print("1. SOURCES")
print("=" * 60)
test("GET", "/api/v1/sources")

print("=" * 60)
print("2. DB STATS")
print("=" * 60)
test("GET", "/api/v1/db/stats")

print("=" * 60)
print("3. CREATE ORG + SOURCES (single call)")
print("=" * 60)
org = test("POST", "/api/v1/organizations", {
    "organization_name": "Hilton Colombo",
    "sources": [
        {"platform": "Booking", "url": "https://www.booking.com/hotel/lk/hilton-colombo.html"},
        {"platform": "Agoda", "url": "https://www.agoda.com/hilton-colombo"},
        {"platform": "Google", "url": "https://maps.app.goo.gl/hilton123"}
    ]
})

if org:
    oid = org["organization_id"]

    print("=" * 60)
    print("4. GET ORG DETAIL")
    print("=" * 60)
    test("GET", f"/api/v1/organizations/{oid}")

    print("=" * 60)
    print("5. LIST ORG SOURCES")
    print("=" * 60)
    test("GET", f"/api/v1/organizations/{oid}/sources")

    print("=" * 60)
    print("6. ORG STATS")
    print("=" * 60)
    test("GET", f"/api/v1/organizations/{oid}/stats")

    print("=" * 60)
    print("7. ORG REVIEWS")
    print("=" * 60)
    test("GET", f"/api/v1/organizations/{oid}/reviews")

    print("=" * 60)
    print("8. UPDATE ORG")
    print("=" * 60)
    test("PUT", f"/api/v1/organizations/{oid}", {"organization_name": "Hilton Colombo Residence"})

    print("=" * 60)
    print("9. UNLINK SOURCE (Google)")
    print("=" * 60)
    test("DELETE", f"/api/v1/organizations/{oid}/sources/Google")

    print("=" * 60)
    print("10. ADD SOURCE BACK")
    print("=" * 60)
    test("POST", f"/api/v1/organizations/{oid}/sources", {"platform": "Google", "url": "https://maps.app.goo.gl/new123"})

    print("=" * 60)
    print("11. LIST ALL ORGS")
    print("=" * 60)
    test("GET", "/api/v1/organizations")

    print("=" * 60)
    print("12. GLOBAL REVIEWS (all platforms)")
    print("=" * 60)
    test("GET", "/api/v1/reviews?limit=5")

    print("=" * 60)
    print("13. DELETE ORG (cleanup)")
    print("=" * 60)
    test("DELETE", f"/api/v1/organizations/{oid}")

print("=" * 60)
print("14. PLATFORM ENDPOINTS (backward compat)")
print("=" * 60)
test("GET", "/agoda/reviews?limit=1")
test("GET", "/booking/reviews?limit=1")
test("GET", "/google/reviews?limit=1")

print("=" * 60)
print("15. SOURCES DETAIL")
print("=" * 60)
test("GET", "/api/v1/sources/1")

print("\n*** ALL TESTS COMPLETE ***")
