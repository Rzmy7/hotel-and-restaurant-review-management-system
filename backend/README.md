# ⚙️ Backend API Service

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white)](https://www.sqlalchemy.org/)
[![Playwright](https://img.shields.io/badge/Playwright-Chromium-2EAD33?style=for-the-badge&logo=google-chrome&logoColor=white)](https://playwright.dev/)

The backend of the **Hotel and Restaurant Review Management System** is a production-grade **Domain-Driven Modular Monolith** built with **FastAPI**. It handles automated web scraping, AI-driven analysis, and secure business logic across multiple encapsulated domains.

---

## 🌟 Core Responsibilities

| Responsibility | Description |
|----------------|-------------|
| **🌐 Scraping Engine** | Orchestrates **Playwright** to extract granular review data from Booking.com, Agoda, Google Maps, and TripAdvisor |
| **🤖 AI Orchestration** | Integrates with **Google Gemini** for sentiment analysis, categorization, and summarization |
| **🔐 Auth & RBAC** | Secure user management using **JWT**, **Bcrypt**, and role-based permissions (System & Group levels) |
| **🗄️ Data Management** | Type-safe persistence using **SQLAlchemy 2.0 ORM** with a strict Repository pattern |
| **🏥 Health Monitoring** | Real-time system diagnostics and database connectivity tracking |
| **📝 Structured Logging** | JSON-formatted logging with correlation IDs (RID) for enterprise traceability |
| **⏰ Task Scheduling** | APScheduler for background jobs and automated scraping |

---

## 🏗️ Project Architecture

The system follows a **Domain-Driven Design** architecture where each business domain is self-contained:

```
backend/app/
├── main.py                     # Thin entry point & router registration
├── core/                       # Infrastructure (Config, Database, Security, Dependencies)
│   ├── config.py               # Environment configuration
│   ├── database.py             # Database connection & session management
│   ├── security.py             # JWT, password hashing, OAuth
│   └── dependencies.py         # Dependency injection
├── middleware/                 # Cross-cutting concerns (Permissions, Auth Guards)
├── modules/                    # DOMAIN MODULES
│   ├── admin/                  # User & Organization management
│   ├── auth/                   # Login, Signup, OAuth, and User Models
│   ├── competitors/            # Competitor tracking, scraping, and analytics
│   ├── dashboard/              # Global KPI aggregation and reporting
│   ├── groups/                 # Collaborative group management
│   ├── reviews/                # Review processing and sentiment analysis
│   ├── scheduler/              # APScheduler for background tasks
│   ├── source/                 # Source management
│   └── user/                   # User profiles & preferences
├── repositories/               # Data access layer
├── schemas/                    # Pydantic models (request/response)
├── services/                   # Business logic services
├── constants/                  # Shared system-wide constants
├── scripts/                    # Database seeding and migration scripts
└── tests/                      # Connectivity and integration tests
```

---

## 🛠️ Technology Stack

| Category | Technology |
|----------|------------|
| **Framework** | FastAPI |
| **ORM** | SQLAlchemy 2.0 |
| **Database Driver** | PyODBC (ODBC Driver 18) |
| **Database** | Microsoft SQL Server |
| **Scraping** | Playwright (Chromium) |
| **AI** | Google GenAI (Gemini 2.5) |
| **Security** | Python-JOSE (JWT), Passlib (Bcrypt), Authlib (OAuth) |
| **Validation** | Pydantic v2 |
| **Scheduling** | APScheduler |
| **Testing** | Pytest, PyODBC connectivity tests |

---

## 🔧 Installation & Setup

### 📋 Prerequisites

- **Python 3.10+**
- **Microsoft SQL Server**
- **ODBC Driver 18 for SQL Server**
- **Git**

### 🚀 Getting Started

#### 1. Environment Setup

```bash
cd backend

# Create & activate virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Install Playwright browser
playwright install chromium
```

#### 2. Configure Environment

Create a `.env` file in the `backend/` directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# ── General ─────────────────────────────────────────────────────────
SECRET_KEY=dev-secret-key-change-me
FRONTEND_URL=http://localhost:5173

# ── SQLAlchemy (Used for Auth/Users/Groups) ─────────────────────────
DATABASE_URL=mssql+pyodbc://<username>:<password>@<server>/<database>?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes

# ── PYODBC (Used for Reviews/Dashboard/Analytics) ───────────────────
DB_DRIVER=ODBC Driver 18 for SQL Server
DB_SERVER=your-server-address
DB_NAME=your-database-name
DB_UID=your-username
DB_PWD=your-password

# ── Google Generative AI (Gemini) ───────────────────────────────────
GENAI_KEY=your-gemini-api-key

# ── Google OAuth ────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# ── JWT ─────────────────────────────────────────────────────────────
JWT_SECRET_KEY=generate-a-long-random-string-for-jwt-signing

# ── SMTP (Email service for password resets) ────────────────────────
SMTP_EMAIL=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# ── Supabase (Optional storage) ─────────────────────────────────────
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_BUCKET=your-storage-bucket-name
```

> **Note**: Ensure `DATABASE_URL` includes `TrustServerCertificate=yes` for local/dev servers.

#### 3. Verify Setup

Run the connectivity suite to ensure the DB and AI keys are working:

```bash
# Windows PowerShell
$env:PYTHONPATH = ".;$env:PYTHONPATH"; python tests/test_db_connectivity.py

# Linux/Mac
export PYTHONPATH=".:$PYTHONPATH"; python tests/test_db_connectivity.py
```

#### 4. Launch the Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**API Documentation**: http://localhost:8000/docs  
**Alternative Docs**: http://localhost:8000/redoc

---

## 📡 API Endpoints

### Health & Diagnostics

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Root health check |
| `/health` | GET | System health (CPU, Memory, Uptime) |
| `/db-test` | GET | Database connectivity test |

### Reviews & Analytics

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/reviews` | GET | Fetch reviews with filtering |
| `/api/dashboard` | GET | Dashboard KPIs and metrics |
| `/api/sources` | GET/POST | Source management |

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | POST | User login (JWT token) |
| `/auth/signup` | POST | User registration |
| `/auth/refresh` | POST | Refresh access token |
| `/auth/password-reset` | POST | Request password reset |
| `/oauth/google` | GET | Google OAuth initiation |
| `/oauth/callback` | GET | OAuth callback handler |

### Administration

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/users` | GET/POST/PUT/DELETE | User management |
| `/api/admin/organizations` | GET/POST/PUT/DELETE | Organization management |
| `/api/admin/roles` | GET/POST/PUT/DELETE | Role management |

### Groups & Collaboration

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/groups` | GET/POST | Create/list groups |
| `/api/groups/{id}/members` | GET/POST/DELETE | Manage group members |
| `/api/groups/{id}` | GET/PUT/DELETE | Group operations |

### Competitors

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/competitors` | GET/POST | List/create competitors |
| `/api/competitors/{id}` | GET/PUT/DELETE | Competitor operations |
| `/api/competitors/{id}/scrape` | POST | Trigger competitor scrape |

---

## 🏥 Monitoring & Health

### Health Check Endpoints

- **`GET /health`**: CPU, Memory, and Uptime diagnostics
- **`GET /db-test`**: Instant database availability check

### Example Health Response

```json
{
  "status": "healthy",
  "cpu_percent": 12.5,
  "memory_mb": 256.8,
  "uptime_seconds": 3600,
  "database": "connected"
}
```

---

## 🗄️ Database Schema

The backend uses a **source-centric** database design:

### Core Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts and credentials |
| `roles` | Role definitions for RBAC |
| `user_roles` | User-role assignments |
| `organizations` | Organization entities |
| `user_organizations` | User-organization memberships |
| `groups` | Collaborative groups |
| `group_members` | Group membership tracking |
| `sources` | Review source registry (URLs, platforms) |
| `reviews` | Central review records (supertype) |
| `[platform]_reviews` | Platform-specific review data (subtypes) |
| `review_media` | Images/videos attached to reviews |
| `sentiment_scores` | AI-generated sentiment analysis |
| `themes` | Extracted themes from reviews |
| `summaries` | AI-generated review summaries |
| `audit_log` | System-wide audit trail |
| `broadcast_events` | Event broadcasting log |

> ER diagrams available in [`docs/ER diagrams/`](../docs/ER%20diagrams/)

---

## 🔐 Security Features

### Authentication
- **JWT-based** authentication with access/refresh tokens
- **Bcrypt** password hashing
- **Google OAuth 2.0** integration
- **Session management** with secure storage

### Authorization
- **Role-Based Access Control (RBAC)** at two levels:
  - **System Level**: Admin, User, Guest
  - **Group Level**: Owner, Manager, Member
- **Permission guards** via middleware

### Data Protection
- **CORS** configuration for frontend origins
- **Input validation** with Pydantic
- **SQL injection prevention** via SQLAlchemy ORM
- **Audit logging** for sensitive operations

---

## 🧪 Testing

### Connectivity Tests

```bash
# Run database connectivity tests
$env:PYTHONPATH = ".;$env:PYTHONPATH"; python tests/test_db_connectivity.py
```

### Running Tests

```bash
# Run all tests
pytest tests/

# Run with coverage
pytest tests/ --cov=app --cov-report=html
```

---

## 📝 Development Conventions

### Code Style
- Follows **PEP 8** guidelines
- Uses **type hints** throughout
- **Flake8** linting enabled (`.flake8` config)

### Architecture Patterns
- **Domain-Driven Design** with modular boundaries
- **Dependency Injection** for testability
- **Repository Pattern** for data access
- **Service Layer** for business logic

### Git Workflow
- Feature branches: `feature/<name>`
- Bug fixes: `fix/<name>`
- Documentation updates required for architectural changes

---

## 🐛 Troubleshooting

### Database Connection Fails

1. Verify ODBC Driver 18 is installed
2. Check connection string includes `TrustServerCertificate=yes`
3. Ensure SQL Server is running and accessible
4. Run connectivity test: `python tests/test_db_connectivity.py`

### Playwright Browser Issues

```bash
# Reinstall Playwright browsers
playwright install chromium --force

# Check system dependencies
playwright install-deps chromium
```

### Google Gemini API Errors

1. Verify `GENAI_KEY` in `.env`
2. Check API quota in Google Cloud Console
3. Test API key: `curl -X POST https://generativelanguage.googleapis.com/...`

### Import Errors

```bash
# Ensure you're in the backend directory
cd backend

# Set PYTHONPATH
$env:PYTHONPATH = "."  # Windows
export PYTHONPATH="."  # Linux/Mac
```

---

## 📚 Additional Resources

- **[Root README](../README.md)** - Project overview
- **[Frontend Documentation](../frontend/README.md)** - User dashboard
- **[Admin Documentation](../admin-frontend/README.md)** - Admin panel
- **[API Documentation](http://localhost:8000/docs)** - Swagger UI
- **[ER Diagrams](../docs/ER%20diagrams/)** - Database schema

---

**License**: Private / Proprietary  
© 2026 Hotel & Restaurant Review Management System
