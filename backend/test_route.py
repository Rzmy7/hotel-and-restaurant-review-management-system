from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

response = client.get("/api/notifications/me/unread-count?userId=781c6c67-58dd-4746-ba72-903b93abcc59")
print(f"Status: {response.status_code}")
print(f"Body: {response.text}")

response2 = client.get("/api/admin/notifications/unread-count?userId=781c6c67-58dd-4746-ba72-903b93abcc59")
print(f"Admin Status: {response2.status_code}")
print(f"Admin Body: {response2.text}")
