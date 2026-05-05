"""
Admin service — business logic for user and organization CRUD.

Migrated from admin-backend/app/admin_router.py.
"""

import re
import uuid
from datetime import date, datetime

from datetime import date, datetime

import pyodbc
from fastapi import HTTPException

from app.core.security import hash_password
from app.core.db_utils import (
    execute_query,
    get_connection_string,
    get_table_columns,
    pick_existing_column,
    table_exists,
    to_datetime,
)
from app.modules.admin.schemas import (
    AdminUser,
    AdminUserCreatePayload,
    AdminUserUpdatePayload,
    DeleteUserResponse,
    OrganizationStats,
    OrganizationSummary,
    UserStatsData,
)
from app.modules.admin.services.subscription_service import (
    get_user_plan_map,
    set_user_subscription_plan,
)
from app.modules.auth.constants.roles import ADMIN_ROLE_ID, TENANT_ROLE_ID

PROCESSED_ACTIVITY_EXPR = (
    "COALESCE(CAST(lastUpdated AS datetime), CAST(firstSeen AS datetime), "
    "CAST(scrapedAt AS datetime), CAST(reviewDate AS datetime))"
)


# ── Helpers ─────────────────────────────────────────────────────────


def _org_status_from_date(value) -> str:
    dt_value = to_datetime(value)
    if dt_value is None:
        return "Inactive"
    age_in_days = (date.today() - dt_value.date()).days
    if age_in_days <= 7:
        return "Active"
    if age_in_days <= 30:
        return "Active"
    return "Inactive"


def _user_status_from_date(value) -> str:
    dt_value = to_datetime(value)
    if dt_value is None:
        return "Suspended"
    age_in_days = (date.today() - dt_value.date()).days
    return "Active" if age_in_days <= 30 else "Suspended"


def _email_from_name(name: str, index: int) -> str:
    slug = re.sub(r"[^a-z0-9]+", ".", name.lower()).strip(".")
    if not slug:
        slug = f"user{index}"
    return f"{slug}@local.user"


def _org_status_from_organization_row(created_at_value, deleted_at_value) -> str:
    if to_datetime(deleted_at_value) is not None:
        return "Inactive"
    created_at = to_datetime(created_at_value)
    if created_at is None:
        return "Active"
    age_in_days = (date.today() - created_at.date()).days
    if age_in_days <= 14:
        return "Active"
    return "Active"


def _role_from_count(review_count: int) -> str:
    if review_count >= 50:
        return "Admin"
    return "User"


def _plan_from_count(review_count: int) -> str:
    if review_count >= 60:
        return "Enterprise"
    if review_count >= 30:
        return "Pro"
    return "Free"


def _name_from_user_row(full_name: str | None, email: str, fallback_index: int) -> str:
    if full_name and full_name.strip():
        return full_name.strip()
    local_part = email.split("@")[0] if "@" in email else email
    normalized = re.sub(r"[._-]+", " ", local_part).strip()
    if normalized:
        return normalized.title()
    return f"User {fallback_index}"


def _role_from_user_flags(role_id: int | None) -> str:
    return "Admin" if role_id == ADMIN_ROLE_ID else "User"


def _plan_from_user_flags(is_email_verified: bool, is_phone_verified: bool) -> str:
    if is_email_verified and is_phone_verified:
        return "Pro"
    return "Free"


def _flags_for_role_plan(
    role: str,
    plan: str | None,
    current_is_email_verified: bool,
    current_is_phone_verified: bool,
) -> tuple[int, bool, bool]:
    if role == "Admin":
        return ADMIN_ROLE_ID, True, True
    if plan == "Free":
        return TENANT_ROLE_ID, False, False
    if plan == "Basic":
        # Backward compatibility for stale clients: map deprecated Basic to Free.
        return TENANT_ROLE_ID, False, False
    if plan in {"Pro", "Enterprise"}:
        return TENANT_ROLE_ID, True, True
    return TENANT_ROLE_ID, current_is_email_verified, current_is_phone_verified


