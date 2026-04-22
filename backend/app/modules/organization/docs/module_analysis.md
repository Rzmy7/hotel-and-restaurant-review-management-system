# Module Analysis: Organization Module

## 1. Module Overview

### What
The Organization module manages multi-tenant organizational hierarchy within the hospitality review management platform. It provides CRUD operations for organizations, handles user-organization relationships with role-based access, manages onboarding workflows, and serves as the bridge between users and the business entities (hotels/restaurants) they operate on. It also includes source management capabilities for configuring review data sources (Booking.com, Agoda, Google Maps, TripAdvisor) at the organization level, and admin-facing statistics for system-wide organization metrics.

### Why
The module exists to solve multi-tenancy, data isolation, and organizational hierarchy needs. In the hospitality domain, a single user may belong to multiple organizations (e.g., a management company overseeing several hotels), each with its own set of review sources, themes, and configuration. The module enforces that users can only access data belonging to their affiliated organizations, supports hierarchical organization structures (parent/child), and provides onboarding flows for new users.

### When Triggered
- **User registration**: Automatically creates a default organization and links the user
- **Login/session creation**: Loads user's organization memberships for context
- **Dashboard loading**: Fetches organization list and active organization context
- **Source configuration**: Organization admins configure review sources
- **Onboarding**: New users complete or skip the onboarding flow
- **Admin dashboard**: System administrators view organization growth and adoption metrics

---

## 2. Architecture & Structure

### File Tree

```
backend/app/modules/organization/
├── models/
│   ├── __init__.py                              # Re-exports Organization, UserOrganization
│   └── org_models.py                            # SQLAlchemy ORM models (Organization, UserOrganization)
├── routes/
│   ├── __init__.py                              # (empty or re-exports)
│   ├── organization_routes.py                   # Core CRUD + admin endpoints (/api/organizations/*)
│   ├── onboarding_routes.py                     # Onboarding flow (/onboarding/skip)
│   ├── source_routes.py                         # Source CRUD per organization (/api/organizations/{id}/sources/*)
│   └── user_organization_routes.py              # User's organizations (/api/user/organizations)
├── schemas/
│   ├── __init__.py                              # (empty or re-exports)
│   ├── organization_schema.py                   # Pydantic models for org create/update/list
│   └── source_schema.py                         # Pydantic models for source configuration
├── services/
│   ├── __init__.py                              # (empty or re-exports)
│   ├── organization_service.py                  # Business logic for org CRUD, membership, auto-creation
│   └── admin_stats_service.py                   # Admin dashboard metrics (total orgs, growth)
└── docs/
    └── module_analysis.md                       # This document
```

### Responsibilities

| File | Responsibility |
|------|---------------|
| `models/org_models.py` | SQLAlchemy ORM definitions for `organization` and `user_organization` tables with relationships and constraints |
| `routes/organization_routes.py` | REST API for organization CRUD, user membership management, admin operations, and theme management |
| `routes/onboarding_routes.py` | Single endpoint to mark user onboarding as complete |
| `routes/source_routes.py` | Organization-scoped review source CRUD (enable/disable/configure data sources) |
| `routes/user_organization_routes.py` | Fetch all organizations the current user belongs to |
| `schemas/organization_schema.py` | Request/response validation models for organization operations |
| `schemas/source_schema.py` | Request/response validation models for source configuration |
| `services/organization_service.py` | Core business logic: create org, link user, ensure default source, membership management |
| `services/admin_stats_service.py` | System-wide organization metrics for admin dashboard (totals, growth rates) |

---

## 3. API Endpoints

### Organization CRUD & Admin

| Method | Path | Auth | Purpose | Request Body | Success Response |
|--------|------|------|---------|-------------|-----------------|
| `GET` | `/api/organizations` | JWT (authenticated) | List organizations the user has access to | None | `200` - `{"organizations": [OrganizationListResponse, ...]}` |
| `POST` | `/api/organizations` | JWT (authenticated) | Create a new organization with current user as owner | `OrganizationCreateRequest` | `201` - `{"id": str, "name": str, "message": str}` |
| `GET` | `/api/organizations/{org_id}` | JWT (authenticated) | Get a single organization by ID | None | `200` - `{"id": str, "name": str, "description": str, ...}` |
| `PUT` | `/api/organizations/{org_id}` | JWT (owner/admin) | Update organization details | `OrganizationUpdateRequest` | `200` - `{"id": str, "name": str, ...}` |
| `DELETE` | `/api/organizations/{org_id}` | JWT (owner only) | Delete an organization (cascades) | None | `200` - `{"message": "Organization deleted successfully"}` |

