# Module Analysis: User Module

## 1. Module Overview

### What & Why
The `user` module manages individual user account data, profile information, and user-specific administrative statistics. It provides the data layer for user identity beyond authentication, handling profile CRUD operations, profile image uploads, and user metrics for the admin dashboard.

It exists to:
- **Manage Profiles**: Store and update user profile information (name, contact, bio, location)
- **Handle Avatars**: Upload and manage profile images via Supabase storage
- **Provide Metrics**: Calculate user-specific statistics for admin dashboards
- **Support Tenancy**: Manage user plan/subscription assignments

### When
The module's logic is triggered under these conditions:
1. **Profile Access**: When users view or edit their profile information
2. **Image Upload**: When users upload or change their profile picture
3. **Admin Dashboard**: When system-wide user metrics are requested
4. **Plan Management**: When users or admins update subscription plans

---

## 2. Architecture & Structure

### File Tree
```
user/
├── __init__.py                         # Module initialization
├── models/
│   └── user_models.py                  # SQLAlchemy User ORM model
├── schemas/
│   ├── user_schema.py                  # Signup/Login/UserResponse schemas
│   └── profile_schema.py               # Profile response/update schemas
├── repositories/
│   └── users_repo.py                   # User data access layer
├── routes/
│   ├── user_routes.py                  # Tenant/plan management routes
│   └── profile_routes.py               # Profile CRUD routes
└── services/
    ├── profile_service.py              # Profile operations and image upload
    └── admin_stats_service.py          # User metrics for admin dashboard
```

### Module Responsibilities
| File | Purpose |
|------|---------|
| `models/user_models.py` | Defines User ORM model with all profile fields and relationships |
| `schemas/user_schema.py` | Authentication-related request/response schemas |
| `schemas/profile_schema.py` | Profile-specific response and update schemas |
| `repositories/users_repo.py` | Low-level user CRUD operations |
| `routes/user_routes.py` | Plan/subscription management endpoints |
| `routes/profile_routes.py` | Profile CRUD and image upload endpoints |
| `services/profile_service.py` | Profile business logic and Supabase integration |
| `services/admin_stats_service.py` | User metrics aggregation for admin dashboard |

---

## 3. API Endpoints

### 3.1 Profile Routes (`profile_routes.py`)

**Base Path**: `/users` (prefix defined in router)

| # | Method | Path | Auth | Purpose | Request Body | Success Response |
|---|--------|------|------|---------|-------------|-----------------|
| 1 | GET | `/users/me` | JWT (get_current_user) | Get current user's profile | None | `ProfileResponse` object |
| 2 | PUT | `/users/me` | JWT (get_current_user) | Update current user's profile | `ProfileUpdate` | Updated profile data |
| 3 | POST | `/users/me/upload-image` | JWT (get_current_user) | Upload profile image to Supabase | Multipart file (image) | `{"message", "profile_image_url"}` |

### 3.2 User Routes (`user_routes.py`)

**Base Path**: `/api` (prefix defined in router)

| # | Method | Path | Auth | Purpose | Request Body | Success Response |
|---|--------|------|------|---------|-------------|-----------------|
| 4 | PUT | `/api/tenant/plan` | JWT (get_current_user) | Update user's subscription plan | `UpdatePlanRequest` with `plan_id` | `{"message", "plan_id"}` |

---

## 4. Database Models & Tables

### Table: `user`
Central user account entity with comprehensive profile fields.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `user_id` | UNIQUEIDENTIFIER | PK | `uuid.uuid4()` | Unique user identifier |
| `email` | NVARCHAR(255) | UNIQUE, NOT NULL | -- | User's email address (login identifier) |
| `password_hash` | NVARCHAR(255) | Nullable | NULL | Bcrypt password hash (NULL for OAuth users) |
| `first_name` | NVARCHAR(100) | Nullable | NULL | User's first name |
| `last_name` | NVARCHAR(100) | Nullable | NULL | User's last name |
| `phone` | NVARCHAR(30) | Nullable | NULL | Contact phone number |
| `job_title` | NVARCHAR(200) | Nullable | NULL | User's job title/position |
| `bio` | NVARCHAR(1000) | Nullable | NULL | Short biography/about text |
| `location` | NVARCHAR(200) | Nullable | NULL | Geographic location |
| `profile_image_url` | NVARCHAR(500) | Nullable | NULL | URL to profile image (Supabase storage) |
| `google_id` | NVARCHAR(MAX) | Nullable | NULL | Google OAuth identifier |
| `is_active` | BIT | NOT NULL | `1` (true) | Account active status |
| `is_email_verified` | BIT | NOT NULL | `0` (false) | Email verification status |
| `is_phone_verified` | BIT | NOT NULL | `0` (false) | Phone verification status |
| `last_login_at` | DATETIME (timezone) | Nullable | NULL | Timestamp of last successful login |
| `created_at` | DATETIME (timezone) | NOT NULL | `SYSUTCDATETIME()` | Account creation timestamp |
| `updated_at` | DATETIME (timezone) | NOT NULL | `SYSUTCDATETIME()`, updates on change | Last profile update timestamp |
| `role_id` | INT | FK → `role.role_id`, NOT NULL | -- | User's primary role |

