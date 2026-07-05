from sentence_transformers import SentenceTransformer
import os

# Use a persistent cache directory for models.
# On Windows, we use a short path in the user home directory to avoid the 260-character path limit.
CACHE_DIR = os.environ.get("EMBEDDING_CACHE_DIR")
if not CACHE_DIR:
    if os.name == 'nt':
        CACHE_DIR = os.path.join(os.path.expanduser("~"), ".hf_cache")
    else:
        CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "model_cache")

os.makedirs(CACHE_DIR, exist_ok=True)

# Load once at startup with persistent cache
model = SentenceTransformer("all-MiniLM-L6-v2", cache_folder=CACHE_DIR)

def embed_text(text: str):
    vector = model.encode(text)
    return vector.tolist()
