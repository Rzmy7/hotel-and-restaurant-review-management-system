# 🏨 Hotel and Restaurant Review Management & Analysis System

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Styling-TailwindCSS_3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![MSSQL](https://img.shields.io/badge/Database-MS%20SQL%20Server-CC2927?style=for-the-badge&logo=microsoft-sql-server&logoColor=white)](https://www.microsoft.com/en-us/sql-server)
[![RabbitMQ](https://img.shields.io/badge/Message_Queue-RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)
[![ChromaDB](https://img.shields.io/badge/Vector_DB-ChromaDB-FFD700?style=for-the-badge&logo=python&logoColor=black)](https://www.trychroma.com/)
[![Docker](https://img.shields.io/badge/Container-Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)](https://github.com/features/actions)

---

## 📌 Project Overview

The **Hotel and Restaurant Review Management & Analysis System** is an enterprise-grade, full-stack intelligence platform engineered to revolutionize how hospitality organizations aggregate, analyze, and act upon customer feedback.

The platform continuously aggregates guest reviews across major global travel platforms (**Booking.com**, **Agoda**, **Google Maps**, and **TripAdvisor**), normalizes heterogeneous metadata, performs aspect-based sentiment analysis and semantic vector indexing, generates context-grounded AI responses (via **OpenAI**, **Google Gemini**, **Qwen**, and **DeepSeek** models using Retrieval-Augmented Generation / SOP injection), and delivers comparative competitive intelligence through modern React 19 portals for business tenants and platform administrators.

---

## 🏗️ System Architecture & Service Topology

The system is architected as a **Domain-Driven Modular Monolith** coupled with specialized high-performance microservices and asynchronous message brokering:

| Component | Technology | Default Port | Description |
|---|---|---|---|
| **Backend API** | FastAPI + SQLAlchemy 2.0 + Pydantic v2 | `8000` | Core API, multi-tenant RBAC, LLM Gateway, RabbitMQ job publisher |
| **User Frontend** | React 19 + TypeScript + Vite + Tailwind CSS | `5173` | Tenant dashboard for review analytics, aspect insights, AI replies & competitor tracking |
| **Admin Frontend** | React 19 + TypeScript + Vite + Tailwind CSS | `5174` | Platform administration, scraper orchestration, LLM settings, broadcasting & monitoring |
| **Embedding Service** | FastAPI + ChromaDB + SentenceTransformers | `8001` / `8002` | Local dense vector embeddings (`all-MiniLM-L6-v2`) and semantic search |
| **Scraper Engine** | FastAPI + Playwright (Headless Chromium) | `8001` | Multi-platform scraper worker, trait deduplication, and RabbitMQ consumer |
| **RabbitMQ Broker** | RabbitMQ AMQP Broker | `5672` (Web UI: `15672`) | Asynchronous distributed queue for scraping jobs and event dispatching |
| **Relational Database** | Microsoft SQL Server (ODBC Driver 18) | `1433` | ACID-compliant relational data store with SQLAlchemy ORM |

```
hotel-and-restaurant-review-management-system/
├── backend/                        # FastAPI Core Backend (Domain-Driven Design)
│   ├── app/
│   │   ├── core/                   # Config, database engine, security, dependencies
│   │   ├── middleware/             # Cookie auth guards, permission checks, internal API auth
│   │   ├── modules/                # Encapsulated Business Domains:
│   │   │   ├── admin/              # User/Org admin, broadcasting, LLM config, subscriptions
│   │   │   ├── auth/               # HttpOnly JWT auth, OAuth (Google), sliding sessions
│   │   │   ├── competitors/        # Competitor tracking, scraping pipeline, comparative analytics
│   │   │   ├── dashboard/          # Unified & granular KPIs, trends, metrics aggregation
│   │   │   ├── groups/             # Tenant group hierarchy & member role management
│   │   │   ├── ml/                 # Machine learning endpoints (aspect analysis & reply generation)
│   │   │   ├── organization/       # Multi-tenant onboarding, rules/SOP management
│   │   │   ├── reviews/            # Reviews ingestion, deduplication, sentiment analysis
│   │   │   ├── scheduler/          # APScheduler background tasks, reconciliation & sync
│   │   │   ├── source/             # Review source management & embedding synchronization
│   │   │   └── user/               # User profiles and preferences
│   │   └── services/               # Shared services (LLM Gateway, Broadcasting, Notifications)
│   ├── requirements.txt            # Python dependencies
│   └── .env.example                # Backend environment template
│
├── frontend/                       # Tenant User Insight Dashboard
│   ├── src/
│   │   ├── api/                    # Axios API client with automatic token refreshing
│   │   ├── components/             # Reusable UI components & aspect visualization charts
│   │   ├── contexts/               # Theme and Auth context providers
│   │   ├── pages/                  # Dashboard, Reviews, Insights, Competitors, Settings, Groups
│   │   ├── services/               # Frontend service layer
│   │   ├── stores/                 # Zustand state management stores
│   │   └── types/                  # Strict TypeScript definitions
│   ├── package.json
│   └── vite.config.ts
│
├── admin-frontend/                 # System Administration Panel
│   ├── src/
│   │   ├── components/             # Admin data tables, system health gauges, broadcasting editor
│   │   ├── pages/                  # Monitoring, Users, Orgs, Scraping, Embeddings, LLMs, Flags
│   │   ├── services/               # Admin API service layer
│   │   └── types.ts                # Administrative TypeScript interfaces
│   ├── package.json
│   └── vite.config.ts
│
├── microservices/
│   ├── embedding-service/          # Vector search & semantic embeddings (ChromaDB)
│   │   ├── app/                    # Chroma client, sentence transformer, batch embedding routes
│   │   ├── Dockerfile              # Container definition with pre-warmed MiniLM cache
│   │   └── requirements.txt
│   └── scraper_engine/             # Universal reviews scraper microservice
│       ├── api/                    # Scraper REST endpoints and health diagnostics
│       ├── core/                   # RabbitMQ consumer, ThreadPool scrape pool, deduplication
│       ├── platforms/              # Platform-specific Playwright engines:
│       │   ├── agoda/              # Agoda scraper & URL resolver
│       │   ├── booking/            # Booking.com scraper & URL resolver
│       │   ├── google/             # Google Maps scraper & authentication logic
│       │   └── tripadvisor/        # TripAdvisor scraper & URL resolver
│       ├── Dockerfile              # Container definition with Playwright & Chromium
│       └── requirements.txt
│
├── deploy/                         # Production deployment configurations
│   ├── server1-frontends/          # Frontends reverse proxy (Nginx + SSL Certbot)
│   ├── server2-backend/            # Backend API container & Nginx reverse proxy
│   ├── server3-embedding/          # ChromaDB Embedding container & Nginx proxy
│   ├── server4-scraper/            # Playwright Scraper container & Nginx proxy
│   └── single-vps/                 # Unified single-server docker-compose deployment
│
└── docs/                           # Architectural blueprints, ER diagrams, UML, ADRs
```

---

## ✨ Key System Capabilities

### 1. Robust Multi-Platform Review Aggregation
- **Playwright Automation**: Headless browser scraping capable of bypassing dynamic SPAs and anti-bot measures across **Google Maps**, **TripAdvisor**, **Booking.com**, and **Agoda**.
- **Asynchronous Message Queueing**: RabbitMQ broker decouples scraper jobs from the backend API, allowing distributed job scheduling, rate limiting, and fault tolerance.
- **Deep Trait Deduplication**: Normalizes review IDs, author hashes, timestamps, and texts to prevent duplicate records across recurring scraping runs.

### 2. Multi-Model AI & LLM Gateway
- **Provider-Agnostic LLM Gateway**: Seamlessly routes prompts across **Google Gemini**, **OpenAI GPT-4o**, **Qwen**, and **DeepSeek** with automatic fallback handling.
- **Aspect-Based Sentiment Analysis**: Extracts granular sentiment (positive, neutral, negative) and rating scores across dimensions like *Cleanliness*, *Service*, *Location*, *Value*, and *Amenities*.
- **Retrieval-Augmented Response Generation (RAG)**: Retrieves relevant hotel SOPs and organizational rules from ChromaDB to craft empathetic, policy-compliant draft replies for management approval.

### 3. Semantic Vector Search & SOP Grounding
- **Local Dense Embeddings**: Generates 384-dimensional dense vectors using `sentence-transformers/all-MiniLM-L6-v2` with zero external API fees and sub-15ms embedding times.
- **ChromaDB Vector Store**: Persists vector embeddings for fast cosine similarity semantic queries over review datasets and property policies.

### 4. Enterprise Security & Multi-Tenancy
- **Secure HttpOnly Cookie Authentication**: Mitigates XSS vulnerabilities by storing JWT access tokens in encrypted, `HttpOnly`, `SameSite=Strict` cookies.
- **Sliding Session Renewal**: Auto-renews active user sessions transparently while enforcing strict absolute session lifetimes.
- **Role-Based Access Control (RBAC)**: Enforces tenant-level boundaries across **Platform Admin**, **Group Admin**, **Group Manager**, and **Group Member** roles.

### 5. Competitive Intelligence & Benchmarking
- **Competitor Tracking**: Ingests competitor property reviews from configured platforms.
- **AI Comparative Analytics**: Benchmarks property scores, aspect strengths/weaknesses, and guest sentiment velocity against market rivals.

---

## 🛠️ Technology Stack

| Domain | Technology / Library | Description |
|---|---|---|
| **Backend Core** | Python 3.11+, FastAPI, Pydantic v2 | High-throughput asynchronous REST API framework |
| **ORM & Data Layer** | SQLAlchemy 2.0, PyODBC, MS SQL Server | Relational persistence with connection pooling |
| **Message Broker** | RabbitMQ (pika / aio_pika) | Asynchronous task distribution and job queueing |
| **Vector Database** | ChromaDB, SentenceTransformers | Local vector store with cosine distance search |
| **Scraping Engine** | Playwright (Python), Headless Chromium | Resilient DOM automation and network interception |
| **Frontends** | React 19, TypeScript 5.9, Vite 7 | Modern reactive component architecture |
| **Styling & UI** | Tailwind CSS 3.4, Lucide React, Recharts | Responsive layout, charts, and dark-mode ready |
| **State Management** | Zustand, React Query (TanStack Query) | Client-side reactive cache and state stores |
| **Authentication** | Python-JOSE, Passlib (Bcrypt), Authlib | Secure JWT cookies, OAuth 2.0 with Google |
| **Container & CI/CD** | Docker, Docker Compose, GitHub Actions | Multi-stage image builds, GHCR registry & SSH deployment |

---

## 📋 Prerequisites

Ensure the following dependencies are installed on your host machine:

- **Python 3.10+** (Python 3.11 recommended)
- **Node.js 18+** & **npm 9+**
- **Microsoft SQL Server** (2019+ or Azure SQL) with **ODBC Driver 18 for SQL Server**
- **RabbitMQ** (Local broker via Docker or hosted CloudAMQP instance)
- **Docker & Docker Compose** (for containerized execution)
- **Git**

---

## 🚀 Quick Start Guide

### 1. Clone the Repository
```bash
git clone https://github.com/Rzmy7/hotel-and-restaurant-review-management-system.git
cd hotel-and-restaurant-review-management-system
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt
playwright install chromium

# Copy and configure environment variables
cp .env.example .env

# Verify database connectivity
python -c "import tests.test_db_connectivity"

# Start FastAPI backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- **Interactive OpenAPI Documentation**: `http://localhost:8000/docs`

### 3. User Frontend Setup (Tenant Dashboard)
```bash
cd frontend
npm install
npm run dev
```
- **Tenant Portal URL**: `http://localhost:5173`

### 4. Admin Frontend Setup (Platform Management)
```bash
cd admin-frontend
npm install
npm run dev
```
- **Admin Portal URL**: `http://localhost:5174`

### 5. Embedding Service Setup (ChromaDB)
```bash
cd microservices/embedding-service
docker build -t embedding-service .
docker run -d -p 8002:8000 -v chroma_data:/data/chroma --name reviewmate-embedding embedding-service
```
- **Embedding API Docs**: `http://localhost:8002/docs`

### 6. Scraper Engine Microservice
```bash
cd microservices/scraper_engine
pip install -r requirements.txt
playwright install chromium
python api/main.py
```
- **Scraper API Docs**: `http://localhost:8001/docs`

### 7. 🚀 All-in-One System Launcher
Launch all services simultaneously using the orchestrator:
```bash
python launcher.py
```
Or execute the pre-built launcher binary:
```bash
.\dist\System-Launcher.exe
```

---

## 🚢 Production Deployment

The project supports both single-server containerized deployment and distributed multi-server architectures with automated Let's Encrypt SSL.

### Option A: Single-VPS Deployment (Docker Compose)
```bash
cd deploy/single-vps
cp .env.example .env
# Edit .env with your domain names and DB connection strings
docker compose up -d --build
sudo bash init-ssl.sh
```

### Option B: Distributed 4-Server Architecture
| Server Target | Role | Config Location | Domain Example |
|---|---|---|---|
| **Server 1** | Frontends (User + Admin + Nginx) | `deploy/server1-frontends/` | `reviewmate.live` / `admin.reviewmate.live` |
| **Server 2** | Backend API (FastAPI) | `deploy/server2-backend/` | `api.reviewmate.live` |
| **Server 3** | Embedding Microservice (ChromaDB) | `deploy/server3-embedding/` | `embed.reviewmate.live` |
| **Server 4** | Scraper Engine (Playwright + Worker) | `deploy/server4-scraper/` | `scrape.reviewmate.live` |

---

## 📄 License & Intellectual Property

**Academic & Enterprise Property**  
© 2026 Hotel and Restaurant Review Management & Analysis System. All rights reserved.