**Computed Property**:
- `full_name`: Returns concatenated first and last name (or empty string if both null)

**Relationships**:
- `role`: Role (back_populates)
- `sessions`: List[Session] (cascade: all, delete-orphan)
- `password_reset_tokens`: List[PasswordResetToken] (cascade: all, delete-orphan)
- `notifications`: List[UserNotification] (cascade: all, delete-orphan)

**Indexes**:
- Unique index on `email`

---

## 5. Pydantic Schemas

### 5.1 User Schemas (`user_schema.py`)

#### `SignupRequest`
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `name` | str | Required | Full name (will be split into first/last) |
| `email` | EmailStr | Required | User's email address |
| `password` | str | Required | Plain text password |

#### `LoginRequest`
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `email` | EmailStr | Required | User's email address |
| `password` | str | Required | Plain text password |

#### `UserResponse`
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `user_id` | str | -- | User's unique identifier |
| `email` | EmailStr | -- | User's email address |
| `first_name` | str or None | None | User's first name |
| `last_name` | str or None | None | User's last name |
| `role` | str or None | None | User's primary role name |

**Config**: `from_attributes = True` (enables ORM mode)

### 5.2 Profile Schemas (`profile_schema.py`)

#### `ProfileResponse`
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `firstName` | str or None | None | User's first name |
| `lastName` | str or None | None | User's last name |
| `email` | str | -- | User's email address (required) |
| `phone` | str or None | None | Phone number |
| `jobTitle` | str or None | None | Job title/position |
| `bio` | str or None | None | Biography text |
| `location` | str or None | None | Geographic location |
| `avatar` | str or None | None | Profile image URL |
| `joinedDate` | str or None | None | Account creation date (stringified) |

#### `ProfileUpdate`
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `firstName` | str or None | None | New first name |
| `lastName` | str or None | None | New last name |
| `phone` | str or None | None | New phone number |
| `jobTitle` | str or None | None | New job title |
| `bio` | str or None | None | New biography text |
| `location` | str or None | None | New location |

**Note**: All fields optional - only provided fields will be updated.

### 5.3 Route-Specific Schemas

#### `UpdatePlanRequest` (defined inline in `user_routes.py`)
| Field | Type | Description |
|-------|------|-------------|
| `plan_id` | str | New plan identifier |

---

## 6. Services

### 6.1 Profile Service (`profile_service.py`)

**Purpose**: User profile management and Supabase image upload.

#### `get_profile(db, user_id)`
- **Signature**: `(db: Session, user_id) -> dict`
- **Purpose**: Fetch and format user profile data
- **Flow**:
  1. Query user from database via `get_user_profile()`
  2. Format response with camelCase field names
  3. Convert `created_at` to string for `joinedDate`
- **Returns**: Dictionary matching `ProfileResponse` schema structure
- **Field Mapping**:
  - `first_name` → `firstName`
  - `last_name` → `lastName`
  - `profile_image_url` → `avatar`
  - `created_at` → `joinedDate`

#### `update_profile(db, user_id, data)`
- **Signature**: `(db: Session, user_id, data: ProfileUpdate) -> User`
- **Purpose**: Update user profile fields
- **Flow**:
  1. Fetch user from database
  2. Call `update_user_profile()` with provided fields
  3. Only updates non-None fields (partial update)
  4. Commits and refreshes
- **Returns**: Updated User object
- **Validation**: Relies on Pydantic schema validation in route layer

