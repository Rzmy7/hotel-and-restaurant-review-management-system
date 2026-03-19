# ⚙️ Backend API Service

The backend of the **Hotel and Restaurant Review Management System** is a production-grade **Domain-Driven Modular Monolith** built with **FastAPI**. It handles automated web scraping, AI-driven analysis, and secure business logic across multiple encapsulated domains.

## 🌟 Core Responsibilities

*   **🌐 Scraping Engine**: Orchestrates **Playwright** to extract granular review data from Booking.com.
*   **🤖 AI Orchestration**: Integrates with **Google Gemini** for sentiment analysis, categorization, and summarization.
*   **🔐 Auth & RBAC**: Secure user management using **JWT**, **Bcrypt**, and role-based permissions (System & Group levels).
*   **🗄️ Data Management**: High-performance storage using **SQL Server** via `pyodbc` and **SQLAlchemy**.
*   **🏥 Health Monitoring**: Real-time system diagnostics and database connectivity tracking.

---

## 🏗️ Project Architecture

The system follows a modular architecture where each business domain is self-contained:

```text
backend/app/
├── main.py                 # Thin entry point & router registration
├── core/                   # Infrastructure (Config, Database, Security, Dependencies)
├── middleware/             # Cross-cutting concerns (Permissions, Auth Guards)
├── modules/                # DOMAIN MODULES
│   ├── admin/              # User & Organization management
│   ├── auth/               # Login, Signup, OAuth, and User Models
│   ├── competitors/        # Competitor tracking, scraping, and analytics
│   ├── dashboard/          # Global KPI aggregation and reporting
│   ├── groups/             # Collaborative group management
│   └── reviews/            # Review processing and sentiment analysis
├── constants/              # Shared system-wide constants
├── scripts/                # Database seeding and migration scripts
└── tests/                  # Connectivity and integration tests
```

---

## 🛠️ Technology Stack

*   **Framework**: FastAPI
*   **Scraping**: Playwright (Chromium)
*   **AI**: Google GenAI (Gemini 2.5)
*   **ORM**: SQLAlchemy 2.0
*   **Database**: Microsoft SQL Server (ODBC Driver 18)
*   **Security**: Python-JOSE, Passlib (Bcrypt)

---

## 🔧 Installation & Setup

### 📋 Prerequisites
*   **Python 3.10+**
*   **Microsoft SQL Server**
*   **ODBC Driver 18 for SQL Server**

### 🚀 Getting Started

1.  **Environment Setup**:
    ```bash
    # Create & activate venv
    python -m venv venv
    venv\Scripts\activate  # Windows
    
    # Install dependencies
    pip install -r requirements.txt
    playwright install chromium
    ```

2.  **Configure Environment**:
    Create a `.env` file in the `backend/` directory by copying the example:
    ```bash
    cp .env.example .env
    ```
    *Note: Ensure `DATABASE_URL` includes `TrustServerCertificate=yes` for local/dev servers.*

3.  **Verify Setup**:
    Run the connectivity suite to ensure the DB and AI keys are working:
    ```bash
    $env:PYTHONPATH = ".;$env:PYTHONPATH"; python tests/test_db_connectivity.py
    ```

4.  **Launch the Server**:
    ```bash
    uvicorn app.main:app --reload
    ```
    API Docs: `http://localhost:8000/docs`

---

## 🏥 Monitoring & Health
- `GET /health`: CPU, Memory, and Uptime diagnostics.
- `GET /db-test`: Instant database availability check.
