# API Documentation

This document lists all the API endpoints available in the backend, their purpose, and their structure.

## Base URL
All API endpoints are prefixed with `/api` unless otherwise noted.
The backend runs on `http://localhost:8000` by default.

---

## 1. Health & System
Managed by `app/core/health.py`.

| Method | Endpoint | Purpose | Input | Output |
|--------|----------|---------|-------|--------|
| GET | `/api/` | Check if API is online | None | `{"message": "API is online", "status": "healthy"}` |
| GET | `/api/health` | System health status | None | `{"status": "Online", "cpu_usage": float, "ram_usage": float, "uptime": string}` |
| GET | `/api/db-test` | Database connectivity test | None | `{"message": "Database connection successful", "result": 1}` |

---

## 2. Authentication
Managed by `app/modules/auth/routes/`. All endpoints prefixed with `/api/auth`.

| Method | Endpoint | Purpose | Input | Output |
|--------|----------|---------|-------|--------|
| POST | `/signup` | User registration | `SignupModel` (name, email, password) | User details + `tenant_id` |
| POST | `/login` | User login | `LoginModel` (email, password) | Session/Token data |
| POST | `/forgot-password` | Request password reset link | `EmailModel` (email) | Success message |
| POST | `/reset-password/{token}` | Reset password with token | `ResetModel` (new_password) | Success message |
| GET | `/check-session` | Verify active session | None | User session info or `null` |
| GET | `/login/google` | Initiate Google OAuth | None | Redirect to Google |
| GET | `/auth/google` | Google OAuth callback | OAuth params | Auth success/failure |

---

## 3. User Profile
Managed by `app/modules/user/routes/profile_routes.py`. Prefixed with `/api/users`.

| Method | Endpoint | Purpose | Input | Output |
|--------|----------|---------|-------|--------|
| GET | `/me` | Get current user profile | None | User profile details |
| PUT | `/me` | Update user profile | `ProfileUpdate` | Updated profile details |
| POST | `/me/upload-image` | Upload profile picture | `UploadFile` | Image URL |

---

## 4. Organizations
Managed by `app/modules/organization/routes/`.

| Method | Endpoint | Purpose | Input | Output |
|--------|----------|---------|-------|--------|
| GET | `/api/user/organizations` | List current user's orgs | None | List of organizations |
| POST | `/api/organizations/{tenant_id}` | Create/Update organization | `OrganizationCreate` | Org ID |
| PATCH | `/api/organizations/{org_id}` | Update organization details | `OrganizationUpdate` | Success message |
| DELETE | `/api/organizations/{org_id}` | Delete organization | None | Success message |
| GET | `/api/organization-types` | Get org types (Hotel, etc.) | None | List of types |
| POST | `/api/onboarding/skip` | Skip onboarding process | None | Success message |

---

## 5. Review Sources
Managed by `app/modules/organization/routes/source_routes.py` and `app/modules/source/routers/`.

| Method | Endpoint | Purpose | Input | Output |
|--------|----------|---------|-------|--------|
| GET | `/api/setup/sources` | Get sources for an org | `organization_id` (Query) | Connected/Default sources |
| POST | `/api/setup/sources/connect` | Connect a review platform | `SourceConnectRequest` | Source ID |
| POST | `/api/setup/sources/custom` | Connect custom URL | `CustomSourceConnectRequest` | Source ID |
| POST | `/api/setup/sources/disconnect`| Disconnect a source | `SourceDisconnectRequest` | Success message |
| GET | `/api/platforms` | List all supported platforms | None | List of platforms |
| POST | `/api/{source_id}/sync` | Trigger manual sync | None | Success message |

---

## 6. Reviews & AI
Managed by `app/modules/reviews/routes/`.

