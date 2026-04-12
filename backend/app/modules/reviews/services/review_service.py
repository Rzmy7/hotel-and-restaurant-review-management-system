"""
Review Service — orchestrates review ingestion, analysis, and retrieval.
"""

from datetime import datetime
import json
import logging
import uuid
import httpx
from typing import List
from dateutil import parser as date_parser

import pyodbc
from app.core.pyodbc_connection import get_connection_string
from app.modules.reviews.repository import (
    upsert_review_pending,
    insert_review_media,
    fetch_all_reviews_enriched,
    count_reviews_raw,
    get_processing_metrics
)

# Ensure related models are registered in the SQLAlchemy registry
import app.modules.auth.models # noqa: F401
import app.modules.organization.models # noqa: F401
import app.modules.source.models # noqa: F401
import app.modules.reviews.models # noqa: F401

logger = logging.getLogger(__name__)


def get_all_reviews_from_db(organization_id: str) -> List[dict]:
    """Fetch all processed reviews with photos for a specific organization."""
    try:
        return fetch_all_reviews_enriched(organization_id)
    except Exception as e:
        logger.error(f"Failed to fetch reviews: {e}")
        raise e


async def ingest_from_scraper(source_id: uuid.UUID, organization_id: uuid.UUID, platform_id: int) -> int:
    """
    Fetches raw review data from the external Scraper Engine (port 8001)
    and stores them as 'pending' in the database.
    """
    scraper_url = f"http://127.0.0.1:8001/api/reviews/{source_id}"
    
    async with httpx.AsyncClient() as client:
        try:
            logger.info(f"Connecting to Scraper Engine at {scraper_url}...")
            response = await client.get(scraper_url, timeout=30.0)
            logger.info(f"Scraper Engine responded with status: {response.status_code}")
            response.raise_for_status()
            raw_data = response.json()
        except Exception as e:
            logger.error(f"!!! Scraper Engine communication FAILED for source {source_id}: {e}")
            return 0

    reviews = raw_data.get("data", [])
    count = 0
    
    # Defensive log file for ingestion troubleshooting
    debug_log_path = "ingest_debug.log"
    
    with pyodbc.connect(get_connection_string()) as conn:
        cursor = conn.cursor()
        for r_data in reviews:
            try:
                logger.info(f"RAW R_DATA: {json.dumps(r_data, indent=2)}")
                # Handle nested detail from Scraper Engine
                detail = r_data.get("detail", {})
                
                # Determine if we have split text (Booking.com) or single text
                pos = detail.get("positive_text")
                neg = detail.get("negative_text")
                raw_text = detail.get("review_text")

                # Parse dates robustly
                r_date = detail.get("review_date")
                r_date_obj = None
                if r_date:
                    try:
                        r_date_obj = date_parser.parse(str(r_date))
                    except:
                        r_date_obj = datetime.now()
                else:
                    r_date_obj = datetime.now()
                
                scraped_at = r_data.get("created_at")
                scraped_at_obj = None
                if scraped_at:
                    try:
                        scraped_at_obj = date_parser.parse(str(scraped_at))
                    except:
                        scraped_at_obj = datetime.now()
                else:
                    scraped_at_obj = datetime.now()

                # Map raw scraper data to our internal fields
                mapping = {
                    "platformReviewId": str(r_data.get("review_id")),
                    "rating": int(detail.get("rating", 0)),
                    "reviewerName": str(detail.get("author", "Guest")),
                    "text": raw_text if not (pos or neg) else None,
                    "positive_text": str(pos) if pos else None,
                    "negative_text": str(neg) if neg else None,
                    "heading": str(detail.get("review_heading")) if detail.get("review_heading") else None,
                    "reviewDate": r_date_obj,
                    "scrapedAt": scraped_at_obj,
                    "source_id": source_id,
                    "organization_id": organization_id,
                    "platform_id": int(platform_id)
                }
                
                # File-based emergency logging to bypass terminal truncation
                with open(debug_log_path, "a", encoding="utf-8") as f:
                    f.write(f"[{datetime.now()}] MAPPING: {json.dumps(mapping, default=str)}\n")

                # Insert as pending
                internal_id = upsert_review_pending(cursor, mapping)
                
                # Handle photos
                photos = r_data.get("photos", [])
                if photos:
                    insert_review_media(cursor, internal_id, photos)
                
                count += 1
            except Exception as ex:
                logger.error(f"Failed to ingest review {r_data.get('id')}: {ex}")
                continue
        
        conn.commit()
    
    logger.info(f"Ingestion SUMMARY: Saved {count} reviews as 'pending' for source {source_id}")
    return count


async def start_ingestion_and_processing_flow(source_id: uuid.UUID):
    """
    Full background flow:
    1. Ingest from Scraper (Raw -> Pending)
    2. Run AI Analysis (Pending -> Processed)
    """
    from app.modules.source.services.source_service import get_source_by_id
    from app.database.session import SessionLocal
    from app.modules.reviews.services.processor import run_analysis_pipeline
    
    db = SessionLocal()
    try:
        logger.info(f"--- Pipeline TRRIGERED for source {source_id} ---")
        # 1. Get source details to find organization_id
        source = get_source_by_id(db, source_id)
        if not source:
            logger.error(f"!!! Pipeline ABORTED: Source {source_id} not found in database.")
            return

        logger.info(f"Pipeline: Starting INGESTION for source {source_id}...")
        # 2. Ingest
        ingested_count = await ingest_from_scraper(source_id, source.organization_id, source.platform_id)
        
        if ingested_count > 0:
            logger.info(f"Pipeline: Starting AI ANALYSIS for {ingested_count} reviews...")
            # 3. Process
            await run_analysis_pipeline()
            logger.info(f"--- Pipeline COMPLETED for source {source_id} ---")
        else:
            logger.info(f"Pipeline: Skipping analysis (0 new reviews ingested).")
        
    except Exception as e:
        logger.error(f"!!! Pipeline CRITICAL FAILURE for source {source_id}: {e}", exc_info=True)
    finally:
        db.close()


def count_all_reviews() -> int:
    """Returns the total number of reviews in the database."""
    try:
        return count_reviews_raw()
    except Exception as e:
        logger.error(f"Count reviews failed: {e}")
        raise e


def get_processing_report(organization_id: str = None) -> dict:
    """
    Returns a report on review processing status (pending, processed, failed).
    """
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            metrics = get_processing_metrics(cursor, organization_id)
            
            # Simple health indicator
            health = "healthy"
            if metrics["failed"] > 0:
                health = "warning"
            if metrics["pending"] > 200: # Example threshold
                health = "congested"
                
            return {
                "metrics": metrics,
                "health": health,
                "timestamp": datetime.now().isoformat()
            }
    except Exception as e:
        logger.error(f"Failed to generate processing report: {e}")
        raise e