def _frontend_user_from_db_row(row, fallback_index: int, plan_name: str | None = None) -> AdminUser:
    user_id = str(row[0]) if row[0] is not None else str(fallback_index)
    email = str(row[1] or "").strip()
    full_name = str(row[2]).strip() if row[2] else None

    is_active = bool(row[3]) if row[3] is not None else False
    is_email_verified = bool(row[4]) if row[4] is not None else False
    is_phone_verified = bool(row[5]) if row[5] is not None else False
    role_id = row[6] if row[6] is not None else None

    role = _role_from_user_flags(role_id)
    inferred_plan = _plan_from_user_flags(is_email_verified, is_phone_verified) if role == "User" else None
    plan = plan_name if (role == "User" and plan_name) else inferred_plan

    return AdminUser(
        id=user_id,
        name=_name_from_user_row(full_name, email, fallback_index),
        email=email,
        role=role,
        status="Active" if is_active else "Suspended",
        plan=plan,
        organizations=[],
        groups=[],
    )




def _build_users_select(columns: set[str], where_clause: str = "", order_clause: str = "") -> str:
    if "first_name" in columns and "last_name" in columns:
        name_expr = "LTRIM(RTRIM(COALESCE(first_name, '') + ' ' + COALESCE(last_name, '')))"
    else:
        name_column = pick_existing_column(columns, ["full_name", "name", "username", "display_name"])
        name_expr = f"[{name_column}]" if name_column else "NULL"

    is_active_expr = "is_active" if "is_active" in columns else "CAST(0 AS bit)"
    is_email_verified_expr = "is_email_verified" if "is_email_verified" in columns else "CAST(0 AS bit)"
    is_phone_verified_expr = "is_phone_verified" if "is_phone_verified" in columns else "CAST(0 AS bit)"
    role_id_expr = "role_id" if "role_id" in columns else "NULL"

    return (
        "SELECT "
        "user_id, "
        "email, "
        f"{name_expr} AS full_name, "
        f"{is_active_expr} AS is_active, "
        f"{is_email_verified_expr} AS is_email_verified, "
        f"{is_phone_verified_expr} AS is_phone_verified, "
        f"{role_id_expr} AS role_id "
        "FROM dbo.[user] "
        f"{where_clause} "
        f"{order_clause}"
    )


def _get_user_row_by_id(cursor: pyodbc.Cursor, user_id: str, columns: set[str]):
    query = _build_users_select(columns, where_clause="WHERE user_id = ?")
    return execute_query(cursor, query, (user_id,)).fetchone()


# ── Organization owner emails ──────────────────────────────────────


def _load_organization_owner_emails(cursor: pyodbc.Cursor) -> dict[str, str]:
    """Return a map of organization_id -> owner email.

    The lookup chain is:
        organization.tenant_id  →  tenant.tenant_id (== user.user_id)  →  user.email
    """
    if not (table_exists(cursor, "organization") and table_exists(cursor, "user")):
        return {}

    # Check whether the 'tenant' table exists for the three-table join
    if table_exists(cursor, "tenant"):
        query = """
        SELECT
            o.organization_id,
            u.email
        FROM dbo.organization o
        JOIN dbo.tenant t  ON t.tenant_id  = o.tenant_id
        JOIN dbo.[user]  u ON u.user_id    = t.tenant_id
        WHERE u.email IS NOT NULL
          AND LTRIM(RTRIM(u.email)) <> ''
        """
    else:
        # Fallback: direct join if tenant_id on organization already equals user_id
        query = """
        SELECT
            o.organization_id,
            u.email
        FROM dbo.organization o
        JOIN dbo.[user] u ON u.user_id = o.tenant_id
        WHERE u.email IS NOT NULL
          AND LTRIM(RTRIM(u.email)) <> ''
        """

    rows = execute_query(cursor, query).fetchall()

    owner_emails: dict[str, str] = {}
    for row in rows:
        if row[0] is None:
            continue
        email = str(row[1] or "").strip()
        if not email:
            continue
        owner_emails[str(row[0])] = email

    return owner_emails


# ── Load organizations ──────────────────────────────────────────────


