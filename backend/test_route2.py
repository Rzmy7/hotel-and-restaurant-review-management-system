from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

response = client.options("/api/notifications/me/unread-count?userId=781c6c67-58dd-4746-ba72-903b93abcc59")
print(f"OPTIONS Status: {response.status_code}")
