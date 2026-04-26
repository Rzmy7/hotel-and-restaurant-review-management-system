"""
Review Service — orchestrates review ingestion, analysis, and retrieval.
Refactored to align with Phase 2 ORM migration while maintaining compatibility with legacy subscription checks.
"""

import json
import logging
import uuid
from datetime import datetime
from typing import Dict, List, Optional

import httpx
from dateutil import parser as date_parser
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.modules.reviews.repository import (
    fetch_all_reviews_enriched,
    insert_review_media,
    upsert_review_pending,
    count_reviews_raw,
    get_processing_metrics,
)

# Ensure related models are registered in the SQLAlchemy registry
import app.modules.auth.models  # noqa: F401
import app.modules.organization.models  # noqa: F401
import app.modules.reviews.models  # noqa: F401
import app.modules.source.models  # noqa: F401

logger = logging.getLogger(__name__)


def get_all_reviews_from_db(
    organization_id: str,
    page: int = 0,
    limit: int = 50,
    filters: Optional[dict] = None,
    db: Session = None,
) -> Dict:
    """Fetch processed reviews with photos for a specific organization, supporting pagination and filtering."""
    if db is None:
        db = SessionLocal()
        should_close = True
    else:
        should_close = False

    try:
        return fetch_all_reviews_enriched(
            organization_id, page=page, limit=limit, filters=filters, db=db
        )
    except Exception as e:
        logger.error(f"Failed to fetch reviews: {e}")
        raise e
    finally:
        if should_close:
            db.close()


async def ingest_from_scraper(
    source_id: uuid.UUID, organization_id: uuid.UUID, platform_id: int
) -> int:
    """
    Fetches raw review data from the external Scraper Engine (port 8001)
    and stores them as 'pending' in the database.
    Respects the user's review_count plan limit.
    """
    from app.core.config import SCRAPER_ENGINE_URL

    scraper_base = SCRAPER_ENGINE_URL
    base_scraper_url = f"{scraper_base}/api/reviews/{source_id}"
    all_reviews_data = []
    skip = 0
    batch_size = 1000
    total_on_server = 0

    async with httpx.AsyncClient() as client:
        while True:
            try:
                current_url = f"{base_scraper_url}?limit={batch_size}&skip={skip}"
                logger.info(
                    f"Fetching reviews page (skip={skip}) from {current_url}..."
                )
                response = await client.get(current_url, timeout=60.0)
                response.raise_for_status()
                page_data = response.json()

                batch = page_data.get("data", [])
                total_on_server = page_data.get("total", 0)

                if not batch:
                    break

                all_reviews_data.extend(batch)
                logger.info(
                    f"Received {len(batch)} reviews. Total so far: {len(all_reviews_data)}/{total_on_server}"
                )

                if len(all_reviews_data) >= total_on_server:
                    break

                skip += batch_size
            except Exception as e:
                logger.error(
                    f"!!! Scraper Engine communication FAILED at skip={skip} for source {source_id}: {e}"
                )
                break

    if not all_reviews_data:
        return 0

    reviews_to_process = all_reviews_data

    # ── Check review_count limit and truncate if needed (Using legacy pyodbc for subscription check) ──
    import pyodbc
    from app.core.pyodbc_connection import get_connection_string

    review_balance = None
    tenant_id = None
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            tenant_row = cursor.execute(
                "SELECT tenant_id FROM dbo.organization WHERE organization_id = ?",
                (str(organization_id),),
            ).fetchone()
            if tenant_row and tenant_row[0]:
                tenant_id = str(tenant_row[0])
                from app.modules.admin.services.subscription_service import (
                    check_feature_limit,
                )

                limit_info = check_feature_limit(cursor, tenant_id, "review_count")
                if limit_info["limit"] is not None:
                    review_balance = limit_info["balance"]
                    if review_balance <= 0:
                        from app.modules.admin.services.subscription_service import (
                            send_limit_reached_notification,
                        )

                        send_limit_reached_notification(
                            tenant_id, limit_info["feature_name"]
                        )
                        logger.info(
                            f"Review count limit reached for tenant {tenant_id}. Skipping ingestion."
                        )
                        return 0
                    elif review_balance < len(reviews_to_process):
                        logger.info(
                            f"Truncating ingestion from {len(reviews_to_process)} to {review_balance} (limit reached)."
                        )
                        reviews_to_process = reviews_to_process[:review_balance]
    except Exception as limit_err:
        logger.warning(f"Review count limit check failed: {limit_err}")

    count = 0
    db = SessionLocal()
    try:
        for r_data in reviews_to_process:
            try:
                detail = r_data.get("detail", {})
                pos = detail.get("positive_text")
                neg = detail.get("negative_text")
                raw_text = detail.get("review_text")

                # Parse dates robustly
                r_date = detail.get("review_date")
                r_date_obj = (
                    date_parser.parse(str(r_date)) if r_date else datetime.now()
                )
                scraped_at = r_data.get("created_at")
                scraped_at_obj = (
                    date_parser.parse(str(scraped_at)) if scraped_at else datetime.now()
                )

                # Normalize rating
                raw_rating = float(detail.get("rating", 0))
                normalized_rating = (
                    round(raw_rating / 2.0, 3)
                    if int(platform_id) in [2, 3]
                    else round(raw_rating, 3)
                )

                # Map raw scraper data to internal fields
                mapping = {
                    "id": str(r_data.get("review_id")),
                    "rating": normalized_rating,
                    "reviewerName": str(detail.get("author", "Guest")),
                    "text": raw_text if not (pos or neg) else None,
                    "positive_text": str(pos) if pos else None,
                    "negative_text": str(neg) if neg else None,
                    "heading": (
                        str(detail.get("review_heading"))
                        if detail.get("review_heading")
                        else None
                    ),
                    "reviewDate": r_date_obj,
                    "scrapedAt": scraped_at_obj,
                    "source_id": source_id,
                }

                # Insert as pending via ORM repository
                internal_id = upsert_review_pending(db, mapping)

                # Handle photos
                photos_raw = r_data.get("media", [])
                photos = [
                    {"media_id": p.get("media_id"), "src": p.get("url"), "alt": ""}
                    for p in photos_raw
                    if p.get("url")
                ]
                if photos:
                    insert_review_media(db, internal_id, photos)

                count += 1
            except Exception as ex:
                logger.error(f"Failed to ingest review {r_data.get('id')}: {ex}")
                continue

        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Ingestion database error: {e}")
        raise e
    finally:
        db.close()

    # Post-ingestion notifications
    if tenant_id and count > 0:
        try:
            from app.services.notification_helpers import notify_new_reviews_ingested

            platform_name = None
            org_name = None
            db = SessionLocal()
            try:
                from app.modules.source.models import Source

                src = db.query(Source).filter(Source.source_id == source_id).first()
                if src:
                    platform_name = src.platform.platform_name
                    org_name = src.organization.organization_name
            finally:
                db.close()

            notify_new_reviews_ingested(tenant_id, count, platform_name, org_name)
        except Exception as notify_err:
            logger.warning(f"Failed to send ingestion notification: {notify_err}")

    logger.info(
        f"Ingestion SUMMARY: Saved {count} reviews as 'pending' for source {source_id}"
    )
    return count


