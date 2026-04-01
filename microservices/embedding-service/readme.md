# 🧠 Embedding Service

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector-FFD700?style=for-the-badge&logo=python&logoColor=black)](https://www.trychroma.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

The **Embedding Service** is a specialized microservice providing **semantic embeddings and vector search** capabilities for hotel reviews and administrative rules. Built with **FastAPI**, **ChromaDB**, and **Dockerized** for seamless deployment, it supports both cloud-based and local execution.

---

## 🌟 Key Features

| Feature | Description |
|---------|-------------|
| **⚡ High-Performance Embedding** | Single and batch processing for reviews and hotel rules |
| **🔍 Semantic Search** | Advanced vector search with hotel-level filtering and metadata separation |
| **✨ Dynamic Model Switching** | Seamlessly toggle between **Google Gemini** (Cloud) and **MiniLM** (Local) via API or Admin Panel |
| **🛡️ Robust Error Handling** | Automatic fallback to local MiniLM if Gemini API connectivity fails |
| **📦 Containerized** | Fully Docker-ready with volume persistence for ChromaDB data |
| **🔧 Configurable** | API key management via environment variables or Admin Panel |

---

## 🏗️ Architecture & API

### Model Specifications

| Model | Provider | Dimensions | Speed | Cost |
|-------|----------|------------|-------|------|
| **MiniLM** (`all-MiniLM-L6-v2`) | Local (HuggingFace) | 384 | Fast (~10ms) | Free |
| **Gemini** (`models/text-embedding-004`) | Google Cloud | 768 | Medium (~100-500ms) | API calls charged |

### Model Comparison

| Aspect | MiniLM | Gemini |
|--------|--------|--------|
| **Accuracy** | Good | Excellent |
| **Latency** | Low | Medium |
| **Privacy** | Full (offline) | Data sent to Google |
| **RAM Usage** | ~500MB | Minimal |
| **Best For** | High-volume, low-latency | Superior semantic understanding |

> ⚠️ **Compatibility Warning**: Embeddings from different models are **NOT compatible**. Clear vector store when switching models.

---

## 📡 API Endpoints

### Embedding Generation

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/embed/batch` | POST | Process multiple texts | `{ texts: string[], metadata?: object[] }` | `{ ids: string[], count: number }` |
| `/embed/single` | POST | Embed single text | `{ text: string, metadata?: object }` | `{ id: string, embedding: number[] }` |

### Search

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/search` | POST | Semantic query | `{ query: string, filter?: object, n_results?: number }` | `{ results: object[] }` |

### Configuration

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/model` | PUT | Switch embedding model | `{ model: "minilm" \| "gemini" }` | `{ current_model: string }` |
| `/model` | GET | Get current model | - | `{ current_model: string }` |
| `/api-settings` | PUT | Update API keys | `{ gemini_api_key?: string }` | `{ status: string }` |

### Health & Diagnostics

| Endpoint | Method | Description | Response |
|----------|--------|-------------|----------|
| `/health` | GET | Service health check | `{ status, cpu_usage, ram_usage, uptime, model }` |
| `/` | GET | Root endpoint | `{ service: "Embedding Service", version }` |

---

## 🔧 Installation & Setup

### 📋 Prerequisites

- **Python 3.10+**
- **Docker** (for containerized deployment)
- **Google Gemini API Key** (optional, for Gemini model)

### 🚀 Local Execution

#### 1. Install Dependencies

```bash
cd microservices/embedding-service

pip install -r requirements.txt
```

#### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your Gemini API key (optional):

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

> **Note**: The service can run without a Gemini API key using only the MiniLM model.

#### 3. Run Service

```bash
uvicorn app.main:app --reload --port 8001
```

Access at: **http://localhost:8001**

---

### 🐳 Docker Deployment

#### 1. Build Image

```bash
docker build -t embedding-service .
```

#### 2. Run Container

```bash
docker run -d \
  -p 8001:8000 \
  -v chroma_data:/data/chroma \
  -e GEMINI_API_KEY=your_api_key \
  --name embedding_service \
  embedding-service
```

#### 3. Verify Container

```bash
docker ps
curl http://localhost:8001/health
```

#### 4. Manage Container

```bash
# Stop
docker stop embedding_service

# Start
docker start embedding_service

# View logs
docker logs -f embedding_service

# Remove
docker rm embedding_service
docker volume rm chroma_data
```

---

## 📊 Deployment Specifications

### VPS Requirements

| VPS RAM | Recommended Mode | Notes |
|---------|------------------|-------|
| **1 GB** | Gemini API Only | MiniLM may cause OOM errors |
| **2 GB** | Local MiniLM | Recommended minimum |
| **4 GB+** | Either Mode | Optimal performance |

### Resource Usage

| Model | RAM Usage | CPU Usage | Disk Space |
|-------|-----------|-----------|------------|
| **MiniLM** | ~500MB | Low (during embedding) | ~300MB |
| **Gemini** | ~100MB | Minimal | ~50MB |

### First Startup

- **MiniLM Model Download**: ~30-90 seconds on first run
- **ChromaDB Initialization**: ~5-10 seconds
- **Total Cold Start**: ~1-2 minutes

---

## 🗄️ Data Persistence

### ChromaDB Volume

Data is persisted in the `chroma_data` Docker volume:

```bash
# View volume
docker volume inspect chroma_data

# Backup
docker run --rm -v chroma_data:/data -v $(pwd):/backup alpine tar czf /backup/chroma-backup.tar.gz /data

# Restore
docker run --rm -v chroma_data:/data -v $(pwd):/backup alpine tar xzf /backup/chroma-backup.tar.gz -C /data
```

### Clearing Vector Store

⚠️ **Required when switching models**:

```bash
# Stop and remove container
docker stop embedding_service
docker rm embedding_service

# Remove volume
docker volume rm chroma_data

# Recreate
docker run -d -p 8001:8000 -v chroma_data:/data/chroma --name embedding_service embedding-service
```

---

## 💻 Usage Examples

### Generate Embeddings (Batch)

```bash
curl -X POST http://localhost:8001/embed/batch \
  -H "Content-Type: application/json" \
  -d '{
    "texts": [
      "Great hotel with excellent service",
      "Poor experience, room was dirty"
    ],
    "metadata": [
      { "review_id": "123", "hotel_id": "456" },
      { "review_id": "124", "hotel_id": "456" }
    ]
  }'
