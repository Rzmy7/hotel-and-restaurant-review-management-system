from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import time

from app.gemini_embedding import embed_text
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

class Rule(BaseModel):
    rule_id: str
    hotel_id: int
    text: str

class RuleItem(BaseModel):
    rule_id: str
    text: str

class BatchRuleEmbedRequest(BaseModel):
    hotel_id: int
    rules: list[RuleItem]



def get_threshold(query: str) -> float:
    words = len(query.split())
    if words == 1:
        return 1.3
    elif words <= 3:
        return 1.2
    return 1.1


@app.post("/embed")
def embed(review: Review):
    vector = embed_text(review.text)

    save_embedding(
        review.review_id,
        vector,
        {
            "hotel_id": review.hotel_id,
            "type": "review"
        },
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
                {"hotel_id": data.hotel_id, "type": "review"},
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

@app.post("/embed/rule")
def embed_rule(rule: Rule):
    vector = embed_text(rule.text)

    save_embedding(
        rule.rule_id,
        vector,
        {
            "hotel_id": rule.hotel_id,
            "type": "rule"
        },
        document=rule.text
    )

    return {
        "status": "success",
        "rule_id": rule.rule_id
    }

@app.post("/embed/rule/batch")
def embed_rule_batch(data: BatchRuleEmbedRequest):
    embedded = []
    failed = []

    for rule in data.rules:
        try:
            vector = embed_text(rule.text)

            save_embedding(
                rule.rule_id,
                vector,
                {
                    "hotel_id": data.hotel_id,
                    "type": "rule"
                },
                document=rule.text
            )

            embedded.append(rule.rule_id)

            time.sleep(0.5)

        except Exception as e:
            failed.append({
                "rule_id": rule.rule_id,
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

    threshold = get_threshold(data.query)

    # 1️⃣ Search REVIEWS
    review_results = collection.query(
        query_embeddings=[vector],
        n_results=data.top_k,
        where={
            "hotel_id": data.hotel_id,
            "type": "review"
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

    # 2️⃣ Search RULES (looser threshold, fewer results)
    rule_results = collection.query(
        query_embeddings=[vector],
        n_results=5,
        where={
            "hotel_id": data.hotel_id,
            "type": "rule"
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
