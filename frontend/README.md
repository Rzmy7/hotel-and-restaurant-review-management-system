# 📺 Tenant User Insight Dashboard

[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Zustand](https://img.shields.io/badge/State-Zustand-4338CA?style=for-the-badge&logo=react&logoColor=white)](https://zustand-demo.pmnd.rs/)

The **User Frontend** is a modern, high-performance customer intelligence and review operations dashboard built for hospitality property owners and general managers. Built with **React 19**, **Vite 7**, **TypeScript 5.9**, and **Tailwind CSS 3.4**, it delivers a fluid, real-time interface for sentiment exploration, competitor benchmarking, and automated AI guest engagement.

---

## ✨ Key Features & Capabilities

### 📊 Real-Time KPI & Sentiment Dashboard
- **Unified Analytics**: Aggregated review volume, average rating scores across all connected OTAs, positive/negative sentiment ratios, and response completion rates.
- **Aspect-Based Radar & Trend Charts**: Interactive Recharts visualizations breaking down guest satisfaction across *Cleanliness*, *Staff*, *Location*, *Value*, and *Food & Beverage*.
- **Platform Breakdown**: Visual comparative metrics across Google Maps, TripAdvisor, Booking.com, and Agoda.

### 📑 Comprehensive Review Feed & Filtering
- **Multi-Dimensional Filters**: Filter reviews instantly by platform, sentiment category, rating threshold, date range, response status, and keyword queries.
- **Deep Sentiment Breakdown**: Expandable review cards showcasing extracted sentiment polarity, granular aspect badges, and raw review comments.
- **Live Sync Polling**: Real-time progress indicators reflecting scraping job execution and review ingestion status.

### 🤖 AI-Assisted Response Generator
- **Context-Grounded Replies**: Drafts professional guest responses aligned with property-specific Standard Operating Procedures (SOPs) retrieved via RAG.
- **Tone & Persona Customization**: Generate responses with varying tones (Professional, Empathetic, Formal, Casual) and customized length parameters.
- **Interactive Editing & Approval**: In-place response editing, copy-to-clipboard, and response status tracking.

### 🏆 Competitor Intelligence & Benchmarking
- **Competitor Tracking**: Monitor competitor properties across identical review platforms.
- **Comparative Aspect Benchmarking**: Head-to-head radar charts and score delta comparisons highlighting competitive advantages and service vulnerabilities.
- **AI Strategic Insights**: Automated LLM-generated SWOT summaries derived from competitor review streams.

### 👥 Multi-Tenant Group Collaboration & RBAC
- **Group Hierarchy**: Organize multi-property portfolios into collaborative groups.
- **Role Assignments**: Manage team permissions across **Group Admin**, **Group Manager**, and **Group Member** roles.
- **Member Invitations**: Email-based group onboarding and access management.

---

## 🏗️ Technical Architecture

```
frontend/src/
├── api/                        # Axios HTTP client configured with credentials & refresh interceptors
├── assets/                     # Static media, icons, and illustrations
├── components/                 # Reusable UI component library
│   ├── auth/                   # Login, signup, reset password modals & forms
│   ├── charts/                 # Recharts implementations (Radar, Line, Bar, Area)
│   ├── common/                 # Buttons, inputs, badges, dropdowns, modal wrappers
│   ├── competitors/            # Competitor comparison tables and radar widgets
│   ├── onboarding/             # Step-by-step organization and source setup wizard
│   ├── reviews/                # Review card, aspect chips, AI reply drawer
│   └── shared/                 # Skeletons, empty states, and toast notifications
├── contexts/                   # React Contexts (ThemeContext, AuthContext)
├── hooks/                      # Custom React hooks (useReviewsData, useCompetitorData, useSyncProgress)
├── pages/                      # Page view components (Dashboard, Reviews, Insights, Competitors, Settings)
├── services/                   # Frontend business logic services interfacing with backend APIs
├── stores/                     # Zustand state stores (useReviewsStore, useOrganizationStore, useNotificationStore)
├── types/                      # Comprehensive TypeScript type definitions
└── utils/                      # Date formatting, role validators, DOM helpers
```

---

## ⚙️ Environment Configuration (`.env`)

```env
# Backend API Base URL
VITE_API_URL=http://localhost:8000

# Google OAuth 2.0 Client ID (for SSO button)
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

---

## 🚀 Getting Started

```bash
# 1. Navigate to directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Build production distribution bundle
npm run build
```
- **Local Development URL**: `http://localhost:5173`
