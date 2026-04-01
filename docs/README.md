# 📚 System Documentation

Welcome to the official documentation for the **Hotel and Restaurant Review Management & Analysis System**. This directory contains architectural blueprints, database schemas, and technical specifications for the entire platform.

---

## 🗺️ Documentation Contents

### 🏗️ Architecture Diagrams

Visual representations of the system's component interaction and data flow.

**Location**: [`Architecture diagrams/`](./Architecture%20diagrams/)

| Diagram | Description |
|---------|-------------|
| **Component Overview** | High-level system architecture and service relationships |
| **Data Flow Diagram** | Review data pipeline from scraping to visualization |
| **Deployment Architecture** | Production deployment topology and networking |
| **Service Communication** | Inter-service API contracts and callback mechanisms |

---

### 🗄️ Database Design

Detailed Entity-Relationship (ER) diagrams for the MS SQL Server database.

**Location**: [`ER diagrams/`](./ER%20diagrams/)

| Diagram | Description |
|---------|-------------|
| **User & Auth Schema** | Users, roles, organizations, and permissions |
| **Groups & Collaboration** | Group membership and access control |
| **Reviews Core Schema** | Central review records and source management |
| **Platform-Specific Reviews** | Agoda, Booking, Google, TripAdvisor subtypes |
| **Analytics & Sentiment** | Sentiment scores, themes, and AI summaries |
| **Audit & System Logs** | System-wide audit trail and event logging |

#### Key Tables Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE SCHEMA                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    users     │  │   roles      │  │ organizations│      │
│  │──────────────│  │──────────────│  │──────────────│      │
│  │ id           │  │ id           │  │ id           │      │
│  │ email        │  │ name         │  │ name         │      │
│  │ password_hash│  │ permissions  │  │ settings     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   sources    │──│   reviews    │──│sentiment_scores│    │
│  │──────────────│  │──────────────│  │──────────────│      │
│  │ id (UUID)    │  │ id           │  │ id           │      │
│  │ url          │  │ source_id    │  │ review_id    │      │
│  │ platform     │  │ rating       │  │ score        │      │
│  └──────────────┘  │ comment      │  │ themes       │      │
│                    └──────────────┘  └──────────────┘      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  audit_log   │  │   sessions   │  │    groups    │      │
│  │──────────────│  │──────────────│  │──────────────│      │
│  │ id           │  │ id           │  │ id           │      │
│  │ timestamp    │  │ user_id      │  │ name         │      │
│  │ endpoint     │  │ token        │  │ settings     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 📐 UML Specifications

Standardized modeling of system behavior and class structures.

**Location**: [`UML diagrams/`](./UML%20diagrams/) *(if available)*

| Diagram | Description |
|---------|-------------|
| **Use Case Diagram** | User interactions and system functionality |
| **Class Diagram** | Object-oriented structure and relationships |
| **Sequence Diagram** | Temporal flow of operations and API calls |
| **State Machine Diagram** | Object lifecycle and state transitions |
| **Activity Diagram** | Business process workflows |

---

## 📋 API Documentation

### Backend API (Port 8000)

**Interactive Documentation**: http://localhost:8000/docs

| Category | Endpoints |
|----------|-----------|
| **Health** | `GET /`, `GET /health`, `GET /db-test` |
| **Auth** | `POST /auth/login`, `POST /auth/signup`, `GET /oauth/google` |
| **Reviews** | `GET /api/reviews`, `GET /api/reviews/{id}` |
| **Dashboard** | `GET /api/dashboard`, `GET /api/dashboard/kpis` |
| **Admin** | `CRUD /api/admin/users`, `CRUD /api/admin/organizations` |
| **Groups** | `CRUD /api/groups`, `CRUD /api/groups/{id}/members` |

### Scraper Engine API (Port 8001)

**Interactive Documentation**: http://localhost:8001/docs

| Category | Endpoints |
|----------|-----------|
| **Scrapers** | `POST /api/{platform}/scrape` |
| **Data** | `GET /api/reviews`, `GET /api/sources` |
| **System** | `GET /api/system/health`, `GET /api/system/jobs` |
| **Admin** | `POST /api/db/vacuum`, `GET /api/db/stats` |

### Embedding Service API (Port 8001)

| Category | Endpoints |
|----------|-----------|
| **Embeddings** | `POST /embed/batch`, `POST /embed/single` |
| **Search** | `POST /search` |
| **Config** | `PUT /model`, `PUT /api-settings` |

---

## 📝 Documenting New Features

When adding new services or modifying existing architecture, please ensure documentation is updated accordingly:

### 1. Draft Diagrams

Use tools like:
- **Mermaid.js** - Markdown-native diagramming
- **Draw.io** - Free online diagram editor
- **Lucidchart** - Professional diagramming
- **PlantUML** - Text-based UML

### 2. Export Files

- **Format**: High-resolution PNG or SVG
- **Naming**: Use descriptive, kebab-case names
- **Versioning**: Include version numbers for evolving diagrams

### 3. Commit Documentation

```bash
git add docs/Architecture\ diagrams/new-diagram.png
git commit -m "docs: add component interaction diagram"
```

### 4. Update Index

Update this README if:
- A new category is created
- New diagrams are added to existing categories
- Diagrams are deprecated or replaced

---

## 🔗 Quick Links

| Resource | Location |
|----------|----------|
| **Root README** | [`../README.md`](../README.md) |
| **Backend Docs** | [`../backend/README.md`](../backend/README.md) |
| **Frontend Docs** | [`../frontend/README.md`](../frontend/README.md) |
| **Admin Docs** | [`../admin-frontend/README.md`](../admin-frontend/README.md) |
| **Embedding Service** | [`../microservices/embedding-service/readme.md`](../microservices/embedding-service/readme.md) |
| **Scraper Engine** | [`../microservices/scraper_engine/README.md`](../microservices/scraper_engine/README.md) |

---

## 📞 Support

For questions about system architecture or documentation:

1. Check relevant component README
2. Review ER diagrams for database questions
3. Consult API documentation at `/docs` endpoints
4. Open an issue in the project repository

---

**License**: Private / Proprietary  
© 2026 Hotel & Restaurant Review Management System