### User-Organization Membership

| Method | Path | Auth | Purpose | Request Body | Success Response |
|--------|------|------|---------|-------------|-----------------|
| `GET` | `/api/user/organizations` | JWT (authenticated) | Get all organizations the current user belongs to | None | `200` - `[{"organization_id": str, "organization_name": str, "organization_type": str, "role": str}, ...]` |
| `POST` | `/api/organizations/{org_id}/users` | JWT (owner/admin) | Add a user to an organization | `{"user_id": str, "role": str}` | `200` - `{"message": str}` |
| `DELETE` | `/api/organizations/{org_id}/users/{user_id}` | JWT (owner/admin) | Remove a user from an organization | None | `200` - `{"message": str}` |
| `PATCH` | `/api/organizations/{org_id}/users/{user_id}/role` | JWT (owner only) | Change a user's role within an organization | `{"role": str}` | `200` - `{"message": str}` |

### Admin Operations

| Method | Path | Auth | Purpose | Request Body | Success Response |
|--------|------|------|---------|-------------|-----------------|
| `POST` | `/api/admin/organizations/{org_id}/disable` | JWT (system admin) | Disable an organization | None | `200` - `{"message": str}` |
| `POST` | `/api/admin/organizations/{org_id}/enable` | JWT (system admin) | Re-enable a disabled organization | None | `200` - `{"message": str}` |
| `GET` | `/api/admin/organizations` | JWT (system admin) | List all organizations system-wide | Query: `page`, `limit`, `search`, `status` | `200` - `{"organizations": [...], "total": int, "page": int, "limit": int}` |

### Themes Management

| Method | Path | Auth | Purpose | Request Body | Success Response |
|--------|------|------|---------|-------------|-----------------|
| `GET` | `/api/organizations/{org_id}/themes` | JWT (authenticated) | List custom themes for an organization | None | `200` - `{"themes": [str, ...]}` |
| `POST` | `/api/organizations/{org_id}/themes` | JWT (owner/admin) | Add a custom theme to an organization | `{"name": str}` | `200` - `{"message": str}` |
| `DELETE` | `/api/organizations/{org_id}/themes/{theme_id}` | JWT (owner/admin) | Remove a custom theme | None | `200` - `{"message": str}` |

### Source Management

| Method | Path | Auth | Purpose | Request Body | Success Response |
|--------|------|------|---------|-------------|-----------------|
| `GET` | `/api/organizations/{org_id}/sources` | JWT (authenticated) | List sources for an organization | None | `200` - `{"sources": [SourceResponse, ...]}` |
| `POST` | `/api/organizations/{org_id}/sources` | JWT (owner/admin) | Add a new source to an organization | `SourceCreateRequest` | `201` - `{"id": int, "source_name": str, "source_type": str, ...}` |
| `PUT` | `/api/organizations/{org_id}/sources/{source_id}` | JWT (owner/admin) | Update a source configuration | `SourceUpdateRequest` | `200` - `{"id": int, "source_name": str, ...}` |
| `DELETE` | `/api/organizations/{org_id}/sources/{source_id}` | JWT (owner/admin) | Remove a source from an organization | None | `200` - `{"message": str}` |

### Onboarding

| Method | Path | Auth | Purpose | Request Body | Success Response |
|--------|------|------|---------|-------------|-----------------|
| `POST` | `/onboarding/skip` | JWT (authenticated) | Mark the current user's onboarding as completed | None | `200` - `{"message": "Skipped"}` |

---

## 4. Database Models & Tables

### `organization` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `organization_id` | `UNIQUEIDENTIFIER` | `PK`, `DEFAULT NEWID()` | Primary key |
| `organization_name` | `NVARCHAR(255)` | `NOT NULL` | Display name of the organization |
| `organization_type_id` | `INT` | `NULL`, `FK → organization_type.type_code` | Organization type (hotel, restaurant, etc.) |
| `description` | `NVARCHAR(MAX)` | `NULL` | Free-text description |
| `tenant_id` | `UNIQUEIDENTIFIER` | `NULL`, `FK → users.user_id` | Owning user (tenant); in this model, user_id == tenant_id |
| `is_active` | `BIT` | `DEFAULT 1` | Soft-delete/disable flag |
| `parent_organization_id` | `UNIQUEIDENTIFIER` | `NULL`, `FK → organization.organization_id` | Self-referencing FK for hierarchical org structure |
| `organization_code` | `NVARCHAR(50)` | `NULL` | Short code/identifier for the org |
| `created_at` | `DATETIME2` | `DEFAULT SYSDATETIME()` | Creation timestamp |
| `updated_at` | `DATETIME2` | `DEFAULT SYSDATETIME()` | Last update timestamp |