def load_organizations(cursor: pyodbc.Cursor) -> list[OrganizationSummary]:
    if table_exists(cursor, "organization"):
        owner_emails = _load_organization_owner_emails(cursor)

        # Joining with organization_type to get the type name (hotel, restaurant, etc.)
        select_sql = """
        SELECT
            o.organization_id, o.organization_name, ot.type_name,
            CAST(o.created_at AS DATETIME2), CAST(o.updated_at AS DATETIME2)
        FROM dbo.organization o
        LEFT JOIN dbo.organization_type ot ON o.organization_type_id = ot.type_code
        ORDER BY COALESCE(CAST(o.updated_at AS DATETIME2), CAST(o.created_at AS DATETIME2)) DESC, o.organization_id DESC
        """

        rows = execute_query(cursor, select_sql).fetchall()

        organizations: list[OrganizationSummary] = []
        for index, row in enumerate(rows, start=1):
            organization_id = str(row[0]) if row[0] is not None else str(index)
            organization_name = str(row[1]).strip() if row[1] else f"Organization {organization_id}"

            # All organizations are active now
            status = "Active"

            organizations.append(
                OrganizationSummary(
                    id=organization_id,
                    name=organization_name,
                    owner=owner_emails.get(organization_id, ""),
                    usersCount=0, # This can be populated via a separate count if needed
                )
            )

        return organizations

    if table_exists(cursor, "ProcessedReviews"):
        rows = execute_query(
            cursor,
            f"""
            SELECT
                COALESCE(NULLIF(LTRIM(RTRIM(source)), ''), 'Unknown') AS orgName,
                COUNT(DISTINCT NULLIF(LTRIM(RTRIM(userName)), '')) AS usersCount,
                MAX({PROCESSED_ACTIVITY_EXPR}) AS lastSeen
            FROM dbo.ProcessedReviews
            GROUP BY COALESCE(NULLIF(LTRIM(RTRIM(source)), ''), 'Unknown')
            ORDER BY COUNT(*) DESC
            """,
        ).fetchall()

        organizations = []
        for index, row in enumerate(rows, start=1):
            name = str(row[0])
            organizations.append(
                OrganizationSummary(
                    id=str(index),
                    name=name,
                    owner="",
                    usersCount=int(row[1]) if row[1] is not None else 0,
                )
            )

        return organizations

    return []


# ── Load users ──────────────────────────────────────────────────────


def load_users(cursor: pyodbc.Cursor) -> list[AdminUser]:
    if table_exists(cursor, "user"):
        user_plan_map = get_user_plan_map(cursor)
        columns = get_table_columns(cursor, "user")
        if "updated_at" in columns and "created_at" in columns:
            order_clause = "ORDER BY COALESCE(updated_at, created_at) DESC"
        elif "updated_at" in columns:
            order_clause = "ORDER BY updated_at DESC"
        elif "created_at" in columns:
            order_clause = "ORDER BY created_at DESC"
        else:
            order_clause = "ORDER BY user_id DESC"

        rows = execute_query(cursor, _build_users_select(columns, order_clause=order_clause)).fetchall()
        return [
            _frontend_user_from_db_row(
                row,
                index,
                user_plan_map.get(str(row[0])) if row[0] is not None else None,
            )
            for index, row in enumerate(rows, start=1)
        ]

    if not table_exists(cursor, "ProcessedReviews"):
        return []

    rows = execute_query(
        cursor,
        f"""
        SELECT
            NULLIF(LTRIM(RTRIM(userName)), '') AS userName,
            COALESCE(NULLIF(LTRIM(RTRIM(source)), ''), 'Unknown') AS source,
            {PROCESSED_ACTIVITY_EXPR} AS activityDate
        FROM dbo.ProcessedReviews
        WHERE NULLIF(LTRIM(RTRIM(userName)), '') IS NOT NULL
        """,
    ).fetchall()

    user_map: dict[str, dict] = {}
    for row in rows:
        user_name = str(row[0])
        source_name = str(row[1])
        activity_date = to_datetime(row[2])

        if user_name not in user_map:
            user_map[user_name] = {
                "reviewCount": 0,
                "lastActivity": activity_date,
                "organizations": set(),
            }

        user_entry = user_map[user_name]
        user_entry["reviewCount"] += 1
        if source_name != "Unknown":
            user_entry["organizations"].add(source_name)

        last_activity = user_entry["lastActivity"]
        if activity_date and (last_activity is None or activity_date > last_activity):
            user_entry["lastActivity"] = activity_date

    sorted_users = sorted(
        user_map.items(),
        key=lambda item: (-item[1]["reviewCount"], item[0].lower()),
    )

    result: list[AdminUser] = []
    for index, (name, meta) in enumerate(sorted_users, start=1):
        review_count = int(meta["reviewCount"])
        role = _role_from_count(review_count)
        result.append(
            AdminUser(
                id=str(index),
                name=name,
                email=_email_from_name(name, index),
                role=role,
                status=_user_status_from_date(meta["lastActivity"]),
                plan=_plan_from_count(review_count) if role == "User" else None,
                organizations=sorted(list(meta["organizations"])),
                groups=["Review Team"],
            )
        )

    return result


