# 📺 User Insight Dashboard

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

The **User Frontend** is a modern, high-performance dashboard designed for hospitality managers to visualize and analyze review data. Built with **React 19**, **Vite**, and **TypeScript**, it offers a fluid, responsive experience for data-driven decision making.

---

## ✨ Key Features

### 📊 Performance Overview
- **Sentiment Trends**: Interactive line charts showing sentiment evolution over time
- **KPI Dashboards**: Key metrics at a glance (average scores, review counts, response rates)
- **Source Comparisons**: Compare performance across Booking.com, Agoda, Google, TripAdvisor
- **Time Range Filters**: Custom date ranges for focused analysis

### 📑 Detailed Review Management
- **Filterable Review Lists**: Filter by platform, sentiment, date, rating, and source
- **Sentiment Highlighting**: Color-coded reviews based on AI sentiment analysis
- **Pagination & Sorting**: Navigate large datasets efficiently
- **Review Details**: Expandable cards with full review content and metadata

### 🧠 AI-Powered Summaries
- **Quick-Read Summaries**: AI-generated executive summaries of review clusters
- **Theme Extraction**: Key topics and patterns identified by Google Gemini
- **Sentiment Breakdown**: Positive, neutral, and negative sentiment distribution
- **Actionable Insights**: Recommendations based on review analysis

### ⚡ Type-Safe Data Flow
- **Comprehensive TypeScript**: Full type definitions for API responses
- **Runtime Validation**: Pydantic-compatible type checking
- **IntelliSense Support**: Full IDE autocomplete and error detection

### 🎨 Premium UI/UX
- **TailwindCSS Styling**: Modern, enterprise-grade aesthetic
- **Lucide React Icons**: Consistent iconography throughout
- **Responsive Design**: Mobile, tablet, and desktop optimized
- **Dark Mode Ready**: Theme switching infrastructure in place

---

## 🏗️ Technical Architecture

| Layer | Technology |
|-------|------------|
| **Core** | React 19 + TypeScript |
| **Build System** | Vite 7 |
| **State Management** | Zustand + React Query |
| **Styling** | TailwindCSS + Tailwind Merge + CLSX |
| **Icons** | Lucide React |
| **Charts** | Recharts |
| **Navigation** | React Router 7 |
| **HTTP Client** | Axios |

### Architecture Diagram

```
src/
├── api/                    # Axios API wrappers
│   ├── client.ts           # Axios instance configuration
│   ├── reviews.api.ts      # Review-related API calls
│   ├── dashboard.api.ts    # Dashboard KPI endpoints
│   └── auth.api.ts         # Authentication endpoints
│
├── components/             # Reusable UI building blocks
│   ├── ui/                 # Base UI components (Button, Card, Input)
│   ├── charts/             # Chart components (Line, Bar, Pie)
│   ├── reviews/            # Review-specific components
│   ├── layout/             # Layout components (Header, Sidebar)
│   └── common/             # Shared components (Loading, Error)
│
├── contexts/               # React Context providers
│   ├── AuthContext.tsx     # Authentication state
│   ├── FilterContext.tsx   # Global filter state
│   └── ThemeContext.tsx    # Theme (dark/light) state
│
├── pages/                  # Main route components
│   ├── Dashboard.tsx       # Overview page
│   ├── Reviews.tsx         # Review list page
│   ├── Analytics.tsx       # Deep analytics page
│   ├── Settings.tsx        # User settings
│   └── Login.tsx           # Authentication page
│
├── services/               # Business logic and data transformation
│   ├── review.service.ts   # Review processing logic
│   ├── chart.service.ts    # Chart data preparation
│   └── auth.service.ts     # Auth business logic
│
├── stores/                 # Zustand state stores
│   ├── auth.store.ts       # Authentication state
│   ├── filter.store.ts     # Filter state
│   └── ui.store.ts         # UI state (modals, toasts)
│
└── types/                  # TypeScript interfaces and types
    ├── review.types.ts     # Review-related types
    ├── api.types.ts        # API response types
    └── common.types.ts     # Shared utility types
```

---

## 🔧 Getting Started

### 📋 Prerequisites

- **Node.js 18+** (LTS recommended)
- **npm** or **yarn**
- **Backend API** running on `http://localhost:8000`

### 🚀 Installation & Setup

#### 1. Navigate to Frontend

```bash
cd frontend
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Configure Environment

Create a `.env` file if needed (defaults are configured in `vite.config.ts`):

```env
VITE_API_URL=http://localhost:8000
VITE_APP_TITLE=Hotel Review Dashboard
```

#### 4. Launch Development Server

```bash
npm run dev
```

Access the dashboard at: **http://localhost:5173**

---

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (Vite HMR enabled) |
| `npm run build` | Production build (TypeScript + Vite) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint check for code quality |

---

## 📂 Internal Directory Structure

### `src/api/`
Axios-based API wrappers for backend communication.

```typescript
// Example: api/reviews.api.ts
import axios from 'axios';
import { Review, ReviewFilters } from '../types/review.types';

