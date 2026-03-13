# Hotel and Restaurant Review Management & Analysis System

## 📌 Project Overview
The **Hotel and Restaurant Review Management & Analysis System** is a sophisticated full-stack application designed to aggregate and analyze customer feedback from Booking.com. It combines automated web scraping, structured data storage, and AI-powered sentiment analysis to provide actionable insights into hotel performance.

The system consists of three main components:
1.  **Backend API**: A FastAPI-based server that handles scraping requests, data processing, and serves data to the frontend.
2.  **User Frontend**: A modern React application for visualizing review data and insights.
3.  **Admin Frontend**: An administrative interface for managing the system.

### 🚀 Key Features
-   **Automated Scraping**: robustly scrapes detailed review data (comments, scores, photos, stay attributes) from Booking.com using **Playwright**.
-   **AI-Powered Analysis**: Utilizes **Google GenAI** to process raw reviews and extract meaningful sentiment and summaries.
-   **Data Persistence**: Efficiently stores structured review data in **Microsoft SQL Server**.
-   **Interactive Dashboard**: Visualizes trends and insights via a responsive React UI.

---

## 🛠️ Technology Stack

| Component | Technologies |
| :--- | :--- |
| **Backend** | Python 3.x, FastAPI, Playwright, PyODBC, Google GenAI |
| **Frontend** | React, Vite, TypeScript, TailwindCSS, Lucide React |
| **Database** | Microsoft SQL Server |

---

## 📋 Prerequisites

Before setting up the project, ensure you have the following installed:
-   **Python 3.10+**
-   **Node.js 18+** & **npm**
-   **Microsoft SQL Server** (local or remote instance)
-   **ODBC Driver for SQL Server** (compatible with `pyodbc`)

---

## 🔧 Installation & Setup

### 1. Database Setup
Ensure your SQL Server is running and you have a database created (e.g., `L2_Project_DB`). Update the environment variables in the backend with your credentials.

### 2. Backend Setup
The backend handles the core logic for scraping and API services.

1.  **Navigate to the backend directory**:
    ```bash
    cd backend
    ```

2.  **Create and activate a virtual environment**:
    ```bash
    python -m venv venv
    # Windows
    venv\Scripts\activate
    # macOS/Linux
    source venv/bin/activate
    ```

3.  **Install Dependencies**:
    Create or update your `requirements.txt` with the following content and install it:

    **`requirements.txt`**:
    ```text
    fastapi
    uvicorn[standard]
    pydantic
    python-dotenv
    google-genai
    playwright
    pyodbc
    ```

    ```bash
    pip install -r requirements.txt
    ```

4.  **Install Playwright Browsers**:
    ```bash
    playwright install chromium
    ```

5.  **Configure Environment Variables**:
    Create a `.env` file in the `backend/app` directory (or where `main.py` functions expect it) with the following keys:
    ```ini
    DB_DRIVER=ODBC Driver 17 for SQL Server
    DB_SERVER=localhost
    DB_NAME=YourDatabaseName
    DB_UID=YourUsername
    DB_PWD=YourPassword
    GOOGLE_API_KEY=your_google_genai_api_key
    ```

6.  **Run the Server**:
    ```bash
    # From the backend directory
    cd backend/app/test
    python main.py
    ```
    The API will be available at `http://127.0.0.1:8000`.

### 3. Frontend Setup (User UI)

1.  **Navigate to the frontend directory**:
    ```bash
    cd ../../frontend
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Run the Development Server**:
    ```bash
    npm run dev
    ```
    The application will run at `http://localhost:5173`.(or on an available port)

### 4. Admin Frontend Setup

1.  **Navigate to the admin directory**:
    ```bash
    cd ../admin-Frontend
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Run the Development Server**:
    ```bash
    npm run dev
    ```
    The application will run at `http://localhost:5174`.(or on an available port)

---

## 📂 Project Structure

```text
e:\L2 Project\UI\L2_project_UI
├── backend/                  # Python FastAPI Backend
│   ├── app/
│   │   ├── main.py           # API Entry Point
|   |   ├── .env              # Environment Variables
│   │   ├── test/             # Scraping & Processing Logic
│   │   │   ├── scraping/     # Playwright Scraper
│   │   │   └── services/     # AI Processing Services
│   └── requirements.txt
├── frontend/                 # User Dashboard (React + Vite)
└── Admin-Frontend/           # Admin Interface (React + Vite)
```

---
**License**: Private / Proprietary
