# Module Analysis: Admin Module

## 1. Module Overview

### What & Why
The `admin` module provides comprehensive system administration capabilities for the Hotel and Restaurant Review Management System. It serves as the backend for the admin frontend (port 5174), enabling platform-wide management of users, organizations, subscriptions, monitoring, broadcasting, and system settings.

It exists to:
- **Manage Users**: CRUD operations for user accounts with role/plan assignment
- **Manage Organizations**: View, update, and delete tenant organizations
- **Monitor Systems**: Track scraper engine status, server health, and job progress
- **Control Subscriptions**: Define plans, features, and usage limits
- **Broadcast Messages**: Send system-wide notifications and announcements
- **Configure Settings**: Manage reply generation, feature flags, and general system preferences

### When
The module's logic is triggered when:
1. Admin users access the admin panel (port 5174)
2. System administrators perform user/organization management
3. Monitoring dashboards request server/scraping status
4. Subscription plans are modified or feature flags toggled
5. Broadcasts are scheduled or sent to users

---

## 2. Architecture & Structure

### File Tree
```
admin/
├── __init__.py                         # Module initialization
├── schemas.py                          # All Pydantic schemas (50+ models)
├── db_utils.py                         # Database utility functions
├── routes/
│   ├── __init__.py                     # Routes package
│   ├── admin_routes.py                 # User and organization CRUD
│   ├── dashboard_routes.py             # Dashboard stats and charts
│   ├── monitoring_routes.py            # Scraping platforms and server status
│   ├── organizations.py                # Organization list for admin
│   ├── users.py                        # User management endpoints
│   ├── subscription_routes.py          # Plan and feature management
│   ├── settings_routes.py              # System settings and reply config
│   ├── insights.py                     # AI insights and analytics
│   ├── maintenance_routes.py           # System maintenance endpoints
│   ├── broadcasting_routes.py          # Message broadcasting
│   └── notifications_routes.py         # Notification management
└── services/
    ├── __init__.py                     # Services package
    ├── admin_service.py                # User/org CRUD business logic
    ├── dashboard_service.py            # Dashboard stats aggregation
    ├── monitoring_service.py           # Scraping platform management
    ├── organization_service.py         # Organization admin operations
    ├── user_service.py                 # User admin operations
    ├── subscription_service.py         # Subscription plan management
    ├── system_settings_service.py      # System settings and reply config
    ├── insights_service.py             # AI insights and analytics
    ├── broadcasting_service.py         # Message broadcast logic
    └── notifications_service.py        # Notification management
```

### Module Responsibilities
| Directory | Purpose |
|-----------|---------|
| `schemas.py` | 50+ Pydantic models for all admin operations |
| `routes/` | HTTP endpoints organized by function (12 route files) |
| `services/` | Business logic for all admin operations (10 service files) |
| `db_utils.py` | Database utilities (table checks, column detection, etc.) |

---

## 3. API Endpoints

### 3.1 Dashboard Routes (`dashboard_routes.py`)

**Base Path**: `/dashboard`

| # | Method | Path | Auth | Purpose | Response Model |
|---|--------|------|------|---------|---------------|
| 1 | GET | `/dashboard/stats` | Admin JWT | System-wide KPIs | `DashboardStats` |
| 2 | GET | `/dashboard/usage` | Admin JWT | 12-month review trend | `List[ChartDataPoint]` |
| 3 | GET | `/dashboard/reviews` | Admin JWT | Per-platform review breakdown | `List[ChartDataPoint]` |
| 4 | GET | `/dashboard/alerts` | Admin JWT | Active system alerts | `List[SystemAlert]` |
| 5 | GET | `/dashboard/activities` | Admin JWT | Recent platform activity | `List[RecentActivity]` |

### 3.2 Admin Routes (`admin_routes.py`)

**Base Path**: Root (registered without prefix)