**Relationships:**
- **One-to-many**: `organization` → `user_organization` (members)
- **One-to-many**: `organization` → `sources` (review data sources)
- **Self-referencing**: `organization` → `organization` (parent/child hierarchy)
- **Belongs-to**: `organization` → `organization_type` (type classification)
- **Belongs-to**: `organization` → `users` (tenant owner)

### `user_organization` Table (Junction/Association)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `BIGINT` | `PK`, `IDENTITY` | Surrogate primary key |
| `user_id` | `UNIQUEIDENTIFIER` | `NOT NULL`, `FK → users.user_id` | User reference |
| `organization_id` | `UNIQUEIDENTIFIER` | `NOT NULL`, `FK → organization.organization_id` | Organization reference |
| `role` | `NVARCHAR(20)` | `DEFAULT 'member'` | Role within this organization: `owner`, `admin`, `member` |
| `joined_at` | `DATETIME2` | `DEFAULT SYSDATETIME()` | Membership creation timestamp |
| `updated_at` | `DATETIME2` | `DEFAULT SYSDATETIME()` | Last update timestamp |

**Unique Constraint:** `(user_id, organization_id)` — a user can only have one membership per organization.

**Relationships:**
- **Belongs-to**: `user_organization` → `users`
- **Belongs-to**: `user_organization` → `organization`

### SQLAlchemy ORM Models (`org_models.py`)

```python
class Organization(Base):
    __tablename__ = "organization"
    __table_args__ = {"schema": "dbo"}

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_name: Mapped[str] = mapped_column(String(255), nullable=False)
    organization_type_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("dbo.organization_type.type_code"))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    tenant_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("dbo.users.user_id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    parent_organization_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("dbo.organization.organization_id"))
    organization_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.sysdatetime())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.sysdatetime(), onupdate=func.sysdatetime())

    # Relationships
    users: Mapped[list["UserOrganization"]] = relationship("UserOrganization", back_populates="organization", cascade="all, delete-orphan")
    sources: Mapped[list["Source"]] = relationship("Source", back_populates="organization")


class UserOrganization(Base):
    __tablename__ = "user_organization"
    __table_args__ = {"schema": "dbo"}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("dbo.users.user_id"), nullable=False)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("dbo.organization.organization_id"), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="member")
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=func.sysdatetime())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.sysdatetime(), onupdate=func.sysdatetime())

    __table_args__ = (UniqueConstraint("user_id", "organization_id"), {"schema": "dbo"})

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="organization_memberships")
    organization: Mapped["Organization"] = relationship("Organization", back_populates="users")
```

---

## 5. Pydantic Schemas

### `organization_schema.py`

#### `OrganizationBase`
Base model with common organization fields.

| Field | Type | Default | Validation |
|-------|------|---------|------------|
| `name` | `str` | - | Max 255 chars |
| `organization_type_id` | `int \| None` | `None` | - |
| `description` | `str \| None` | `None` | - |
| `is_active` | `bool` | `True` | - |
| `organization_code` | `str \| None` | `None` | Max 50 chars |
| `parent_organization_id` | `UUID \| None` | `None` | - |

#### `OrganizationCreateRequest` (extends `OrganizationBase`)
Request body for creating a new organization. All fields inherited from `OrganizationBase`.

#### `OrganizationUpdateRequest`
Request body for updating an organization. All fields optional.

| Field | Type | Default | Validation |
|-------|------|---------|------------|
| `name` | `str \| None` | `None` | Max 255 chars, optional |
| `organization_type_id` | `int \| None` | `None` | Optional |
| `description` | `str \| None` | `None` | Optional |
| `is_active` | `bool \| None` | `None` | Optional |
| `organization_code` | `str \| None` | `None` | Max 50 chars, optional |
| `parent_organization_id` | `UUID \| None` | `None` | Optional |

#### `OrganizationResponse`
Response model for a single organization.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | `str` | - | UUID string of the organization |
| `name` | `str` | - | Organization name |
| `description` | `str \| None` | `None` | Description |
| `organization_type_id` | `int \| None` | `None` | Type ID |
| `is_active` | `bool` | - | Active status |
| `organization_code` | `str \| None` | `None` | Short code |
| `parent_organization_id` | `str \| None` | `None` | Parent org UUID string |
| `created_at` | `str \| None` | `None` | ISO timestamp |
| `updated_at` | `str \| None` | `None` | ISO timestamp |

