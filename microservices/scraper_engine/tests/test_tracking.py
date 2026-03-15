import urllib.request
import json
import time

def test_api():
    print("Triggering Background Scraper via API...")
    payload = json.dumps({"url": "https://www.booking.com/hotel/lk/the-villa-in-lavinia.en-gb.html", "headless": True, "pages": "1"}).encode('utf-8')
    req = urllib.request.Request("http://127.0.0.1:8000/booking/scrape", data=payload, headers={'Content-Type': 'application/json'}, method="POST")
    
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            print(f"API Response: {data}")
            job_id = data.get("job_id")
    except Exception as e:
        print(f"Failed to trigger scraper: {e}")
        return

    print("\nSimulating frontend waiting for websocket init...")
    time.sleep(3)

    print("\nPolling System Jobs API Endpoint:")
    try:
        req_jobs = urllib.request.Request("http://127.0.0.1:8000/api/v1/system/jobs")
        with urllib.request.urlopen(req_jobs) as response:
            jobs_data = json.loads(response.read().decode())
            print(json.dumps(jobs_data, indent=2))
    except Exception as e:
        print(f"Failed to fetch jobs: {e}")

if __name__ == "__main__":
    test_api()
