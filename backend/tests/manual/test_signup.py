import urllib.request
import json
import traceback

data = json.dumps(
    {"name": "Alice Johnson", "email": "alice@example.com", "password": "password123"}
).encode()
req = urllib.request.Request(
    "http://localhost:8000/auth/signup",
    data=data,
    headers={"Content-Type": "application/json"},
)

try:
    resp = urllib.request.urlopen(req)
    print("SUCCESS:")
    print(resp.read().decode())
except urllib.error.HTTPError as e:
    print(f"HTTP ERROR: {e.code}")
    print(e.read().decode())
except Exception as e:
    print(f"ERROR: {e}")
    traceback.print_exc()
