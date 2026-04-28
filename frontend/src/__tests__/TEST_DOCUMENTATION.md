# Frontend Test Suite Documentation

## Overview

This document describes the comprehensive test suite for the **L2 Project UI** frontend — a React + TypeScript application built with Vite, using Zustand for state management and TailwindCSS for styling.

| Category | Directory | Tests | Purpose |
|----------|-----------|-------|---------|
| **Validators** | `__tests__/validators/` | 65 | Signup, login, file upload validation |
| **Utils** | `__tests__/utils/` | 32 | Auth role normalization, competitor domain inference |
| **Stores** | `__tests__/stores/` | 27 | Zustand state management (organization, reviews) |
| **API** | `__tests__/api/` | 13 | API client URL building, headers, error handling |
| **Config** | `__tests__/config/` | 7 | URL resolution with localStorage overrides |
| **Services** | `__tests__/services/` | 11 | Feature flag service with mocked fetch |
| **Total** | | **175** | |

All tests run **without a backend** — fetch calls are mocked and localStorage is reset between tests.

---

## Prerequisites

### Dependencies

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### Running Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run a specific test file
npx vitest run src/__tests__/validators/signupValidator.test.ts

# Run with coverage
npx vitest run --coverage
```

---

## Test Directory Structure

```
frontend/src/__tests__/
├── setup.ts                                    # Global setup (jest-dom, localStorage mock, env vars)
├── validators/
│   ├── signupValidator.test.ts                # Name, email, password, form, normalize, error mapping
│   ├── loginValidator.test.ts                 # Email, password, verification code, form, normalize
│   └── fileValidator.test.ts                  # Image type and size constraints
├── utils/
│   ├── authRole.test.ts                       # normalizeRole, isAdminRole, isExternalDestination
│   └── competitorDomain.test.ts               # DOMAIN_OPTIONS, inferCompetitorDomain
├── stores/
│   ├── useOrganizationStore.test.ts           # Zustand org store — fetch, switch, localStorage
│   └── useReviewsStore.test.ts                # Zustand reviews store — modal, navigation
├── api/
│   └── client.test.ts                         # URL construction, auth headers, HTTP methods, errors
├── config/
│   └── api.test.ts                            # getApiBaseUrl, getAdminPanelUrl, localStorage overrides
└── services/
    └── featureFlagService.test.ts             # Flag checking, error handling, network failures
