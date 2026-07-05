import os
import json
import pika
from dotenv import load_dotenv

# Load env configurations
load_dotenv()
url = os.getenv("RABBITMQ_URL")
if not url:
    # Fallback to backend/.env if run from root
    load_dotenv("backend/.env")
    url = os.getenv("RABBITMQ_URL")

if not url:
    print("[ERROR] RABBITMQ_URL not found in environment or .env file.")
    exit(1)

print(f"Connecting to: {url[:30]}...")

try:
    # 1. Connect to RabbitMQ broker
    params = pika.URLParameters(url)
    params.connection_attempts = 1
    connection = pika.BlockingConnection(params)
    channel = connection.channel()
    
    # 2. Declare queue
    channel.queue_declare(queue="scraper_jobs", durable=True)
    print("[OK] Successfully connected to RabbitMQ and declared 'scraper_jobs' queue!")
    
    # 3. Publish a test verification job
    test_job = {
        "job_id": "verify-job-id-123",
        "source_id": "verify-source-id-123",
        "source_url": "https://www.google.com/maps/place/test",
        "platform": "google"
    }
    
    channel.basic_publish(
        exchange="",
        routing_key="scraper_jobs",
        body=json.dumps(test_job),
        properties=pika.BasicProperties(delivery_mode=2)
    )
    print("[OK] Successfully published test message to 'scraper_jobs' queue!")
    
    connection.close()
    print("[SUCCESS] Verification PASSED! Network connection and message dispatch are active.")
except Exception as e:
    print(f"[ERROR] Verification FAILED: {e}")
