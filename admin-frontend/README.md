# 🛠️ System Administration Panel

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

The **Admin Frontend** is a dedicated management interface for the **Hotel and Restaurant Review Management System**. It provides administrators with the tools necessary to monitor scrapers, manage system configuration, and oversee the health of the entire ecosystem.

---

## ✨ Key Features

### 🕵️ Scraper Orchestration
- **Trigger Scraping Jobs**: Start scraping for Booking.com, Agoda, Google Maps, TripAdvisor
- **Job Status Monitoring**: Real-time progress tracking for active scraping tasks
- **Source Management**: Configure and manage review source URLs
- **Scrape History**: View past scraping runs with timestamps and results

### 🏥 System Health Monitoring
- **Real-Time Metrics**: Live visualization of backend resource usage (CPU, RAM)
- **Uptime Tracking**: Server availability and uptime statistics
- **Multi-Service Monitoring**: Track Main Backend, Scraper Engine, Embedding Service, Frontend
- **Auto-Refresh**: Updates every 10 seconds for real-time visibility
- **Status Indicators**: Color-coded badges (Online/Warning/Offline)

### ⚙️ Global Configuration
- **API Key Management**: Configure Google Gemini, OAuth, and other API keys
- **System Settings**: Manage system-wide parameters without code changes
- **Service URL Configuration**: Set backend service endpoints via UI
- **Environment Variables**: Runtime configuration overrides

### 📊 Review Oversight
- **Processed Review Data**: View AI-analyzed reviews for quality control
- **Sentiment Insights**: Monitor sentiment analysis accuracy
- **Theme Extraction**: Review AI-extracted topics and patterns
- **Audit Logs**: Track system-wide API calls and operations

### 🔐 Access Management
- **User Overview**: View registered users and their roles
- **Organization Management**: Manage organization hierarchies
- **Permission Control**: Overview of role-based access settings
- **Group Administration**: Manage collaborative group memberships

---

## 🏗️ Technical Architecture

| Layer | Technology |
|-------|------------|
| **Core** | React 19 + TypeScript |
| **Build System** | Vite 7 |
| **Styling** | TailwindCSS |
| **Icons** | Lucide React |
| **Navigation** | React Router 7 |
| **HTTP Client** | Fetch API |
| **State Management** | React Context + localStorage |

### Architecture Diagram

```
admin-frontend/
├── src/
│   ├── components/           # Admin-specific UI components
│   │   ├── StatusCard.tsx    # Service status display
│   │   ├── SystemHealth.tsx  # Health metrics visualization
│   │   ├── ScraperControl.tsx # Scraper trigger controls
│   │   └── LogsViewer.tsx    # Audit log display
│   │
│   ├── layouts/              # Dashboard layouts
│   │   ├── DashboardLayout.tsx
│   │   └── AuthLayout.tsx
│   │
│   ├── pages/                # Management views
│   │   ├── Monitoring.tsx    # System health dashboard
│   │   ├── Scrapers.tsx      # Scraper orchestration
│   │   ├── Configuration.tsx # System settings
│   │   ├── Reviews.tsx       # Review oversight
│   │   └── Users.tsx         # User management
│   │
│   ├── services/             # API service layer
│   │   ├── monitoringService.ts # Health check API
│   │   ├── scraperService.ts    # Scraper control API
│   │   ├── configService.ts     # Configuration API
│   │   └── reviewService.ts     # Review data API
│   │
│   └── types.ts              # Global admin type definitions
│
├── .env.example              # Environment template
├── vite.config.ts            # Vite configuration
└── package.json              # Dependencies
```

---

## 🔧 Getting Started

### 📋 Prerequisites

- **Node.js 18+** (LTS recommended)
- **npm** or **yarn**
- **Backend services** running (Main Backend, Scraper Engine, Embedding Service)

### 🚀 Installation & Setup

#### 1. Navigate to Admin Frontend

