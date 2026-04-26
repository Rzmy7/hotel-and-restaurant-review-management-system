import requests

url = "http://127.0.0.1:8001/api/agoda/scrape"
payload = {
    "source_id": "123e4567-e89b-12d3-a456-426614174000",
    "source_url": "https://www.agoda.com/example",
    "headless": True,
    "pages": "1",
}

response = requests.post(url, json=payload)
print(f"Status Code: {response.status_code}")
print(f"Response: {response.text}")
