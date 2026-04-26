# Admin Frontend Test Suite Documentation

## Overview

This document describes the test suite for the **Admin Frontend** — a React + TypeScript admin panel built with Vite, used for system management, monitoring, and configuration.

| Category | Directory | Tests | Purpose |
|----------|-----------|-------|---------|
| **Utils** | `__tests__/utils/` | 10 | DateTime formatting |
| **Config** | `__tests__/config/` | 13 | Backend & frontend URL resolution |
| **API Client** | `__tests__/api/` | 19 | HTTP methods, auth headers, URL construction, errors |
| **Services** | `__tests__/services/` | 37 | Settings helpers, maintenance events, API contracts |
| **Total** | | **79** | |

All tests run **without a backend** — fetch calls are mocked, localStorage is reset between tests.

---

## Prerequisites

### Dependencies

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom
```

### Running Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run a specific file
npx vitest run src/__tests__/utils/dateTime.test.ts
```

---

## Test Directory Structure

```
admin-frontend/src/__tests__/
├── setup.ts                                     # Global setup (jest-dom, localStorage, env vars)
├── utils/
│   └── dateTime.test.ts                        # formatDateTime with timezones
├── config/
│   ├── api.test.ts                             # normalizeBackendBaseUrl, getApiBaseUrl
│   └── frontend.test.ts                        # getFrontendBaseUrl, getFrontendLoginUrl
├── api/
│   └── client.test.ts                          # URL building, auth, HTTP methods, errors
└── services/
    ├── settingsService.test.ts                 # Timezone storage, apply, events
    ├── maintenanceService.test.ts              # Maintenance mode events & cleanup
    └── apiContracts.test.ts                    # Dashboard, admin data, notifications, feature flags
```

---

## Utility Tests

### `dateTime.test.ts` (10 tests)

| Test | What it verifies |
|------|-----------------|
| Formats ISO date string | Correct month/day/year |
| Formats with different timezone | Asia/Kolkata |
| Formats UTC timezone | UTC correct |
| Includes time portion | HH:MM format present |
| Returns "Unknown time" for null | Null handling |
| Returns "Unknown time" for undefined | Undefined handling |
| Returns "Unknown time" for empty string | Empty handling |
| Returns raw value for unparseable string | Invalid date passthrough |
| Returns raw value for random text | Non-date passthrough |
| Falls back for invalid timezone | No crash on bad tz |

---

## Config Tests

### `api.test.ts` (10 tests)

| Describe | Tests | What it verifies |
|----------|-------|-----------------|
| `normalizeBackendBaseUrl` | 7 | Valid URL, trailing slash, auto protocol, protocol-relative, empty, custom fallback |
| `getApiBaseUrl` | 3 | Fallback, localStorage override, trailing slash strip |

### `frontend.test.ts` (5 tests)

| Describe | Tests | What it verifies |
|----------|-------|-----------------|
| `getFrontendBaseUrl` | 2 | Returns configured URL, no trailing slash |
| `getFrontendLoginUrl` | 3 | No query, with query, leading ? strip, empty query |

---

## API Client Tests

### `client.test.ts` (19 tests)

| Describe | Tests | What it verifies |
|----------|-------|-----------------|
| URL construction | 4 | Auto /api prefix, no double /api/, absolute URLs, auth route passthrough |
| Headers | 3 | Bearer token, Content-Type JSON, omit auth when no token |
| HTTP methods | 7 | GET, POST+body, PUT, PATCH, DELETE, query params, array params |
| Error handling | 4 | 500 error, detail message, 204 No Content, JSON response |

---

## Service Tests

### `settingsService.test.ts` (9 tests)

| Describe | Tests | What it verifies |
|----------|-------|-----------------|
| `getStoredSystemTimezone` | 3 | Default "UTC", stored value, correct storage key |
| `applySystemTimezone` | 4 | Store to localStorage, normalize empty to UTC, trim whitespace, dispatch event |
| `emitSystemTimezoneUpdated` | 1 | Dispatches event with timezone detail |
| `SYSTEM_TIMEZONE_UPDATED_EVENT` | 1 | Correct event name constant |

### `maintenanceService.test.ts` (6 tests)

| Describe | Tests | What it verifies |
|----------|-------|-----------------|
| `emitMaintenanceModeUpdated` | 2 | Dispatch with true, dispatch with false |
| `onMaintenanceModeUpdated` | 4 | Handler called, cleanup removes listener, falsy coercion, multiple handlers |

### `apiContracts.test.ts` (22 tests)

| Describe | Tests | What it verifies |
|----------|-------|-----------------|
| `dashboardService` | 7 | Stats, usage, reviews, alerts, activities, dismiss alert, dismiss all |
| `adminDataService` | 7 | Orgs, users, create user, delete user, delete org, update org, trigger embeddings |
| `notificationsService` | 4 | Get notifications, unread count, mark as read, mark all as read |
| `featureFlagsService` | 2 | Get flags, update flag |

---

## Shared Setup (`setup.ts`)

| Feature | Purpose |
|---------|---------|
| `@testing-library/jest-dom/vitest` | DOM assertion matchers |
| `localStorage` mock | In-memory implementation |
| `import.meta.env` defaults | VITE_MAIN_BACKEND_URL, VITE_FRONTEND_URL |
| `beforeEach` reset | Clears localStorage between tests |

---

## Test Results

```
 Test Files  7 passed (7)
      Tests  79 passed (79)
   Duration  7.11s
```

All **79 tests pass** with 0 failures, 0 errors.

## Test all

```
cd admin-frontend
npm test
```