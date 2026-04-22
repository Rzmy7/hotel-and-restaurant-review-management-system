# Module Analysis: Groups Module

## 1. Module Overview

### What & Why
The `groups` module provides collaborative workspace management within the Hotel and Restaurant Review Management System. It enables users to organize into groups with role-based access control, facilitating team-based review management and analysis.

The module exists to:
- **Organize**: Create logical groupings of users within organizations for collaborative work
- **Manage Roles**: Enforce hierarchy with GROUP_MANAGER and GROUP_MEMBER roles
- **Control Access**: Gate review access and group-specific features by membership
- **Notify**: Provide integrated notification system for group activities

### When
The module's logic is triggered under these conditions:
1. **Group Creation**: When a user creates a new collaborative group
2. **Membership Changes**: When managers add/remove members or transfer ownership
3. **Access Control**: When users attempt to access group-scoped resources (reviews, analytics)
4. **Role Checks**: When verifying user permissions for group operations

---

## 2. Architecture & Structure

### File Tree
```
groups/
├── __init__.py                         # Module initialization
├── models.py                           # SQLAlchemy ORM models (Group, GroupMember, GroupMemberRole)
├── repository.py                       # Data access layer (CRUD operations)
├── notifications_repo.py               # Notification repository
├── router.py                           # FastAPI route definitions
└── services/
    ├── __init__.py                     # Service exports
    ├── group_service.py                # Group creation and member management
    └── membership_service.py           # Ownership transfer and member removal
```

### Module Responsibilities
| File | Purpose |
|------|---------|
| `models.py` | Defines Group, GroupMember, and GroupMemberRole ORM models with relationships |
| `repository.py` | Low-level database operations for groups and members |
| `notifications_repo.py` | Notification CRUD operations for group events |
| `router.py` | HTTP endpoints for group management |
| `services/group_service.py` | Business logic for group creation with usage tracking |
| `services/membership_service.py` | Advanced membership operations (ownership transfer, removal) |

---

## 3. API Endpoints

**Base Path**: `/groups` (prefix defined in router)

| # | Method | Path | Auth | Purpose | Request Params | Success Response |
|---|--------|------|------|---------|---------------|-----------------|
| 1 | POST | `/groups` | Session-based user | Create new group | Query: `group_name` (string) | `{"message": "Group created successfully", "group_id", "group_name"}` |
| 2 | POST | `/groups/{group_id}/members` | JWT + Group Manager permission | Add member to group | Path: `group_id`, Query: `user_id` | `{"message": "User added to group", "group_id", "user_id", "role"}` |
| 3 | GET | `/groups/{group_id}/my-role` | Session-based user | Get current user's role in group | Path: `group_id` | `{"group_id", "role"}` |
| 4 | GET | `/groups/{group_id}/reviews` | Session-based user + Group Member permission | Access group reviews | Path: `group_id` | `{"message": "You can access group reviews"}` |

### Authentication Pattern
The group routes use **session-based authentication** via `_get_current_user()` helper (extracts user from `request.session`), unlike most other modules that use JWT via `get_current_user` from auth_utils.

---

## 4. Database Models & Tables

### Table: `group`
Group entity representing collaborative workspaces.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `group_id` | UNIQUEIDENTIFIER | PK | `uuid.uuid4()` | Unique group identifier |
| `group_name` | NVARCHAR(255) | NOT NULL | -- | Display name for the group |
| `organization_id` | UNIQUEIDENTIFIER | Nullable | NULL | Associated organization (optional scoping) |
| `created_by` | UNIQUEIDENTIFIER | FK → `user.user_id` (CASCADE), NOT NULL | -- | Creator/owner user ID |
| `created_at` | DATETIME (timezone) | NOT NULL | `SYSUTCDATETIME()` | Timestamp of group creation |

**Relationships**:
- `creator`: User (backref: `created_groups`)
- `members`: List[GroupMember] (cascade: all, delete-orphan)