#### `upload_profile_image(db, user_id, file)`
- **Signature**: `(db: Session, user_id, file: UploadFile) -> dict`
- **Purpose**: Upload profile image to Supabase storage and save URL
- **Flow**:
  1. Validate image using `validate_image(file)` from `app.core.validators`
  2. Generate unique filename: `profile/{uuid4()}.{ext}`
  3. Upload to Supabase bucket (from `SUPABASE_BUCKET` env var)
  4. Get public URL from Supabase
  5. Update user's `profile_image_url` in database
  6. Commit and refresh
- **Validation**:
  - File type must be image (via `validate_image`)
  - Raises `FileValidationException` on invalid file
- **Supabase Integration**:
  - Uses `supabase.storage.from_(BUCKET_NAME).upload()`
  - Sets `content-type` and `upsert: true` options
  - Gets public URL via `get_public_url()`
- **Error Handling**: Raises Exception on Supabase upload failure
- **Returns**: `{"message", "profile_image_url"}`

### 6.2 Admin Stats Service (`admin_stats_service.py`)

**Purpose**: User metrics aggregation for admin dashboard.

#### `get_total_users(cursor)`
- **Signature**: `(cursor: pyodbc.Cursor) -> tuple[int, float]`
- **Purpose**: Get total user count and month-over-month growth percentage
- **Flow**:
  1. Check if `user` table exists (fallback if not)
  2. Count total users
  3. Count current month registrations
  4. Count previous month registrations
  5. Calculate growth percentage: `(current - previous) / previous * 100`
- **Returns**: `(total_count, growth_percentage)`
- **Fallback**: `(0, 0.0)` if table doesn't exist
- **Date Calculations**: Uses helper functions from `app.core.db_utils`:
  - `month_start(date)`: Get first day of month
  - `shift_month(date, offset)`: Add/subtract months
  - `count_scalar(cursor, query, params)`: Execute count query
  - `growth(current, previous)`: Calculate growth percentage

#### `get_active_users_today(cursor)`
- **Signature**: `(cursor: pyodbc.Cursor) -> int`
- **Purpose**: Count users who logged in today
- **Query**:
  ```sql
  SELECT COUNT(*) FROM dbo.[user]
  WHERE is_active = 1
    AND CAST(last_login_at AS date) = CAST(GETDATE() AS date)
  ```
- **Returns**: Count of active users with today's login
- **Fallback**: `0` if table doesn't exist

---

## 7. Repositories

### User Repository (`users_repo.py`)

**Purpose**: Low-level database operations for users.

#### `get_user_by_email(db, email)`
- **Signature**: `(db: Session, email: str) -> User | None`
- **Purpose**: Fetch user by email address
- **Returns**: User object or None

#### `get_user_by_id(db, user_id)`
- **Signature**: `(db: Session, user_id) -> User | None`
- **Purpose**: Fetch user by ID
- **Returns**: User object or None

#### `create_user(db, email, ...)`
- **Signature**: 
  ```python
  (db: Session, email: str, password_hash: str | None = None,
   first_name: str | None = None, last_name: str | None = None,
   phone: str | None = None, job_title: str | None = None,
   bio: str | None = None, location: str | None = None,
   profile_image_url: str | None = None, google_id: str | None = None,
   is_email_verified: bool = False) -> User
  ```
- **Purpose**: Create new user with default role assignment
- **Flow**:
  1. Query for default role (`TENANT` from `auth.constants.roles`)
  2. Raise `ValueError` if default role not found (critical error)
  3. Create User with all provided fields
  4. Set `role_id` to default role's ID
  5. Commit and refresh
- **Validation**: Requires `TENANT` role to exist in database
- **Returns**: Created User object
- **Raises**: `ValueError` if default role missing

#### `get_user_profile(db, user_id)`
- **Signature**: `(db: Session, user_id) -> User | None`
- **Purpose**: Fetch full user profile by ID
- **Returns**: User object or None

#### `update_user_profile(db, user, ...)`
- **Signature**:
  ```python
  (db: Session, user: User, first_name: str | None = None,
   last_name: str | None = None, phone: str | None = None,
   job_title: str | None = None, bio: str | None = None,
   location: str | None = None, profile_image_url: str | None = None) -> User
  ```
- **Purpose**: Update user profile fields (partial update)
- **Flow**:
  1. For each non-None parameter, update corresponding user field
  2. Commit changes
  3. Refresh user object
- **Pattern**: Only updates provided fields (None = skip)
- **Returns**: Updated User object

---

## 8. Utilities & Helpers