| # | Method | Path | Auth | Purpose | Request Body | Response |
|---|--------|------|------|---------|-------------|----------|
| 6 | GET | `/organizations` | Admin JWT | List all organizations | None | `List[OrganizationSummary]` |
| 7 | GET | `/organizations/stats` | Admin JWT | Organization statistics | None | `OrganizationStats` |
| 8 | PATCH | `/organizations/{org_id}` | Admin JWT | Update org name | `OrganizationUpdatePayload` | `{"id", "name", "status"}` |
| 9 | DELETE | `/organizations/{org_id}` | Admin JWT | Delete org and sources | None | `{"status", "id", "name"}` |
| 10 | GET | `/sources` | Admin JWT | List all platforms | None | `List[{platform_id, platform_name}]` |
| 11 | GET | `/organizations/{org_id}/sources` | Admin JWT | Get org's sources | None | `List[{source_id, platform, url, last_synced}]` |
| 12 | PUT | `/organizations/{org_id}/sources` | Admin JWT | Replace all org sources | `OrgSourcesUpdatePayload` | Updated source list |
| 13 | GET | `/users` | Admin JWT | List all users | None | `List[AdminUser]` |
| 14 | POST | `/users` | Admin JWT | Create admin user | `AdminUserCreatePayload` | `AdminUser` |
| 15 | PATCH | `/users/{user_id}` | Admin JWT | Update user | `AdminUserUpdatePayload` | `AdminUser` |
| 16 | DELETE | `/users/{user_id}` | Admin JWT | Delete user | None | `DeleteUserResponse` |
| 17 | GET | `/users/stats` | Admin JWT | User statistics | None | `UserStatsData` |

### 3.3 Monitoring Routes (`monitoring_routes.py`)

**Base Path**: `/monitoring`

| # | Method | Path | Purpose | Response |
|---|--------|------|---------|----------|
| 18 | GET | `/monitoring/admin-backend-status` | Server health | `{"service", "status", "cpu", "ram"}` |
| 19 | GET | `/monitoring/admin-backend-usage` | CPU/RAM usage | `{"cpu", "ram"}` |
| 20 | GET | `/monitoring/scraping/platforms` | List scraping platforms | `List[dict]` |
| 21 | POST | `/monitoring/scraping/platforms` | Create platform | `{"id", "name", "enabled"}` |
| 22 | GET | `/monitoring/scraping/platforms/{platform_id}` | Platform details | `dict` |
| 23 | PUT | `/monitoring/scraping/platforms/{platform_id}` | Update platform | Updated platform dict |
| 24 | PATCH | `/monitoring/scraping/platforms/{platform_id}/toggle` | Toggle enabled | `{"id", "name", "enabled", "status"}` |
| 25 | DELETE | `/monitoring/scraping/platforms/{platform_id}` | Delete platform | `{"status", "id", "name"}` |
| 26 | GET | `/monitoring/scraping/stats` | Scraping statistics | `{"activeJobs", "completedToday", ...}` |
| 27 | GET | `/monitoring/scraping/jobs` | Recent scraping jobs | `List[{id, platform, status, ...}]` |

### 3.4 Subscription Routes

| # | Method | Path | Purpose | Request/Response |
|---|--------|------|---------|------------------|
| 28 | GET | `/subscription/plans` | List all plans | `List[SubscriptionPlan]` |
| 29 | POST | `/subscription/plans` | Create plan | `SubscriptionPlanUpsertPayload` → `SubscriptionPlan` |
| 30 | PUT | `/subscription/plans/{plan_id}` | Update plan | `SubscriptionPlanUpsertPayload` → `SubscriptionPlan` |
| 31 | DELETE | `/subscription/plans/{plan_id}` | Delete plan | `DeleteSubscriptionPlanResponse` |
| 32 | GET | `/subscription/usage/{user_id}` | User feature usage | `SubscriptionUsageSummary` |

### 3.5 Settings Routes

| # | Method | Path | Purpose | Request/Response |
|---|--------|------|---------|------------------|
| 33 | GET | `/settings/general` | General settings | `GeneralSettingsResponse` |
| 34 | PUT | `/settings/general` | Update general settings | `GeneralSettingsPayload` |
| 35 | GET | `/settings/reply-generation` | Reply generation config | `ReplyGenerationSettingsResponse` |
| 36 | PUT | `/settings/reply-generation` | Update reply config | `ReplyGenerationSettingsPayload` |
| 37 | POST | `/settings/reply-generation/test` | Test API connection | `ReplyGenerationApiTestPayload` → `ReplyGenerationApiTestResponse` |
| 38 | GET | `/settings/feature-flags` | List feature flags | `List[FeatureFlagResponse]` |
| 39 | PATCH | `/settings/feature-flags/{flag_id}` | Toggle feature | `FeatureFlagUpdatePayload` |