#### `OrganizationListResponse`
Simplified model for listing organizations.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | `str` | - | UUID string |
| `name` | `str` | - | Organization name |
| `organization_type_id` | `int \| None` | `None` | Type ID |

### `source_schema.py`

#### `SourceCreateRequest`
Request body for creating a new source.

| Field | Type | Default | Validation |
|-------|------|---------|------------|
| `source_name` | `str` | - | Required, max 255 chars |
| `source_type` | `str` | - | Required, must be one of: `booking`, `agoda`, `google`, `tripadvisor` |
| `source_url` | `str \| None` | `None` | Valid URL format |
| `credentials` | `dict \| None` | `None` | Platform-specific auth credentials |
| `is_active` | `bool` | `True` | - |
| `scrape_schedule` | `str \| None` | `None` | Cron-like schedule expression |

#### `SourceUpdateRequest`
Request body for updating a source. All fields optional.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `source_name` | `str \| None` | `None` | Source display name |
| `source_type` | `str \| None` | `None` | Platform type |
| `source_url` | `str \| None` | `None` | Source URL |
| `credentials` | `dict \| None` | `None` | Auth credentials |
| `is_active` | `bool \| None` | `None` | Active status |
| `scrape_schedule` | `str \| None` | `None` | Schedule expression |

#### `SourceResponse`
Response model for a source.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | `int` | - | Source ID |
| `organization_id` | `str` | - | Owning organization UUID |
| `source_name` | `str` | - | Display name |
| `source_type` | `str` | - | Platform type |
| `source_url` | `str \| None` | `None` | URL |
| `is_active` | `bool` | - | Active status |
| `scrape_schedule` | `str \| None` | `None` | Schedule |
| `created_at` | `str \| None` | `None` | ISO timestamp |
| `updated_at` | `str \| None` | `None` | ISO timestamp |

---

## 6. Services

### `organization_service.py`

#### `_ensure_sources_table(cursor: pyodbc.Cursor) -> None`
**Purpose**: Ensures the `sources` table exists in the database. Creates it with the proper schema if it does not exist. This is a defensive migration utility that runs before source operations to prevent table-not-found errors.

**Returns**: `None` (side effect: creates table if missing)

**Table schema created**:
- `id` (INT IDENTITY PK)
- `organization_id` (UNIQUEIDENTIFIER FK)
- `source_name` (NVARCHAR)
- `source_type` (NVARCHAR)
- `source_url` (NVARCHAR, nullable)
- `credentials` (NVARCHAR(MAX) JSON, nullable)
- `is_active` (BIT DEFAULT 1)
- `scrape_schedule` (NVARCHAR(100), nullable)
- `created_at` (DATETIME2 DEFAULT SYSDATETIME)
- `updated_at` (DATETIME2 DEFAULT SYSDATETIME)

---

#### `_resolve_org_id(org_id: Any, db: Session) -> str`
**Purpose**: Resolves and validates an organization ID. Verifies the organization exists in the database and returns its string representation. Raises `HTTPException(404)` if the organization is not found.

**Parameters**:
- `org_id`: Any - The organization ID to resolve (accepts string, UUID, or int)
- `db`: Session - SQLAlchemy database session

**Returns**: `str` - The validated organization ID as a string

**Raises**: `HTTPException(404, "Organization not found")`

---

#### `_check_org_access(cursor: pyodbc.Cursor, org_id: str, user_id: str, allowed_roles: list[str] | None = None) -> bool`
**Purpose**: Checks whether a user has access to a specific organization with one of the allowed roles. If `allowed_roles` is None, defaults to checking for any membership.

**Parameters**:
- `cursor`: pyodbc.Cursor - Open database cursor
- `org_id`: str - Organization ID
- `user_id`: str - User ID
- `allowed_roles`: list[str] | None - List of acceptable roles

**Returns**: `bool` - True if user has access with an allowed role

---

#### `_get_user_org_role(cursor: pyodbc.Cursor, org_id: str, user_id: str) -> str | None`
**Purpose**: Retrieves the user's role within a specific organization.

**Parameters**:
- `cursor`: pyodbc.Cursor - Open database cursor
- `org_id`: str - Organization ID
- `user_id`: str - User ID