```bash
cd admin-frontend
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Configure Environment

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your service URLs:

```env
# Backend Service URLs
VITE_MAIN_BACKEND_URL=http://localhost:8000
VITE_SCRAPING_URL=http://localhost:8002
VITE_EMBEDDING_SERVICE_URL=http://localhost:8001
VITE_FRONTEND_URL=http://localhost:5173

# App Configuration
VITE_APP_TITLE=Admin Panel
```

> **Note**: Service URLs can also be configured via the Admin Panel UI (API Management page).

#### 4. Launch Development Server

```bash
npm run dev
```

Access the Admin Panel at: **http://localhost:5174** (or next available port)

---

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (Vite HMR) |
| `npm run build` | Production build (TypeScript + Vite) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint check for code quality |

---

## 📂 Project Structure

### `src/components/`
Admin-specific UI components:

| Component | Purpose |
|-----------|---------|
| `StatusCard.tsx` | Service status display with CPU/RAM metrics |
| `SystemHealth.tsx` | Health metrics visualization dashboard |
| `ScraperControl.tsx` | Scraper trigger and job status controls |
| `LogsViewer.tsx` | Audit log and system event display |
| `ConfigForm.tsx` | Configuration form for API keys |
| `ServiceURLConfig.tsx` | Service endpoint configuration |

### `src/layouts/`
Layout components for different sections:

```tsx
// layouts/DashboardLayout.tsx
- Sidebar navigation
- Header with user menu
- Main content area
- Footer with system status

// layouts/AuthLayout.tsx
- Login page layout
- Centered authentication forms
```

### `src/pages/`
Main management views:

| Page | Route | Description |
|------|-------|-------------|
| `Monitoring` | `/monitoring` | System health dashboard |
| `Scrapers` | `/scrapers` | Scraper orchestration panel |
| `Configuration` | `/configuration` | System settings and API keys |
| `Reviews` | `/reviews` | Review oversight and quality control |
| `Users` | `/users` | User and role management |
| `Organizations` | `/organizations` | Organization hierarchy |
| `Groups` | `/groups` | Collaborative group management |

### `src/services/`
API service layer for admin tasks:

```typescript
// services/monitoringService.ts
export const monitoringService = {
  checkAllServices: async () => {
    // Fetches /health from all configured services
    // Returns aggregated status
  },
  
  getServiceStatus: async (url: string) => {
    // Individual service health check with 5s timeout
  },
};

// services/scraperService.ts
export const scraperService = {
  triggerScrape: async (platform: string, sourceId: string) => {
    // POST to scraper engine API
  },
  
  getJobStatus: async (jobId: string) => {
    // GET job progress and status
  },
};
```

---

## 🏥 System Monitoring

### Health Endpoint Specification

Each backend service implements a `/health` endpoint:

```json
GET /health