### 3.6 Broadcasting Routes

| # | Method | Path | Purpose | Request/Response |
|---|--------|------|---------|------------------|
| 40 | POST | `/broadcast` | Create broadcast | `BroadcastCreate` |
| 41 | GET | `/broadcast/estimate` | Estimate recipients | `EstimatedRecipientsResponse` |
| 42 | GET | `/broadcast/statistics` | Broadcast stats | `StatisticsResponse` |

---

## 4. Database Schema

The admin module interacts with numerous tables but doesn't own most of them. Key tables it reads/writes:

### Tables Managed/Queried

| Table | Purpose | Operations |
|-------|---------|------------|
| `user` | User accounts | SELECT, INSERT, UPDATE, DELETE |
| `organization` | Tenant organizations | SELECT, UPDATE, DELETE |
| `organization_type` | Org type definitions | SELECT, JOIN |
| `tenant` | Tenant workspace mapping | SELECT, JOIN |
| `platform` | Scraping platform configs | SELECT, INSERT, UPDATE, DELETE |
| `source` | Organization data sources | SELECT, INSERT, DELETE |
| `sync_frequency` | Sync interval definitions | SELECT |
| `sync_log` | Sync execution logs | SELECT |
| `subscription_plans` | Plan definitions | SELECT, INSERT, UPDATE, DELETE |
| `subscription_features` | Feature definitions | SELECT |
| `plan_features` | Plan-feature mappings | SELECT, INSERT, UPDATE, DELETE |
| `user_feature_usage` | Per-user feature consumption | SELECT, UPDATE |
| `system_settings` | Key-value system config | SELECT, UPDATE |
| `broadcast_event` | Scheduled broadcasts | SELECT, UPDATE |
| `feature_flags` | Feature toggle flags | SELECT, UPDATE |
| `processed_review` | Review data (fallback) | SELECT (for stats) |

### Dynamic Table Creation

The admin module can **create and manage dynamic tables** for scraping platforms:
- Admin defines table schema via `ScrapingTableAttributePayload`
- Module creates table in database via `create_dynamic_platform_table()`
- Supports column addition, alteration, and removal
- Syncs schema changes to Scraper Engine via HTTP API

---

## 5. Pydantic Schemas

The module defines **50+ Pydantic models** in `schemas.py`. Key schema groups:

### Dashboard Schemas
| Schema | Fields |
|--------|--------|
| `DashboardStats` | totalOrganizations, organizationsAddedToday, organizationsGrowth, addedTodayGrowth, totalUsers, usersGrowth, totalReviews, reviewsCollectedToday, reviewsGrowth, activeUsersToday, systemUptime, aiJobsProcessed, aiJobsGrowth |
| `ChartDataPoint` | label, value |
| `SystemAlert` | id, type, title, message, timestamp, isRead |
| `RecentActivity` | id, type, title, description, timestamp, user |

### Organization Schemas
| Schema | Fields |
|--------|--------|
| `OrganizationSummary` | id, name, owner, usersCount, iconUrl |
| `OrganizationStats` | total, addedToday |
| `OrganizationUpdatePayload` | name |
| `OrgSourcesUpdateItem` | source_id, external_url |
| `OrgSourcesUpdatePayload` | sources (list) |

### User Schemas
| Schema | Fields |
|--------|--------|
| `AdminUser` | id, name, email, role, status, plan, avatarColor, organizations, groups |
| `UserStatsData` | allActiveUsers, todayActiveUsers, todayRegistered |
| `AdminUserCreatePayload` | name, email, role, status, password, plan, organizations, groups |
| `AdminUserUpdatePayload` | name, email, role, status, plan, organizations, groups (all optional) |
| `DeleteUserResponse` | status, userId |