**Returns**: `str | None` - Role string (e.g., "owner", "admin", "member") or None if not a member

---

#### `_ensure_default_source_for_org(cursor: pyodbc.Cursor, org_id: str) -> None`
**Purpose**: Creates a default source for a newly created organization if no sources exist. This ensures every organization has at least one configurable data source out of the box.

**Parameters**:
- `cursor`: pyodbc.Cursor - Open database cursor
- `org_id`: str - Organization ID

**Returns**: `None` (side effect: inserts default source row)

---

#### `create_organization_with_owner(name: str, owner_user_id: str, db: Session, organization_type_id: int | None = None, **kwargs) -> dict`
**Purpose**: Creates a new organization and links the calling user as the owner. Automatically creates a `user_organization` membership record with role "owner". Also ensures a default source is created for the new organization.

**Parameters**:
- `name`: str - Organization name
- `owner_user_id`: str - User ID of the organization owner
- `db`: Session - SQLAlchemy session
- `organization_type_id`: int | None - Optional organization type
- `**kwargs`: Additional fields (description, organization_code, etc.)

**Returns**: `dict` - `{"id": str, "name": str, "message": str}`

---

#### `get_user_organizations(user_id: str, db: Session) -> list[dict]`
**Purpose**: Fetches all organizations the user is a member of, including their role in each.

**Parameters**:
- `user_id`: str - User ID
- `db`: Session - SQLAlchemy session

**Returns**: `list[dict]` - List of organization dicts with id, name, type, and role

---

#### `get_organization_detail(org_id: str, db: Session) -> dict | None`
**Purpose**: Fetches full details of a single organization by ID.

**Parameters**:
- `org_id`: str - Organization ID
- `db`: Session - SQLAlchemy session

**Returns**: `dict | None` - Organization detail dict or None if not found

---

#### `update_organization(org_id: str, updates: dict, db: Session) -> dict | None`
**Purpose**: Updates an organization's fields. Only the fields present in `updates` are modified (partial update). Updates the `updated_at` timestamp automatically.

**Parameters**:
- `org_id`: str - Organization ID
- `updates`: dict - Field names and values to update
- `db`: Session - SQLAlchemy session

**Returns**: `dict | None` - Updated organization dict or None if not found

---

#### `delete_organization(org_id: str, db: Session) -> bool`
**Purpose**: Soft-deletes an organization by setting `is_active = 0`. Does not cascade delete related records (sources, memberships) — they remain for audit purposes.

**Parameters**:
- `org_id`: str - Organization ID
- `db`: Session - SQLAlchemy session

**Returns**: `bool` - True if organization was found and deactivated

---

#### `add_user_to_organization(org_id: str, user_id: str, role: str, db: Session) -> dict`
**Purpose**: Adds a user to an organization with the specified role. Creates a `user_organization` record.

**Parameters**:
- `org_id`: str - Organization ID
- `user_id`: str - User ID
- `role`: str - Role to assign ("member", "admin", "owner")
- `db`: Session - SQLAlchemy session

**Returns**: `dict` - `{"message": str}`

---

#### `remove_user_from_organization(org_id: str, user_id: str, db: Session) -> bool`
**Purpose**: Removes a user's membership from an organization.

**Parameters**:
- `org_id`: str - Organization ID
- `user_id`: str - User ID
- `db`: Session - SQLAlchemy session

**Returns**: `bool` - True if membership was found and removed

---

#### `update_user_role(org_id: str, user_id: str, new_role: str, db: Session) -> bool`
**Purpose**: Updates a user's role within an organization.

**Parameters**:
- `org_id`: str - Organization ID
- `user_id`: str - User ID
- `new_role`: str - New role to assign
- `db`: Session - SQLAlchemy session

**Returns**: `bool` - True if membership was found and role updated

---

### `admin_stats_service.py`

#### `get_total_organizations(cursor: pyodbc.Cursor) -> tuple[int, float]`
**Purpose**: Returns the total number of organizations in the system and the month-over-month growth percentage.

**Parameters**:
- `cursor`: pyodbc.Cursor - Open pyodbc cursor

**Returns**: `tuple[int, float]` - `(total_count, growth_percentage)`

**Logic**:
- Queries `COUNT(*) FROM dbo.organization` for total
- Compares current month's new org count vs previous month's
- Uses `growth()` utility: if previous = 0 and current > 0, returns 100.0%
- Falls back to `(0, 0.0)` if table does not exist

---

