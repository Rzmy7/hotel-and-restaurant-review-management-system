from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import time
import uuid
import psutil
from datetime import datetime

from app.chroma import save_embedding, collection
from app.config import (
    load_config, save_config, get_threshold_by_query, DEFAULT_THRESHOLDS,
    is_service_paused, set_service_paused
)
from app.jobs import add_job, update_job, get_recent_jobs
from app.embedding import embed_text

app = FastAPI(title="Embedding Service")

# Store service start time for uptime calculation
SERVICE_START_TIME = datetime.now()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Preload models at startup
@app.on_event("startup")
async def startup_event():
    """Preload the embedding model to avoid first-request delay"""
    print("Preloading embedding model...")
    from app.embedding import model
    print(f"[OK] MiniLM model preloaded successfully")

def wait_if_paused():
    """Wait while service is paused, checking every 0.5 seconds"""
    while is_service_paused():
        time.sleep(0.5)


class ReviewItem(BaseModel):
    review_id: str
    text: str

class BatchEmbedRequest(BaseModel):
    source_id: str
    reviews: List[ReviewItem]

class SearchRequest(BaseModel):
    query: str
    source_ids: List[str]
    top_k: int = 3

class RuleItem(BaseModel):
    rule_id: str
    text: str

class BatchRuleEmbedRequest(BaseModel):
    source_id: str
    rules: list[RuleItem]

class ThresholdConfig(BaseModel):
    oneWord: float
    twoWords: float
    threeOrMore: float


def get_threshold(query: str) -> float:
    """Get threshold based on query - uses configurable values"""
    return get_threshold_by_query(query)


@app.post("/embed")
def embed_batch(data: BatchEmbedRequest):
    job_id = str(uuid.uuid4())[:8]
    add_job(job_id, "Review", "Running", 0)
    
    embedded = []
    failed = []
    total = len(data.reviews)
    start_time = time.time()

    for idx, review in enumerate(data.reviews):
        try:
            wait_if_paused()  # Wait if service is paused before each item
            vector = embed_text(review.text)

            save_embedding(
                review.review_id,
                vector,
                {"source_id": data.source_id, "type": "review"},
                document=review.text
            )

            embedded.append(review.review_id)
            progress = int(((idx + 1) / total) * 100)
            update_job(job_id, "Running", progress)

        except Exception as e:
            failed.append({
                "review_id": review.review_id,
                "error": str(e)
            })
    
    duration = f"{time.time() - start_time:.1f}s"
    final_status = "Completed" if len(failed) == 0 else "Failed"
    update_job(job_id, final_status, 100, duration)

    return {
        "embedded_count": len(embedded),
        "embedded_ids": embedded,
        "failed": failed,
        "job_id": job_id
    }

@app.post("/embed/rule")
def embed_rule_batch(data: BatchRuleEmbedRequest):
    job_id = str(uuid.uuid4())[:8]
    add_job(job_id, "Regulation", "Running", 0)
    
    embedded = []
    failed = []
    total = len(data.rules)
    start_time = time.time()

    for idx, rule in enumerate(data.rules):
        try:
            wait_if_paused()  # Wait if service is paused before each item
            vector = embed_text(rule.text)

            save_embedding(
                rule.rule_id,
                vector,
                {
                    "source_id": data.source_id,
                    "type": "rule"
                },
                document=rule.text
            )

            embedded.append(rule.rule_id)
            progress = int(((idx + 1) / total) * 100)
            update_job(job_id, "Running", progress)

        except Exception as e:
            failed.append({
                "rule_id": rule.rule_id,
                "error": str(e)
            })
    
    duration = f"{time.time() - start_time:.1f}s"
    final_status = "Completed" if len(failed) == 0 else "Failed"
    update_job(job_id, final_status, 100, duration)

    return {
        "embedded_count": len(embedded),
        "embedded_ids": embedded,
        "failed": failed,
        "job_id": job_id
    }



@app.post("/search")
def search(data: SearchRequest):
    vector = embed_text(data.query)

    threshold = get_threshold(data.query)

    # Build source_id filter: single value or $in for multiple
    if len(data.source_ids) == 1:
        source_filter = {"source_id": data.source_ids[0]}
    else:
        source_filter = {"source_id": {"$in": data.source_ids}}

    # Search REVIEWS
    review_results = collection.query(
        query_embeddings=[vector],
        n_results=data.top_k,
        where={
            "$and": [
                source_filter,
                {"type": "review"}
            ]
        },
        include=["documents", "metadatas", "distances"]
    )

    reviews = [
        {
            "id": review_results["ids"][0][i],
            "text": review_results["documents"][0][i],
            "metadata": review_results["metadatas"][0][i],
            "distance": dist
        }
        for i, dist in enumerate(review_results["distances"][0])
        if dist < threshold
    ]

    # Search RULES (looser threshold, fewer results)
    rule_results = collection.query(
        query_embeddings=[vector],
        n_results=5,
        where={
            "$and": [
                source_filter,
                {"type": "rule"}
            ]
        },
        include=["documents", "metadatas", "distances"]
    )

    rules = [
        {
            "id": rule_results["ids"][0][i],
            "text": rule_results["documents"][0][i],
            "metadata": rule_results["metadatas"][0][i],
            "distance": dist
        }
        for i, dist in enumerate(rule_results["distances"][0])
        if dist < (threshold + 0.2)   # rules are authoritative
    ]

    return {
        "query": data.query,
        "threshold": threshold,
        "reviews": reviews,
        "rules": rules
    }


