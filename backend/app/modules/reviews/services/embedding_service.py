import logging
import httpx
from typing import List, Optional
from app.core.config import EMBEDDING_SERVICE_URL

logger = logging.getLogger(__name__)

def search_reviews_by_embedding(
    query: str, 
    source_ids: List[str], 
    top_k: int = 50
) -> List[str]:
    """
    Query the external embedding service for reviews matching the semantic search query.
    Returns a list of matching review UUIDs.
    """
    if not source_ids:
        return []

    try:
        with httpx.Client() as client:
            resp = client.post(
                f"{EMBEDDING_SERVICE_URL}/search",
                json={
                    "query": query,
                    "source_ids": source_ids,
                    "top_k": top_k,
                },
                timeout=10.0,
            )
            
            if resp.status_code != 200:
                logger.error(f"Embedding service returned status {resp.status_code}: {resp.text}")
                return []
                
            data = resp.json()
            reviews = data.get("reviews", [])
            
            # Extract review IDs (service might return 'review_id' or 'id')
            matching_ids = [
                r.get("review_id") or r.get("id")
                for r in reviews
                if r.get("review_id") or r.get("id")
            ]
            
            return matching_ids
            
    except httpx.HTTPError as e:
        logger.error(f"HTTP error connecting to embedding service: {e}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error during embedding search: {e}")
        return []