### Table: `group_member`
Membership linking users to groups with roles.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `group_id` | UNIQUEIDENTIFIER | PK, FK → `group.group_id` (CASCADE), NOT NULL | -- | Composite PK part 1 |
| `user_id` | UNIQUEIDENTIFIER | PK, FK → `user.user_id`, NOT NULL | -- | Composite PK part 2 |
| `role` | NVARCHAR(30) | NOT NULL, CHECK: `IN ('GROUP_MANAGER', 'GROUP_MEMBER')` | `GROUP_MEMBER` | Member's role in group |
| `role_id` | UNIQUEIDENTIFIER | FK → `group_member_role.role_id`, Nullable | NULL | Reference to detailed role definition |
| `joined_at` | DATETIME (timezone) | NOT NULL | `SYSUTCDATETIME()` | Membership timestamp |

**Composite Primary Key**: `(group_id, user_id)` - prevents duplicate memberships

**Constraints**:
- `ck_group_member_role_valid`: CHECK `(role IN ('GROUP_MANAGER', 'GROUP_MEMBER'))`

**Relationships**:
- `group`: Group (back_populates)
- `user`: User (backref: `group_memberships`)
- `member_role`: GroupMemberRole (back_populates)

### Table: `group_member_role`
Detailed role definitions with optional skills metadata.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `role_id` | UNIQUEIDENTIFIER | PK | `uuid.uuid4()` | Unique role identifier |
| `role_name` | NVARCHAR(100) | UNIQUE, NOT NULL | -- | Role name (e.g., "Manager", "Analyst") |
| `description` | NVARCHAR(255) | Nullable | NULL | Role description |
| `skills` | NVARCHAR(MAX) | Nullable | NULL | JSON array of skill tags |
| `created_at` | DATETIME (timezone) | NOT NULL | `SYSUTCDATETIME()` | Role creation timestamp |

**Relationships**:
- `members`: List[GroupMember] (back_populates)

---

## 5. Pydantic Schemas

**Note**: This module does not define Pydantic schemas. All endpoints use raw query parameters or path parameters directly.

**Schemas Used From Other Modules**:
- Authentication models from `app.modules.auth.schemas`
- User models from `app.modules.user.models`

---

## 6. Services

### 6.1 Group Service (`group_service.py`)

**Purpose**: Group creation and basic member management with usage tracking.

#### `create_group_service(db, group_name, current_user)`
- **Signature**: `(db: Session, group_name: str, current_user) -> Group`
- **Purpose**: Create a new group and assign creator as GROUP_MANAGER
- **Flow**:
  1. Create group via repository
  2. Add creator as GROUP_MANAGER
  3. Increment feature usage counter (`groups` feature)
  4. Commit and refresh
- **Usage Tracking**: Calls `increment_feature_usage(cursor, user_id, "groups")` via pyodbc
- **Returns**: Created Group object
- **Error Handling**: Logs subscription init failures but doesn't block creation

#### `add_group_member_service(db, group_id, user_id, role, current_user)`
- **Signature**: `(db: Session, group_id: UUID, user_id: UUID, role: str, current_user) -> GroupMember`
- **Purpose**: Add a user to a group with specified role
- **Flow**:
  1. Verify group exists (`_get_group_or_404`)
  2. Check current user has GROUP_MANAGER permission
  3. Add member with specified role (defaults to GROUP_MEMBER)
  4. Commit and refresh
- **Permission Check**: `require_group_manager(group_id, current_user, db)`
- **Returns**: Created GroupMember object

#### `_get_group_or_404(db, group_id)` (Internal)
- **Signature**: `(db: Session, group_id: UUID) -> Group`
- **Purpose**: Fetch group or raise 404
- **Raises**: `HTTPException(404, "Group not found")`

### 6.2 Membership Service (`membership_service.py`)

**Purpose**: Advanced membership operations (ownership transfer, removal).