@app.get("/thresholds")
def get_thresholds() -> Dict[str, float]:
    """Get current similarity thresholds"""
    thresholds = load_config()
    return thresholds


@app.put("/thresholds")
def update_thresholds(config: ThresholdConfig) -> Dict[str, Any]:
    """Update similarity thresholds"""
    thresholds = {
        "oneWord": config.oneWord,
        "twoWords": config.twoWords,
        "threeOrMore": config.threeOrMore
    }
    
    # Validate thresholds are within reasonable range
    for key, value in thresholds.items():
        if value < 0 or value > 2.0:
            raise HTTPException(
                status_code=400, 
                detail=f"Threshold {key} must be between 0 and 2.0"
            )
    
    success = save_config(thresholds)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save configuration")
    
    return {"status": "success", "thresholds": thresholds}


@app.post("/thresholds/reset")
def reset_thresholds() -> Dict[str, Any]:
    """Reset thresholds to default values"""
    success = save_config(DEFAULT_THRESHOLDS)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to reset configuration")
    
    return {"status": "success", "thresholds": DEFAULT_THRESHOLDS}


@app.get("/jobs/recent")
def get_jobs(page: int = 1, page_size: int = 10) -> Dict[str, Any]:
    """Get embedding jobs with pagination"""
    return get_recent_jobs(page, page_size)


@app.post("/service/pause")
def pause_service() -> Dict[str, Any]:
    """Pause the embedding service"""
    success = set_service_paused(True)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to pause service")
    return {"status": "success", "message": "Embedding service paused", "isPaused": True}


@app.post("/service/resume")
def resume_service() -> Dict[str, Any]:
    """Resume the embedding service"""
    success = set_service_paused(False)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to resume service")
    return {"status": "success", "message": "Embedding service resumed", "isPaused": False}


@app.get("/service/status")
def get_service_status() -> Dict[str, Any]:
    """Get embedding service status"""
    return {
        "isPaused": is_service_paused(),
        "status": "paused" if is_service_paused() else "running"
    }


@app.get("/database/stats")
def get_database_stats() -> Dict[str, Any]:
    """Get ChromaDB statistics"""
    try:
        # Get collection information
        count = collection.count()
        
        # Get collection name (namespace)
        namespace = collection.name
        
        # ChromaDB uses HNSW index by default
        # Embedding model uses specific dimensions (MiniLM uses 384)
        dimensions = 384  # Default for MiniLM
        
        # Try to get a sample to determine dimensions
        if count > 0:
            try:
                sample = collection.get(limit=1, include=["embeddings"])
                embeddings = sample.get("embeddings") if sample else None
                if embeddings is not None and len(embeddings) > 0:
                    first_embedding = embeddings[0]
                    if first_embedding is not None:
                        dimensions = len(first_embedding)
            except Exception as e:
                print(f"Could not determine dimensions from sample: {e}")
        
        # Estimate storage size (rough approximation)
        # Each vector: dimensions * 4 bytes (float32) + metadata overhead
        estimated_bytes = count * (dimensions * 4 + 200)  # +200 for metadata
        storage_mb = estimated_bytes / (1024 * 1024)
        storage_gb = storage_mb / 1024
        
        if storage_gb >= 1:
            storage = f"{storage_gb:.1f} GB"
        else:
            storage = f"{storage_mb:.1f} MB"
        
        return {
            "totalVectors": count,
            "namespace": namespace,
            "dimensions": dimensions,
            "indexType": "HNSW",
            "storage": storage,
            "isHealthy": True
        }
    except Exception as e:
        print(f"Error getting database stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get database stats: {str(e)}")