### Subscription Schemas
| Schema | Fields |
|--------|--------|
| `SubscriptionPlan` | id, name, description, monthlyPrice, annualPrice, currency, isPopular, isActive, color, iconName, features |
| `SubscriptionFeature` | id, key, name, description, supportsLimit |
| `SubscriptionPlanFeatureState` | extends SubscriptionFeature + enabled, limit |
| `SubscriptionPlanUpsertPayload` | name, description, monthlyPrice, annualPrice, currency, isPopular, isActive, color, iconName, features |
| `SubscriptionFeatureUsage` | id, key, name, enabled, used, limit, balance |
| `SubscriptionUsageSummary` | userId, planId, planName, features |

### Monitoring Schemas
| Schema | Fields |
|--------|--------|
| `ScrapingPlatformCreatePayload` | name, baseUrl, fetchingType, enabled, tableName, attributes |
| `ScrapingPlatformUpdatePayload` | name, baseUrl, fetchingType, enabled, tableName, attributes |
| `ScrapingTableAttributePayload` | name, type, nullable |

### Settings Schemas
| Schema | Fields |
|--------|--------|
| `GeneralSettingsResponse` | timezone, language, dateFormat, currency |
| `GeneralSettingsPayload` | timezone, language, dateFormat, currency |
| `ReplyGenerationSettingsResponse` | googleApiKey, claudeApiKey, selectedModel, similarReviewsCount, googleRequestCount, claudeRequestCount, googleTokenUsage, claudeTokenUsage, useEmbeddingRules, useSimilarReviews |
| `ReplyGenerationSettingsPayload` | googleApiKey, claudeApiKey, selectedModel, similarReviewsCount, useEmbeddingRules, useSimilarReviews |
| `FeatureFlagResponse` | id, key, name, description, status, limit |
| `FeatureFlagUpdatePayload` | status, limit |

### Broadcasting Schemas
| Schema | Fields |
|--------|--------|
| `BroadcastCreate` | subject, body, channel, audienceType, audienceValue, messageType, scheduleType, scheduledAt |
| `EstimatedRecipientsResponse` | count |
| `StatisticsResponse` | total, sent, scheduled, failed |

---

## 6. Services

### 6.1 Admin Service (`admin_service.py`)

**Purpose**: Core user and organization CRUD operations.

#### Key Functions:

##### `load_organizations(cursor)`
- **Signature**: `(cursor: pyodbc.Cursor) -> List[OrganizationSummary]`
- **Purpose**: Load all organizations with fallback logic for different schema versions
- **Flow**:
  1. If `organization` table exists: join with `organization_type` and `tenant`/`user` to get owner emails
  2. If `reviews` table exists (legacy): group by `room_name` as fallback
  3. If `ProcessedReviews` table exists (legacy): group by `source` as fallback
- **Returns**: List of OrganizationSummary objects

##### `load_users(cursor)`
- **Signature**: `(cursor: pyodbc.Cursor) -> List[AdminUser]`
- **Purpose**: Load all users with plan and role inference
- **Flow**:
  1. If `user` table exists: fetch with dynamic column detection, map subscription plans
  2. If `ProcessedReviews` table exists (legacy): infer users from review authors
- **Role Inference**: `_role_from_user_flags(role_id)` - Admin if role_id matches ADMIN_ROLE_ID
- **Plan Inference**: `_plan_from_user_flags()` - Pro if email+phone verified, else Free
- **Returns**: List of AdminUser objects

##### `create_user_in_db(cursor, conn, payload)`
- **Signature**: `(cursor, conn, payload: AdminUserCreatePayload) -> AdminUser`
- **Purpose**: Create new admin user with validation
- **Validation**:
  - Only Admin role users can be created from admin panel
  - Password required
  - Table must exist with required columns
- **Dynamic Column Detection**: Builds INSERT statement based on existing columns
- **Returns**: Created AdminUser

##### `update_user_in_db(cursor, conn, user_id, payload)`
- **Signature**: `(cursor, conn, user_id, payload: AdminUserUpdatePayload) -> AdminUser`
- **Purpose**: Update user with role/plan synchronization
- **Flow**:
  1. Fetch existing user
  2. Build dynamic SET clauses based on existing columns
  3. Update role_id and verification flags based on role/plan
  4. Update subscription plan if changed
