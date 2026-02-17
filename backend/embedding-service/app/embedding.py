from sentence_transformers import SentenceTransformer

# Load once at startup
model = SentenceTransformer("all-MiniLM-L6-v2")

def embed_text(text: str):
    vector = model.encode(text)
    return vector.tolist()