# ── Create user ─────────────────────────────────────────────────────


def create_user_in_db(cursor: pyodbc.Cursor, conn: pyodbc.Connection, payload: AdminUserCreatePayload) -> AdminUser:
    if not table_exists(cursor, "user"):
        raise HTTPException(status_code=400, detail="Table dbo.[user] was not found.")

    if payload.role != "Admin":
        raise HTTPException(status_code=400, detail="Only admin accounts can be created from this panel.")

    if not payload.password or not payload.password.strip():
        raise HTTPException(status_code=400, detail="Password is required.")

    columns = get_table_columns(cursor, "user")

    email = payload.email.strip().lower()
    name = payload.name.strip() if payload.name else ""
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")

    if "user_id" not in columns or "email" not in columns:
        raise HTTPException(status_code=400, detail="Table dbo.[user] must include user_id and email columns.")

    role_id, is_email_verified, is_phone_verified = _flags_for_role_plan(
        payload.role,
        payload.plan,
        current_is_email_verified=False,
        current_is_phone_verified=False,
    )

    user_id = str(uuid.uuid4())
    now = datetime.utcnow()

    insert_fields = ["user_id", "email"]
    insert_values: list[object] = [user_id, email]

    if "password_hash" in columns:
        insert_fields.append("password_hash")
        insert_values.append(hash_password(payload.password))
    else:
        raise HTTPException(status_code=400, detail="Table dbo.users must include password_hash to create admin accounts.")

    # Handle name storage: prefer first_name/last_name split, fall back to single column
    if "first_name" in columns and "last_name" in columns:
        name_parts = name.split(" ", 1) if name else [""]
        insert_fields.append("first_name")
        insert_values.append(name_parts[0] or None)
        insert_fields.append("last_name")
        insert_values.append(name_parts[1] if len(name_parts) > 1 else None)
    else:
        name_column = pick_existing_column(columns, ["full_name", "name", "username", "display_name"])
        if name_column:
            insert_fields.append(name_column)
            insert_values.append(name or None)
    if "phone" in columns:
        insert_fields.append("phone")
        insert_values.append(None)
    if "profile_image_url" in columns:
        insert_fields.append("profile_image_url")
        insert_values.append(None)
    if "is_active" in columns:
        insert_fields.append("is_active")
        insert_values.append(1 if payload.status == "Active" else 0)
    if "is_email_verified" in columns:
        insert_fields.append("is_email_verified")
        insert_values.append(1 if is_email_verified else 0)
    if "is_phone_verified" in columns:
        insert_fields.append("is_phone_verified")
        insert_values.append(1 if is_phone_verified else 0)
    if "role_id" in columns:
        insert_fields.append("role_id")
        insert_values.append(role_id)
    if "last_login_at" in columns:
        insert_fields.append("last_login_at")
        insert_values.append(None)
    if "created_at" in columns:
        insert_fields.append("created_at")
        insert_values.append(now)
    if "updated_at" in columns:
        insert_fields.append("updated_at")
        insert_values.append(now)

    field_sql = ", ".join(insert_fields)
    placeholders = ", ".join(["?"] * len(insert_fields))

    execute_query(
        cursor,
        f"INSERT INTO dbo.[user] ({field_sql}) VALUES ({placeholders})",
        tuple(insert_values),
    )
    conn.commit()

    row = _get_user_row_by_id(cursor, user_id, columns)
    if row is None:
        raise HTTPException(status_code=500, detail="User was created but could not be loaded.")

    if payload.role == "User" and payload.plan:
        set_user_subscription_plan(cursor, user_id, payload.plan)
        conn.commit()
        row = _get_user_row_by_id(cursor, user_id, columns)

    user_plan_map = get_user_plan_map(cursor)
    plan_name = user_plan_map.get(user_id)

    return _frontend_user_from_db_row(row, 1, plan_name)


# ── Update user ─────────────────────────────────────────────────────