- **Returns**: Updated AdminUser

##### `delete_user_in_db(cursor, conn, user_id)`
- **Signature**: `(cursor, conn, user_id) -> DeleteUserResponse`
- **Purpose**: Hard delete user from database
- **Returns**: DeleteUserResponse with status and userId

##### `get_user_stats(cursor)`
- **Signature**: `(cursor: pyodbc.Cursor) -> UserStatsData`
- **Purpose**: Get user activity statistics
- **Returns**: UserStatsData with allActiveUsers, todayActiveUsers, todayRegistered

##### `get_organization_stats_data(cursor)`
- **Signature**: `(cursor: pyodbc.Cursor) -> OrganizationStats`
- **Purpose**: Get organization count and today's additions
- **Returns**: OrganizationStats with total and addedToday

### 6.2 Dashboard Service (`dashboard_service.py`)

**Purpose**: Aggregate dashboard statistics.

#### Key Functions:

##### `build_dashboard_stats(cursor)`
- **Signature**: `(cursor: pyodbc.Cursor) -> dict`
- **Purpose**: Build complete dashboard stats object
- **Delegates to**:
  - `organization.services.admin_stats_service.get_total_organizations()`
  - `organization.services.admin_stats_service.get_organizations_added_today()`
  - `user.services.admin_stats_service.get_total_users()`
  - `user.services.admin_stats_service.get_active_users_today()`
  - `reviews.services.stats_service.get_review_metrics()`
- **Returns**: Dictionary matching DashboardStats schema

##### `build_usage_data(cursor)`
- **Signature**: `(cursor: pyodbc.Cursor) -> List[dict]`
- **Purpose**: 12-month review volume trend
- **Source**: `reviews.services.stats_service.get_usage_trend()`
- **Returns**: List of ChartDataPoint objects

##### `build_review_data(cursor)`
- **Signature**: `(cursor: pyodbc.Cursor) -> List[dict]`
- **Purpose**: Per-platform review volume breakdown (top 8 platforms)
- **Returns**: List of ChartDataPoint objects

##### `build_system_alerts(cursor)`
- **Signature**: `(cursor: pyodbc.Cursor) -> List[dict]`
- **Purpose**: Active system alerts from database state
- **Returns**: List of SystemAlert objects

##### `build_recent_activity(cursor)`
- **Signature**: `(cursor: pyodbc.Cursor) -> List[dict]`
- **Purpose**: Recent platform activity from processed_review rows
- **Returns**: List of RecentActivity objects

### 6.3 Monitoring Service (`monitoring_service.py`)

**Purpose**: Scraping platform management and server health.

#### Key Functions:

##### `server_usage()`
- **Signature**: `() -> tuple[float, float]`
- **Purpose**: Get CPU and RAM usage percentages
- **Implementation**: Uses `psutil` library
- **Returns**: (cpu_percent, ram_percent)

##### `fetch_platforms_from_db()`
- **Signature**: `() -> List[dict]`
- **Purpose**: Load scraping platforms with visual metadata
- **Flow**:
  1. If `platform` table exists: load with icons, colors, status
  2. If `processed_review` table exists (fallback): infer platforms from source field
- **Returns**: List of platform dictionaries

##### `create_platform_in_db(payload)`
- **Signature**: `(payload: ScrapingPlatformCreatePayload) -> dict`
- **Purpose**: Create new scraping platform with optional dynamic table
- **Flow**:
  1. Validate platform name uniqueness
  2. If tableName and attributes provided: create table via `_create_table_in_scraper_backend()`
  3. Insert platform record
- **Returns**: Created platform dict

##### `update_platform_in_db(platform_id, payload)`
- **Signature**: `(platform_id, payload: ScrapingPlatformUpdatePayload) -> dict`
- **Purpose**: Update platform and sync table schema
- **Flow**:
  1. Update platform metadata
  2. If tableName changed: sync schema via `sync_dynamic_platform_table()`
  3. Handles table rename, column additions/alterations/removals
- **Returns**: Updated platform dict

