# Module Analysis: Auth Module

## 1. Module Overview

### What & Why
The `auth` module is the authentication and authorization backbone of the Hotel and Restaurant Review Management System. It provides JWT-based authentication, OAuth integration with Google, password management (forgot/reset), session management, role-based access control (RBAC), and permission enforcement utilities.

It exists to:
- **Authenticate**: Verify user identity via email/password or OAuth providers
- **Authorize**: Enforce role-based permissions across all modules
- **Secure**: Manage JWT tokens, sessions, and password reset flows
- **Protect**: Provide middleware and dependencies for route protection

### When
The module's logic is triggered under these conditions:
1. **Login/Signup**: When users register or authenticate via credentials or OAuth
2. **API Access**: On every protected API request (JWT validation via `get_current_user`)
3. **Password Reset**: When users request password reset emails or submit new passwords
4. **Permission Checks**: When routes require specific roles or permissions
5. **Session Management**: When users check session status or logout

---

## 2. Architecture & Structure

### File Tree
```
auth/
├── __init__.py                         # Module initialization
├── constants/
│   ├── __init__.py                     # Constants package
│   └── roles.py                        # Role name constants
├── dependencies/
│   ├── __init__.py                     # Dependencies package
│   ├── auth_permissions.py             # Permission-based dependencies
│   ├── broadcasting_routes.py          # Broadcasting endpoints (auth-related)
│   └── notifications_routes.py         # Notification endpoints (auth-related)
├── models/
│   ├── __init__.py                     # Models package
│   └── auth_models.py                  # Role, Session, PasswordResetToken ORM models
├── repositories/
│   ├── roles_repo.py                   # Role data access
│   └── repository.py                   # Auth-related repositories
├── routes/
│   ├── __init__.py                     # Routes package
│   ├── auth_routes.py                  # Core auth endpoints (login, signup, password)
│   ├── oauth.py                        # OAuth configuration
│   ├── oauth_routes.py                 # OAuth endpoints
│   ├── login.py                        # Login-specific routes
│   ├── signup.py                       # Signup-specific routes
│   ├── password.py                     # Password management routes
│   └── session.py                      # Session management routes
├── schemas/
│   ├── __init__.py                     # Schemas package
│   └── auth_schemas.py                 # Auth request/response schemas
├── services/
│   ├── __init__.py                     # Services package
│   ├── auth_service.py                 # Login business logic
│   ├── jwt_service.py                  # JWT token operations
│   ├── oauth_service.py                # OAuth business logic
│   └── email_service.py                # Email sending service
└── utils/
    ├── auth_utils.py                   # Password hashing, JWT user extraction
    └── email_utils.py                  # Email formatting and sending
```

### Module Responsibilities
| Directory | Purpose |
|-----------|---------|
| `constants/` | Role name constants (TENANT, GROUP_MANAGER, GROUP_MEMBER, etc.) |
| `dependencies/` | FastAPI dependencies for permission checks |
| `models/` | ORM models for Role, Session, PasswordResetToken |
| `repositories/` | Data access layer for roles and auth operations |
| `routes/` | HTTP endpoints organized by function |
| `schemas/` | Pydantic models for request/response validation |
| `services/` | Business logic (login, JWT, OAuth, email) |
| `utils/` | Helper functions (hashing, verification, email utils) |

---

## 3. API Endpoints

### 3.1 Authentication Routes (`auth_routes.py`)

**Base Path**: `/api/auth` (prefix varies based on registration in main.py)

| # | Method | Path | Auth | Purpose | Request Body | Success Response |
|---|--------|------|------|---------|-------------|-----------------|
| 1 | POST | `/signup` | None | Register new user | `SignupModel` (name, email, password) | `{"message", "user": {id, first_name, last_name, email, roles, tenant_id}}` |
| 2 | POST | `/login` | None | Authenticate user | `LoginModel` (email, password) | `{"message", "access_token", "token_type", "user"}` |
| 3 | POST | `/switch-organization` | JWT | Switch active organization | `SwitchOrganizationModel` (organization_id) | `{"access_token", "token_type", "organization_id"}` |
| 4 | POST | `/forgot-password` | None | Request password reset email | `EmailModel` (email) | `{"message": "If the account exists, a reset link has been sent"}` |
| 5 | POST | `/reset-password/{token}` | None | Reset password with token | `ResetModel` (new_password) | `{"message": "Password reset successful"}` |
| 6 | GET | `/test-smtp` | None | Test email configuration | None | `{"success": true/false, ...}` |
| 7 | GET | `/check-session` | None | Check session status | None | `{"user": {...}}` or `{"user": null}` |
| 8 | GET | `/token-check` | Bearer Token | Validate and decode JWT | Bearer token in header | `{"valid", "claims", "expires_at_utc"}` |
| 9 | GET | `/admin/dashboard` | JWT + Admin role | Admin dashboard test endpoint | None | `{"message": "Welcome Admin"}` |

