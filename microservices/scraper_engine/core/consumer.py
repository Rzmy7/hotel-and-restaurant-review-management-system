import pika
import json
import time
import logging
from core.config import config, setup_logger
from core.database import get_session
from core.models import Source
from core.job_manager import job_manager
from core.scrape_pool import scrape_pool
from core.utils import normalize_url
from services.source_service import SourceService

# Import scraper modules
from platforms.google.logic import scrape_google
from platforms.booking.logic import scrape_booking
from platforms.agoda.scraping.logic import scrape_agoda
from platforms.tripadvisor.logic import scrape_tripadvisor

logger = setup_logger("scraper_consumer")

# Map platform keys to logic functions
SCRAPE_FUNCTIONS = {
    "google": scrape_google,
    "booking": scrape_booking,
    "agoda": scrape_agoda,
    "tripadvisor": scrape_tripadvisor
}

def process_message(ch, method, properties, body):
    """Callback triggered on receiving a RabbitMQ message."""
    try:
        data = json.loads(body)
        job_id = data.get("job_id")
        source_id = data.get("source_id")
        source_url = data.get("source_url")
        platform = data.get("platform")
        
        if not all([job_id, source_id, source_url, platform]):
            logger.error(f"Invalid message format: {data}")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        logger.info(f"Consumed scrape job: job_id={job_id}, source_id={source_id}, url={source_url}, platform={platform}")
        
        # 1. Normalize the URL
        normalized_url = normalize_url(source_url)
        
        # 2. Get logic function
        scrape_func = SCRAPE_FUNCTIONS.get(platform.lower())
        if not scrape_func:
            logger.error(f"Unsupported platform: {platform}")
            SourceService.notify_single(source_id, "FAILED", error_message=f"Unsupported platform: {platform}")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        # 3. Upsert source in scraper local DB
        session = get_session()
        try:
            source = session.query(Source).filter_by(source_id=source_id).first()
            if not source:
                source = Source(
                    source_id=source_id,
                    source_url=normalized_url,
                    platform_name=platform.lower()
                )
                session.add(source)
            else:
                source.source_url = normalized_url
                source.platform_name = platform.lower()
            session.commit()
        except Exception as db_err:
            session.rollback()
            logger.error(f"Local source database upsert failed: {db_err}")
            SourceService.notify_single(source_id, "FAILED", error_message=f"Local DB sync failed: {str(db_err)}")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return
        finally:
            session.close()

        # 4. Check for active duplicate jobs to optimize scraping resources
        active_job = job_manager.get_active_job_by_url(normalized_url)
        if active_job:
            logger.info(f"Existing job {active_job['id']} found for {normalized_url}. Attaching source {source_id}.")
            SourceService.notify_single(source_id, "RUNNING")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        # 5. Submit new job to pool
        job_manager.create_job_with_id(job_id=job_id, platform=platform.lower(), url=normalized_url)
        scrape_pool.submit(
            job_id, scrape_func,
            url=normalized_url, headless=True, pages="*",
            job_id=job_id, source_id=source_id, platform=platform.lower()
        )
        logger.info(f"Successfully dispatched scrape job {job_id} to pool.")
        
        # Acknowledge completion of dispatch
        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        logger.error(f"Critical error processing message: {e}", exc_info=True)
        # Still ACK to prevent infinite poison pill loops, unless we want to retry
        try:
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception:
            pass

def run_rabbitmq_consumer():
    """Persistent RabbitMQ Consumer loop with retry logic."""
    logger.info("Starting RabbitMQ Consumer Worker...")
    
    while True:
        try:
            connection_params = pika.URLParameters(config.rabbitmq_url)
            connection = pika.BlockingConnection(connection_params)
            channel = connection.channel()
            
            # Ensure queue exists and is durable
            channel.queue_declare(queue="scraper_jobs", durable=True)
            
            # Set QOS prefetch limit to balance load
            channel.basic_qos(prefetch_count=1)
            
            logger.info("Successfully connected to RabbitMQ. Listening for jobs on queue 'scraper_jobs'...")
            channel.basic_consume(queue="scraper_jobs", on_message_callback=process_message)
            
            channel.start_consuming()
            
        except pika.exceptions.AMQPConnectionError as conn_err:
            logger.warning(f"RabbitMQ connection lost/failed: {conn_err}. Reconnecting in 5 seconds...")
            time.sleep(5)
        except Exception as e:
            logger.error(f"Unexpected consumer error: {e}. Reconnecting in 5 seconds...", exc_info=True)
            time.sleep(5)