#### `get_organizations_added_today(cursor: pyodbc.Cursor) -> tuple[int, float]`
**Purpose**: Returns the number of organizations created today and the growth percentage compared to yesterday.

**Parameters**:
- `cursor`: pyodbc.Cursor - Open pyodbc cursor

**Returns**: `tuple[int, float]` - `(count_today, growth_vs_yesterday_pct)`

**Logic**:
- Counts orgs where `CAST(created_at AS date) = today`
- Compares against yesterday's count
- Falls back to `(0, 0.0)` if table does not exist

---

## 7. Utilities & Helpers

### `_ensure_sources_table(cursor)`
A defensive auto-migration utility. Before any source operation, it checks `INFORMATION_SCHEMA.TABLES` for the existence of the `sources` table and creates it with the proper schema if missing. This handles scenarios where the table was not created by initial migrations.

### `_resolve_org_id(org_id, db)`
Normalizes organization ID input (which may come as string, UUID, or int) into a validated string. Performs a database lookup to confirm the organization exists. Returns the string ID or raises a 404.

### `_check_org_access(cursor, org_id, user_id, allowed_roles)`
Authorization guard that checks the `user_organization` junction table for a matching `(user_id, organization_id)` pair with a role in `allowed_roles`. Used by routes to enforce that users can only perform operations on organizations they belong to with sufficient privileges.

### `_get_user_org_role(cursor, org_id, user_id)`
Helper to extract the exact role string for a user-organization pair. Used by routes to determine permission levels (e.g., only "owner" can delete).

### `_ensure_default_source_for_org(cursor, org_id)`
Post-creation hook that seeds a new organization with a default source entry. Prevents the "empty state" problem where a new org has no data sources configured.

### `admin_stats_service` utilities (from `app.core.db_utils` and `app.modules.admin.db_utils`)
- `table_exists(cursor, table_name)` - Checks `INFORMATION_SCHEMA.TABLES`
- `count_scalar(cursor, query, params)` - Executes COUNT query, returns int
- `month_start(date)` - Returns first day of the month
- `shift_month(date, delta)` - Shifts date by N months
- `growth(current, previous)` - Calculates percentage growth: `((current - previous) / previous) * 100`, with zero-division handling

---

## 8. Integrations with Other Modules

### Auth Module (`app.modules.auth`)
- **`get_current_user`** dependency from `app.modules.auth.utils.auth_utils` is used on **all** organization endpoints for JWT validation and user extraction
- **User model**: `tenant_id` on `organization` references `users.user_id`; `user_organization.user_id` references `users.user_id`
- **Role system**: Organization roles (`owner`, `admin`, `member`) work alongside the auth module's system-level roles (`system_admin`, etc.)
- **Signup flow**: The auth module's signup endpoint (`app.modules.auth.routes.signup`) calls `organization_service.create_organization_with_owner` to auto-create a default organization for new users

### Source Module (`app.modules.source`)
- **Data flow**: Organization sources drive the review scraping pipeline. Each source record tells the scraper engine what to scrape for which organization
- **Shared tables**: The `sources` table is managed by the organization module but consumed by the reviews and scheduler modules
- **Scrape scheduling**: The `scrape_schedule` field on sources is read by the APScheduler module to trigger periodic scraping jobs

### Reviews Module (`app.modules.reviews`)
- **Data isolation**: Reviews are scoped to organizations via the `sources` table. When querying reviews, the organization module's `_check_org_access` ensures users only see reviews from their organization's sources
- **Sentiment analysis**: Reviews fetched through organization sources are processed by the reviews module's Gemini-powered sentiment pipeline

### Competitors Module (`app.modules.competitors`)
- **Parallel structure**: Competitors use a similar multi-tenant pattern but with a simpler tracking model (user-level competitor tracking vs. organization-level source management)
- **Shared UI patterns**: Both modules use similar CRUD patterns and admin statistics

### Admin Module (`app.modules.admin`)
- **Admin stats**: `admin_stats_service.py` is consumed by the admin dashboard endpoints (`app.modules.admin.routes`) to populate system-wide organization metrics (total count, growth rates)
- **Shared db utilities**: Both modules use utilities from `app.modules.admin.db_utils` and `app.core.db_utils` for raw pyodbc operations

### Scheduler Module (`app.modules.scheduler`)
- **Background jobs**: The scheduler reads `scrape_schedule` from organization sources to trigger automated scraping
- **Organization-scoped tasks**: Background jobs are organized by organization, with each org's sources scraped independently

---

