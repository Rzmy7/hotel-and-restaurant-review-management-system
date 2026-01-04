from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import time

from app.embedding import embed_text
from app.chroma import save_embedding, collection

app = FastAPI(title="Embedding Service")


class Review(BaseModel):
    review_id: str
    text: str
    hotel_id: int


class ReviewItem(BaseModel):
    review_id: str
    text: str


class BatchEmbedRequest(BaseModel):
    hotel_id: int
    reviews: List[ReviewItem]


class SearchRequest(BaseModel):
    query: str
    hotel_id: int
    top_k: int = 3


def get_threshold(query: str) -> float:
    words = len(query.split())
    if words == 1:
        return 1.3
    elif words <= 3:
        return 1.1
    return 0.9


@app.post("/embed")
def embed(review: Review):
    vector = embed_text(review.text)

    save_embedding(
        review.review_id,
        vector,
        {"hotel_id": review.hotel_id},
        document=review.text
    )

    return {"status": "success"}


@app.post("/embed/batch")
def embed_batch(data: BatchEmbedRequest):
    embedded = []
    failed = []

    for review in data.reviews:
        try:
            vector = embed_text(review.text)

            save_embedding(
                review.review_id,
                vector,
                {"hotel_id": data.hotel_id},
                document=review.text
            )

            embedded.append(review.review_id)
            time.sleep(1.5)

        except Exception as e:
            failed.append({
                "review_id": review.review_id,
                "error": str(e)
            })

    return {
        "embedded_count": len(embedded),
        "embedded_ids": embedded,
        "failed": failed
    }


@app.post("/search")
def search(data: SearchRequest):
    vector = embed_text(data.query)

    results = collection.query(
        query_embeddings=[vector],
        n_results=data.top_k,
        where={"hotel_id": data.hotel_id}
    )

    threshold = get_threshold(data.query)

    filtered = [
        {
            "id": results["ids"][0][i],
            "metadata": results["metadatas"][0][i],
            "distance": dist
        }
        for i, dist in enumerate(results["distances"][0])
        if dist < threshold
    ]

    return {
        "query": data.query,
        "threshold": threshold,
        "results": filtered
    }
