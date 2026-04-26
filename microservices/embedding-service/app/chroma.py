import chromadb
from chromadb.config import Settings
import os

# Use a persistent directory relative to the project
CHROMA_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "chroma_data")
os.makedirs(CHROMA_DATA_DIR, exist_ok=True)

client = chromadb.PersistentClient(
    path=CHROMA_DATA_DIR, settings=Settings(anonymized_telemetry=False)
)

collection = client.get_or_create_collection("hotel_reviews")


def save_embedding(review_id, embedding, metadata, document=None):
    collection.add(
        ids=[review_id],
        embeddings=[embedding],
        metadatas=[metadata],
        documents=[document] if document else None,
    )
