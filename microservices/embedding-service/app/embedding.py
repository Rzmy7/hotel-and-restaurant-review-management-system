from sentence_transformers import SentenceTransformer
import os

# Use a persistent cache directory for models
CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "model_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

# Load once at startup with persistent cache
model = SentenceTransformer("all-MiniLM-L6-v2", cache_folder=CACHE_DIR)

def embed_text(text: str):
    vector = model.encode(text)
    return vector.tolist()