#### `transfer_group_ownership(db, group_id, new_manager_user_id, current_user)`
- **Signature**: `(db: Session, group_id: UUID, new_manager_user_id: UUID, current_user) -> dict`
- **Purpose**: Transfer GROUP_MANAGER role to another member
- **Flow**:
  1. Verify group exists
  2. Check current user is GROUP_MANAGER
  3. Verify target user is already a group member
  4. Set target's role to GROUP_MANAGER
  5. Demote current user to GROUP_MEMBER (if different from target)
  6. Commit
- **Validation**:
  - Target must be existing member (404 if not)
  - Current user must be manager
- **Returns**: `{"message": "Ownership transferred successfully"}`

#### `remove_group_member(db, group_id, user_id, current_user)`
- **Signature**: `(db: Session, group_id: UUID, user_id: UUID, current_user) -> dict`
- **Purpose**: Remove a user from the group
- **Flow**:
  1. Verify group exists
  2. Check current user is GROUP_MANAGER
  3. Find target member
  4. If target is GROUP_MANAGER, verify at least one other manager remains
  5. Delete member
  6. Commit
- **Validation**:
  - Member must exist (404 if not)
  - Cannot remove last GROUP_MANAGER (400 Bad Request)
- **Returns**: `{"message": "Member removed successfully"}`

---

## 7. Repositories

### 7.1 Group Repository (`repository.py`)

**Purpose**: Low-level database operations for groups and members.

#### `create_group(db, group_name, created_by)`
- **Signature**: `(db: Session, group_name: str, created_by) -> Group`
- **Purpose**: Insert new group record
- **Returns**: Created Group object (refreshed from DB)

#### `add_member_to_group(db, group_id, user_id, role)`
- **Signature**: `(db: Session, group_id, user_id, role="GROUP_MEMBER") -> GroupMember`
- **Purpose**: Insert new membership record
- **Default Role**: GROUP_MEMBER
- **Returns**: Created GroupMember object (refreshed from DB)

#### `get_user_group_role(db, group_id, user_id)`
- **Signature**: `(db: Session, group_id, user_id) -> str | None`
- **Purpose**: Fetch user's role in specific group
- **Returns**: Role string ("GROUP_MANAGER" / "GROUP_MEMBER") or None if not member

### 7.2 Notifications Repository (`notifications_repo.py`)

**Purpose**: Notification CRUD operations for group-related events.

**Note**: Uses `Notification` and `UserNotification` models from `app.modules.auth.models`.

#### `create_notification(db, user_id, title, message, notification_type)`
- **Signature**: `(db: Session, user_id: UUID, title: str, message: str, notification_type: str = "info") -> UserNotification`
- **Purpose**: Create notification and link to user
- **Flow**:
  1. Create Notification record
  2. Flush to get notification_id
  3. Create UserNotification link
  4. Commit and refresh
- **Returns**: UserNotification object with joined Notification data

#### `list_notifications_for_user(db, user_id, limit, offset, unread_only)`
- **Signature**: `(db: Session, user_id: UUID, limit: int = 50, offset: int = 0, unread_only: bool = False) -> List[UserNotification]`
- **Purpose**: Fetch user's notifications with pagination and filtering
- **Default Limit**: 50
- **Ordering**: By Notification.created_at DESC
- **Filter**: Optional unread_only flag

#### `count_unread_notifications(db, user_id)`
- **Signature**: `(db: Session, user_id: UUID) -> int`
- **Purpose**: Count user's unread notifications
- **Returns**: Integer count

#### `mark_notification_as_read(db, notification_id, user_id)`
- **Signature**: `(db: Session, notification_id: UUID, user_id: UUID) -> UserNotification | None`
- **Purpose**: Mark single notification as read
- **Updates**: `is_read = True`, `read_at = datetime.utcnow()`
- **Returns**: Updated UserNotification or None if not found

#### `mark_all_notifications_as_read(db, user_id)`
- **Signature**: `(db: Session, user_id: UUID) -> int`
- **Purpose**: Mark all user's notifications as read
- **Updates**: All unread notifications with `is_read = True`, `read_at = now`
- **Returns**: Count of notifications marked as read

---

## 8. Utilities & Helpers

### Permission Middleware
**Import**: `from app.middleware.permissions import require_group_manager, require_group_member`