---

## 4. Database Models & Tables

### Table: `role`
Role definitions for RBAC system.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `role_id` | INT | PK, autoincrement | -- | Unique role identifier |
| `role_name` | NVARCHAR(100) | UNIQUE, NOT NULL | -- | Role name (e.g., "TENANT", "ADMIN") |
| `description` | NVARCHAR(255) | Nullable | NULL | Role description |
| `created_at` | DATETIME (timezone) | NOT NULL | `SYSUTCDATETIME()` | Role creation timestamp |

**Relationships**:
- `users`: List[User] (back_populates)

### Table: `session`
User session tracking for refresh tokens and active sessions.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `session_id` | UNIQUEIDENTIFIER | PK | `uuid.uuid4()` | Unique session identifier |
| `user_id` | UNIQUEIDENTIFIER | FK → `user.user_id` (CASCADE), NOT NULL | -- | Session owner |
| `refresh_token_hash` | NVARCHAR(255) | NOT NULL | -- | Hashed refresh token |
| `ip_address` | NVARCHAR(50) | Nullable | NULL | Client IP at creation |
| `user_agent` | NVARCHAR(500) | Nullable | NULL | Client user agent at creation |
| `is_revoked` | BIT | NOT NULL | `0` (false) | Revocation status |
| `created_at` | DATETIME (timezone) | NOT NULL | `SYSUTCDATETIME()` | Session creation timestamp |
| `expires_at` | DATETIME (timezone) | NOT NULL | -- | Session expiration timestamp |
| `revoked_at` | DATETIME (timezone) | Nullable | NULL | Revocation timestamp |

**Relationships**:
- `user`: User (back_populates)

### Table: `password_reset_token`
Password reset token storage with expiration.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `token_id` | UNIQUEIDENTIFIER | PK | `uuid.uuid4()` | Unique token identifier |
| `user_id` | UNIQUEIDENTIFIER | FK → `user.user_id` (CASCADE), NOT NULL | -- | Token owner |
| `token_hash` | NVARCHAR(255) | NOT NULL | -- | SHA-256 hash of raw token |
| `expires_at` | DATETIME (timezone) | NOT NULL | -- | Token expiration (60 minutes from creation) |
| `used_at` | DATETIME (timezone) | Nullable | NULL | Timestamp when token was used |
| `created_at` | DATETIME (timezone) | NOT NULL | `SYSUTCDATETIME()` | Token creation timestamp |

**Relationships**:
- `user`: User (back_populates)

---

## 5. Pydantic Schemas

### Auth Schemas (`auth_schemas.py`)

#### `SignupModel`
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `name` | str | Required | Full name (will be split into first/last) |
| `email` | EmailStr | Required | User's email address |
| `password` | str | min_length=1, max_length=72 | Plain text password |

#### `LoginModel`
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `email` | EmailStr | Required | User's email address |
| `password` | str | min_length=1, max_length=72 | Plain text password |

#### `EmailModel`
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `email` | EmailStr | Required | Email address for password reset |

#### `ResetModel`
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `new_password` | str | min_length=1, max_length=72 | New password to set |

### Route-Specific Schemas

#### `SwitchOrganizationModel` (defined in `auth_routes.py`)
| Field | Type | Description |
|-------|------|-------------|
| `organization_id` | str | Target organization ID |

---

## 6. Services

### 6.1 Auth Service (`auth_service.py`)

**Purpose**: Login business logic and JWT token issuance.

#### `login_user(db, email, password)`
- **Signature**: `(db: Session, email: str, password: str) -> dict`
- **Purpose**: Authenticate user and issue JWT
- **Flow**:
  1. Fetch user by email
  2. Validate user exists (401 if not)
  3. Check user is active (403 if disabled)
  4. Verify password_hash exists (401 if NULL - OAuth-only users)
  5. Verify password matches hash (401 if wrong)
  6. Fetch user's primary role
  7. Update `last_login_at` timestamp
  8. If role is "Tenant", initialize "Free" subscription plan
  9. Fetch user's default organization
  10. Create JWT with user_id, role, organization_id
  11. Return token and user details