export const reviewsApi = {
  getAll: async (filters: ReviewFilters): Promise<Review[]> => {
    const response = await axios.get('/api/reviews', { params: filters });
    return response.data;
  },
  
  getById: async (id: string): Promise<Review> => {
    const response = await axios.get(`/api/reviews/${id}`);
    return response.data;
  },
};
```

### `src/components/`
Reusable UI components organized by category:

| Subdirectory | Purpose |
|--------------|---------|
| `ui/` | Base components (Button, Card, Input, Modal) |
| `charts/` | Recharts wrappers for dashboard visualizations |
| `reviews/` | Review card, list, and filter components |
| `layout/` | Header, Sidebar, Footer, PageLayout |
| `common/` | LoadingSpinner, ErrorBoundary, EmptyState |

### `src/contexts/`
React Context providers for global state:

- **AuthContext**: User authentication state and methods
- **FilterContext**: Global filter state (date range, platform, sentiment)
- **ThemeContext**: Light/dark mode toggle

### `src/pages/`
Route-level components:

| Page | Route | Description |
|------|-------|-------------|
| `Dashboard` | `/` | Overview with KPIs and charts |
| `Reviews` | `/reviews` | Filterable review list |
| `Analytics` | `/analytics` | Deep dive analytics |
| `Settings` | `/settings` | User preferences |
| `Login` | `/login` | Authentication page |

### `src/services/`
Business logic layer separating UI from API:

```typescript
// Example: services/review.service.ts
export const reviewService = {
  fetchAndTransformReviews: async (filters) => {
    const reviews = await reviewsApi.getAll(filters);
    return transformReviewsForDisplay(reviews);
  },
  
  calculateSentimentTrends: (reviews) => {
    // Business logic for trend calculation
  },
};
```

### `src/stores/`
Zustand stores for global state:

```typescript
// Example: stores/filter.store.ts
import { create } from 'zustand';

interface FilterState {
  dateRange: { start: Date; end: Date };
  platforms: string[];
  sentiment: string | null;
  setFilters: (filters: Partial<FilterState>) => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  dateRange: { start: new Date(), end: new Date() },
  platforms: [],
  sentiment: null,
  setFilters: (filters) => set((state) => ({ ...state, ...filters })),
}));
```

### `src/types/`
TypeScript type definitions:

```typescript
// types/review.types.ts
export interface Review {
  id: string;
  sourceId: string;
  platform: 'booking' | 'agoda' | 'google' | 'tripadvisor';
  reviewerName: string;
  rating: number;
  comment: string;
  stayDate: string;
  sentimentScore: number;
  sentimentLabel: 'positive' | 'neutral' | 'negative';
  themes: string[];
  createdAt: string;
}

export interface ReviewFilters {
  dateFrom?: string;
  dateTo?: string;
  platform?: string;
  sentiment?: string;
  minRating?: number;
  page?: number;
  limit?: number;
}
```

---

## 🎨 UI Component Library

### Base Components

| Component | Props Example | Description |
|-----------|---------------|-------------|
| `Button` | `variant="primary" \| "secondary" \| "outline"` | Styled button with variants |
| `Card` | `className`, `children` | Container with shadow and padding |
| `Input` | `type`, `placeholder`, `value`, `onChange` | Form input field |
| `Select` | `options`, `value`, `onChange` | Dropdown selector |
| `Modal` | `isOpen`, `onClose`, `children` | Dialog overlay |
| `Badge` | `variant="success" \| "warning" \| "error"` | Status indicator |

### Chart Components

Built with **Recharts** for consistent styling:

- **LineChart**: Sentiment trends over time
- **BarChart**: Review counts by platform
- **PieChart**: Sentiment distribution
- **AreaChart**: Cumulative metrics

---

## 🔌 API Integration

### Axios Configuration

```typescript
// api/client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth tokens
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### React Query Integration

```typescript
// hooks/useReviews.ts
import { useQuery } from '@tanstack/react-query';
import { reviewService } from '../services/review.service';

export const useReviews = (filters) => {
  return useQuery({
    queryKey: ['reviews', filters],
    queryFn: () => reviewService.fetchAndTransformReviews(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
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

### API Connection Errors

1. Ensure backend is running on `http://localhost:8000`
2. Check CORS settings in backend
3. Verify `VITE_API_URL` in environment

### Build Failures

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### TypeScript Errors

```bash
# Check TypeScript config
cat tsconfig.json

# Run type check
npx tsc --noEmit
```

### Vite HMR Not Working

```bash
# Restart dev server with --force
npm run dev -- --force
```

---

## 📝 Development Conventions

### Code Style
- **TypeScript**: Strict mode enabled
- **React**: Functional components with hooks
- **Naming**: PascalCase for components, camelCase for utilities
- **Files**: Named exports preferred, default exports for pages

### Component Structure

```tsx
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface Props {
  className?: string;
  children: React.ReactNode;
}

export const Component: React.FC<Props> = ({ className, children }) => {
  return (
    <div className={twMerge(clsx('base-styles', className))}>
      {children}
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
- **[Admin Documentation](../admin-frontend/README.md)** - Admin panel
- **[React Docs](https://react.dev/)** - Official React documentation
- **[Vite Docs](https://vite.dev/)** - Build tool documentation
- **[TailwindCSS](https://tailwindcss.com/docs)** - Utility-first CSS
- **[Recharts](https://recharts.org/)** - Chart library
- **[Zustand](https://github.com/pmndrs/zustand)** - State management

---

**License**: Private / Proprietary  
© 2026 Hotel & Restaurant Review Management System