These middleware functions are used throughout the module to enforce access control:
- `require_group_manager(group_id, current_user, db)`: Raises 403 if user is not GROUP_MANAGER
- `require_group_member(group_id, current_user, db)`: Raises 403 if user is not a group member

### Role Constants
**Import**: `from app.modules.auth.constants.roles import GROUP_MANAGER, GROUP_MEMBER`

Defined constants:
- `GROUP_MANAGER = "GROUP_MANAGER"`
- `GROUP_MEMBER = "GROUP_MEMBER"`

---

## 9. Integrations with Other Modules

### Auth Module
- **Role Constants**: Imports `GROUP_MANAGER` and `GROUP_MEMBER` from `auth.constants.roles`
- **Notification Models**: Uses `Notification` and `UserNotification` from `auth.models`
- **Permission Middleware**: Relies on `app.middleware.permissions` for access control

### User Module
- **User Model**: Foreign keys to `user.user_id` in Group and GroupMember models
- **User Relationships**: Backrefs create `created_groups` and `group_memberships` on User objects

### Admin Module
- **Subscription Service**: Calls `increment_feature_usage` to track group creation against user's plan limits
- **Feature Tracking**: Uses `groups` as feature key in `user_feature_usage` table

### Organization Module
- **Organization Scoping**: Group model has optional `organization_id` field for organizational grouping (not actively used in current implementation)

### Middleware
- **Permissions Module**: `require_group_manager` and `require_group_member` from `app.middleware.permissions`

---

## 10. Configuration & Environment Variables

### No Direct Environment Variables
The groups module does not read any environment variables directly.

### Implicit Configuration
- **Database Connection**: Uses SQLAlchemy session from `app.database.session.get_db`
- **PyODBC Connection**: Opens direct connections for feature usage tracking via `app.core.db_utils.get_connection_string`
- **Session Storage**: Relies on FastAPI session middleware for user extraction

---

## 11. Code Review: Flaws & Technical Debt

### Mixed Authentication Patterns
> [!WARNING]
> **Inconsistency**: The router uses session-based auth (`_get_current_user` from request.session) while services expect JWT-based user objects (with `current_user.user_id` attribute).
- **Risk**: These are incompatible - session dict has `user["id"]` while JWT user object has `user.user_id`
- **Location**: `router.py` line 19 vs `group_service.py` line 33
- **Recommendation**: Standardize on JWT authentication using `get_current_user` from auth_utils

### Missing Pydantic Schemas
> [!CAUTION]
> **Validation Gap**: Endpoints use raw query parameters instead of Pydantic models, bypassing input validation.
- **Risk**: No validation of `group_name` length, `user_id` format, or `role` values
- **Recommendation**: Define request/response schemas and use them in endpoint signatures

### Incomplete Router Implementation
The router only has 4 basic endpoints. Missing functionality:
- List groups for user
- List members of a group
- Update group name
- Delete group
- Leave group (self-removal)
- Get group details

### Service Layer Not Used by Router
> [!WARNING]
> **Architecture Violation**: The router calls repository functions directly (`create_group`, `add_member_to_group`) instead of service layer functions (`create_group_service`, `add_group_member_service`).
- **Impact**: Usage tracking is bypassed when router is used
- **Location**: `router.py` lines 33-34 vs `group_service.py`
- **Recommendation**: Router should call service functions, not repository functions

### No Validation on Role Parameter
`add_member_to_group` accepts any string as role, not just GROUP_MANAGER/GROUP_MEMBER.
- **Risk**: Invalid roles could be inserted (database CHECK constraint prevents invalid values, but error messages would be unclear)
- **Recommendation**: Validate role in service layer before database call

### Composite Key Handling
The composite primary key `(group_id, user_id)` on `group_member` requires careful handling:
- **Risk**: SQLAlchemy queries might behave unexpectedly with composite keys
- **Current Usage**: Correctly queries both fields in filters
- **Recommendation**: Add explicit tests for composite key operations

