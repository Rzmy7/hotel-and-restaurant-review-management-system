import httpx
import json

source_id = "ca97b51f-e1e4-405e-9e7e-3964a51eda1a"
url = f"http://127.0.0.1:8000/api/source/tasks/{source_id}/sync-status"
payload = {
    "status": "RUNNING",
    "new_review_count": 0
}

try:
    response = httpx.post(url, json=payload, timeout=10)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