##### `scraping_backend_get(endpoint)`
- **Purpose**: HTTP GET to Scraper Engine
- **Base URL**: `SCRAPING_BACKEND_URL` env var (default: `http://localhost:8001`)

##### `scraping_stats()`
- **Signature**: `() -> dict`
- **Purpose**: Get scraping statistics from Scraper Engine
- **Flow**:
  1. Fetch active jobs: `/api/v1/system/jobs`
  2. Fetch all jobs: `/api/v1/system/jobs/all`
  3. Calculate: activeJobs, completedToday, successRate, failedJobs, reviewsIngested
- **Returns**: Dictionary with scraping stats

### 6.4 System Settings Service (`system_settings_service.py`)

**Purpose**: System-wide configuration management.

#### Key Functions:

##### `ensure_system_settings_table(cursor)`
- **Purpose**: Create settings table if not exists
- **Table Schema**: `dbo.system_settings(setting_key PK, setting_value, updated_at)`

##### `get_setting(cursor, key)`
- **Signature**: `(cursor, key: str) -> str | None`
- **Purpose**: Get setting value by key

##### `set_setting(cursor, key, value)`
- **Signature**: `(cursor, key: str, value: str) -> None`
- **Purpose**: Upsert setting value

##### `get_setting_bool(cursor, key, default)`
- **Signature**: `(cursor, key: str, default: bool = False) -> bool`
- **Purpose**: Get boolean setting with flexible parsing

##### `get_similar_reviews_count(cursor)`
- **Purpose**: Get configured similar reviews count (1-20 range)
- **Default**: 3

##### `increment_setting_counter(cursor, key, delta)`
- **Purpose**: Atomically increment numeric setting

#### Default Settings Constants:
```python
DEFAULT_TIMEZONE = "UTC"
DEFAULT_LANGUAGE = "en"
DEFAULT_DATE_FORMAT = "MM/DD/YYYY"
DEFAULT_CURRENCY = "USD ($)"
DEFAULT_REPLY_PROVIDER = "google"
DEFAULT_SIMILAR_REVIEWS_COUNT = 3
DEFAULT_REPLY_GOOGLE_MODEL = "gemini-2.5-flash-lite"
DEFAULT_REPLY_CLAUDE_MODEL = "claude-sonnet-4-6"
DEFAULT_REPLY_SELECTED_MODEL = DEFAULT_REPLY_GOOGLE_MODEL
DEFAULT_REPLY_USE_EMBEDDING_RULES = True
DEFAULT_REPLY_USE_SIMILAR_REVIEWS = True
```

### 6.5 Subscription Service (`subscription_service.py`)

**Purpose**: Subscription plan and feature management.

#### Key Functions:

##### `get_user_plan_map(cursor)`
- **Signature**: `(cursor: pyodbc.Cursor) -> dict[str, str]`
- **Purpose**: Map user_id to plan name
- **Returns**: Dictionary of user_id → plan_name

##### `set_user_subscription_plan(cursor, user_id, plan)`
- **Signature**: `(cursor, user_id, plan: str) -> None`
- **Purpose**: Set user's subscription plan

##### `increment_feature_usage(cursor, user_id, feature_key, amount)`
- **Signature**: `(cursor, user_id, feature_key, amount: int = 1) -> None`
- **Purpose**: Increment feature usage counter for user

##### `get_subscription_plans(cursor)`
- **Signature**: `(cursor: pyodbc.Cursor) -> List[SubscriptionPlan]`
- **Purpose**: Load all subscription plans with features

##### `upsert_subscription_plan(cursor, payload)`
- **Signature**: `(cursor, payload: SubscriptionPlanUpsertPayload) -> SubscriptionPlan`
- **Purpose**: Create or update subscription plan with features

### 6.6 Broadcasting Service (`broadcasting_service.py`)

**Purpose**: System message broadcasting.

#### Key Functions:

##### `create_broadcast(cursor, payload)`
- **Signature**: `(cursor, payload: BroadcastCreate) -> dict`
- **Purpose**: Create new broadcast (immediate or scheduled)

##### `get_recipient_ids(cursor, audience_type, audience_value)`
- **Signature**: `(cursor, audience_type, audience_value) -> List[str]`
- **Purpose**: Get recipient user IDs based on audience configuration
- **Audience Types**: all, role, plan