- **Validation Points**:
  - User existence
  - Account active status
  - Password availability (vs OAuth-only)
  - Password correctness
  - Role assignment
- **Subscription Init**: Calls `set_user_subscription_plan(cursor, user_id, "Free")` for Tenant users
- **Returns**: `{"access_token", "token_type", "user": {user_id, email, first_name, last_name, full_name, role}}`
- **Error Handling**: Raises HTTPException with appropriate status codes

### 6.2 JWT Service (`jwt_service.py`)

**Purpose**: JWT token creation, validation, and decoding.

**Note**: Most JWT operations are in `app.core.security`, but this module may wrap or extend them.

### 6.3 OAuth Service (`oauth_service.py`)

**Purpose**: OAuth provider integration (Google).

### 6.4 Email Service (`email_service.py`)

**Purpose**: Email sending for password resets and notifications.

---

## 7. Utilities & Helpers

### 7.1 Auth Utils (`auth_utils.py`)

#### Password Hashing

##### `hash_password(password)`
- **Signature**: `(password: str) -> str`
- **Purpose**: Hash password using bcrypt
- **Flow**:
  1. Encode password to bytes (UTF-8)
  2. Generate random salt via `bcrypt.gensalt()`
  3. Hash password with salt via `bcrypt.hashpw()`
  4. Decode result to string for DB storage
- **Returns**: Bcrypt hash string
- **Algorithm**: bcrypt (industry standard)

##### `verify_password(plain_password, hashed_password)`
- **Signature**: `(plain_password: str, hashed_password: str) -> bool`
- **Purpose**: Verify password against stored hash
- **Flow**:
  1. Encode both inputs to bytes (UTF-8)
  2. Call `bcrypt.checkpw()`
  3. Return boolean result
- **Error Handling**: Returns `False` on ValueError, TypeError, or AttributeError (handles corrupted hashes)
- **Returns**: `True` if match, `False` otherwise

#### JWT Authentication

##### `get_current_user(credentials, db)`
- **Signature**: `(credentials: HTTPAuthorizationCredentials, db: Session) -> User`
- **Purpose**: Extract current user from JWT token (FastAPI dependency)
- **Flow**:
  1. Strip whitespace from token
  2. Remove "Bearer " prefix if present (defensive)
  3. Validate JWT format (must have 3 dot-separated segments)
  4. Decode token via `decode_access_token()`
  5. Extract `user_id` from claims
  6. Query user from database
  7. Return User object
- **Validation**:
  - Token format (raises 401 if not 3 segments)
  - Token validity (raises 401 if expired/invalid)
  - User existence (raises 401 if user not found)
- **Raises**: HTTPException with descriptive messages
- **Used As**: `Depends(get_current_user)` in protected routes

### 7.2 Email Utils (`email_utils.py`)

#### `send_reset_email(email, reset_link)`
- **Purpose**: Send password reset email
- **Integration**: Uses SMTP configuration from environment variables
- **Error Handling**: May raise exceptions on SMTP failure

---

## 8. Security & Permissions

### 8.1 Role-Based Access Control

**Role Constants** (`constants/roles.py`):
```python
TENANT = "TENANT"
GROUP_MANAGER = "GROUP_MANAGER"
GROUP_MEMBER = "GROUP_MEMBER"
# Additional roles as defined in database
```

### 8.2 Permission Dependencies

**Import**: `from app.modules.auth.dependencies.auth_permissions import require_admin`

- `require_admin`: FastAPI dependency that checks user has admin role
- Raises 403 Forbidden if user lacks required permissions

### 8.3 Token Security

**Password Reset Token**:
- Generated via `secrets.token_urlsafe(32)` (cryptographically secure)
- Hashed with SHA-256 before storage
- Expires in 60 minutes
- Single-use (marked as used after reset)
- Old tokens invalidated on new request

**JWT Tokens**:
- Signed with secret key from environment
- Contain user_id, role, organization_id claims
- Expiration set during creation
- Validated on every protected request

### 8.4 Session Security