| Method | Endpoint | Purpose | Input | Output |
|--------|----------|---------|-------|--------|
| GET | `/api/reviews/{org_id}` | Fetch all reviews for org | None | List of `ReviewModel` |
| GET | `/api/reviews/stats` | KPIs for reviews page | None | Total, Avg Rating, etc. |
| POST | `/api/reviews/generate` | Generate AI reply | `ReplyGenerationRequest` | `ReplyGenerationResponse` |
| POST | `/api/scrape/booking` | Trigger Booking.com scrape | `BookingScrapeRequest` | Success message |
| DELETE | `/api/delete_reviews` | Wipe all reviews (Debug) | None | Success message |

---

## 7. Competitor Analysis
Managed by `app/modules/competitors/routes/`. All endpoints prefixed with `/api/competitors`.

| Method | Endpoint | Purpose | Input | Output |
|--------|----------|---------|-------|--------|
| GET | `/` | List all competitors | None | Tracked vs Available list |
| POST | `/` | Add new competitor | `AddCompetitorRequest` | Competitor ID |
| POST | `/track` | Start tracking a competitor | `TrackCompetitorRequest` | Success message |
| POST | `/untrack` | Stop tracking a competitor | `TrackCompetitorRequest` | Success message |
| GET | `/rankings` | Competitive rankings | None | Rankings data |
| GET | `/{id}/compare` | Compare with competitor | None | Comparison metrics |
| GET | `/{id}/insights` | AI insights on competitor | None | Strengths/Weaknesses |
| POST | `/{id}/scrape` | Scrape competitor reviews | `ScrapeCompetitorRequest` | Success message |

---

## 8. Dashboard
Managed by `app/modules/dashboard/routes/`.

| Method | Endpoint | Purpose | Input | Output |
|--------|----------|---------|-------|--------|
| GET | `/api/organizations/{org_id}/dashboard` | Unified dashboard data | None | Aggregated stats & charts |
| GET | `/api/dashboard/stats` | Dashboard KPIs | None | Metrics summary |
| GET | `/api/dashboard/distribution` | Rating distribution | None | Distribution data |
| GET | `/api/dashboard/sentiment-counts` | Sentiment summary | None | Counts by sentiment |

---

## 9. Admin Panel
Managed by `app/modules/admin/routes/`. All endpoints prefixed with `/api/admin`.

### 9.1 Data Management
| Method | Endpoint | Purpose | Input | Output |
|--------|----------|---------|-------|--------|
| GET | `/organizations` | List all organizations | None | Summary list |
| GET | `/users` | List all users | None | User list |
| POST | `/users` | Create new user | `AdminUserCreatePayload` | User ID |
| DELETE | `/users/{id}` | Delete a user | None | Success message |

### 9.2 Settings & Configuration
Prefixed with `/api/admin/settings`.

| Method | Endpoint | Purpose | Input | Output |
|--------|----------|---------|-------|--------|
| GET | `/general` | Get system settings | None | Timezone, Lang, etc. |
| PATCH | `/general` | Update system settings | `GeneralSettingsPayload` | Success message |
| GET | `/reply-generation` | AI reply settings | None | Provider/Model info |
| PATCH | `/reply-generation`| Update AI settings | `ReplyGenerationSettingsPayload` | Success message |
| GET | `/feature-flags` | List feature flags | None | Feature status |

### 9.3 Broadcasting
Prefixed with `/api/admin/broadcasting`.

| Method | Endpoint | Purpose | Input | Output |
|--------|----------|---------|-------|--------|
| POST | `/send` | Send a broadcast message | `BroadcastCreate` | Success message |
| GET | `/history` | Broadcast history | None | History list |
| POST | `/{id}/resend` | Resend broadcast | None | Success message |

---

## 10. Groups
Managed by `app/modules/groups/router.py`. Prefixed with `/api/groups`.

| Method | Endpoint | Purpose | Input | Output |
|--------|----------|---------|-------|--------|
| POST | `/` | Create a new group | `group_name` | Group ID |
| POST | `/{id}/members` | Add member to group | `user_id` | Success message |
| GET | `/{id}/my-role` | Get user's role in group | None | Role name |