### File Validation
**Import**: `from app.core.validators.file_validator import validate_image`

- `validate_image(file: UploadFile) -> bytes`: Validates file type and size, returns file bytes
- Raises `ValueError` on invalid file

### Custom Exceptions
**Import**: `from app.core.exceptions.custom_exceptions import FileValidationException`

- `FileValidationException`: Raised when file validation fails

### Supabase Client
**Import**: `from app.core.superbase_client import supabase`

- Pre-configured Supabase client for storage operations
- Uses `SUPABASE_BUCKET` environment variable for bucket name

### Role Constants
**Import**: `from app.modules.auth.constants.roles import TENANT`

- `TENANT = "TENANT"`: Default role for new users

---

## 9. Integrations with Other Modules

### Auth Module
- **User Model**: Imports `User` and `Role` from `app.modules.auth.models` (cross-module model sharing)
- **Authentication**: All routes use `get_current_user` from `app.modules.auth.utils.auth_utils`
- **Role Constants**: Uses `TENANT` from `app.modules.auth.constants.roles`
- **Relationships**: User has relationships to Session, PasswordResetToken, UserNotification (all in auth module)

### Admin Module
- **Stats Service**: `admin_stats_service.py` consumed by admin dashboard for user metrics
- **Plan Management**: `update_tenant_plan` route updates subscription plan in `tenant` table

### Core Utilities
- **Database**: Uses `app.database.session.get_db` for SQLAlchemy sessions
- **PyODBC Helpers**: Uses `app.core.db_utils` functions (count_scalar, growth, month_start, shift_month, table_exists)
- **File Handling**: Uses `app.core.validators.file_validator` and `app.core.exceptions.custom_exceptions`
- **Supabase**: Uses `app.core.superbase_client` for storage operations

---

## 10. Configuration & Environment Variables

### Environment Variables

| Variable | Required | Description | Used In |
|----------|----------|-------------|---------|
| `SUPABASE_BUCKET` | Yes | Supabase storage bucket name for profile images | `profile_service.py` |
| `SUPABASE_URL` | Yes | Supabase project URL | `superbase_client.py` |
| `SUPABASE_KEY` | Yes | Supabase anon/public key | `superbase_client.py` |

### Implicit Configuration
- **Database Connection**: SQLAlchemy session via `get_db` dependency
- **File Validation**: Default image size/type limits in `app.core.validators.file_validator`

---

## 11. Code Review: Flaws & Technical Debt

### Cross-Module Model Import
> [!WARNING]
> **Architecture Concern**: User model is defined in `user/models/user_models.py` but imported from `app.modules.auth.models`.
- **Location**: `users_repo.py` line 2, `auth_routes.py` imports User
- **Risk**: Creates confusion about module ownership and can lead to circular imports
- **Recommendation**: Define User model in one place (preferably `user/models`) and import everywhere else

### Inconsistent Response Formatting
Profile service manually formats response with camelCase:
```python
{
    "firstName": user.first_name,
    "lastName": user.last_name,
    ...
}
```
- **Risk**: Bypasses Pydantic validation, inconsistent with other endpoints
- **Recommendation**: Use `ProfileResponse` Pydantic model with `from_orm()` instead

### Profile Image Upload Error Handling
`upload_profile_image` raises generic `Exception` on Supabase errors:
```python
if hasattr(response, "error") and response.error:
    raise Exception(str(response.error))
```
- **Risk**: Returns 500 Internal Server Error without proper logging
- **Recommendation**: Raise specific HTTPException with logged error details

### Plan Update Endpoint Location
`PUT /api/tenant/plan` is defined in user module but updates `tenant` table:
- **Concern**: Blurs line between user and organization/tenant management
- **Better Location**: Could belong in organization or admin module
- **Current Justification**: User updates their own tenant plan (self-service)

### No Profile Image Validation on Update
Profile update endpoint doesn't validate `profile_image_url` format:
- **Risk**: Could store invalid URLs
- **Current Mitigation**: Only set via `upload_profile_image` which validates
- **Recommendation**: Add URL format validation if direct URL updates allowed

### Missing Profile Image Deletion
No endpoint to remove profile image:
- **Gap**: Users can upload but not delete avatar
- **Recommendation**: Add `DELETE /users/me/upload-image` endpoint

### Date Stringification
`joinedDate` is converted to string via `str(user.created_at)`:
- **Issue**: Loses timezone information, format inconsistent
- **Recommendation**: Use ISO 8601 format: `user.created_at.isoformat()`

