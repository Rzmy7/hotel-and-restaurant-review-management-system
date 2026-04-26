# 🏨 Hotel and Restaurant Review Management & Analysis System

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Styling-TailwindCSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![MSSQL](https://img.shields.io/badge/Database-MS%20SQL%20Server-CC2927?style=for-the-badge&logo=microsoft-sql-server&logoColor=white)](https://www.microsoft.com/en-us/sql-server)
[![Docker](https://img.shields.io/badge/Container-Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)](https://github.com/features/actions)

## 📌 Project Overview

The **Hotel and Restaurant Review Management & Analysis System** is a sophisticated, full-stack enterprise solution designed to revolutionize how hospitality businesses handle customer feedback. By integrating advanced web scraping, AI-powered sentiment analysis, and interactive data visualization, the system provides actionable insights to improve service quality and reputation.

The platform aggregates data from major travel platforms like **Booking.com**, **Agoda**, **Google Maps**, and **TripAdvisor**, processes it using state-of-the-art LLMs (**Google Gemini**), and presents it through intuitive dashboards for both end-users and administrators.

---

## 🎓 Academic Refactor (Phased Modernization)

This project has undergone a rigorous **Academic Refactor** to achieve institutional-grade code quality, adhering to a 100/100 assessment rubric. Key improvements include:

- **Phased Roadmap**: 6-phase transformation from monolithic scripts to a decoupled, layered architecture.
- **ORM Transition**: Complete migration from raw SQL strings to **SQLAlchemy 2.0 ORM** with centralized session management.
- **Robust Validation**: Implementation of **Pydantic V2** schemas for strict request/response validation across all layers.
- **Performance Profiling**: Centralized JSON-structured logging with automated execution-time decorators for bottleneck identification.
- **Standardized Error Handling**: Global exception handlers providing consistent, type-safe API responses.
- **Verified Testing**: Integration of a `pytest` suite with an automated SQLite compatibility layer for rapid development.

---

## 🏗️ System Architecture

The system is built on a **Domain-Driven Modular Monolith** architecture with a strict **Layered Service Pattern** to ensure high modifiability and separation of concerns:

- **Routing Layer**: FastAPI routers handling HTTP requests and Pydantic validation.
- **Service Layer**: Business logic isolation, decoupling API logic from data persistence.
- **Repository Layer**: Specialized data access objects (DAOs) using SQLAlchemy ORM.
- **Microservices**: Decoupled engines for scraping and embedding to ensure system scalability.

| Component | Technology | Port | Description |
|-----------|------------|------|-------------|
| **Backend API** | FastAPI + SQLAlchemy | 8000 | Core API, auth, scraping orchestration, AI integration |
| **User Frontend** | React 19 + Vite + TypeScript | 5173 | Customer-facing dashboard for review analytics |
| **Admin Frontend** | React 19 + Vite + TypeScript | 5174 | System management, scraper control, monitoring |
| **Embedding Service** | FastAPI + ChromaDB | 8001 | Semantic search & vector embeddings (Dockerized) |
| **Scraper Engine** | FastAPI + Playwright | 8001 | Multi-platform review scraping microservice |

```
hotel-and-restaurant-review-management-system/
├── backend/                        # FastAPI backend (Domain-Driven Design)
│   ├── app/
│   │   ├── main.py                 # API entry point & router registration
│   │   ├── core/                   # Config, database, security, dependencies
│   │   ├── middleware/             # Auth guards, permission checks
│   │   ├── modules/                # Business domains (admin, auth, reviews, etc.)
│   │   ├── repositories/           # Data access layer
│   │   ├── schemas/                # Pydantic models
│   │   └── services/               # Business logic services
│   ├── tests/                      # Integration & connectivity tests
│   ├── requirements.txt            # Python dependencies
│   └── .env.example                # Environment template
│
├── frontend/                       # User Insight Dashboard
│   ├── src/
│   │   ├── api/                    # API wrappers (Axios)
│   │   ├── components/             # Reusable UI components
│   │   ├── contexts/               # React Context providers
│   │   ├── pages/                  # Route components
│   │   ├── services/               # Business logic layer
│   │   ├── stores/                 # Zustand state management
│   │   └── types/                  # TypeScript definitions
│   ├── package.json
│   └── vite.config.ts
│
├── admin-frontend/                 # System Administration Panel
│   ├── src/
│   │   ├── components/             # Admin UI components
│   │   ├── layouts/                # Dashboard layouts
│   │   ├── pages/                  # Management views
│   │   ├── services/               # API service layer
│   │   └── types.ts                # Type definitions
│   ├── package.json
│   └── vite.config.ts
│
├── microservices/
│   ├── embedding-service/          # Vector search & semantic embeddings
│   │   ├── app/
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   └── scraper_engine/             # Multi-platform scraping microservice
│       ├── api/                    # FastAPI endpoints
│       ├── platforms/              # Platform-specific scrapers
│       │   ├── agoda/
│       │   ├── booking/
│       │   ├── google/
│       │   └── tripadvisor/
│       ├── core/                   # Config, database, utils
│       └── requirements.txt
│
└── docs/                           # Architecture diagrams, ER diagrams, UML
```

---

## ✨ Key Features

### Backend
- **🌐 Domain-Driven Design**: Modular architecture with clear business boundaries
- **🕷️ Web Scraping**: Playwright-based scraping engine for multiple platforms
- **🤖 AI Integration**: Google Gemini for sentiment analysis and summarization
- **🔐 Authentication**: JWT-based auth with OAuth (Google) support
- **👥 RBAC**: Role-based access control (System & Group levels)
- **⏰ Scheduler**: APScheduler for background tasks
- **🏥 Health Monitoring**: Real-time system diagnostics

### Frontend (User Dashboard)
- **📊 Performance Overview**: Sentiment trends and KPI charts (Recharts)
- **📑 Review Management**: Filterable review lists with sentiment highlighting
- **🧠 AI Summaries**: Quick-read summaries of review clusters
- **🎨 Type-Safe**: Comprehensive TypeScript definitions
- **🔄 State Management**: Zustand for global state

### Admin Panel
- **🎛️ Scraper Orchestration**: Trigger and monitor scraping jobs
- **📈 System Health**: CPU, RAM, and database status visualization
- **⚙️ Configuration Management**: API keys and system settings
- **🔍 Review Oversight**: Quality control for processed reviews

### Embedding Service
- **🔍 Semantic Search**: Vector-based review search with filtering
- **🔄 Model Switching**: Toggle between Gemini (cloud) and MiniLM (local)
- **📦 Batch Processing**: High-performance embedding generation
- **🐳 Dockerized**: Ready for containerized deployment

- **Scraper Engine**
- **🌍 Multi-Platform**: Agoda, Booking.com, Google Maps, TripAdvisor
- **🛡️ High Reliability**: Individual review savepoints with a 3-attempt retry logic
- **🚀 Verified Batching**: Real-time progress updates and crash resilience
- **🔗 Unified API**: Consistent data format across all sources
- **📝 Audit Logging**: System-wide API call tracking
- **🔄 Scalable Ingestion**: Asynchronous pagination support for sources with 5,000+ reviews
- **📣 Callback Mechanism**: Automatic backend notification on completion

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Backend Framework** | FastAPI, SQLAlchemy 2.0, Playwright |
| **AI/ML** | Google GenAI (Gemini), ChromaDB, SentenceTransformers |
| **Frontend** | React 19, TypeScript 5.9, Vite 7 |
| **Styling** | TailwindCSS, Lucide React, Recharts |
| **State Management** | Zustand, React Query, Context API |
| **Database** | Microsoft SQL Server (ODBC Driver 18) |
| **Vector Store** | ChromaDB |
| **Security** | JWT, Bcrypt, Authlib, Python-JOSE |
| **Containerization** | Docker |
| **CI/CD** | GitHub Actions, GHCR, SSH Deployment |

---

## 📋 Prerequisites

Before setting up the project, ensure you have the following installed:

- **Python 3.10+**
- **Node.js 18+** & **npm**
- **Microsoft SQL Server** with ODBC Driver 18
- **Docker** (for Embedding Service)
- **Git**

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd hotel-and-restaurant-review-management-system
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt
playwright install chromium

# Configure environment
cp .env.example .env
# Edit .env with your database credentials and API keys

# Run connectivity tests
$env:PYTHONPATH = ".;$env:PYTHONPATH"; python tests/test_db_connectivity.py

# Start server
uvicorn app.main:app --reload

# Running Tests (Academic Quality Assurance)
# Ensure the backend virtual environment is active
pytest tests/modules/reviews/  # Run core domain tests
pytest tests/                  # Run full connectivity suite
```

**API Docs**: http://localhost:8000/docs

### 3. Frontend Setup (User Dashboard)

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

**Access**: http://localhost:5173

### 4. Admin Frontend Setup

```bash
cd admin-frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

**Access**: http://localhost:5174

### 5. Embedding Service (Docker)

```bash
cd microservices/embedding-service

# Build and run
docker build -t embedding-service .
docker run -d -p 8001:8000 -v chroma_data:/data/chroma --name embedding_service embedding-service
```

### 6. Scraper Engine Microservice

```bash
cd microservices/scraper_engine

# Install dependencies
pip install -r requirements.txt
playwright install chromium

# Configure .env with database and backend URL

# Start service
python api/main.py
```

**API Docs**: http://localhost:8001/docs

### 7. 🚀 Unified System Launcher (Orchestrator)

We have a dedicated python tool to launch all 5 services concurrently saving you the hassle of juggling terminals. It automatically fetches missing dependencies, orchestrates start orders, and separates logs using colored prefixes!

You can run it natively using Python:
```bash
python launcher.py
```

Or you can use the precompiled standalone executable, located in the dist directory:
```bash
.\dist\System-Launcher.exe
```

> **Note**: To prevent port collisions when run simultaneously, the launcher automatically starts the **Embedding Service** on **Port 8002** and the **Admin UI** on **Port 5174**.

---

## 📄 Documentation

Comprehensive system documentation is available in the **[docs](docs/README.md)** folder:

- **[Architecture Diagrams](docs/Architecture%20diagrams/)** - Component interaction and data flow
- **[ER Diagrams](docs/ER%20diagrams/)** - Database schema design
- **[UML Diagrams](docs/UML%20diagrams/)** - System logic and class structures

---

## 🔌 API Endpoints Summary

### Backend (Port 8000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/health` | GET | System health (CPU, Memory, Uptime) |
| `/db-test` | GET | Database connectivity test |
| `/api/reviews` | GET | Fetch reviews |
| `/api/dashboard` | GET | Dashboard KPIs |
| `/api/competitors` | GET/POST | Competitor analysis |
| `/api/admin` | Various | Admin operations |
| `/api/groups` | Various | Group management |
| `/auth/*` | Various | Authentication endpoints |
| `/oauth/*` | Various | OAuth endpoints |

### Scraper Engine (Port 8001)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agoda/scrape` | POST | Trigger Agoda scrape |
| `/api/booking/scrape` | POST | Trigger Booking scrape |
| `/api/google/scrape` | POST | Trigger Google scrape |
| `/api/tripadvisor/scrape` | POST | Trigger TripAdvisor scrape |
| `/api/reviews` | GET | Query reviews |
| `/api/sources/{id}/cleanup` | POST | Trigger deep trait-based deduplication |
| `/api/sources/{id}/integrity` | GET | Detailed database health & consistency report |
| `/api/system/health` | GET | Health check |
| `/api/db/stats` | GET | Database statistics |

### Embedding Service (Port 8001)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/embed/batch` | POST | Batch embedding generation |
| `/search` | POST | Semantic search |
| `/model` | PUT | Switch embedding model |
| `/api-settings` | PUT | Update API configuration |

---

## ⚙️ Environment Configuration

### Backend `.env` Variables

```env
# General
SECRET_KEY=dev-secret-key-change-me
FRONTEND_URL=http://localhost:5173

# Database (SQLAlchemy)
DATABASE_URL=mssql+pyodbc://<user>:<pass>@<server>/<db>?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes

# PyODBC (Reviews/Dashboard)
DB_DRIVER=ODBC Driver 18 for SQL Server
DB_SERVER=your-server
DB_NAME=your-database
DB_UID=your-username
DB_PWD=your-password

# Google Generative AI
GENAI_KEY=your-gemini-api-key

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# JWT
JWT_SECRET_KEY=generate-random-string

# SMTP (Password resets)
SMTP_EMAIL=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# Supabase (Optional storage)
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-anon-key
```

### Scraper Engine `.env` Variables

```env
# Database
DB_DRIVER=ODBC Driver 18 for SQL Server
DB_SERVER=your_server
DB_NAME=ScraperEngine
DB_UID=sa
DB_PWD=your_password

# Backend notification
BACKEND_API_URL=http://127.0.0.1:8000
```

---

## 🚢 CI/CD & Deployment

The project uses **GitHub Actions** to automatically build Docker images and deploy them to production servers whenever changes are pushed to the `dev` branch. The pipeline is optimized with **path-based change detection** so only modified services are rebuilt and redeployed.

### Deployment Architecture

Services are distributed across **4 dedicated servers**, each running Docker Compose with Nginx + SSL (Let's Encrypt):

| Server | Services | Domain | Deploy Config |
|--------|----------|--------|---------------|
| **Server 1** — Frontends | User Frontend, Admin Frontend, Nginx, Certbot | `reviewmate.live`, `admin.reviewmate.live` | `deploy/server1-frontends/` |
| **Server 2** — Backend | FastAPI Backend, Nginx, Certbot | `api.reviewmate.live` | `deploy/server2-backend/` |
| **Server 3** — Embedding | Embedding Service + ChromaDB, Nginx, Certbot | `embed.reviewmate.live` | `deploy/server3-embedding/` |
| **Server 4** — Scraper | Scraper Engine + Playwright, Nginx, Certbot | `scrape.reviewmate.live` | `deploy/server4-scraper/` |

### Docker Images

All images are built and pushed to the **GitHub Container Registry (GHCR)**:

| Image | Source |
|-------|--------|
| `ghcr.io/rzmy7/reviewmate-frontend:latest` | `frontend/Dockerfile` |
| `ghcr.io/rzmy7/reviewmate-admin-frontend:latest` | `admin-frontend/Dockerfile` |
| `ghcr.io/rzmy7/reviewmate-backend:latest` | `backend/Dockerfile` |
| `ghcr.io/rzmy7/reviewmate-embedding:latest` | `microservices/embedding-service/Dockerfile` |
| `ghcr.io/rzmy7/reviewmate-scraper:latest` | `microservices/scraper_engine/Dockerfile` |

Each image is tagged with both `latest` and the commit SHA (`${{ github.sha }}`) for rollback support.

### Pipeline Flow

```
Push to 'dev' branch
        │
        ▼
┌─────────────────┐
│ Detect Changes  │  (dorny/paths-filter)
│ per service     │
└────────┬────────┘
         │ outputs: frontend, admin-frontend, backend, embedding, scraper
         ▼
┌────────────────────────────────────────────────────────────────────┐
│              BUILD (parallel, only changed services)              │
├────────────┬──────────────┬───────────┬────────────┬──────────────┤
│  Frontend  │ Admin Front. │  Backend  │ Embedding  │   Scraper    │
│  (if ∆)    │   (if ∆)     │  (if ∆)   │  (if ∆)    │   (if ∆)     │
└─────┬──────┴──────┬───────┴─────┬─────┴─────┬──────┴──────┬───────┘
      │             │             │           │             │
      ▼             ▼             ▼           ▼             ▼
┌────────────────────────────────────────────────────────────────────┐
│              DEPLOY (SSH → docker compose pull & up)              │
├─────────────────────┬───────────┬────────────┬────────────────────┤
│  Server 1           │ Server 2  │  Server 3  │     Server 4      │
│  (if front. or      │ (if back  │ (if embed  │   (if scraper     │
│   admin built)      │  built)   │  built)    │    built)         │
└─────────────────────┴───────────┴────────────┴────────────────────┘
```

### Change Detection Rules

The pipeline uses [`dorny/paths-filter`](https://github.com/dorny/paths-filter) to detect which services have changed:

| Service | Trigger Paths |
|---------|---------------|
| Frontend | `frontend/**`, `deploy/server1-frontends/**` |
| Admin Frontend | `admin-frontend/**`, `deploy/server1-frontends/**` |
| Backend | `backend/**`, `deploy/server2-backend/**` |
| Embedding | `microservices/embedding-service/**`, `deploy/server3-embedding/**` |
| Scraper | `microservices/scraper_engine/**`, `deploy/server4-scraper/**` |

### Required GitHub Secrets & Variables

Configure these in **Settings → Secrets and variables → Actions**:

#### Secrets

| Secret | Description |
|--------|-------------|
| `GITHUB_TOKEN` | Automatically provided; used for GHCR authentication during builds |
| `GHCR_TOKEN` | Personal Access Token with `read:packages` scope for servers to pull images |
| `SSH_KEY` | Private SSH key for deployment to all servers |
| `USER` | SSH username on all servers |
| `FRONTEND_HOST` | IP / hostname of Server 1 (frontends) |
| `BACKEND_HOST` | IP / hostname of Server 2 (backend) |
| `EMBEDDING_HOST` | IP / hostname of Server 3 (embedding) |
| `SCRAPING_HOST` | IP / hostname of Server 4 (scraper) |

#### Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PROD_API_URL` | Production backend API URL | `https://api.reviewmate.live` |
| `PROD_SCRAPER_URL` | Production scraper engine URL | `https://scrape.reviewmate.live` |
| `PROD_EMBEDDING_URL` | Production embedding service URL | `https://embed.reviewmate.live` |
| `PROD_FRONTEND_URL` | Production frontend URL | `https://reviewmate.live` |
| `PROD_ADMIN_URL` | Production admin panel URL | `https://admin.reviewmate.live` |

### First-Time Server Setup

Each server requires a one-time setup before the pipeline can deploy to it:

```bash
# 1. Create the application directory
sudo mkdir -p /opt/reviewmate
cd /opt/reviewmate

# 2. Copy the corresponding deploy config from this repo
#    Example for Server 2 (backend):
scp deploy/server2-backend/docker-compose.yml  user@server:/opt/reviewmate/
scp deploy/server2-backend/.env.example        user@server:/opt/reviewmate/.env

# 3. Edit the .env file with production credentials
nano .env

# 4. Authenticate with GHCR (one-time)
echo "<GHCR_TOKEN>" | docker login ghcr.io -u <github-username> --password-stdin

# 5. Start the services
docker compose pull
docker compose up -d

# 6. Set up SSL certificates (one-time)
sudo bash init-ssl.sh
```

> **Note**: Each server includes an `init-ssl.sh` script for bootstrapping Let's Encrypt SSL certificates. Run it once after the first deployment. Certificates auto-renew via the `certbot` container.

### Deployment File Structure

```
deploy/
├── server1-frontends/
│   ├── docker-compose.yml     # Frontend + Admin + Nginx + Certbot
│   ├── nginx.conf             # SSL + domain-based routing
│   └── init-ssl.sh            # One-time SSL bootstrap script
├── server2-backend/
│   ├── docker-compose.yml     # Backend + Nginx + Certbot
│   ├── nginx.conf             # SSL reverse proxy for api.reviewmate.live
│   ├── .env.example           # Full environment template
│   └── init-ssl.sh            # One-time SSL bootstrap script
├── server3-embedding/
│   ├── docker-compose.yml     # Embedding + Nginx + Certbot
│   ├── nginx.conf             # SSL reverse proxy for embed.reviewmate.live
│   └── init-ssl.sh            # One-time SSL bootstrap script
└── server4-scraper/
    ├── docker-compose.yml     # Scraper + Nginx + Certbot
    ├── nginx.conf             # SSL reverse proxy for scrape.reviewmate.live
    ├── .env.example           # Scraper env template
    └── init-ssl.sh            # One-time SSL bootstrap script
```

---

## 🧪 Development Commands

| Component | Command | Description |
|-----------|---------|-------------|
| **Backend** | `uvicorn app.main:app --reload` | Start dev server |
| **Frontend** | `npm run dev` | Start Vite dev server |
| **Frontend** | `npm run build` | Production build |
| **Frontend** | `npm run lint` | ESLint check |
| **Admin** | `npm run dev` | Start Vite dev server |
| **Admin** | `npm run build` | Production build |
| **Embedding** | `docker run -d -p 8001:8000 ...` | Run Docker container |
| **Scraper** | `python api/main.py` | Start scraper service |

---

## 🐛 Troubleshooting

### Database Connection Issues
- Ensure ODBC Driver 18 is installed
- Add `TrustServerCertificate=yes` to connection string for local/dev servers
- Run `python tests/test_db_connectivity.py` to diagnose

### Scraper Issues
- Run `playwright install chromium` to install browser
- Check Playwright browser dependencies on your OS

### Embedding Service
- First startup downloads MiniLM model (~30-90 seconds)
- Clear `chroma_data` volume when switching models
- Use Gemini API mode for VPS with <2GB RAM

### Frontend Build Errors
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check TypeScript config: `tsconfig.json`

---

## 📝 Development Conventions

### Code Style
- **Python**: Follows PEP 8, uses type hints
- **TypeScript**: Strict mode enabled, React 19 patterns
- **Linting**: ESLint (frontend/admin), Flake8 (backend `.flake8` config)

### Testing Practices
- Backend includes connectivity tests in `tests/`
- Scraper engine has integration tests in `tests/`
- Run `python tests/test_db_connectivity.py` to verify setup

### Architecture Patterns
- **Backend**: Domain-Driven Design with modular monolith structure
- **Frontend**: Component-based architecture with Context + Zustand
- **API**: RESTful design with OpenAPI/Swagger documentation

### Git Workflow
- Feature branches for new development
- Documentation updates required for architectural changes
- ER diagrams and UML stored in `docs/`

---

## 📄 License

**Private / Proprietary**  
© 2026 Hotel & Restaurant Review Management System

---

## 📞 Support

For questions or issues, please refer to the individual component READMEs:

- **[Backend Documentation](backend/README.md)**
- **[Frontend Documentation](frontend/README.md)**
- **[Admin Panel Documentation](admin-frontend/README.md)**
- **[Embedding Service Documentation](microservices/embedding-service/readme.md)**
- **[Scraper Engine Documentation](microservices/scraper_engine/README.md)**