def update_user_in_db(cursor: pyodbc.Cursor, conn: pyodbc.Connection, user_id: str, payload: AdminUserUpdatePayload) -> AdminUser:
    if not table_exists(cursor, "user"):
        raise HTTPException(status_code=400, detail="Table dbo.[user] was not found.")

    columns = get_table_columns(cursor, "user")

    existing_row = _get_user_row_by_id(cursor, user_id, columns)
    if existing_row is None:
        raise HTTPException(status_code=404, detail="User not found.")

    current_email = str(existing_row[1] or "").strip()
    current_name = str(existing_row[2]).strip() if existing_row[2] else None
    current_is_active = bool(existing_row[3]) if existing_row[3] is not None else False
    current_is_email_verified = bool(existing_row[4]) if existing_row[4] is not None else False
    current_is_phone_verified = bool(existing_row[5]) if existing_row[5] is not None else False
    current_role_id = existing_row[6] if existing_row[6] is not None else TENANT_ROLE_ID

    current_role = _role_from_user_flags(current_role_id)
    current_status = "Active" if current_is_active else "Suspended"

    next_email = current_email
    if payload.email is not None:
        candidate_email = payload.email.strip().lower()
        if not candidate_email:
            raise HTTPException(status_code=400, detail="Email cannot be empty.")
        next_email = candidate_email

    next_name = current_name
    if payload.name is not None:
        cleaned_name = payload.name.strip()
        next_name = cleaned_name or None

    next_role = payload.role or current_role
    next_status = payload.status or current_status
    next_role_id, next_is_email_verified, next_is_phone_verified = _flags_for_role_plan(
        next_role,
        payload.plan,
        current_is_email_verified=current_is_email_verified,
        current_is_phone_verified=current_is_phone_verified,
    )

    set_clauses: list[str] = []
    params: list[object] = []

    if "email" in columns:
        set_clauses.append("email = ?")
        params.append(next_email)

    # Handle name update: prefer first_name/last_name split, fall back to single column
    if "first_name" in columns and "last_name" in columns:
        if next_name:
            name_parts = next_name.split(" ", 1)
            set_clauses.append("first_name = ?")
            params.append(name_parts[0])
            set_clauses.append("last_name = ?")
            params.append(name_parts[1] if len(name_parts) > 1 else None)
        else:
            set_clauses.append("first_name = ?")
            params.append(None)
            set_clauses.append("last_name = ?")
            params.append(None)
    else:
        name_column = pick_existing_column(columns, ["full_name", "name", "username", "display_name"])
        if name_column:
            set_clauses.append(f"[{name_column}] = ?")
            params.append(next_name)

    if "is_active" in columns:
        set_clauses.append("is_active = ?")
        params.append(1 if next_status == "Active" else 0)

    if "is_email_verified" in columns:
        set_clauses.append("is_email_verified = ?")
        params.append(1 if next_is_email_verified else 0)

    if "is_phone_verified" in columns:
        set_clauses.append("is_phone_verified = ?")
        params.append(1 if next_is_phone_verified else 0)

    if "role_id" in columns:
        set_clauses.append("role_id = ?")
        params.append(next_role_id)

    if "updated_at" in columns:
        set_clauses.append("updated_at = SYSUTCDATETIME()")

    if not set_clauses:
        raise HTTPException(status_code=400, detail="Table dbo.[user] has no updatable admin columns.")

    params.append(user_id)

    execute_query(
        cursor,
        f"UPDATE dbo.[user] SET {', '.join(set_clauses)} WHERE user_id = ?",
        tuple(params),
    )

    if next_role == "User" and payload.plan:
        set_user_subscription_plan(cursor, user_id, payload.plan)
    conn.commit()

    # ── Notify user about admin-initiated plan change ──
    # IMPORTANT: This MUST happen AFTER conn.commit() because the notification
    # helper opens a separate SQLAlchemy session. If called before commit, the
    # pyodbc connection still holds write locks on the user table, and the
    # SQLAlchemy session can deadlock waiting for those locks — freezing the
    # entire backend with no error output.
    if next_role == "User" and payload.plan:
        try:
            from app.services.notification_helpers import notify_plan_changed_by_admin
            notify_plan_changed_by_admin(user_id, payload.plan)
        except Exception:
            pass  # Best-effort

    updated_row = _get_user_row_by_id(cursor, user_id, columns)
    if updated_row is None:
        raise HTTPException(status_code=500, detail="User was updated but could not be loaded.")

    user_plan_map = get_user_plan_map(cursor)
    plan_name = user_plan_map.get(user_id)

    return _frontend_user_from_db_row(updated_row, 1, plan_name)