**Session Tracking**:
- Refresh tokens hashed before storage
- IP address and user agent recorded
- Revocation supported (soft delete via `is_revoked` flag)
- Expiration enforced

---

## 9. Integrations with Other Modules

### User Module
- **User Model**: Imports `User` from `app.modules.user.models.user_models` (or re-exported via `app.modules.auth.models`)
- **User Repository**: Calls `get_user_by_email` and `create_user` from `app.modules.user.repositories.users_repo`
- **Relationship**: Auth module handles authentication logic; User module handles profile data

### Admin Module
- **Subscription Service**: Calls `set_user_subscription_plan` during login for Tenant users
- **Feature Usage**: Initializes `user_feature_usage` rows during signup

### Organization Module
- **Tenant Model**: Creates `Tenant` record during signup
- **Organization Query**: Fetches default organization during login for JWT claims

### Source Module
- **Tenant Model**: Imports from `app.modules.source.models` for tenant creation

### Core Security
- **JWT Operations**: Uses `create_access_token`, `decode_access_token` from `app.core.security`
- **Password Hashing**: bcrypt library (industry standard)

---

## 10. Configuration & Environment Variables

### Environment Variables

| Variable | Required | Description | Used In |
|----------|----------|-------------|---------|
| `SECRET_KEY` | Yes | JWT signing secret | `app.core.security` |
| `SMTP_EMAIL` | Yes | SMTP sender email | `email_utils.py` |
| `SMTP_PASSWORD` | Yes | SMTP password/app password | `email_utils.py` |
| `SMTP_HOST` | Yes | SMTP server host | `email_utils.py` |
| `SMTP_PORT` | Yes | SMTP server port | `email_utils.py` |
| `GOOGLE_CLIENT_ID` | If using OAuth | Google OAuth client ID | `oauth_service.py` |
| `GOOGLE_CLIENT_SECRET` | If using OAuth | Google OAuth client secret | `oauth_service.py` |
| `FRONTEND_URL` | Yes | Frontend URL for reset links | `auth_routes.py` |

### Password Configuration
- **Max Length**: 72 characters (bcrypt limitation)
- **Min Length**: 1 character (enforced by schema)
- **Hash Algorithm**: bcrypt with random salt
- **Reset Token Expiry**: 60 minutes (hardcoded constant)

---

## 11. Code Review: Flaws & Technical Debt

### Password Reset Email Information Leakage
> [!CAUTION]
> **Security Risk**: Both forgot-password success and "email not found" return the same message: `"If the account exists, a reset link has been sent"`.
- **Current Behavior**: Correctly prevents email enumeration
- **BUT**: Error handling prints to console: `print(f"[warn] send_reset_email failed: {exc}")`
- **Risk**: Information leakage in logs
- **Recommendation**: Use proper logging framework, not print statements

### Mixed User Model Imports
User model is imported from multiple locations:
- `app.modules.user.repositories.users_repo` (for queries)
- `app.modules.auth.models` (for relationships)
- `app.modules.user.models.user_models` (definition)
- **Risk**: Potential circular imports and confusion
- **Recommendation**: Centralize User model import in one place

### Inline Schema Definition
`SwitchOrganizationModel` is defined inline in `auth_routes.py` instead of in schemas file:
```python
from pydantic import BaseModel
class SwitchOrganizationModel(BaseModel):
    organization_id: str
```
- **Risk**: Inconsistent organization, harder to find
- **Recommendation**: Move to `auth_schemas.py`

### Session-Based Auth Alongside JWT
Some routes use session-based auth (`request.session.get("user")`) while others use JWT:
- `check-session`: Uses session
- `get_current_user` (local function): Uses session
- Most other routes: Use JWT
- **Risk**: Inconsistent authentication patterns
- **Recommendation**: Standardize on JWT throughout

### JWT Prefix Stripping
Token prefix stripping is done manually:
```python
if token.lower().startswith("bearer "):
    token = token[7:].strip()
```
- **Note**: HTTPBearer should already strip the prefix
- **Risk**: Redundant code, suggests misunderstanding of HTTPBearer behavior
- **Recommendation**: Remove if HTTPBearer handles it (which it does)

### No Rate Limiting on Password Reset
`/forgot-password` endpoint has no rate limiting:
- **Risk**: Email spam attacks
- **Recommendation**: Add rate limiting per IP or email