##### `create_notifications(cursor, recipient_ids, subject, body, message_type, timestamp)`
- **Signature**: `(cursor, recipient_ids, subject, body, message_type, timestamp) -> None`
- **Purpose**: Create notification records for all recipients

##### `estimate_recipients(cursor, audience_type, audience_value)`
- **Signature**: `(cursor, audience_type, audience_value) -> int`
- **Purpose**: Estimate broadcast recipient count

---

## 7. Utilities & Helpers

### DB Utils (`db_utils.py`)

Key utility functions used throughout the module:

| Function | Purpose |
|----------|---------|
| `execute_query(cursor, sql, params)` | Execute parameterized SQL safely |
| `get_connection_string()` | Get pyodbc connection string |
| `table_exists(cursor, table_name)` | Check if table exists via OBJECT_ID |
| `get_table_columns(cursor, table_name)` | Get column names set for a table |
| `pick_existing_column(columns, candidates)` | Pick first matching column from candidates |
| `is_valid_sql_identifier(name)` | Validate SQL identifier (prevents injection) |
| `count_scalar(cursor, query, params)` | Execute COUNT query |
| `growth(current, previous)` | Calculate growth percentage |
| `month_start(date)` | Get first day of month |
| `shift_month(date, offset)` | Add/subtract months from date |
| `to_datetime(value)` | Parse datetime from various formats |

---

## 8. Integrations with Other Modules

### Organization Module
- **Stats**: Calls `organization.services.admin_stats_service` for organization metrics
- **Data**: Direct queries to `organization`, `organization_type`, `tenant` tables

### User Module
- **Stats**: Calls `user.services.admin_stats_service` for user metrics
- **Data**: Direct queries to `user` table with dynamic column detection

### Reviews Module
- **Stats**: Calls `reviews.services.stats_service` for review metrics
- **Data**: Queries `processed_review` for activity feeds and trends

### Scheduler Module
- **Broadcasting**: Creates broadcasts that scheduler processes on schedule
- **Tables**: `broadcast_event` table read by scheduler's `process_pending_broadcasts()`

### Scraper Engine (Microservice)
- **Monitoring**: HTTP calls to scraping backend for stats and jobs
- **Table Management**: Creates/alters tables in scraper engine database
- **Endpoints**: 
  - `GET /api/v1/system/jobs` - Active jobs
  - `GET /api/v1/system/jobs/all` - All jobs
  - `GET /api/v1/sources` - Source list
  - `POST /api/tables/create` - Create dynamic table

### Auth Module
- **Roles**: Uses `ADMIN_ROLE_ID` and `TENANT_ROLE_ID` from `auth.constants.roles`
- **Password**: Uses `hash_password` from `app.core.security`

### Core Utilities
- **psutil**: Server CPU/RAM monitoring
- **pyodbc**: Direct database access
- **requests**: HTTP calls to Scraper Engine

---

## 9. Configuration & Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SCRAPING_BACKEND_URL` | `http://localhost:8001` | Scraper Engine base URL |
| `DB_DRIVER` | (required) | ODBC driver name |
| `DB_SERVER` | (required) | Database server |
| `DB_NAME` | (required) | Database name |
| `DB_UID` | (required) | Database username |
| `DB_PWD` | (required) | Database password |

---

## 10. Code Review: Flaws & Technical Debt

### Massive Service File
> [!WARNING]
> **Maintainability Risk**: `admin_service.py` is 700+ lines with mixed responsibilities
- **Risk**: Difficult to test, understand, and modify
- **Recommendation**: Split into `user_service.py`, `organization_service.py`, `legacy_fallback_service.py`

### Hardcoded Role IDs
Role inference uses hardcoded constants:
```python
ADMIN_ROLE_ID, TENANT_ROLE_ID
```
- **Risk**: Breaks if database role IDs change
- **Recommendation**: Query roles by name or use configuration

### Dynamic SQL Construction
Some queries build SQL dynamically with string formatting:
```python
f"INSERT INTO dbo.[user] ({field_sql}) VALUES ({placeholders})"
```
- **Mitigation**: Uses parameterized values, but structure is dynamic
- **Risk**: Harder to audit, potential for errors
- **Recommendation**: Use ORM or query builder where possible

