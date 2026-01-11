<<<<<<< HEAD
=======
<<<<<<< HEAD
import os
import time
from google import genai
from google.api_core.exceptions import ResourceExhausted

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def embed_text(text: str, retries: int = 3):
    for attempt in range(retries):
        try:
            result = client.models.embed_content(
                model="text-embedding-004",
                contents=text
            )
            return result.embeddings[0].values

        except ResourceExhausted:
            wait = 20
            print(f"[WARN] Gemini quota hit. Retrying in {wait}s...")
            time.sleep(wait)

    raise Exception("Embedding failed due to quota limits")
=======
>>>>>>> temp
from sentence_transformers import SentenceTransformer

# Load once at startup
model = SentenceTransformer("all-MiniLM-L6-v2")

def embed_text(text: str):
    vector = model.encode(text)
    return vector.tolist()
<<<<<<< HEAD
=======
>>>>>>> vectordb
>>>>>>> temp