### Notification Model Import Location
Notifications repo imports from `app.modules.auth.models` but this creates cross-module dependency.
- **Recommendation**: Move notification models to dedicated notification module or shared models package

### Error Handling Inconsistency
- Repository functions don't catch exceptions (rely on caller)
- Service functions catch usage tracking errors but not database errors
- Router doesn't handle any exceptions
- **Recommendation**: Add consistent error handling with logging

---

## 12. Strategic Enhancements

### High Priority
1. **Fix Authentication Mismatch**: Standardize router to use JWT auth like rest of system
2. **Wire Up Service Layer**: Update router to call service functions instead of repository functions directly
3. **Add Input Validation**: Create Pydantic schemas for all endpoint requests

### Medium Priority
4. **Complete CRUD Operations**: Add missing endpoints (list groups, list members, update, delete, leave)
5. **Role Validation**: Validate role values in service layer before database operations
6. **Error Handling**: Add consistent exception handling with logging across all layers
7. **Organization Integration**: Actively use `organization_id` field for proper scoping

### Low Priority
8. **Notification Module**: Move notification models to dedicated module
9. **Permission Caching**: Cache permission checks to reduce database queries
10. **Group Analytics**: Add group-level review aggregation and insights
11. **Audit Trail**: Track group membership changes in audit log
12. **Bulk Operations**: Add endpoints for adding/removing multiple members at once

---

## Appendices

### A. Role Hierarchy

```
GROUP_MANAGER
  ├── Can add members
  ├── Can remove members
  ├── Can transfer ownership
  └── Can access all group resources

GROUP_MEMBER
  ├── Can view group reviews
  ├── Can participate in group activities
  └── Cannot modify membership
```

### B. Database Relationships

```
User (user.user_id)
  ├── created_groups (1:N) → Group
  └── group_memberships (N:M) → GroupMember

Group (group.group_id)
  ├── creator (N:1) → User
  └── members (1:N) → GroupMember

GroupMember (group_id + user_id)
  ├── group (N:1) → Group
  ├── user (N:1) → User
  └── member_role (N:1) → GroupMemberRole

GroupMemberRole (role_id)
  └── members (1:N) → GroupMember
```

### C. Quick Reference: Functions

| Function | File | Purpose | Returns |
|----------|------|---------|---------|
| `create_group` | repository.py | Insert group | Group |
| `add_member_to_group` | repository.py | Insert membership | GroupMember |
| `get_user_group_role` | repository.py | Get user's role | str or None |
| `create_notification` | notifications_repo.py | Create notification | UserNotification |
| `list_notifications_for_user` | notifications_repo.py | List notifications | List[UserNotification] |
| `count_unread_notifications` | notifications_repo.py | Count unread | int |
| `mark_notification_as_read` | notifications_repo.py | Mark single read | UserNotification or None |
| `mark_all_notifications_as_read` | notifications_repo.py | Mark all read | int |
| `create_group_service` | group_service.py | Create with tracking | Group |
| `add_group_member_service` | group_service.py | Add with permission check | GroupMember |
| `transfer_group_ownership` | membership_service.py | Transfer manager role | dict |
| `remove_group_member` | membership_service.py | Remove with validation | dict |

### D. Security Considerations

1. **Authorization Checks**: All membership modifications require GROUP_MANAGER permission
2. **Last Manager Protection**: Cannot remove last GROUP_MANAGER to prevent orphaned groups
3. **Membership Verification**: Target user must be member before ownership transfer
4. **Cascade Deletes**: Deleting a group removes all members (CASCADE on FK)
5. **Organization Scoping**: Optional `organization_id` could be used for cross-group isolation (not currently enforced)

### E. Feature Usage Tracking

When a group is created:
```python
increment_feature_usage(cursor, str(current_user.user_id), "groups")
```

This increments the `used_quantity` counter in `dbo.user_feature_usage` for the `groups` feature, enabling plan-based limits on group creation.

---

*Last Updated: 2026-04-12*  
*Module Version: Groups Module v1.0 (Complete Documentation)*
