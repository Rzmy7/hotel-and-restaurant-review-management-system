"""
Embedding Client
================
Triggered by the main backend after a scrape COMPLETED notification.

Flow:
  1. Fetch unembedded reviews from the Scraper Engine
     (GET {SCRAPER_ENGINE_URL}/api/reviews/unembedded/{source_id})
  2. Derive a stable integer hotel_id from the source_id for ChromaDB namespacing
  3. POST them in one batch to the Embedding Service
     (POST {EMBEDDING_SERVICE_URL}/embed/batch)
  4. On success, tell the Scraper Engine to mark those review_ids as embedded
     (PATCH {SCRAPER_ENGINE_URL}/api/reviews/mark-embedded)
"""

import os
import logging
import threading
import httpx

logger = logging.getLogger(__name__)

# ── Service URLs ─────────────────────────────────────────────────────────────
SCRAPER_ENGINE_URL = os.getenv("SCRAPER_ENGINE_URL", "http://127.0.0.1:8001")
EMBEDDING_SERVICE_URL = os.getenv("EMBEDDING_SERVICE_URL", "http://127.0.0.1:8002")


def _derive_hotel_id(source_id: str) -> int:
    """
    Derive a stable positive integer from a source_id UUID string.
    Used to namespace embeddings in ChromaDB (the embedding service uses hotel_id).
    The hash is deterministic — same source_id always yields the same int.
    """
    return abs(hash(source_id)) % (10 ** 9)


def _embed_source_reviews(source_id: str) -> None:
    """
    Core logic (runs in a background thread):
      1. Fetch unembedded reviews from Scraper Engine
      2. Batch-embed them via Embedding Service
      3. Mark them as embedded in Scraper Engine
    """
    logger.info(f"[EmbeddingClient] Starting embedding pipeline for source_id={source_id}")

    # ── Step 1: Fetch unembedded reviews from Scraper Engine ──────────────────
    try:
        fetch_url = f"{SCRAPER_ENGINE_URL}/api/reviews/unembedded/{source_id}"
        response = httpx.get(fetch_url, timeout=30.0)
        response.raise_for_status()
        payload = response.json()
    except httpx.HTTPError as e:
        logger.error(f"[EmbeddingClient] Failed to fetch unembedded reviews for {source_id}: {e}")
        return
    except Exception as e:
        logger.error(f"[EmbeddingClient] Unexpected error fetching unembedded reviews: {e}")
        return

    reviews_data = payload.get("data", [])
    if not reviews_data:
        logger.info(f"[EmbeddingClient] No unembedded reviews found for source_id={source_id}. Skipping.")
        return

    logger.info(f"[EmbeddingClient] Found {len(reviews_data)} unembedded reviews for source_id={source_id}")

    # ── Step 2: Send to Embedding Service ─────────────────────────────────────
    hotel_id = _derive_hotel_id(source_id)
    embed_payload = {
        "hotel_id": hotel_id,
        "reviews": [
            {
                "review_id": str(r["review_id"]),
                "text": r["review_text"]
            }
            for r in reviews_data
        ]
    }

    try:
        embed_url = f"{EMBEDDING_SERVICE_URL}/embed/batch"
        embed_response = httpx.post(embed_url, json=embed_payload, timeout=120.0)
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

    # ── Step 3: Mark reviews as embedded in Scraper Engine ────────────────────
    # The embedding service returns review_ids as strings.
    try:
        mark_url = f"{SCRAPER_ENGINE_URL}/api/reviews/mark-embedded"
        mark_response = httpx.patch(mark_url, json={"review_ids": embedded_ids_str}, timeout=30.0)
        mark_response.raise_for_status()
        mark_result = mark_response.json()
        logger.info(f"[EmbeddingClient] Marked {mark_result.get('updated_count', 0)} reviews as embedded in Scraper Engine.")
    except httpx.HTTPError as e:
        logger.error(f"[EmbeddingClient] Failed to mark reviews as embedded in Scraper Engine: {e}")
    except Exception as e:
        logger.error(f"[EmbeddingClient] Unexpected error marking reviews as embedded: {e}")


def trigger_embedding_for_source(source_id: str) -> None:
    """
    Fire-and-forget: launch embedding pipeline in a background thread.
    Called from source_service.update_sync_status() when status == COMPLETED.
    Does NOT block the sync-status API response.
    """
    thread = threading.Thread(
        target=_embed_source_reviews,
        args=(str(source_id),),
        daemon=True,
        name=f"embed-{str(source_id)[:8]}"
    )
    thread.start()
    logger.info(f"[EmbeddingClient] Background embedding thread launched for source_id={source_id}")