# ── Delete user ─────────────────────────────────────────────────────


def delete_user_in_db(cursor: pyodbc.Cursor, conn: pyodbc.Connection, user_id: str) -> DeleteUserResponse:
    if not table_exists(cursor, "user"):
        raise HTTPException(status_code=400, detail="Table dbo.[user] was not found.")

    columns = get_table_columns(cursor, "user")

    existing_row = _get_user_row_by_id(cursor, user_id, columns)
    if existing_row is None:
        raise HTTPException(status_code=404, detail="User not found.")

    execute_query(cursor, "DELETE FROM dbo.[user] WHERE user_id = ?", (user_id,))
    conn.commit()

    return DeleteUserResponse(status="success", userId=user_id)


# ── User stats ──────────────────────────────────────────────────────


def get_user_stats(cursor: pyodbc.Cursor) -> UserStatsData:
    if table_exists(cursor, "user"):
        row = execute_query(
            cursor,
            """
            SELECT
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS allActiveUsers,
                SUM(CASE WHEN is_active = 1 AND CAST(last_login_at AS date) = CAST(GETDATE() AS date) THEN 1 ELSE 0 END) AS todayActiveUsers,
                SUM(CASE WHEN CAST(created_at AS date) = CAST(GETDATE() AS date) THEN 1 ELSE 0 END) AS todayRegistered
            FROM dbo.[user]
            """,
        ).fetchone()

        return UserStatsData(
            allActiveUsers=int(row[0]) if row and row[0] is not None else 0,
            todayActiveUsers=int(row[1]) if row and row[1] is not None else 0,
            todayRegistered=int(row[2]) if row and row[2] is not None else 0,
        )

    if not table_exists(cursor, "ProcessedReviews"):
        return UserStatsData(allActiveUsers=0, todayActiveUsers=0, todayRegistered=0)

    row = execute_query(
        cursor,
        f"""
        WITH user_activity AS (
            SELECT
                NULLIF(LTRIM(RTRIM(userName)), '') AS userName,
                MAX({PROCESSED_ACTIVITY_EXPR}) AS lastActivity,
                MIN({PROCESSED_ACTIVITY_EXPR}) AS firstActivity
            FROM dbo.ProcessedReviews
            WHERE NULLIF(LTRIM(RTRIM(userName)), '') IS NOT NULL
            GROUP BY NULLIF(LTRIM(RTRIM(userName)), '')
        )
        SELECT
            SUM(CASE WHEN DATEDIFF(day, lastActivity, GETDATE()) <= 30 THEN 1 ELSE 0 END) AS allActiveUsers,
            SUM(CASE WHEN CAST(lastActivity AS date) = CAST(GETDATE() AS date) THEN 1 ELSE 0 END) AS todayActiveUsers,
            SUM(CASE WHEN CAST(firstActivity AS date) = CAST(GETDATE() AS date) THEN 1 ELSE 0 END) AS todayRegistered
        FROM user_activity
        """,
    ).fetchone()

    return UserStatsData(
        allActiveUsers=int(row[0]) if row and row[0] is not None else 0,
        todayActiveUsers=int(row[1]) if row and row[1] is not None else 0,
        todayRegistered=int(row[2]) if row and row[2] is not None else 0,
    )


# ── Organization stats ──────────────────────────────────────────────


def get_organization_stats_data(cursor: pyodbc.Cursor) -> OrganizationStats:
    """Return total count and count added today for organizations."""
    total_count = 0
    added_today = 0

    if table_exists(cursor, "organization"):
        row = execute_query(
            cursor,
            """
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN CAST(created_at AS date) = CAST(GETDATE() AS date) THEN 1 ELSE 0 END) AS addedToday
            FROM dbo.organization
            """,
        ).fetchone()
        if row:
            total_count = int(row[0] or 0)
            added_today = int(row[1] or 0)
    elif table_exists(cursor, "processed_review"):
        total_count = count_scalar(
            cursor,
            "SELECT COUNT(DISTINCT NULLIF(LTRIM(RTRIM(source)), '')) FROM dbo.processed_review",
        )
        # Fallback doesn't track registration dates well
        added_today = 0

    return OrganizationStats(total=total_count, addedToday=added_today)