### Fallback to Legacy Tables
Several functions fall back to `ProcessedReviews` or `reviews` tables:
- **Risk**: Masks schema migration issues
- **Recommendation**: Remove fallbacks after migration complete

### Table Creation in Scraper Backend
Admin module creates tables in Scraper Engine database:
- **Coupling**: Tight coupling between admin and scraper
- **Risk**: Scraper Engine must be running for platform creation
- **Recommendation**: Queue table creation as async task with retry

### Error Handling in Monitoring
Monitoring routes catch all exceptions and return 500:
```python
except Exception as exc:
    raise HTTPException(status_code=500, detail=f"Failed to...: {exc}")
```
- **Risk**: Exposes internal errors to frontend
- **Recommendation**: Log full exception, return sanitized message

### No Pagination
List endpoints return all records without pagination:
- **Risk**: Performance degradation with large datasets
- **Recommendation**: Add offset/limit parameters

---

## 11. Strategic Enhancements

### High Priority
1. **Add Pagination**: Implement for users and organizations endpoints
2. **Split Large Services**: Break `admin_service.py` into focused modules
3. **Sanitize Error Messages**: Don't expose internal errors to frontend

### Medium Priority
4. **Remove Legacy Fallbacks**: Clean up ProcessedReviews fallbacks after migration
5. **Role Configuration**: Make role IDs configurable instead of hardcoded
6. **Audit Logging**: Track admin actions (user creation, plan changes, etc.)
7. **Caching**: Cache dashboard stats with TTL to reduce database load

### Low Priority
8. **Bulk Operations**: Add endpoints for bulk user/org updates
9. **Export Functionality**: CSV/JSON export for users and organizations
10. **Health Checks**: Comprehensive health check endpoint
11. **Rate Limiting**: Protect admin endpoints from abuse
12. **Webhook Support**: Trigger webhooks on subscription changes

---

## Appendices

### A. Role and Plan Inference Logic

```python
# Role inference from role_id
if role_id == ADMIN_ROLE_ID:
    return "Admin"
return "User"

# Plan inference from verification flags
if is_email_verified and is_phone_verified:
    return "Pro"
return "Free"

# Role/Plan to flags conversion
if role == "Admin":
    return ADMIN_ROLE_ID, True, True  # role_id, email_verified, phone_verified
if plan in {"Pro", "Enterprise"}:
    return TENANT_ROLE_ID, True, True
return TENANT_ROLE_ID, False, False
```

### B. Quick Reference: Services

| Service | Key Functions | Purpose |
|---------|--------------|---------|
| `admin_service` | load_users, load_organizations, CRUD | User/org management |
| `dashboard_service` | build_dashboard_stats, build_* | Stats aggregation |
| `monitoring_service` | server_usage, scraping_*, platform_* | System monitoring |
| `system_settings_service` | get/set_setting, defaults | Configuration |
| `subscription_service` | plans, features, usage | Subscription management |
| `broadcasting_service` | create_broadcast, get_recipients | Message broadcast |

### C. Database Column Detection Pattern

The module uses dynamic column detection for schema compatibility:
```python
columns = get_table_columns(cursor, "user")
if "password_hash" in columns:
    insert_fields.append("password_hash")
if "is_active" in columns:
    insert_fields.append("is_active")
```

This allows the code to work with different schema versions gracefully.

### D. External API Contracts

#### Scraper Engine - Table Creation
```http
POST {SCRAPING_BACKEND_URL}/api/tables/create
{
  "table_name": "booking_reviews",
  "columns": [
    {"name": "review_id", "type": "UNIQUEIDENTIFIER", "nullable": false},
    {"name": "rating", "type": "INT", "nullable": false}
  ]
}
```

#### Scraper Engine - Jobs
```http
GET {SCRAPING_BACKEND_URL}/api/v1/system/jobs
GET {SCRAPING_BACKEND_URL}/api/v1/system/jobs/all
```

---

*Last Updated: 2026-04-12*  
*Module Version: Admin Module v1.0 (Complete Documentation)*
