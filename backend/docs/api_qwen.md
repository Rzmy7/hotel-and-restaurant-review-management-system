# Backend API Documentation

> **Base URL**: `http://localhost:8000`  
> **Version**: 2.0.0  
> **Framework**: FastAPI  
> **Interactive Docs**: http://localhost:8000/docs

---

## Table of Contents

1. [Health & Debug](#health--debug)
2. [Authentication](#authentication)
3. [OAuth](#oauth)
4. [User Profile](#user-profile)
5. [User Management](#user-management)
6. [Organization Management](#organization-management)
7. [Onboarding](#onboarding)
8. [Source Management](#source-management)
9. [Reviews](#reviews)
10. [Competitors](#competitors)
11. [Dashboard (User)](#dashboard-user)
12. [Groups](#groups)
13. [Admin Dashboard](#admin-dashboard)
14. [Admin Users](#admin-users)
15. [Admin Organizations](#admin-organizations)
16. [Admin Monitoring](#admin-monitoring)
17. [Admin Maintenance](#admin-maintenance)
18. [Admin Settings](#admin-settings)
19. [Admin Subscriptions](#admin-subscriptions)
20. [Admin Broadcasting](#admin-broadcasting)
21. [Admin Notifications](#admin-notifications)
22. [Admin Insights](#admin-insights)
23. [Scraping](#scraping)

---

## Health & Debug

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/` | No | Health check — returns `{"message": "API is online", "status": "healthy"}` |
| `GET` | `/health` | No | System health check with CPU, RAM, and uptime |
| `GET` | `/db-test` | No | Database connectivity test |
| `GET` | `/which-main` | No | Debug endpoint — identifies the running main module |

### Response Structures

**`GET /health`**
```json
{
  "status": "Online | Warning | Offline",
  "cpu_usage": 12.5,
  "ram_usage": 45.2,
  "uptime": "5d 3h 22m"
}
```

**`GET /db-test`**
```json
{
  "message": "Database connection successful",
  "result": 1
}
```

---

## Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/signup` | No | Register a new user with email/password |
| `POST` | `/api/auth/login` | No | Authenticate user and return JWT token |
| `POST` | `/api/auth/forgot-password` | No | Send password reset email |
| `POST` | `/api/auth/reset-password/{token}` | No | Reset password using token |
| `GET` | `/api/auth/check-session` | No | Check current session status |
| `GET` | `/api/auth/admin/dashboard` | Admin | Admin-only dashboard access |
| `GET` | `/api/auth/test-smtp` | No | Debug — test SMTP email configuration |

### Request/Response Structures

**`POST /api/auth/signup`**
```json
// Request Body
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}

// Response
{
  "message": "User registered successfully in database",
  "user": {
    "id": "uuid",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "roles": ["TENANT"],
    "tenant_id": "uuid"
  }
}
```

**`POST /api/auth/login`**
```json
// Request Body
{
  "email": "john@example.com",
  "password": "securepassword"
}

// Response
{
  "message": "Login successful",
  "access_token": "jwt_token_here",
  "token_type": "bearer"
}
```

**`POST /api/auth/forgot-password`**
```json
// Request Body
{
  "email": "john@example.com"
}

// Response
{
  "message": "If the account exists, a reset link has been sent"
}
```

**`POST /api/auth/reset-password/{token}`**
```json
// Request Body
{
  "new_password": "newsecurepassword"
}

// Response
{
  "message": "Password reset successful"
}
```

---

## OAuth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/auth/login/google` | No | Initiate Google OAuth login flow |
| `GET` | `/api/auth/auth/google` | No | Google OAuth callback handler |

### Response Structures

**`GET /api/auth/auth/google`**
- Redirects to: `{FRONTEND_URL}/oauth-success?token={access_token}`

---

## User Profile

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/users/me` | Yes | Get current user's profile |
| `PUT` | `/api/users/me` | Yes | Update current user's profile |
| `POST` | `/api/users/me/upload-image` | Yes | Upload profile image to Supabase |
| `PUT` | `/api/tenant/plan` | Yes | Update tenant's subscription plan |

### Request/Response Structures

**`GET /api/users/me`**
```json
// Response
{
  "user_id": "uuid",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "profile_image_url": "https://..."
}
```

**`PUT /api/users/me`**
```json
// Request Body
{
  "first_name": "John",
  "last_name": "Doe",
  "profile_image_url": "https://..."
}
```

**`PUT /api/tenant/plan`**
```json
// Request Body
{
  "plan_id": "2"
}

// Response
{
  "message": "Plan updated successfully",
  "plan_id": "2"
}
```

---

## User Management

> **Note**: These endpoints are for admin-level user management.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/users/` | Admin | List all users |
| `POST` | `/api/users/` | Admin | Create a new user |
| `PUT` | `/api/users/{user_id}` | Admin | Update an existing user |
| `DELETE` | `/api/users/{user_id}` | Admin | Delete a user |

---

## Organization Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/organizations/{tenant_id}` | Yes | Create or update an organization |
| `PATCH` | `/api/organizations/{org_id}` | Yes | Update organization details |
| `POST` | `/api/organizations/{org_id}` | Yes | Update organization details (alias for PATCH) |
| `DELETE` | `/api/organizations/{org_id}` | Yes | Delete an organization |
| `DELETE` | `/api/setup/organizations/{org_id}/discard` | Yes | Discard a setup-in-progress organization |
| `GET` | `/api/organization-types` | Yes | Get all organization types (Hotel, Restaurant, etc.) |
| `GET` | `/api/user/organizations` | Yes | Get current user's organizations |

### Request/Response Structures

**`POST /api/organizations/{tenant_id}`**
```json
// Request Body
{
  "organization_name": "Grand Hotel",
  "organization_type_id": "HOTEL",
  "sources": [
    {
      "platform_id": 1,
      "source_url": "https://...",
      "fetching_frequency": "daily"
    }
  ]
}

// Response
{
  "message": "Organization created successfully",
  "organization_id": "uuid",
  "organization_created": true
}
```

**`GET /api/organization-types`**
```json
// Response
[
  {
    "type_code": "HOTEL",
    "type_name": "Hotel"
  },
  {
    "type_code": "RESTAURANT",
    "type_name": "Restaurant"
  }
]
```

**`GET /api/user/organizations`**
```json
// Response
[
  {
    "organization_id": "uuid",
    "organization_name": "Grand Hotel",
    "organization_type": "Hotel",
    "organization_type_id": "HOTEL",
    "role": "owner"
  }
]
```

---

## Onboarding

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/onboarding/skip` | Yes | Mark onboarding as completed |

---

## Source Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/setup/sources` | Yes | Get available and connected sources |
| `POST` | `/api/setup/sources/connect` | Yes | Connect a review source |
| `POST` | `/api/setup/sources/custom` | Yes | Connect a custom review source |
| `POST` | `/api/setup/sources/disconnect` | Yes | Disconnect a review source |
| `GET` | `/api/platforms` | Yes | List all available platforms |
| `GET` | `/api/sync-frequencies` | Yes | List sync frequency options |
| `GET` | `/api/tenants/{tenant_id}/organizations` | Yes | Get organizations for a tenant |
| `GET` | `/api/tenants/{tenant_id}/sources` | Yes | Get all sources for a tenant |
| `GET` | `/api/organizations/{organization_id}/sources` | Yes | Get sources with stats for an organization |
| `GET` | `/api/organizations/{organization_id}/sync-logs` | Yes | Get sync logs with pagination |
| `GET` | `/api/stuck-tasks` | Yes | Get sources stuck in 'running' or 'queued' state |
| `POST` | `/api/` | Yes | Create a new source |
| `PATCH` | `/api/{source_id}` | Yes | Update source settings |
| `DELETE` | `/api/{source_id}` | Yes | Delete a source |
| `POST` | `/api/{source_id}/sync` | Yes | Manually trigger a source sync |

### Request/Response Structures

**`POST /api/setup/sources/connect`**
```json
// Request Body
{
  "source_name": "Agoda",
  "organization_id": "uuid",
  "source_url": "https://www.agoda.com/hotel/123"
}

// Response
{
  "message": "Source connected successfully",
  "source_id": "uuid",
  "organization_id": "uuid"
}
```

**`POST /api/{source_id}/sync`**
```json
// Response
{
  "message": "Sync triggered successfully",
  "source_id": "uuid"
}
```

---

## Reviews

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/reviews/{organization_id}` | Yes | Fetch all reviews for an organization |
| `GET` | `/api/reviews_count` | Yes | Get total review count |
| `DELETE` | `/api/delete_reviews` | Yes | Delete all reviews |
| `GET` | `/api/reviews/stats` | Yes | Get review KPIs (total, avg rating, pending replies, sentiment) |
| `POST` | `/api/reviews/generate` | Yes | Generate AI reply for a review |
| `GET` | `/api/reviews` | No | Fetch analyzed reviews from JSON file (legacy) |

### Request/Response Structures

**`GET /api/reviews/{organization_id}`**
```json
// Response
[
  {
    "id": "uuid",
    "reviewer_name": "John Doe",
    "rating": 4.5,
    "sentiment": "positive",
    "text": "Great experience...",
    "date": "2026-04-01",
    "source": "Booking.com"
  }
]
```

**`GET /api/reviews/stats`**
```json
// Response
{
  "totalReviews": 1250,
  "averageRating": 4.2,
  "pendingReplies": 45,
  "sentimentScore": 75
}
```

**`POST /api/reviews/generate`**
```json
// Request Body
{
  "review_id": "uuid",
  "review_text": "The room was clean but the service was slow.",
  "rating": 3,
  "source": "Google"
}

// Response
{
  "reply": "Thank you for your feedback. We're glad you enjoyed...",
  "provider": "openai",
  "model": "gpt-4o"
}
```

---

## Competitors

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/competitors/` | Yes | List tracked and available competitors |
| `POST` | `/api/competitors/` | Yes | Add a new competitor |
| `POST` | `/api/competitors/track` | Yes | Start tracking a competitor |
| `POST` | `/api/competitors/untrack` | Yes | Stop tracking a competitor |
| `DELETE` | `/api/competitors/{competitor_id}` | Yes | Remove a competitor |
| `GET` | `/api/competitors/{competitor_id}/reviews` | Yes | Get reviews for a competitor |

### Request/Response Structures

**`POST /api/competitors/`**
```json
// Request Body
{
  "name": "Rival Hotel",
  "location": "Colombo",
  "bookingUrl": "https://www.booking.com/hotel/rival"
}

// Response
{
  "message": "Competitor added",
  "competitor": {
    "id": 1,
    "name": "Rival Hotel",
    "location": "Colombo"
  }
}
```

**`POST /api/competitors/track`**
```json
// Request Body
{
  "competitorId": 1
}

// Response
{
  "message": "Competitor now tracked",
  "competitor": { ... }
}
```

---

## Dashboard (User)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/organizations/{org_id}/dashboard` | Yes | Unified dashboard with metrics, charts, and insights |
| `GET` | `/api/dashboard/stats` | Yes | Get dashboard KPI statistics |
| `GET` | `/api/dashboard/distribution` | Yes | Get sentiment distribution |
| `GET` | `/api/dashboard/alerts` | Yes | Get system alerts |
| `GET` | `/api/dashboard/activities` | Yes | Get activity feed |
| `GET` | `/api/dashboard/sentiment-counts` | Yes | Get sentiment count breakdown |
| `GET` | `/api/dashboard/negative-reviews` | Yes | Get negative reviews list |

### Request/Response Structures

**`GET /api/organizations/{org_id}/dashboard`**
```json
// Query Parameters
// period: int (default: 30) — number of days

// Response
{
  "hotel": { "id": "uuid", "name": "Organization Dashboard", "status": "Active" },
  "organizations": [ { "id": "uuid", "name": "Current Organization", "status": "Active" } ],
  "currentOrganizationId": "uuid",
  "metrics": { ... },
  "charts": {
    "sentiment": [ ... ],
    "reviewsOverTime": [ ... ],
    "sentimentTrends": [ ... ]
  },
  "latestReviews": [ ... ],
  "aiInsights": {
    "strengths": [ ... ],
    "issues": [ ... ],
    "highlight": { "text": "...", "correlation": "Strong" }
  },
  "alerts": [ ... ],
  "sourceComparison": [ ... ],
  "categoryPerformance": [ ... ]
}
```

---

## Groups

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/groups` | Yes | Create a new group |
| `POST` | `/api/groups/{group_id}/members` | Group Manager | Add a member to a group |
| `GET` | `/api/groups/{group_id}/my-role` | Yes | Get current user's role in a group |
| `GET` | `/api/groups/{group_id}/reviews` | Group Member | Get reviews for a group |

### Request/Response Structures

**`POST /api/groups`**
```json
// Query Parameters
// group_name: string

// Response
{
  "message": "Group created successfully",
  "group_id": "uuid",
  "group_name": "My Group"
}
```

---

## Admin Dashboard

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/dashboard/stats` | Admin | System-wide KPI statistics |
| `GET` | `/api/dashboard/usage` | Admin | 12-month review volume trend |
| `GET` | `/api/dashboard/reviews` | Admin | Per-platform review volume breakdown |
| `GET` | `/api/dashboard/alerts` | Admin | Active system alerts |
| `GET` | `/api/dashboard/activities` | Admin | Recent platform activity |

### Request/Response Structures

**`GET /api/dashboard/stats`**
```json
// Response
{
  "totalOrganizations": 50,
  "totalUsers": 200,
  "totalReviews": 15000,
  "activeSources": 120
}
```

---

## Admin Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/admin/users` | Admin | List all users (admin view) |
| `POST` | `/api/admin/users` | Admin | Create a new user (admin view) |
| `PATCH` | `/api/admin/users/{user_id}` | Admin | Update a user (admin view) |
| `DELETE` | `/api/admin/users/{user_id}` | Admin | Delete a user (admin view) |
| `GET` | `/api/admin/users/stats` | Admin | Get user statistics |

### Request/Response Structures

**`GET /api/admin/users`**
```json
// Response
[
  {
    "user_id": "uuid",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "TENANT",
    "created_at": "2026-01-15T10:30:00"
  }
]
```

---

## Admin Organizations

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/organizations` | Admin | List all organizations |
| `GET` | `/api/organizations/stats` | Admin | Get organization statistics |
| `GET` | `/api/sources` | Admin | Get all available platforms |
| `GET` | `/api/organizations/{org_id}/sources` | Admin | Get sources for an organization |
| `PATCH` | `/api/organizations/{org_id}` | Admin | Update organization name |
| `PUT` | `/api/organizations/{org_id}/sources` | Admin | Replace all sources for an organization |
| `DELETE` | `/api/organizations/{org_id}` | Admin | Delete an organization and its sources |

### Request/Response Structures

**`GET /api/organizations`**
```json
// Response
[
  {
    "id": "uuid",
    "name": "Grand Hotel",
    "created_at": "2026-01-15T10:30:00"
  }
]
```

**`PUT /api/organizations/{org_id}/sources`**
```json
// Request Body
{
  "sources": [
    {
      "source_id": "1",
      "external_url": "https://www.booking.com/hotel/123"
    }
  ]
}

// Response
[
  {
    "source_id": "uuid",
    "platform_id": 1,
    "platform_name": "Booking.com",
    "source_url": "https://...",
    "last_synced_at": "2026-04-09T12:00:00"
  }
]
```

---

## Admin Monitoring

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/monitoring/admin-backend-status` | Admin | Backend server status and resource usage |
| `GET` | `/api/monitoring/main-backend-status` | Admin | Alias for admin-backend-status |
| `GET` | `/api/monitoring/admin-backend-usage` | Admin | Backend CPU and RAM usage |
| `GET` | `/api/monitoring/main-backend-usage` | Admin | Alias for admin-backend-usage |
| `GET` | `/api/monitoring/scraping/platforms` | Admin | List scraping platform configurations |
| `POST` | `/api/monitoring/scraping/platforms` | Admin | Create a scraping platform entry |
| `GET` | `/api/monitoring/scraping/platforms/{platform_id}` | Admin | Get platform metadata and attributes |
| `PUT` | `/api/monitoring/scraping/platforms/{platform_id}` | Admin | Update platform metadata |
| `PATCH` | `/api/monitoring/scraping/platforms/{platform_id}/toggle` | Admin | Toggle platform enabled/disabled state |
| `DELETE` | `/api/monitoring/scraping/platforms/{platform_id}` | Admin | Delete a platform |
| `GET` | `/api/monitoring/scraping/stats` | Admin | Scraping statistics (jobs, success rate, reviews ingested) |
| `GET` | `/api/monitoring/scraping/jobs` | Admin | Recent scraping jobs list |

### Request/Response Structures

**`GET /api/monitoring/admin-backend-status`**
```json
// Response
{
  "service": "admin-backend",
  "status": "healthy",
  "cpu": 12.5,
  "ram": 45.2
}
```

**`GET /api/monitoring/scraping/stats`**
```json
// Response
{
  "activeJobs": 3,
  "activeJobsChange": 0,
  "completedToday": 15,
  "successRate": 95.5,
  "failedJobs": 1,
  "requiresAttention": true,
  "reviewsIngested": 5000,
  "reviewsChange": 0
}
```

**`GET /api/monitoring/scraping/jobs`**
```json
// Response
[
  {
    "id": "job-uuid",
    "jobId": "#SCR-ABC123",
    "platform": "Booking.com",
    "platformIcon": "B",
    "platformColor": "#0047AB",
    "organization": "Grand Hotel",
    "status": "completed | running | failed | queued",
    "startTime": "2 hours ago",
    "duration": "15m",
    "reviews": 250
  }
]
```

---

## Admin Maintenance

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/maintenance/status` | Admin | Get maintenance mode status |
| `PATCH` | `/api/maintenance/status` | Admin | Update maintenance mode |

### Request/Response Structures

**`GET /api/maintenance/status`**
```json
// Response
{
  "maintenanceMode": false
}
```

**`PATCH /api/maintenance/status`**
```json
// Request Body
{
  "maintenanceMode": true
}

// Response
{
  "success": true,
  "maintenanceMode": true
}
```

---

## Admin Settings

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/settings/general` | Admin | Get general settings (timezone, language, date format, currency) |
| `PATCH` | `/api/settings/general` | Admin | Update general settings |
| `GET` | `/api/settings/admin-profile` | Admin | Get admin profile |
| `PATCH` | `/api/settings/admin-profile` | Admin | Update admin profile name |
| `PATCH` | `/api/settings/admin-profile/password` | Admin | Change admin password |
| `GET` | `/api/settings/reply-generation` | Admin | Get AI reply generation settings |
| `PATCH` | `/api/settings/reply-generation` | Admin | Update reply generation settings |
| `POST` | `/api/settings/reply-generation/test` | Admin | Test AI API key connectivity |
| `GET` | `/api/settings/feature-flags` | Admin | Get feature flags |
| `PATCH` | `/api/settings/feature-flags/{flag_key}` | Admin | Update a feature flag |

### Request/Response Structures

**`GET /api/settings/general`**
```json
// Response
{
  "timezone": "Asia/Colombo",
  "language": "en",
  "dateFormat": "MM/DD/YYYY",
  "currency": "USD"
}
```

**`PATCH /api/settings/admin-profile/password`**
```json
// Request Body
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword"
}

// Response
{
  "message": "Password updated successfully"
}
```

**`GET /api/settings/reply-generation`**
```json
// Response
{
  "selectedModel": "gpt-4o",
  "similarReviewsCount": 5,
  "requestCount": 100,
  "tokenUsage": 50000,
  "useEmbeddingRules": true,
  "useSimilarReviews": true
}
```

**`POST /api/settings/reply-generation/test`**
```json
// Request Body
{
  "provider": "openai",
  "apiKey": "sk-...",
  "model": "gpt-4o"
}

// Response
{
  "provider": "openai",
  "success": true,
  "message": "API key is valid and model 'gpt-4o' is reachable."
}
```

**`GET /api/settings/feature-flags`**
```json
// Response
[
  {
    "id": "1",
    "key": "content_search_embeddings",
    "name": "Content Search by Embeddings",
    "description": "Enable semantic search across reviews and content using vector embeddings",
    "status": "Enabled",
    "limit": null
  },
  {
    "id": "2",
    "key": "reply_regeneration_limit",
    "name": "Reply Regeneration Limit",
    "description": "Set maximum number of times a reply can be regenerated per review",
    "status": "Enabled",
    "limit": 3
  }
]
```

---

## Admin Subscriptions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/subscription-features` | Admin | List all subscription features |
| `GET` | `/api/subscription-plans` | Admin | List all subscription plans |
| `GET` | `/api/subscription-usage/{user_id}` | Admin | Get user's subscription usage summary |
| `POST` | `/api/subscription-plans` | Admin | Create a new subscription plan |
| `PATCH` | `/api/subscription-plans/{plan_id}` | Admin | Update a subscription plan |
| `DELETE` | `/api/subscription-plans/{plan_id}` | Admin | Delete a subscription plan |

### Request/Response Structures

**`GET /api/subscription-plans`**
```json
// Response
[
  {
    "plan_id": 1,
    "plan_name": "Free",
    "description": "Basic plan for new tenants",
    "price": 0.00,
    "features": [ ... ]
  }
]
```

**`GET /api/subscription-usage/{user_id}`**
```json
// Response
{
  "user_id": "uuid",
  "plan_id": 1,
  "plan_name": "Free",
  "features": [
    {
      "feature_key": "reply_generations",
      "used_quantity": 15,
      "limit": 50
    }
  ]
}
```

---

## Admin Broadcasting

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/broadcasting/send` | Admin | Send a broadcast message |
| `GET` | `/api/broadcasting/estimate-recipients` | Admin | Estimate recipient count for an audience |
| `GET` | `/api/broadcasting/statistics` | Admin | Get broadcast statistics |
| `GET` | `/api/broadcasting/history` | Admin | Get broadcast history |
| `GET` | `/api/broadcasting/{broadcast_id}` | Admin | Get details of a specific broadcast |
| `POST` | `/api/broadcasting/{broadcast_id}/resend` | Admin | Resend a broadcast |
| `POST` | `/api/broadcasting/{broadcast_id}/cancel` | Admin | Cancel a scheduled broadcast |

### Request/Response Structures

**`POST /api/broadcasting/send`**
```json
// Request Body
{
  "subject": "System Maintenance",
  "body": "The system will be down for maintenance on...",
  "channel": "notification | email | both",
  "audienceType": "all | role | plan",
  "audienceValue": "admin",
  "messageType": "info | warning | maintenance | announcement",
  "scheduleType": "now | scheduled",
  "scheduledAt": "2026-04-10T10:00:00Z"
}

// Response
{
  "success": true,
  "broadcastId": "uuid",
  "message": "Broadcast sent for 150 recipients"
}
```

**`GET /api/broadcasting/estimate-recipients`**
```json
// Query Parameters
// audienceType: all | role | plan
// audienceValue: string (optional)

// Response
{
  "count": 150
}
```

---

## Admin Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/notifications/` | Admin | Get notifications for a user |
| `GET` | `/api/notifications/unread-count` | Admin | Get unread notification count |
| `POST` | `/api/notifications/{notification_id}/read` | Admin | Mark notification as read |
| `POST` | `/api/notifications/read-all` | Admin | Mark all notifications as read |
| `DELETE` | `/api/notifications/read-all` | Admin | Delete all read notifications |
| `DELETE` | `/api/notifications/{notification_id}` | Admin | Delete a specific notification |

### Request/Response Structures

**`GET /api/notifications/`**
```json
// Query Parameters
// userId: string (optional)
// limit: int (default: 20, max: 100)

// Response
{
  "userId": "uuid",
  "notifications": [
    {
      "notification_id": "uuid",
      "user_id": "uuid",
      "title": "New Review",
      "message": "A new 5-star review was posted on Booking.com",
      "notification_type": "info",
      "is_read": false,
      "created_at": "2026-04-09T12:00:00",
      "read_at": null
    }
  ]
}
```

---

## Admin Insights

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/admin/dashboard` | Admin | Admin dashboard overview |
| `GET` | `/api/admin/insights` | Admin | AI-generated insights |

---

## Scraping

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/scrape/booking` | No | Trigger Booking.com scraping (background task) |

### Request/Response Structures

**`POST /scrape/booking`**
```json
// Request Body
{
  "url": "https://www.booking.com/hotel/example",
  "headless": true
}

// Response
{
  "message": "Booking.com scrape started",
  "url": "https://www.booking.com/hotel/example",
  "headless": true
}
```

---

## Authentication Summary

| Endpoint Pattern | Auth Required | Roles |
|------------------|---------------|-------|
| `/`, `/health`, `/db-test`, `/which-main` | No | — |
| `/api/auth/signup`, `/api/auth/login`, `/api/auth/forgot-password`, `/api/auth/reset-password/*` | No | — |
| `/api/auth/login/google`, `/api/auth/auth/google` | No | — |
| `/api/users/me`, `/api/organizations/*`, `/api/reviews/*` | Yes | TENANT, ADMIN |
| `/api/competitors/*`, `/api/groups/*` | Yes | TENANT, ADMIN |
| `/api/dashboard/*` | Yes | TENANT |
| `/api/admin/*`, `/api/monitoring/*`, `/api/maintenance/*`, `/api/settings/*` | Yes | ADMIN |
| `/api/broadcasting/*` | Yes | ADMIN |
| `/api/notifications/*` | Yes | ADMIN, TENANT |

---

## Error Response Format

All error responses follow this structure:

```json
{
  "detail": "Error message describing what went wrong"
}
```

HTTP status codes used:
- `200` — Success
- `201` — Created
- `400` — Bad Request
- `401` — Unauthorized
- `403` — Forbidden
- `404` — Not Found
- `500` — Internal Server Error
- `503` — Service Unavailable

---

## Notes

- **Database**: Microsoft SQL Server via ODBC Driver 18
- **Authentication**: JWT-based with session support for OAuth
- **Role System**: TENANT (default user), ADMIN (system admin), GROUP_MANAGER, GROUP_MEMBER
- **Scheduler**: APScheduler for background tasks (sync, reconciliation, broadcasting)
- **AI Integration**: Multi-model LLM Gateway for reply generation and sentiment analysis
- **Vector Search**: ChromaDB embedding service for semantic review search (separate microservice)
- **Scraper Engine**: Playwright-based multi-platform scraper (separate microservice on port 8001)

---

*Generated: April 10, 2026*
