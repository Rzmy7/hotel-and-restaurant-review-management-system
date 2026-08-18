# 🧠 Vector Embedding & Semantic Search Microservice

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector_Store-FFD700?style=for-the-badge&logo=python&logoColor=black)](https://www.trychroma.com/)
[![SentenceTransformers](https://img.shields.io/badge/Model-all--MiniLM--L6--v2-blue?style=for-the-badge&logo=huggingface&logoColor=white)](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

The **Embedding Service** is a high-performance vector microservice designed to handle **dense semantic indexing, similarity search, and Retrieval-Augmented Generation (RAG) context retrieval** for hotel reviews and operational standard operating procedures (SOPs).

---

## 🌟 Core Architecture & Capabilities

| Capability | Specification |
|---|---|
| **Embedding Model** | `sentence-transformers/all-MiniLM-L6-v2` (Local HuggingFace model, 384-dimensional dense vectors) |
| **Vector Engine** | **ChromaDB** with SQLite persistence and HNSW cosine distance indexing |
| **Isolated Collections** | `hotel_reviews` (indexed guest reviews) and `hotel_rules` (property policies & SOPs) |
| **Batch Processing** | High-throughput vectorization handling 500+ text records per second |
| **Dynamic Thresholding** | Adaptive cosine similarity filtering tailored for 1-word, 2-word, and multi-word semantic search |
| **Zero Cost & Privacy** | 100% local model inference guarantees zero API cost and strict guest data privacy |
| **Circuit Breaker** | Real-time service pause and resume controls for background indexing operations |

---

## 📡 API Specification

### 1. Vector Ingestion Endpoints

#### `POST /embed` — Ingest & Index Guest Reviews
```json
// Request Body
{
  "source_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "reviews": [
    {
      "review_id": "rev_101",
      "text": "The rooftop pool had stunning sunset views, but the breakfast buffet was overcrowded."
    }
  ]
}

// Response: 200 OK
{
  "status": "success",
  "embedded_count": 1,
  "source_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

#### `POST /embed/rule` — Ingest & Index Property SOP Rules
```json
// Request Body
{
  "source_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "rules": [
    {
      "rule_id": "rule_201",
      "text": "Complimentary breakfast is served from 6:30 AM to 10:30 AM in the Palm Terrace Restaurant."
    }
  ]
}
```

### 2. Semantic Search Endpoint

#### `POST /search` — Multi-Collection Semantic Query
```json
// Request Body
{
  "query": "breakfast timing and quality",
  "source_ids": ["3fa85f64-5717-4562-b3fc-2c963f66afa6"],
  "top_k": 5
}

// Response: 200 OK
{
  "reviews": [
    {
      "review_id": "rev_101",
      "text": "The rooftop pool had stunning sunset views, but the breakfast buffet was overcrowded.",
      "score": 0.842
    }
  ],
  "rules": [
    {
      "rule_id": "rule_201",
      "text": "Complimentary breakfast is served from 6:30 AM to 10:30 AM in the Palm Terrace Restaurant.",
      "score": 0.891
    }
  ]
}
```

### 3. Service Control & Threshold Management
- `GET /thresholds`: Retrieve active similarity thresholds (`oneWord: 0.60`, `twoWords: 0.70`, `threeOrMore: 0.75`).
- `PUT /thresholds`: Update similarity thresholds dynamically without restarts.
- `POST /service/pause`: Temporarily suspend new embedding requests.
- `POST /service/resume`: Resume normal embedding ingestion.
- `GET /health`: Health check, ChromaDB status, and memory consumption.
- `GET /stats`: Count of active vectors per collection and storage footprint.

---

## 🏗️ Project Structure

```
microservices/embedding-service/
├── app/
│   ├── main.py                 # FastAPI application and endpoint definitions
│   ├── chroma.py               # ChromaDB client initialization & collection management
│   ├── embedding.py            # SentenceTransformer model wrapper & batch generator
│   ├── jobs.py                 # Job tracking and circuit breaker state
│   └── config.py               # Service configuration & default thresholds
├── chroma_data/                # Persistent vector storage volume
├── model_cache/                # Cached HuggingFace weights (all-MiniLM-L6-v2)
├── tests/                      # Unit and integration test suites
├── Dockerfile                  # Production container definition
└── requirements.txt            # Python dependencies
```

---

## 🚀 Running the Microservice

### Using Docker (Recommended)
```bash
cd microservices/embedding-service
docker build -t embedding-service .
docker run -d -p 8002:8000 -v chroma_data:/data/chroma --name reviewmate-embedding embedding-service
```

### Running Locally with Python
```bash
cd microservices/embedding-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload
```
- **OpenAPI Documentation**: `http://localhost:8002/docs`