## 9. Configuration & Environment Variables

### Required Environment Variables

| Variable | Type | Description | Used By |
|----------|------|-------------|---------|
| `DB_DRIVER` | string | ODBC driver name (default: "ODBC Driver 17 for SQL Server") | `db_utils.py` |
| `DB_SERVER` | string | SQL Server hostname/address | `db_utils.py` |
| `DB_NAME` | string | Database name | `db_utils.py` |
| `DB_UID` | string | Database username | `db_utils.py` |
| `DB_PWD` | string | Database password | `db_utils.py` |

### Implicit Dependencies

- **ODBC Driver**: Must have "ODBC Driver 17 for SQL Server" or "ODBC Driver 18 for SQL Server" installed
- **SQLAlchemy**: Uses `app.database.session.get_db` for ORM operations
- **pyodbc**: Used directly for raw SQL queries in services and admin stats
- **python-dotenv**: `load_dotenv()` called in `db_utils.py` to load `.env` file

### No Module-Specific Environment Variables

The organization module does not define its own `.env` variables. It relies on the global database configuration shared across the backend.

---

## 10. Code Review: Flaws & Technical Debt

### Critical Issues

1. **Mixed ORM and Raw SQL**: The module uses both SQLAlchemy ORM (for CRUD operations in `organization_service.py`) and raw pyodbc queries (in `admin_stats_service.py` and authorization checks). This creates inconsistency and potential for transaction isolation issues since ORM sessions and raw connections do not share transaction context.

2. **No Cascading Deletes on Soft Delete**: `delete_organization` sets `is_active = 0` but does not deactivate related sources or user memberships. This leaves orphaned active records that could cause confusion or data leaks if queries do not filter by `is_active`.

3. **Hardcoded Role Strings**: Role values (`"owner"`, `"admin"`, `"member"`) are used as string literals throughout the codebase without an enum or constant definition. This is error-prone and makes refactoring difficult.

4. **`user_organization_routes.py` Hardcodes Role as "owner"**: The `/api/user/organizations` endpoint returns `"role": "owner"` for every organization, ignoring the actual role stored in `user_organization.role`. This is factually incorrect for users who are members or admins.

### Moderate Issues

5. **No Organization Type Validation**: `organization_type_id` is a foreign key to `organization_type.type_code`, but there is no validation in the create/update service functions to ensure the type exists before assignment.

6. **`_ensure_sources_table` is a Code Smell**: The need for a runtime table existence check indicates missing or incomplete database migrations. Production systems should have explicit migration scripts, not conditional table creation.

7. **`admin_stats_service` Uses `CAST(created_at AS datetime2)`**: Repeated casting in WHERE clauses prevents index usage on `created_at`. If this column is not already indexed, these queries will perform table scans on large datasets.

8. **No Pagination on List Endpoints**: `GET /api/organizations` and `GET /api/user/organizations` return all results without pagination. As the number of organizations grows, this will cause performance degradation.

9. **Error Handling in `admin_stats_service` Relies on Table Existence Check**: The service checks `table_exists` before querying, but this does not handle other failure modes (connection loss, permission errors, corrupted data).

### Minor Issues

10. **`onboarding_routes.py` Only Has Skip Endpoint**: There is no endpoint for actually completing onboarding (only skipping it). The onboarding flow appears incomplete.

11. **`organization_schema.py` Uses Both `OrganizationBase` and Flat Models**: The inheritance hierarchy exists but `OrganizationCreateRequest` simply inherits all fields from `OrganizationBase` without adding anything, making the base class redundant.

12. **No Audit Logging**: Organization create, update, delete, and membership changes are not logged to the `audit_log` table. This is a compliance and debugging gap.

13. **Duplicate `get_db` Imports**: Routes import `get_db` from different paths (`app.database` vs `app.database.session`), which may or may not resolve to the same dependency depending on project configuration.

---

## 11. Strategic Enhancements

### High Priority

1. **Implement Pagination and Filtering**: Add `page`, `limit`, `search`, and `sort` query parameters to all list endpoints. Use cursor-based pagination for large datasets.

2. **Define Role Enum**: Replace hardcoded role strings with a Python `Enum` and a database `CHECK` constraint. Add a middleware or dependency that validates role values at the API boundary.

3. **Fix User Organization Role Reporting**: Update `/api/user/organizations` to return the actual role from `user_organization.role` instead of hardcoding `"owner"`.

