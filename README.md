# 🏥 Hotel and Restaurant Review Management & Analysis System

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Styling-TailwindCSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![MSSQL](https://img.shields.io/badge/Database-MS%20SQL%20Server-CC2927?style=for-the-badge&logo=microsoft-sql-server&logoColor=white)](https://www.microsoft.com/en-us/sql-server)

## 📌 Project Overview

The **Hotel and Restaurant Review Management & Analysis System** is a sophisticated, full-stack enterprise solution designed to revolutionize how hospitality businesses handle customer feedback. By integrating advanced web scraping, AI-powered sentiment analysis, and interactive data visualization, the system provides actionable insights to improve service quality and reputation.

The platform aggregates data from major travel platforms like **Booking.com**, processes it using state-of-the-art LLMs (**Google Gemini**), and presents it through intuitive dashboards for both end-users and administrators.

---

## 🏗️ System Architecture

The system is built on a modern, decoupled architecture ensuring scalability and maintainability:

1.  **[Backend API](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/backend/README.md)**: A robust FastAPI ecosystem handling scraping, auth, and AI orchestration.
2.  **[User Frontend](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/frontend/README.md)**: A high-performance React dashboard for data visualization and insight exploration.
3.  **[Admin Frontend](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/admin-frontend/README.md)**: A management portal for system monitoring, configuration, and data control.
4.  **[Embedding Service](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/backend/embedding-service/readme.md)**: A dedicated microservice for semantic search and vector-based analysis.

---

## 🚀 Key Features

*   **🔍 Advanced Scraping**: Deep-scraping of Booking.com using **Playwright**, capturing comments, scores, stay attributes, and photos.
*   **🧠 AI Sentiment Analysis**: Leveraging **Google GenAI** to extract granular sentiment, key themes, and executive summaries from thousands of reviews.
*   **📊 Insight Dashboards**: Interactive charts (Recharts) and data tables for tracking performance trends over time.
*   **📡 Real-time Monitoring**: System health and scraping status tracking via the Admin Panel.
*   **🔗 Semantic Search**: Vector-based search for finding specific review contexts and patterns.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Backend** | Python 3.x, FastAPI, Playwright, PyODBC, Google GenAI, Authlib |
| **Frontend** | React 19, Vite, TypeScript, TailwindCSS, Lucide React, Recharts |
| **Services** | ChromaDB (Vector Store), Docker |
| **Database** | Microsoft SQL Server |

---

## 📂 Project Structure

```text
.
├── backend/                # Python FastAPI Backend & Scraping Logic
│   ├── app/                # Core API Implementation
│   ├── scraping/           # Playwright Scraper Engine
│   └── embedding-service/  # Vector Search Microservice
├── frontend/               # User Dashboard (React + Vite)
├── admin-frontend/         # System Admin Portal (React + Vite)
└── docs/                   # System Documentation & Diagrams
```

---

## 📋 Quick Start

### Prerequisites
*   **Python 3.10+**
*   **Node.js 18+** & **npm**
*   **Microsoft SQL Server**
*   **Docker** (for Embedding Service)

### Setup Guide
For detailed setup instructions, please refer to the individual component READMEs:

1.  **[Database Setup](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/backend/README.md#database-setup)**
2.  **[Backend Configuration](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/backend/README.md#installation--setup)**
3.  **[Frontend Installation](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/frontend/README.md#getting-started)**
4.  **[Admin Setup](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/admin-frontend/README.md#getting-started)**

---

## 📄 Documentation

Comprehensive system documentation, including architecture diagrams and database schemas, can be found in the **[docs](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/docs/README.md)** folder.

---

---

**License**: Private / Proprietary
© 2026 Hotel & Restaurant Review Management System
