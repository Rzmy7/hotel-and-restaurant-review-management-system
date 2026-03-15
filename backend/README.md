# ⚙️ Backend API Service

The backend of the **Hotel and Restaurant Review Management System** is a high-performance API ecosystem built with **FastAPI**. It handles complex tasks including automated web scraping, AI-driven data processing, and secure data storage.

## 🌟 Core Responsibilities

*   **🌐 Scraping Engine**: Orchestrates **Playwright** to extract granular review data from Booking.com.
*   **🤖 AI Orchestration**: Integrates with **Google Gemini** for sentiment analysis and review summarization.
*   **🔐 Authentication & RBAC**: Secure user management using **Authlib** and custom Role-Based Access Control.
*   **🗄️ Data Management**: Structured storage and retrieval using **Microsoft SQL Server** via `pyodbc`.
*   **🏥 Health Monitoring**: Real-time system diagnostics and process tracking.

---

## 🏗️ Architecture & Modules

The backend is organized into several key modules for better maintainability:

*   `app/main.py`: The central entry point for the FastAPI application.
*   `app/auth/`: Secure authentication flows and token management.
*   `app/services/`: Business logic, including GenAI integration and scraping orchestration.
*   `app/repositories/`: Data access layer for SQL Server interactions.
*   `scraping/`: Specialized logic for Playwright-based web extraction.
*   `embedding-service/`: (Sidecar) Microservice for vector-based search and analysis.

---

## 🛠️ Technology Stack

*   **Framework**: FastAPI
*   **Scraping**: Playwright (Chromium)
*   **AI**: Google GenAI (Gemini)
*   **Auth**: Authlib, Passlib (Bcrypt)
*   **Database**: Microsoft SQL Server
*   **Drivers**: PyODBC (ODBC Driver 17/18)

---

## 🔧 Installation & Setup

### 📋 Prerequisites
*   **Python 3.10+**
*   **Microsoft SQL Server**
*   **ODBC Driver for SQL Server**

### 🚀 Getting Started

1.  **Environment Setup**:
    ```bash
    # Navigate to backend
    cd backend

    # Create & activate venv
    python -m venv venv
    .\venv\Scripts\activate
    ```

2.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    playwright install chromium
    ```

3.  **Configure Environment**:
    Create a `.env` file in the `backend/app/` directory:
    ```ini
    DB_SERVER=localhost
    DB_NAME=L2_Project_DB
    DB_UID=sa
    DB_PWD=your_password
    GOOGLE_API_KEY=your_gemini_key
    ```

4.  **Launch the Server**:
    ```bash
    # From the backend/app directory
    uvicorn main:app --reload
    ```
    API Docs available at: `http://localhost:8000/docs`

---

## 🔍 Monitoring & Health
The API includes built-in endpoints for monitoring system health:
- `GET /health`: Detailed system diagnostics (CPU, Memory, DB Connectivity).

---

**[← Back to Root](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/README.md)** | **[Go to Frontend →](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/frontend/README.md)**
