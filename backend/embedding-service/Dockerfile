FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Pre-download the MiniLM model during build to avoid download on startup
RUN python -c "from sentence_transformers import SentenceTransformer; import os; \
    cache_dir = os.path.join('/app', 'model_cache'); \
    os.makedirs(cache_dir, exist_ok=True); \
    SentenceTransformer('all-MiniLM-L6-v2', cache_folder=cache_dir)"

# Create directories for persistent data
RUN mkdir -p /app/chroma_data

ENV PYTHONUNBUFFERED=1

# Optional: Set Gemini API key via environment variable
# Can also be configured via admin panel API
# ENV GEMINI_API_KEY=your_key_here

# Volume mount points for persistent data
VOLUME ["/app/chroma_data", "/app/config.json", "/app/jobs.json"]

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
