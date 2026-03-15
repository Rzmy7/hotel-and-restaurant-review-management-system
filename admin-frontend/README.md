# 🛠️ System Administration Panel

The **Admin Frontend** is a dedicated management interface for the **Hotel and Restaurant Review Management System**. It provides administrators with the tools necessary to monitor scrapers, manage system configuration, and oversee the health of the entire ecosystem.

## ✨ Key Features

*   **🕵️ Scraper Orchestration**: Trigger and monitor web scraping jobs for Booking.com.
*   **🏥 System Health Monitoring**: Real-time visualization of backend resource usage (CPU, RAM) and database status.
*   **⚙️ Global Configuration**: Manage API keys (Gemini, etc.) and system-wide settings without code changes.
*   **📊 Review Oversight**: View processed review data and AI-generated insights for quality control.
*   **🔐 Access Management**: Overview of user roles and permissions within the system.

---

## 🏗️ Technical Architecture

*   **Core**: React 19 + TypeScript
*   **Build System**: Vite
*   **Styling**: TailwindCSS & Lucide React
*   **Navigation**: React Router 7
*   **Communication**: Fetch API integration with the FastAPI backend.

---

## 🔧 Getting Started

### 🚀 Installation & Setup

1.  **Navigate to admin-frontend**:
    ```bash
    cd admin-frontend
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Launch Development Server**:
    ```bash
    npm run dev
    ```
    Access the Admin Panel at: `http://localhost:5174` (or next available port).

---

## 📂 Project Structure

```text
src/
├── components/   # Admin-specific UI components (Status cards, Logs)
├── layouts/      # Dashboard and auth layouts
├── pages/        # Management views (Scrapers, Systems, Reviews)
├── services/     # API service layer for admin tasks
└── types.ts      # Global admin type definitions
```

---

**[← Back to Root](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/README.md)** | **[Go to Embedding Service →](file:///e:/L2%20Project/hotel-and-restaurant-review-management-system/backend/embedding-service/readme.md)**
