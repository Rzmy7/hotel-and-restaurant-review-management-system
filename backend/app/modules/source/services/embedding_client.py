"""
Embedding Client
================
Triggered by the main backend after reviews are stored in processed_review.

Flow:
  1. Fetch reviews from [ReviewMate].[dbo].[processed_review]
     that have is_embedded=0 for the given source_id
  2. Use the source_id UUID for ChromaDB namespacing
  3. POST them in one batch to the Embedding Service
     (POST {EMBEDDING_SERVICE_URL}/embed)
  4. On success, mark those review IDs as is_embedded=1 directly in processed_review
"""

import os
import logging
import threading
import httpx
import pyodbc

from app.core.pyodbc_connection import get_raw_connection, retry_on_deadlock

logger = logging.getLogger(__name__)

# ── Service URLs ─────────────────────────────────────────────────────────────
from app.core.config import EMBEDDING_SERVICE_URL

# ── Internal API Key (shared secret for service-to-service auth) ─────────────
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "dev-internal-secret")
_AUTH_HEADERS = {"X-Internal-API-Key": INTERNAL_API_KEY}


@retry_on_deadlock(max_retries=3)
def _mark_reviews_embedded_tx(embedded_ids_str: list) -> int:
    """Update database status for a batch of embedded reviews inside a single transaction with deadlock retries."""
    with get_raw_connection() as conn:
        cursor = conn.cursor()
        placeholders = ",".join(["CAST(? AS UNIQUEIDENTIFIER)"] * len(embedded_ids_str))
        sql = f"""
            UPDATE dbo.processed_review
            SET is_embedded = 1
            WHERE id IN ({placeholders})
        """
        cursor.execute(sql, *embedded_ids_str)
        return cursor.rowcount


def _embed_source_reviews(source_id: str) -> None:
    """
    Core logic (runs in a background thread):
      1. Fetch unembedded processed reviews from ReviewMate DB
      2. Batch-embed them via Embedding Service
      3. Mark them as embedded in processed_review table
    """
    logger.info(f"[EmbeddingClient] Starting embedding pipeline for source_id={source_id}")

    # ── Step 1: Fetch unembedded, processed reviews from ReviewMate DB ────────
    try:
        with get_raw_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT
                    CAST(id AS VARCHAR(36)) AS review_id,
                    text,
                    positive_text,
                    negative_text
                FROM dbo.processed_review
                WHERE source_id = CAST(? AS UNIQUEIDENTIFIER)
                  AND is_embedded = 0
                ORDER BY scrapedAt ASC, id ASC
            """, source_id)

            columns = [col[0] for col in cursor.description]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
    except Exception as e:
        logger.error(f"[EmbeddingClient] Failed to fetch unembedded processed reviews for {source_id}: {e}")
        return

    if not rows:
        logger.info(f"[EmbeddingClient] No unembedded processed reviews found for source_id={source_id}. Skipping.")
        return

    # Build review text for embedding (combine text fields)
    reviews_data = []
    for row in rows:
        # Build the review_text from available fields
        text_parts = []
        if row.get("text"):
            text_parts.append(row["text"])
        if row.get("positive_text"):
            text_parts.append(row["positive_text"])
        if row.get("negative_text"):
            text_parts.append(row["negative_text"])

        review_text = " ".join(text_parts).strip()
        if review_text:
            reviews_data.append({
                "review_id": row["review_id"],
                "review_text": review_text,
            })

    if not reviews_data:
        logger.info(f"[EmbeddingClient] All fetched reviews have empty text for source_id={source_id}. Skipping.")
        return

    logger.info(f"[EmbeddingClient] Found {len(reviews_data)} unembedded processed reviews for source_id={source_id}")

    # ── Step 2: Send to Embedding Service ─────────────────────────────────────
    embed_payload = {
        "source_id": source_id,
        "reviews": [
            {
                "review_id": r["review_id"],
                "text": r["review_text"]
            }
            for r in reviews_data
        ]
    }

    try:
        embed_url = f"{EMBEDDING_SERVICE_URL}/embed"
        embed_response = httpx.post(embed_url, json=embed_payload, headers=_AUTH_HEADERS, timeout=120.0)
        embed_response.raise_for_status()
        embed_result = embed_response.json()
    except httpx.HTTPError as e:
        logger.error(f"[EmbeddingClient] Embedding service request failed for source_id={source_id}: {e}")
        return
    except Exception as e:
        logger.error(f"[EmbeddingClient] Unexpected error during embedding: {e}")
        return

    embedded_ids_str = embed_result.get("embedded_ids", [])
    failed = embed_result.get("failed", [])

    if failed:
        logger.warning(f"[EmbeddingClient] {len(failed)} reviews failed to embed for source_id={source_id}: {failed[:5]}")

    if not embedded_ids_str:
        logger.warning(f"[EmbeddingClient] Embedding service returned no embedded_ids for source_id={source_id}")
        return

    logger.info(f"[EmbeddingClient] Successfully embedded {len(embedded_ids_str)} reviews for source_id={source_id}")

    # ── Step 3: Mark reviews as embedded in processed_review table ────────────
    # Enforce deterministic lock ordering
    embedded_ids_str.sort()
    try:
        updated_count = _mark_reviews_embedded_tx(embedded_ids_str)
        logger.info(f"[EmbeddingClient] Marked {updated_count} reviews as embedded in processed_review.")
    except Exception as e:
        logger.error(f"[EmbeddingClient] Failed to mark reviews as embedded in processed_review: {e}")


def trigger_embedding_for_source(source_id: str) -> None:
    """
    Fire-and-forget: launch embedding pipeline in a background thread.
    Called from review_service after AI analysis pipeline completes.
    Does NOT block the processing pipeline.
    """
    thread = threading.Thread(
        target=_embed_source_reviews,
        args=(str(source_id).upper(),),
        daemon=True,
        name=f"embed-{str(source_id)[:8]}"
    )
    thread.start()
    logger.info(f"[EmbeddingClient] Background embedding thread launched for source_id={source_id}")

def delete_embeddings_for_source(source_id: str) -> None:
    """
    Tells the Embedding Service to clear all vectors for a source.
    Usually called when resetting or deleting source data.
    """
    logger.info(f"[EmbeddingClient] Requesting embedding deletion for source_id={source_id}")
    try:
        # Uppercase to match ChromaDB metadata (SQL Server CAST produces uppercase UUIDs)
        url = f"{EMBEDDING_SERVICE_URL}/delete/source/{str(source_id).upper()}"
        resp = httpx.delete(url, headers=_AUTH_HEADERS, timeout=30.0)
        resp.raise_for_status()
        logger.info(f"[EmbeddingClient] Successfully cleared embeddings for source {source_id}")
    except Exception as e:
        logger.error(f"[EmbeddingClient] Failed to delete embeddings for {source_id}: {e}")
