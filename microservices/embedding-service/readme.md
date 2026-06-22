# 🧠 Embedding Service

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector-FFD700?style=for-the-badge&logo=python&logoColor=black)](https://www.trychroma.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

The **Embedding Service** is a specialized microservice providing **semantic embeddings and vector search** capabilities for hotel reviews and administrative rules. Built with **FastAPI**, **ChromaDB**, and **Dockerized** for seamless deployment, it supports both cloud-based and local execution.

---

## 🌟 Key Features

| Feature | Description |
|---------|-------------|
| **⚡ High-Performance Embedding** | Batch processing for reviews and hotel rules |
| **🔍 Semantic Search** | Advanced vector search with hotel-level filtering and dynamic thresholds |
| **🚀 Local Execution** | Uses the highly efficient `all-MiniLM-L6-v2` model locally without external API dependencies |
| **📦 Containerized** | Fully Docker-ready with volume persistence for ChromaDB data |
| **⏸️ Circuit Breaker** | Built-in service pause/resume mechanism for safe background processing |

---

## 🏗️ Architecture & API

### Model Specifications

| Model | Provider | Dimensions | Speed | Cost |
|-------|----------|------------|-------|------|
| **MiniLM** (`all-MiniLM-L6-v2`) | Local (HuggingFace) | 384 | Fast (~10ms) | Free |

> ℹ️ **Note**: The service is optimized to run this model locally to guarantee data privacy and zero API costs.

---

## 📡 API Endpoints

### Embedding Generation

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/embed` | POST | Embed multiple reviews | `{ source_id: string, reviews: [{review_id, text}] }` | `{ embedded_ids: string[], job_id: string }` |
| `/embed/rule` | POST | Embed multiple rules | `{ source_id: string, rules: [{rule_id, text}] }` | `{ embedded_ids: string[], job_id: string }` |

### Search

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/search` | POST | Semantic query | `{ query: string, source_ids: string[], top_k?: int }` | `{ reviews: [], rules: [] }` |

### Configuration & Control

| Endpoint | Method | Description | Response |
|----------|--------|-------------|----------|
| `/thresholds` | GET/PUT | Manage search similarity thresholds | `{ oneWord, twoWords, threeOrMore }` |
| `/service/pause` | POST | Pause background embedding | `{ status: "success" }` |
| `/service/resume` | POST | Resume background embedding | `{ status: "success" }` |

### Database & Diagnostics

| Endpoint | Method | Description | Response |
|----------|--------|-------------|----------|
| `/health` | GET | Service metrics | `{ status, cpu_usage, ram_usage, uptime }` |
| `/jobs/recent` | GET | Paginated background jobs | `{ jobs: [], total: int }` |
| `/database/stats` | GET | ChromaDB metrics | `{ totalVectors, storage, ... }` |

---

## 🔧 Installation & Setup

### 📋 Prerequisites

- **Python 3.10+**
- **Docker** (for containerized deployment)

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

Edit `.env` to set the internal communication key:

```env
INTERNAL_API_KEY=your_internal_secret
```

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
  -e INTERNAL_API_KEY=your_internal_secret \
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
| **1 GB** | Not Recommended | MiniLM may cause OOM errors |
| **2 GB** | Local MiniLM | Recommended minimum |
| **4 GB+** | Local MiniLM | Optimal performance |

### Resource Usage

| Model | RAM Usage | CPU Usage | Disk Space |
|-------|-----------|-----------|------------|
| **MiniLM** | ~500MB | High (during embedding) | ~300MB |

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
curl -X POST http://localhost:8001/embed \
  -H "Content-Type: application/json" \
  -H "X-Internal-API-Key: your_internal_secret" \
  -d '{
    "source_id": "456",
    "reviews": [
      { "review_id": "123", "text": "Great hotel with excellent service" },
      { "review_id": "124", "text": "Poor experience, room was dirty" }
    ]
  }'
```

### Semantic Search

```bash
curl -X POST http://localhost:8001/search \
  -H "Content-Type: application/json" \
  -H "X-Internal-API-Key: your_internal_secret" \
  -d '{
    "query": "clean rooms and friendly staff",
    "source_ids": ["456"],
    "top_k": 5
  }'
```

### Pause Service

```bash
curl -X POST http://localhost:8001/service/pause \
  -H "X-Internal-API-Key: your_internal_secret"
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
  "service_paused": false
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

### High Memory Usage

- Reduce batch size for embedding requests if experiencing out-of-memory errors
- Restart service periodically to clear memory
- Ensure VPS has at least 2GB RAM

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
│   ├── main.py             # FastAPI application and routes
│   ├── config.py           # Configuration and thresholds
│   ├── embedding.py        # SentenceTransformers integration
│   ├── chroma.py           # ChromaDB operations
│   └── jobs.py             # Background job tracking
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
- **[SentenceTransformers](https://sbert.net/)** - MiniLM model documentation

---

## 📄 License

**Private / Proprietary**  
© 2026 Hotel & Restaurant Review Management System