```

---

## Validator Tests

### `signupValidator.test.ts` (37 tests)

| Describe | Tests | What it verifies |
|----------|-------|-----------------|
| `validateFullName` | 11 | Trimming, empty, min/max length, digits rejection, hyphens, apostrophes |
| `validateEmailAddress` | 11 | Valid emails, empty, missing @, unrealistic TLD, dots, trimming, short domains |
| `validatePassword` | 7 | Strong password, empty, short, no uppercase/digit/symbol, exactly 8 chars |
| `validateConfirmPassword` | 3 | Match, empty confirm, mismatch |
| `validateSignupForm` | 7 | Valid form, each missing field, unaccepted terms, multiple errors |
| `normalizeSignupPayload` | 4 | Trim name, lowercase email, strip whitespace, exclude extra fields |
| `mapBackendSignupErrorToField` | 4 | Email exists, password, name, unknown errors |

### `loginValidator.test.ts` (19 tests)

| Describe | Tests | What it verifies |
|----------|-------|-----------------|
| `validateLoginEmail` | 3 | Valid, empty, invalid |
| `validateLoginPassword` | 2 | Non-empty, empty |
| `validateVerificationCode` | 7 | 6-digit, trimming, empty, 5/7 digits, letters, special chars |
| `validateLoginForm` | 4 | Valid, empty email, empty password, both empty |
| `normalizeLoginPayload` | 2 | Lowercase/trim email, preserve password |
| `mapBackendLoginErrorToField` | 5 | Credential, email, password, verification, unknown errors |

### `fileValidator.test.ts` (8 tests)

| Test | What it verifies |
|------|-----------------|
| Accepts JPEG under 2MB | ✅ |
| Accepts PNG under 2MB | ✅ |
| Rejects GIF, SVG, WebP, PDF | Type restriction |
| Rejects files > 2MB | Size limit |
| Accepts exactly 2MB | Boundary |

---

## Utility Tests

### `authRole.test.ts` (19 tests)

| Describe | Tests | What it verifies |
|----------|-------|-----------------|
| `normalizeRole` | 7 | Uppercase, trim, array input, empty array, number, null, undefined |
| `isAdminRole` | 8 | ADMIN, admin, SYSTEM_ADMIN, SUPER_ADMIN, USER, empty, array, null |
| `isExternalDestination` | 4 | http, https, relative path, empty |
| `getDashboardPathForRole` | 4 | User → /dashboard, admin → panel URL, token/user params |

### `competitorDomain.test.ts` (16 tests)

| Describe | Tests | What it verifies |
|----------|-------|-----------------|
| `DOMAIN_OPTIONS` | 3 | Has 2 options: Hotel, Restaurant / Cafe |
| `inferCompetitorDomain` | 13 | Restaurant keywords (restaurant, cafe, bar, coffee, pizza, zomato, yelp, food), Hotel defaults, empty/null fields, case insensitivity |

---

## Store Tests (Zustand)

### `useOrganizationStore.test.ts` (12 tests)

| Group | Tests | What it verifies |
|-------|-------|-----------------|
| Initial state | 5 | Empty orgs, null currentOrg, loading, no error, no hasOrganization |
| `fetchOrganizations` | 5 | Load from localStorage, select first, restore saved, empty/corrupt JSON |
| `switchOrganization` | 2 | Valid switch + localStorage update, no-op for non-existent ID |

### `useReviewsStore.test.ts` (15 tests)

| Group | Tests | What it verifies |
|-------|-------|-----------------|
| Initial state | 6 | Empty reviews, loading, no error, modal closed, no selection, default pagination |
| Modal actions | 2 | openReview, closeReview |
| `navigateReview` | 7 | Next, prev, boundary (last/first), no selection, empty reviews, custom list |

---

## API Client Tests

### `client.test.ts` (13 tests)

| Describe | Tests | What it verifies |
|----------|-------|-----------------|
| `getFullUrl logic` | 3 | Auto-prepend /api, no double /api/, preserve absolute URLs |
| `getHeaders` | 2 | Bearer token from localStorage, Content-Type for JSON |
| `handleResponse` | 3 | Error on 500, error on 403, JSON parsing on success |
| `HTTP methods` | 5 | GET, POST with body, PUT, DELETE, GET with query params |

---

## Config Tests

### `api.test.ts` (7 tests)

| Describe | Tests | What it verifies |
|----------|-------|-----------------|
| `getApiBaseUrl` | 4 | Fallback, localStorage override, trailing slash strip, empty value |
| `getAdminPanelUrl` | 3 | Fallback, localStorage override, trailing slash strip |

---

## Service Tests

### `featureFlagService.test.ts` (11 tests)

| Test | What it verifies |
|------|-----------------|
| Content search enabled/disabled/missing | Flag state detection |
| Dark mode enabled/disabled | Flag state detection |
| 2FA enabled | Flag state detection |
| Get all flags | Array returned |
| Network failure → empty array | Error resilience |
| Network failure → false for flags | Error resilience |
| Non-ok response → empty array | Error resilience |

---

## Shared Setup (`setup.ts`)

| Feature | Purpose |
|---------|---------|
| `@testing-library/jest-dom/vitest` | DOM assertion matchers (toBeInTheDocument, etc.) |
| `localStorage` mock | In-memory localStorage implementation |
| `import.meta.env` defaults | VITE_MAIN_BACKEND_URL, VITE_ADMIN_PANEL_URL |
| `beforeEach` reset | Clears localStorage between tests |

---

## Test Results Summary

```
 Test Files  10 passed (10)
      Tests  175 passed (175)
   Duration  4.68s
```

All **175 tests pass** with 0 failures, 0 errors.

## Running All Tests

```cd frontend
npm test
```
