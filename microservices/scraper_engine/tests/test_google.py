"""
Google Reviews Scraper – End-to-End Test
==========================================
Triggers a scrape on the provided Google Maps URL, waits for
the background task, then queries the database for results.
"""

import json
import time
import urllib.request

BASE = "http://127.0.0.1:8000"


def post(url, body):
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def get(url):
    with urllib.request.urlopen(url) as r:
        return json.loads(r.read())


print("=== STEP 1: Trigger Google Scrape ===")
resp = post(
    f"{BASE}/google/scrape",
    {
        "url": "https://maps.app.goo.gl/wtVgndgu1xVmSKks6",
        "headless": False,
        "pages": "20",  # Target first 20 reviews for quick test
    },
)
print(json.dumps(resp, indent=2))
job_id = resp.get("job_id", "")

print(f"\n=== STEP 2: Polling job {job_id} ===")
for i in range(60):
    time.sleep(5)
    try:
        jobs = get(f"{BASE}/api/v1/system/jobs")
        active = [j for j in jobs.get("jobs", []) if j["id"] == job_id]
        if active:
            j = active[0]
            print(
                f"  [{j['status'].upper()}] {j.get('percentage', 0)}% | {j.get('progress', '')} | Reviews: {j.get('reviews_extracted', 0)}"
            )
            if j["status"] in ("completed", "failed"):
                break
        else:
            print("  Job no longer active. Checking if completed...")
            break
    except Exception as e:
        print(f"  Poll error: {e}")

print(f"\n=== STEP 3: Query stored reviews ===")
try:
    reviews = get(f"{BASE}/google/reviews?limit=5")
    print(json.dumps(reviews, indent=2, ensure_ascii=False))
except Exception as e:
    print(f"  Error: {e}")

print("\nDone.")
