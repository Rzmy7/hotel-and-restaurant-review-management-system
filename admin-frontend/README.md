# 🛠️ Platform Administration Panel

[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

The **Admin Frontend** is a mission-control administration interface built for system operators to govern, monitor, and scale the entire **Hotel and Restaurant Review Management System** ecosystem.

---

## ✨ Key Administrative Features

### 🏥 System Health & Resource Telemetry
- **Live Infrastructure Telemetry**: Real-time visualization of CPU utilization, RAM consumption, system uptime, and database latency.
- **Multi-Service Connectivity Grid**: Live health statuses for Backend API, Scraper Engine, ChromaDB Embedding Service, RabbitMQ Broker, and MS SQL Server.
- **Automated Health Polling**: 10-second heartbeat polling with warning thresholds and instant visual alerts.

### 🎛️ Scraper Orchestration & Worker Control
- **Manual & Scheduled Ingestion**: Trigger immediate scraping tasks for any registered source across Google Maps, TripAdvisor, Booking.com, or Agoda.
- **Worker Pool Monitoring**: Live visibility into active scraping threads, job queues, error rates, and platform rate limits.
- **Trait Deduplication & Data Scrubbing**: Trigger deep deduplication routines and database vacuuming directly from the UI.

### 🤖 LLM Model & AI Gateway Management
- **Multi-Provider Routing**: Configure active LLM providers (Google Gemini, OpenAI GPT-4o, DeepSeek, Qwen) with dynamic failover ordering.
- **Hyperparameter Tuning**: Adjust model temperature, max token limits, and prompt template parameters per tenant tier.
- **Vector Search Threshold Tuning**: Configure cosine similarity cutoff thresholds for 1-word, 2-word, and 3+-word semantic queries in ChromaDB.

### 📢 System-Wide Broadcasting Engine
- **Targeted Announcements**: Compose and schedule broadcast alerts to specific audiences (All Users, Organization Admins, Specific Subscription Tiers).
- **Multi-Channel Delivery**: In-app banner alerts, modal takeovers, and email notifications.
- **Broadcast History & Metrics**: Track impression rates and dismissals.

### 🚩 Dynamic Feature Flags & Subscription Tiers
- **Granular Feature Toggling**: Enable or disable beta features (e.g., Competitor AI Insights, Auto-Reply Generation) globally or per organization.
- **Tier Quota Management**: Configure plan limits for review storage, scraping frequency, and AI token allowances.

### ⏸️ Maintenance Mode & Global Controls
- **Instant Maintenance Lockdown**: Toggle maintenance mode with real-time WebSocket/polling broadcast, gracefully suspending tenant operations while maintaining admin access.

---

## 🏗️ Technical Architecture

```
admin-frontend/src/
├── api/                        # HTTP client with authorization headers
├── assets/                     # Platform logos and branding assets
├── components/                 # Administrative UI components
│   ├── AlertsPanel.tsx         # Real-time infrastructure warnings
│   ├── Broadcasting/           # Broadcast composer, audience selector & preview
│   ├── Monitoring/             # System health gauges and server stat cards
│   ├── OrganizationTable.tsx   # Multi-tenant organization explorer
│   ├── UserTable.tsx           # Platform user directory and role editor
│   └── shared/                 # Status badges, modals, skeletons
├── contexts/                   # Theme and Auth context providers
├── hooks/                      # Custom hooks (useMaintenanceModePoller, useSystemTimezone)
├── layouts/                    # Main administrative layout with sidebar & header
├── pages/                      # Administrative views (Dashboard, Users, Orgs, Scraping, LLMs, Monitoring)
├── services/                   # Admin API service modules
└── types.ts                    # Administrative TypeScript schemas
```

---

## ⚙️ Environment Configuration (`.env`)

```env
# Backend API Base URL
VITE_API_URL=http://localhost:8000
```

---

## 🚀 Getting Started

```bash
# 1. Navigate to directory
cd admin-frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Build production bundle
npm run build
```
- **Admin Portal URL**: `http://localhost:5174`