```

### Semantic Search

```bash
curl -X POST http://localhost:8001/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "clean rooms and friendly staff",
    "filter": { "hotel_id": "456" },
    "n_results": 5
  }'
```

### Switch Model

```bash
# Switch to Gemini
curl -X PUT http://localhost:8001/model \
  -H "Content-Type: application/json" \
  -d '{ "model": "gemini" }'

# Switch to MiniLM
curl -X PUT http://localhost:8001/model \
  -H "Content-Type: application/json" \
  -d '{ "model": "minilm" }'
```

### Configure API Key

```bash
curl -X PUT http://localhost:8001/api-settings \
  -H "Content-Type: application/json" \
  -d '{ "gemini_api_key": "your_new_api_key" }'
```

---

## 🏥 Monitoring

### Health Check Response

```json
{
  "status": "Online",
  "cpu_usage": 12.5,
  "ram_usage": 45.2,
  "uptime": "2d 5h 30m",
  "current_model": "minilm",
  "chroma_collections": 2,
  "total_embeddings": 15420
}
```

### Admin Panel Integration

The service integrates with the Admin Panel Monitoring page:

1. Navigate to **Admin Panel → Monitoring**
2. View **Embedding Service** status card
3. See real-time CPU, RAM, and uptime metrics

---

## 🐛 Troubleshooting

### Service Won't Start

```bash
# Check logs
docker logs embedding_service

# Verify port is free
netstat -an | grep 8001
```

### Model Switching Issues

```bash
# Check current model
curl http://localhost:8001/model

# If switching fails, clear ChromaDB volume
docker volume rm chroma_data
```

### High Memory Usage

- Use **Gemini API mode** for VPS with <2GB RAM
- Reduce batch size for embedding requests
- Restart service periodically to clear memory

### API Rate Limits (Gemini)

- Gemini API has rate limits (check Google AI Studio)
- Implement retry logic in client applications
- Consider caching frequently used embeddings

### CORS Errors

Ensure the service allows requests from your frontend:

```python
# In app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 📝 Development

### Project Structure

```
embedding-service/
├── app/
│   ├── main.py             # FastAPI application
│   ├── routes/
│   │   ├── embeddings.py   # Embedding endpoints
│   │   ├── search.py       # Search endpoints
│   │   └── config.py       # Configuration endpoints
│   ├── services/
│   │   ├── chroma_service.py  # ChromaDB operations
│   │   ├── gemini_service.py  # Gemini API wrapper
│   │   └── minilm_service.py  # MiniLM wrapper
│   └── utils/
│       └── health.py       # Health check utilities
├── Dockerfile              # Docker build configuration
├── requirements.txt        # Python dependencies
├── .env.example            # Environment template
└── readme.md               # This file
```

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest tests/
```

---

## 📚 Additional Resources

- **[Root README](../../README.md)** - Project overview
- **[Admin Panel](../../admin-frontend/README.md)** - Configuration UI
- **[ChromaDB Docs](https://docs.trychroma.com/)** - Vector database documentation
- **[Google Gemini API](https://ai.google.dev/)** - Embedding API reference
- **[SentenceTransformers](https://sbert.net/)** - MiniLM model documentation

---

## 📄 License

**Private / Proprietary**  
© 2026 Hotel & Restaurant Review Management System