@app.post("/database/reindex")
def reindex_database() -> Dict[str, Any]:
    """Re-generate all embeddings using the current model"""
    try:
        # Get all existing documents
        all_data = collection.get(include=["documents", "metadatas"])
        
        if not all_data or not all_data.get("ids"):
            return {
                "status": "success",
                "message": "No documents to re-index",
                "vectorsReindexed": 0
            }
        
        ids = all_data["ids"]
        documents = all_data.get("documents", [])
        metadatas = all_data.get("metadatas", [])
        
        # Track progress
        job_id = f"reindex_{len(ids)}"
        add_job(job_id, "Re-index", "Running", 0)
        
        # Re-generate embeddings for all documents
        total = len(ids)
        reindexed = 0
        new_embeddings = []
        
        for i, (doc_id, document, metadata) in enumerate(zip(ids, documents, metadatas)):
            if document:  # Only re-embed if document exists
                try:
                    wait_if_paused()  # Wait if service is paused before each item
                    # Generate new embedding with current model
                    new_embedding = embed_text(document)
                    new_embeddings.append(new_embedding)
                    reindexed += 1
                    
                    # Update progress every 10%
                    if i % max(1, total // 10) == 0:
                        progress = int((i / total) * 100)
                        update_job(job_id, "Running", progress)
                except Exception as e:
                    print(f"Failed to re-embed document {doc_id}: {e}")
                    continue
        
        # Update all embeddings in batch
        if new_embeddings:
            # Delete old entries
            collection.delete(ids=ids[:len(new_embeddings)])
            
            # Add with new embeddings
            collection.add(
                ids=ids[:len(new_embeddings)],
                embeddings=new_embeddings,
                metadatas=metadatas[:len(new_embeddings)],
                documents=documents[:len(new_embeddings)]
            )
        
        update_job(job_id, "Completed", 100, f"{reindexed / max(0.1, (total / 60)):.1f}s")
        
        return {
            "status": "success",
            "message": f"Re-indexed {reindexed} vectors using MiniLM model",
            "vectorsReindexed": reindexed,
            "totalVectors": total
        }
    except Exception as e:
        print(f"Error re-indexing database: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to re-index database: {str(e)}")


@app.post("/database/clear")
def clear_database() -> Dict[str, Any]:
    """Clear all vectors from the database (WARNING: deletes all data)"""
    try:
        # Get count before clearing
        count_before = collection.count()
        
        # Delete all items from the collection
        # ChromaDB requires getting all IDs first, then deleting
        if count_before > 0:
            # Get all IDs
            all_items = collection.get()
            if all_items and all_items.get("ids"):
                collection.delete(ids=all_items["ids"])
        
        # Verify it's empty
        count_after = collection.count()
        
        return {
            "status": "success",
            "message": f"Cleared {count_before} vectors from database",
            "vectorsRemoved": count_before,
            "currentCount": count_after
        }
    except Exception as e:
        print(f"Error clearing database: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clear database: {str(e)}")


@app.get("/health")
def health_check() -> Dict[str, Any]:
    """
    Health check endpoint for system monitoring.
    Returns server status, CPU usage, RAM usage, and uptime.
    """
    try:
        # Get CPU usage
        cpu_usage = round(psutil.cpu_percent(interval=0.5), 1)
        
        # Get RAM usage
        memory = psutil.virtual_memory()
        ram_usage = round(memory.percent, 1)
        
        # Calculate uptime
        uptime_delta = datetime.now() - SERVICE_START_TIME
        days = uptime_delta.days
        hours, remainder = divmod(uptime_delta.seconds, 3600)
        minutes, _ = divmod(remainder, 60)
        uptime = f"{days}d {hours}h {minutes}m"
        
        # Determine status based on resource usage and service state
        if is_service_paused():
            status = "Warning"
        elif cpu_usage >= 90 or ram_usage >= 90:
            status = "Warning"
        else:
            status = "Online"
        
        return {
            "status": status,
            "cpu_usage": cpu_usage,
            "ram_usage": ram_usage,
            "uptime": uptime,
            "service_paused": is_service_paused()
        }
    except Exception as e:
        print(f"Error in health check: {e}")
        return {
            "status": "Warning",
            "cpu_usage": 0.0,
            "ram_usage": 0.0,
            "uptime": "Unknown",
            "service_paused": False,
            "error": str(e)
        }

@app.delete("/delete/source/{source_id}")
def delete_by_source(source_id: str) -> Dict[str, Any]:
    """Delete all embeddings associated with a specific source ID."""
    try:
        # Get count before deleting (informative)
        # However, ChromaDB delete doesn't return count directly easily without a query
        
        # Delete items matching the source_id metadata
        collection.delete(where={"source_id": source_id})
        
        return {
            "status": "success",
            "message": f"Deleted all embeddings for source_id: {source_id}",
            "source_id": source_id
        }
    except Exception as e:
        print(f"Error deleting embeddings for source {source_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/delete/source/{source_id}/rules")
def delete_rules_by_source(source_id: str) -> Dict[str, Any]:
    """Delete only rule-type embeddings for a source, preserving review embeddings."""
    try:
        collection.delete(where={
            "$and": [
                {"source_id": source_id},
                {"type": "rule"}
            ]
        })
        
        return {
            "status": "success",
            "message": f"Deleted rule embeddings for source_id: {source_id}",
            "source_id": source_id
        }
    except Exception as e:
        print(f"Error deleting rule embeddings for source {source_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