### Admin Stats Service Uses Raw SQL
`admin_stats_service.py` uses pyodbc cursors while other parts use SQLAlchemy:
- **Justification**: Complex date calculations and table existence checks
- **Technical Debt**: Inconsistent with module's otherwise ORM-based approach
- **Recommendation**: Migrate to SQLAlchemy where possible

---

## 12. Strategic Enhancements

### High Priority
1. **Standardize User Model Location**: Clarify ownership (user vs auth module)
2. **Use Pydantic for Profile Response**: Replace manual dict formatting with `ProfileResponse.from_orm()`
3. **Add Profile Image Deletion**: Endpoint to remove avatar

### Medium Priority
4. **Improve Error Handling**: Log and properly format Supabase upload errors
5. **ISO Date Formatting**: Use standard date format for `joinedDate`
6. **Profile Image Validation**: Validate URL format on direct updates
7. **Email Update Support**: Add endpoint to change email (with verification)

### Low Priority
8. **Profile Completeness Score**: Calculate percentage of filled profile fields
9. **Profile Image Resize**: Generate thumbnails for faster loading
10. **Audit Trail**: Track profile change history
11. **Bulk User Operations**: Admin endpoints for batch user management
12. **User Export**: CSV/JSON export of user list for admin

---

## Appendices

### A. Profile Field Mapping

| Database Column | Pydantic Schema | API Response | Notes |
|-----------------|-----------------|--------------|-------|
| `first_name` | `firstName` | `firstName` | CamelCase conversion |
| `last_name` | `lastName` | `lastName` | CamelCase conversion |
| `email` | `email` | `email` | Direct mapping |
| `phone` | `phone` | `phone` | Direct mapping |
| `job_title` | `jobTitle` | `jobTitle` | CamelCase conversion |
| `bio` | `bio` | `bio` | Direct mapping |
| `location` | `location` | `location` | Direct mapping |
| `profile_image_url` | N/A (update only) | `avatar` | Renamed in response |
| `created_at` | N/A (read-only) | `joinedDate` | Stringified |

### B. User Creation Flow

```
Signup Request → Auth Routes
    ↓
validate_email_unique
    ↓
hash_password
    ↓
create_user (users_repo)
    ├── Query TENANT role
    ├── Create User with role_id
    └── Commit
    ↓
Create Tenant record
    ↓
Initialize feature_usage rows
    ↓
Commit
    ↓
Return User + Roles
```

### C. Profile Image Upload Flow

```
POST /users/me/upload-image
    ↓
Validate file (type, size)
    ↓
Generate UUID filename: profile/{uuid}.{ext}
    ↓
Upload to Supabase Storage
    ↓
Get public URL
    ↓
Update user.profile_image_url
    ↓
Commit
    ↓
Return URL
```

### D. Quick Reference: Functions

| Function | File | Purpose | Returns |
|----------|------|---------|---------|
| `get_user_by_email` | users_repo.py | Fetch user by email | User or None |
| `get_user_by_id` | users_repo.py | Fetch user by ID | User or None |
| `create_user` | users_repo.py | Create with default role | User |
| `get_user_profile` | users_repo.py | Fetch full profile | User or None |
| `update_user_profile` | users_repo.py | Partial update | User |
| `get_profile` | profile_service.py | Format profile data | dict |
| `update_profile` | profile_service.py | Update profile fields | User |
| `upload_profile_image` | profile_service.py | Upload to Supabase | dict |
| `get_total_users` | admin_stats_service.py | Count + growth | tuple[int, float] |
| `get_active_users_today` | admin_stats_service.py | Active today count | int |

### E. Supabase Storage Configuration

**Bucket**: Defined by `SUPABASE_BUCKET` environment variable

**File Path Pattern**: `profile/{uuid4()}.{extension}`

**File Options**:
- `content-type`: From uploaded file
- `upsert`: `true` (allows overwriting)

**URL Type**: Public URL (no authentication required for viewing)

### F. Database Indexes

**Suggested Indexes** (verify with DBA):
- `IX_user_email`: UNIQUE (already exists via UNIQUE constraint)
- `IX_user_created_at`: For date range queries in admin stats
- `IX_user_last_login_at`: For active user queries
- `IX_user_is_active`: For filtering inactive users

---

*Last Updated: 2026-04-12*  
*Module Version: User Module v1.0 (Complete Documentation)*