4. **Add Database Indexes**: Create indexes on `organization(created_at)`, `user_organization(user_id, organization_id)`, and `organization(tenant_id)` to support the most common query patterns.

5. **Implement Audit Trail**: Log all organization mutations (create, update, delete, membership changes) to the `audit_log` table with user ID, timestamp, action type, and before/after values.

### Medium Priority

6. **Migrate `_ensure_sources_table` to Alembic**: Replace runtime table creation with a proper Alembic migration. This ensures consistent schema across all environments and removes the need for defensive checks.

7. **Add Organization Type Validation**: Validate `organization_type_id` against the `organization_type` table before insert/update. Return a 400 error with a clear message if the type does not exist.

8. **Implement Cascading Soft Deletes**: When an organization is deactivated, also deactivate all its sources. Consider a `deleted_at` timestamp column instead of (or in addition to) `is_active` for auditability.

9. **Add Rate Limiting**: Implement rate limiting on organization create/delete endpoints to prevent abuse. Use FastAPI's `SlowAPI` or a custom middleware.

10. **Add Organization-Level Permissions**: Implement a permission system within organizations (e.g., "can_manage_sources", "can_view_reviews") rather than relying solely on roles.

### Low Priority

11. **Complete Onboarding Flow**: Add endpoints for tracking onboarding step completion, storing user preferences, and providing guided setup for new organizations.

12. **Add Organization Logo and Branding Fields**: Support `logo_url`, `brand_color`, and `timezone` fields on the organization model for multi-brand white-labeling.

13. **Implement Organization Webhooks**: Allow organizations to register webhook URLs for real-time notifications when new reviews are scraped or sentiment scores are calculated.

14. **Add Organization Activity Feed**: Expose an endpoint that returns a chronological feed of recent activity (reviews scraped, sources added, members joined) for the organization dashboard.

---

## Appendices

### Appendix A: Role Hierarchy

```
System Admin (auth module)
  └─ Can manage all organizations system-wide
     └─ Organization Owner
          └─ Can delete org, manage members, configure sources
             └─ Organization Admin
                  └─ Can manage sources, view all data
                     └─ Organization Member
                          └─ Can view org data, configured sources
```

### Appendix B: API Response Envelope

All endpoints return plain JSON objects (no standard envelope). Error responses follow the FastAPI default format:

```json
{
  "detail": "Error message string"
}
```

### Appendix C: Organization Type Reference

| type_code | type_name | Description |
|-----------|-----------|-------------|
| (defined in `organization_type` table) | hotel | Hotel property |
| (defined in `organization_type` table) | restaurant | Restaurant property |
| (defined in `organization_type` table) | management_company | Multi-property management company |

*Note: Actual type codes are defined by seed data in the `organization_type` table, not enforced by the organization module code.*

### Appendix D: Quick Reference - Key Functions by Use Case

| Use Case | Function | File |
|----------|----------|------|
| Create org with owner | `create_organization_with_owner()` | `organization_service.py` |
| List user's orgs | `get_user_organizations()` | `organization_service.py` |
| Get org details | `get_organization_detail()` | `organization_service.py` |
| Update org | `update_organization()` | `organization_service.py` |
| Delete org | `delete_organization()` | `organization_service.py` |
| Add user to org | `add_user_to_organization()` | `organization_service.py` |
| Remove user from org | `remove_user_from_organization()` | `organization_service.py` |
| Change user role | `update_user_role()` | `organization_service.py` |
| Check org access | `_check_org_access()` | `organization_service.py` |
| Get user's role | `_get_user_org_role()` | `organization_service.py` |
| Admin: total orgs | `get_total_organizations()` | `admin_stats_service.py` |
| Admin: orgs today | `get_organizations_added_today()` | `admin_stats_service.py` |

### Appendix E: Database Relationships Diagram (Text)

```
users (1) ────< user_organization (N) >──── (1) organization
                                                   ├───> organization_type
                                                   ├───< sources (N)
                                                   └───< organization (self-ref, children)
```

### Appendix F: Security Considerations

- **JWT Required**: All endpoints require a valid JWT token via `get_current_user` dependency
- **Role-Based Access**: Operations are gated by `_check_org_access()` with role allowlists
- **Soft Deletes**: Organizations are deactivated, not hard-deleted, for auditability
- **No Multi-Tenant Data Leaks**: All queries filter by `organization_id` and verify user membership
- **SQL Injection**: Raw pyodbc queries use parameterized queries (`?` placeholders), preventing injection
- **Owner-Only Operations**: Delete org and role changes require `owner` role specifically
