# ⚙️ Backend API Service

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white)](https://www.sqlalchemy.org/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-Publisher-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)
[![Pydantic v2](https://img.shields.io/badge/Pydantic-v2-E92063?style=for-the-badge&logo=pydantic&logoColor=white)](https://docs.pydantic.dev/)

The backend of the **Hotel and Restaurant Review Management & Analysis System** is a production-grade **Domain-Driven Modular Monolith** built with **FastAPI**. It coordinates web scraping orchestration, multi-model AI sentiment analysis and response generation, semantic vector search integration, role-based multi-tenancy, and high-performance relational persistence.

---

## 🌟 Core Architecture & Responsibilities

| Domain Module | Description & Key Responsibilities |
|---|---|
| **`auth`** | Secure authentication using **HttpOnly Cookie JWTs**, Google OAuth 2.0, sliding session management, and password reset flows via SMTP. |
| **`admin`** | Platform administrator capabilities: user/organization oversight, maintenance mode toggles, broadcasting service, feature flags, subscription tiers, and LLM model routing. |
| **`organization`** | Multi-tenant organization lifecycle, business profile onboarding, property configurations, and custom operational rules / SOP management. |
| **`groups`** | Hierarchical group structures with granular Role-Based Access Control (**Group Admin**, **Group Manager**, **Group Member**). |
| **`reviews`** | Review ingestion, normalization, trait deduplication, sentiment scoring, alert rule triggers, and reply management. |
| **`ml`** | Aspect-based sentiment analysis and contextual review response drafting with Retrieval-Augmented SOP grounding. |
| **`competitors`** | Competitor tracking, automated review scraping pipeline, comparative sentiment analytics, and market benchmarking. |
| **`dashboard`** | Aggregated KPI calculation, sentiment distribution trends, platform breakdown, and executive analytics. |
| **`source`** | Management of review sources (Google Maps, TripAdvisor, Booking.com, Agoda), sync status tracking, and vector indexing triggers. |
| **`scheduler`** | APScheduler background worker executing automated sync tasks, scraping job reconciliation, and scheduled broadcast dispatches. |
| **`user`** | User profile management, notification settings, and personal preference handling. |

---

## 🏗️ Directory Structure

```
backend/app/
├── main.py                     # Application entry point, lifespan events & router registration
├── core/                       # Infrastructure configuration & foundational dependencies
│   ├── config.py               # Pydantic Settings management (.env loader)
│   ├── database.py             # SQLAlchemy 2.0 async/sync engine & session factories
│   ├── security.py             # Password hashing (Bcrypt), JWT generation & decoding
│   └── dependencies.py         # FastAPI dependency injection providers
├── middleware/                 # Interceptors & security guards
│   └── permissions.py          # RBAC verification, cookie auth extractors & internal API guards
├── modules/                    # Domain-Driven Business Modules
│   ├── admin/                  # System admin routes, services, schemas & activity logging
│   ├── auth/                   # Login, signup, OAuth, session refresh, email service
│   ├── competitors/            # Competitor CRUD, scraping pipelines, analytics services
│   ├── dashboard/              # Granular and unified KPI metrics, trend analysis
│   ├── groups/                 # Group memberships, migration utilities, role assignments
│   ├── ml/                     # Aspect sentiment extraction and AI reply endpoints
│   ├── organization/           # Multi-tenant onboarding and hotel SOP rules
│   ├── reviews/                # Review CRUD, deduplication, sentiment processing, alerts
│   ├── scheduler/              # APScheduler task definitions (sync, reconcile, broadcast)
│   ├── source/                 # Source registration, sync task queues, embedding client
│   └── user/                   # User profile management and preferences
├── services/                   # Cross-cutting application services
│   ├── broadcasting_service.py # System-wide user announcements & broadcast dispatcher
│   ├── llm_gateway.py          # Multi-provider LLM abstraction (OpenAI, Qwen, DeepSeek, custom OpenAI-compatible)
│   └── notifications_service.py# In-app and email notification dispatcher
└── tests/                      # Automated integration and unit tests
```

---

## 🔐 Authentication & Security Model

1. **HttpOnly Cookie JWT Authentication**: Access tokens are stored exclusively in secure, `HttpOnly`, `SameSite=Lax/Strict` cookies to completely eliminate token theft via Cross-Site Scripting (XSS).
2. **Sliding Session Renewal**: The backend dynamically refreshes valid tokens upon active user requests, maintaining frictionless user experience without compromising session security.
3. **Internal Microservice Authentication**: Inter-service communication with the Scraper Engine and Embedding Service is secured via pre-shared `X-Internal-API-Key` headers.
4. **Hierarchical RBAC**: Granular permissions distinguish between platform-level administrators and organization-level tenant roles (`GROUP_ADMIN`, `GROUP_MANAGER`, `GROUP_MEMBER`).

---

## 🤖 Multi-Provider LLM Gateway

The backend abstracts Large Language Model interactions through a unified `LLMClient` and `LLMGateway`:

- **Supported Models**: OpenAI GPT-4o, Qwen 2.5, DeepSeek V3/R1, and any OpenAI format-compatible endpoints configured via the Admin Portal (`dbo.llm_model`).
- **Aspect-Based Sentiment Extraction**: Deconstructs raw review prose into aspect-specific ratings (*Cleanliness*, *Staff & Service*, *Location*, *Value for Money*, *Food & Dining*).
- **Retrieval-Augmented Response Generation (RAG)**: Integrates with the ChromaDB Embedding Microservice to retrieve property-specific standard operating procedures (SOPs), generating responses strictly adhering to hotel policy.

---

## ⚙️ Environment Variables (`.env`)

```env
# Application Settings
ENVIRONMENT=development
SECRET_KEY=your-super-secret-jwt-signing-key
FRONTEND_URL=http://localhost:5173
ADMIN_FRONTEND_URL=http://localhost:5174

# Database Configuration (MSSQL via SQLAlchemy)
DATABASE_URL=mssql+pyodbc://sa:YourPassword123@localhost:1433/ReviewManagementDB?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes

# Microservice Endpoints & Security
SCRAPER_SERVICE_URL=http://localhost:8001
EMBEDDING_SERVICE_URL=http://localhost:8002
INTERNAL_API_KEY=your-internal-microservice-shared-key

# RabbitMQ Asynchronous Task Broker
RABBITMQ_URL=amqp://guest:guest@localhost:5672/

# AI Provider API Keys (managed dynamically in Admin Portal via dbo.llm_model)
OPENAI_API_KEY=your-openai-api-key
DEEPSEEK_API_KEY=your-deepseek-api-key
QWEN_API_KEY=your-qwen-api-key

# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# SMTP Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=notifications@yourdomain.com
SMTP_PASSWORD=your-email-app-password
```

---

## 🚀 Running Locally

```bash
# 1. Activate Python environment
venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Start development server with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- **OpenAPI Interactive Documentation**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`