### SHA-256 for Token Hashing
Password reset tokens use SHA-256 hashing:
```python
def token_sha256(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
```
- **Note**: SHA-256 is fine for tokens (not passwords), but consider using `secrets.compare_digest` for timing-safe comparison
- **Recommendation**: Use timing-safe comparison if security audit requires it

### Test SMTP Endpoint Exposure
`/test-smtp` endpoint is tagged as "Debug" but may be exposed in production:
- **Risk**: Allows anyone to test SMTP configuration
- **Recommendation**: Protect with admin-only access or remove in production

---

## 12. Strategic Enhancements

### High Priority
1. **Add Rate Limiting**: Protect forgot-password and login endpoints from brute force
2. **Standardize User Model Import**: Clarify ownership and centralize imports
3. **Remove Debug Endpoints**: Protect or remove `/test-smtp` in production

### Medium Priority
4. **Move Inline Schemas**: Relocate `SwitchOrganizationModel` to schemas file
5. **Improve Error Logging**: Replace print statements with proper logging
6. **Add Email Verification**: Send verification email on signup
7. **Refresh Token Rotation**: Implement refresh token rotation for better security

### Low Priority
8. **Timing-Safe Token Comparison**: Use `secrets.compare_digest` for token validation
9. **Multi-Factor Authentication**: Add TOTP/SMS-based 2FA
10. **OAuth Provider Expansion**: Add Microsoft, Facebook OAuth support
11. **Password Strength Meter**: Enforce password complexity requirements
12. **Session Management UI**: Allow users to view/revoke active sessions

---

## Appendices

### A. Signup Flow

```
POST /signup
    ↓
Check email uniqueness (400 if exists)
    ↓
Split name into first_name/last_name
    ↓
hash_password
    ↓
create_user (with TENANT role)
    ↓
Create Tenant record (tenant_id = user_id, plan = "1")
    ↓
Initialize feature_usage rows (INSERT FROM features table)
    ↓
Commit
    ↓
Return user with roles and tenant_id
```

### B. Login Flow

```
POST /login
    ↓
get_user_by_email
    ↓
Validate user exists, active, has password
    ↓
verify_password
    ↓
get_user_primary_role
    ↓
Update last_login_at
    ↓
If Tenant role: set_user_subscription_plan("Free")
    ↓
Fetch default organization
    ↓
create_access_token(user_id, role, organization_id)
    ↓
Return token and user details
```

### C. Password Reset Flow

```
POST /forgot-password
    ↓
get_user_by_email (return success even if not found)
    ↓
Invalidate old tokens (set used_at)
    ↓
Generate raw_token = secrets.token_urlsafe(32)
    ↓
Hash token: token_sha256(raw_token)
    ↓
Insert password_reset_tokens record (expires in 60 min)
    ↓
Send email with reset link: /reset-password/{raw_token}
    ↓
Return success message

POST /reset-password/{token}
    ↓
Hash token: token_sha256(token)
    ↓
Find token record (400 if not found)
    ↓
Check not used (400 if already used)
    ↓
Check not expired (400 if expired)
    ↓
hash_password(new_password)
    ↓
Update user.password_hash
    ↓
Mark token as used
    ↓
Commit
    ↓
Return success
```

### D. Quick Reference: Functions

| Function | File | Purpose | Returns |
|----------|------|---------|---------|
| `hash_password` | auth_utils.py | Hash with bcrypt | str |
| `verify_password` | auth_utils.py | Verify password | bool |
| `get_current_user` | auth_utils.py | JWT dependency | User |
| `login_user` | auth_service.py | Authenticate + JWT | dict |
| `token_sha256` | auth_routes.py | Hash reset token | str |
| `send_reset_email` | email_utils.py | Send reset email | None |
| `require_admin` | auth_permissions.py | Admin permission check | Dependency |

### E. Role Hierarchy

```
System Level:
  ADMIN - Full system access
  MODERATOR - Content moderation

Tenant Level:
  TENANT - Organization owner/manager

Group Level:
  GROUP_MANAGER - Group administration
  GROUP_MEMBER - Group participation
```

### F. JWT Claims Structure

```json
{
  "user_id": "uuid-string",
  "role": "TENANT",
  "organization_id": "uuid-string",
  "exp": 1234567890,
  "iat": 1234567890
}
```

---

*Last Updated: 2026-04-12*  
*Module Version: Auth Module v1.0 (Complete Documentation)*