async def start_ingestion_and_processing_flow(
    source_id: uuid.UUID, sync_log_id: uuid.UUID = None
):
    """
    Full background flow:
    1. Ingest from Scraper (Raw -> Pending)
    2. Run AI Analysis (Pending -> Processed)
    """
    from app.database.session import SessionLocal
    from app.modules.reviews.services.processor import run_analysis_pipeline
    from app.modules.source.services.source_service import (
        get_source_by_id,
        log_activity,
    )

    db = SessionLocal()
    try:
        logger.info(f"--- Pipeline TRIGGERED for source {source_id} ---")
        source = get_source_by_id(db, source_id)
        if not source:
            logger.error(f"!!! Pipeline ABORTED: Source {source_id} not found.")
            return

        logger.info(f"Pipeline: Starting INGESTION for source {source_id}...")
        ingested_count = await ingest_from_scraper(
            source_id, source.organization_id, source.platform_id
        )

        log_activity(
            db,
            source_id,
            activity_type="INGESTION_COMPLETED",
            reviews_fetched=ingested_count,
            activity_details=f"Successfully ingested {ingested_count} reviews from {source.platform.platform_name}.",
        )

        if sync_log_id:
            from app.modules.source.models import SyncLog

            sync_log = db.query(SyncLog).filter(SyncLog.log_id == sync_log_id).first()
            if sync_log:
                sync_log.reviews_fetched = ingested_count
                db.commit()

        if ingested_count > 0:
            logger.info(
                f"Pipeline: Starting AI ANALYSIS for {ingested_count} reviews..."
            )
            log_activity(
                db, source_id, activity_type="AI_ANALYSIS_STARTED", status="In Progress"
            )

            await run_analysis_pipeline()

            log_activity(
                db, source_id, activity_type="AI_ANALYSIS_COMPLETED", status="Success"
            )
            logger.info(
                f"--- Pipeline AI ANALYSIS COMPLETED for source {source_id} ---"
            )

            from app.modules.source.services.embedding_client import (
                trigger_embedding_for_source,
            )

            trigger_embedding_for_source(str(source_id))
            logger.info(f"--- Pipeline COMPLETED for source {source_id} ---")
        else:
            logger.info("Pipeline: Skipping analysis (0 new reviews ingested).")

    except Exception as e:
        logger.error(
            f"!!! Pipeline CRITICAL FAILURE for source {source_id}: {e}", exc_info=True
        )
    finally:
        db.close()


def count_all_reviews(db: Session = None) -> int:
    """Returns the total number of reviews in the database."""
    if db is None:
        db = SessionLocal()
        should_close = True
    else:
        should_close = False

    try:
        return count_reviews_raw(db)
    except Exception as e:
        logger.error(f"Count reviews failed: {e}")
        raise e
    finally:
        if should_close:
            db.close()


def get_processing_report(organization_id: str = None) -> dict:
    """Returns a report on review processing status (pending, processed, failed)."""
    db = SessionLocal()
    try:
        metrics = get_processing_metrics(db, organization_id)

        health = "healthy"
        if metrics["failed"] > 0:
            health = "warning"
        if metrics["pending"] > 200:
            health = "congested"

        return {
            "metrics": metrics,
            "health": health,
            "timestamp": datetime.now().isoformat(),
        }
    except Exception as e:
        logger.error(f"Failed to generate processing report: {e}")
        raise e
    finally:
        db.close()