Response:
{
  "status": "Online",
  "cpu_usage": 45.2,
  "ram_usage": 62.5,
  "uptime": "45d 12h 23m"
}
```

### Monitored Services

| Service | Default URL | Description |
|---------|-------------|-------------|
| **Main Backend** | http://localhost:8000 | Core API and business logic |
| **Scraping Service** | http://localhost:8002 | Web scraping microservice |
| **Embedding Service** | http://localhost:8001 | Vector search and embeddings |
| **Frontend Server** | http://localhost:5173 | User dashboard (Vite dev server) |

### Auto-Refresh

The monitoring page automatically refreshes every **10 seconds** to provide real-time visibility.

### Status Indicators

| Status | Color | Meaning |
|--------|-------|---------|
| **Online** | Green | Normal operation |
| **Warning** | Yellow | High resource usage (≥90%) or service issues |
| **Offline** | Red | Server unreachable or not responding |

---

## 🕵️ Scraper Orchestration

### Supported Platforms

| Platform | Endpoint | Description |
|----------|----------|-------------|
| **Agoda** | `/api/agoda/scrape` | Agoda hotel reviews |
| **Booking.com** | `/api/booking/scrape` | Booking.com guest reviews |
| **Google Maps** | `/api/google/scrape` | Google Maps business reviews |
| **TripAdvisor** | `/api/tripadvisor/scrape` | TripAdvisor traveler reviews |

### Scraping Workflow

1. **Configure Source**: Add source URL in Source Management
2. **Trigger Scrape**: Select platform and start job
3. **Monitor Progress**: View real-time job status
4. **Review Results**: Check scraped data in Review Oversight

### Callback Mechanism

Upon successful completion, the Scraper Engine automatically notifies the Main Backend:

```
POST ${BACKEND_API_URL}/source/tasks/{source_id}/sync-complete
```

---

## ⚙️ Configuration Management

### API Keys

Configure the following API keys via the Admin Panel:

| Key | Purpose |
|-----|---------|
| **Google Gemini API** | AI sentiment analysis and summarization |
| **Google OAuth** | OAuth 2.0 authentication |
| **SMTP Credentials** | Password reset emails |
| **Supabase** | Optional cloud storage |

### Service URLs

Service URLs can be configured in two ways:

1. **Environment Variables** (`.env` file)
2. **Admin Panel UI** (API Management page)

> **Note**: Admin panel settings override environment variables and are stored in browser localStorage.

---

## 🔌 API Integration

### Fetch API Wrapper

```typescript
// services/api.ts
const apiClient = {
  async request(url: string, options?: RequestInit) {
    const token = localStorage.getItem('adminToken');
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },
};
```

### Timeout Handling

Health check requests implement a **5-second timeout**:

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

try {
  const response = await fetch(`${url}/health`, {
    signal: controller.signal,
  });
  clearTimeout(timeoutId);
  return response.json();
} catch (error) {
  clearTimeout(timeoutId);
  return { status: 'Offline', cpu_usage: 0, ram_usage: 0, uptime: 'N/A' };
}
```

---

## 🧪 Testing

```bash
# Run ESLint
npm run lint

# Build and check for TypeScript errors
npm run build

# Preview production build
npm run preview
```

---

## 🐛 Troubleshooting

### Service Shows as Offline

1. Verify the service is running
2. Check the service URL in API Management
3. Ensure CORS is configured correctly
4. Check browser console for network errors

### High CPU/RAM Warning

- System shows "Warning" when resources ≥ 90%
- Optimize service performance or scale resources

### Configuration Not Saving

1. Check browser localStorage is enabled
2. Verify API endpoint is accessible
3. Ensure admin user has sufficient permissions

### Build Failures

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 📝 Development Conventions

### Code Style
- **TypeScript**: Strict mode enabled
- **React**: Functional components with hooks
- **Naming**: PascalCase for components, camelCase for utilities
- **Files**: Named exports preferred

### Component Structure

```tsx
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  value: string | number;
  icon: LucideIcon;
}

export const StatusCard: React.FC<Props> = ({ title, value, icon: Icon }) => {
  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex items-center justify-between">
        <h3 className="text-gray-600">{title}</h3>
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
};
```

### Git Workflow
- Feature branches: `feature/<name>`
- Bug fixes: `fix/<name>`
- Commit messages: Conventional Commits format

---

## 📚 Additional Resources

- **[Root README](../README.md)** - Project overview
- **[Backend Documentation](../backend/README.md)** - API reference
- **[Frontend Documentation](../frontend/README.md)** - User dashboard
- **[Monitoring API Docs](./MONITORING_API.md)** - Health endpoint specification
- **[Monitoring Implementation](./MONITORING_IMPLEMENTATION.md)** - Implementation details

---

## 📄 Documentation Files

| File | Description |
|------|-------------|
| [`MONITORING_API.md`](./MONITORING_API.md) | Health endpoint API specification |
| [`MONITORING_IMPLEMENTATION.md`](./MONITORING_IMPLEMENTATION.md) | Monitoring implementation details |
| [`.env.example`](./.env.example) | Environment variable template |

---

**License**: Private / Proprietary  
© 2026 Hotel & Restaurant Review Management System
