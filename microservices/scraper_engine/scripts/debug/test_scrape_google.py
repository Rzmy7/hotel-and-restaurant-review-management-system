import requests

url = "http://127.0.0.1:8001/api/google/scrape"
payload = {
    "source_id": "046abd4a-dfea-4a86-85d3-53bbda502845",
    "source_url": "https://maps.app.goo.gl/iPBSTNdB8BDkhQpEA",
    "headless": True,
    "pages": "*",
}

try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
