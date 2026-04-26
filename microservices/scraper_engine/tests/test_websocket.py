"""
WebSocket Job Tracker End-to-End Test
=====================================
This script:
1. Triggers a background scrape via POST /booking/scrape
2. Receives the job_id from the response
3. Connects to ws://127.0.0.1:8000/api/v1/ws/jobs/{job_id}
4. Streams live status updates until the job completes or fails

Prerequisites:
    pip install websockets

Usage:
    python tests/test_websocket.py
"""

import json
import asyncio
import urllib.request


async def test_websocket_stream():
    import websockets

    # Step 1: Trigger a background scrape
    print("=" * 60)
    print("STEP 1: Triggering background scrape via REST API...")
    print("=" * 60)

    payload = json.dumps(
        {
            "url": "https://www.booking.com/hotel/lk/the-villa-in-lavinia.en-gb.html",
            "headless": True,
            "pages": "1",
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        "http://127.0.0.1:8000/booking/scrape",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        job_id = data["job_id"]
        print(f"  Response: {json.dumps(data, indent=2)}")
        print(f"  Job ID: {job_id}")

    # Step 2: Connect to the WebSocket
    ws_url = f"ws://127.0.0.1:8000/api/v1/ws/jobs/{job_id}"
    print(f"\n{'=' * 60}")
    print(f"STEP 2: Connecting to WebSocket at {ws_url}")
    print(f"{'=' * 60}")

    async with websockets.connect(ws_url) as ws:
        print("  Connected! Streaming live updates...\n")
        while True:
            try:
                message = await asyncio.wait_for(ws.recv(), timeout=120)
                data = json.loads(message)
                status = data.get("status", "unknown")
                progress = data.get("progress", "")
                reviews = data.get("reviews_extracted", 0)
                pct = data.get("percentage", 0)
                cur_page = data.get("current_page", 0)
                tot_pages = data.get("total_pages", 0)
                tot_reviews = data.get("total_reviews", 0)

                print(
                    f"  [{status.upper()}] {pct}% | Page {cur_page}/{tot_pages} | Reviews: {reviews}/{tot_reviews} | {progress}"
                )

                if status in ["completed", "failed"]:
                    print(f"\n  Final state: {json.dumps(data, indent=2)}")
                    break

            except asyncio.TimeoutError:
                print("  Timed out waiting for updates.")
                break

    print(f"\n{'=' * 60}")
    print("TEST COMPLETE")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    asyncio.run(test_websocket_stream())
