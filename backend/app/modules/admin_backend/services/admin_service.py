"""
Admin service — business logic for user and organization CRUD.

Migrated from admin-backend/app/admin_router.py.
"""

import re
import uuid
from datetime import date, datetime

import pyodbc
from fastapi import HTTPException
from app.core.security import hash_password

from app.modules.admin_backend.db_utils import (
    execute_query,
    get_connection_string,
    get_table_columns,
    pick_existing_column,
    table_exists,
    to_datetime,
)
from app.modules.admin_backend.schemas import (
    AdminUser,
    AdminUserCreatePayload,
    AdminUserUpdatePayload,
    DeleteUserResponse,
    OrganizationStats,
    OrganizationSummary,
    UserStatsData,
)

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
        return "Pending"
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
        return "Pending"
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


def _role_from_user_flags(is_super_admin: bool) -> str:
    return "Admin" if is_super_admin else "User"


def _plan_from_user_flags(is_email_verified: bool, is_phone_verified: bool) -> str:
    if is_email_verified and is_phone_verified:
        return "Pro"
    return "Free"


def _flags_for_role_plan(
    role: str,
    plan: str | None,
    current_is_email_verified: bool,
    current_is_phone_verified: bool,
) -> tuple[bool, bool, bool]:
    if role == "Admin":
        return True, True, True
    if plan == "Free":
        return False, False, False
    if plan == "Basic":
        # Backward compatibility for stale clients: map deprecated Basic to Free.
        return False, False, False
    if plan in {"Pro", "Enterprise"}:
        return False, True, True
    return False, current_is_email_verified, current_is_phone_verified


def _frontend_user_from_db_row(row, fallback_index: int, plan_name: str | None = None) -> AdminUser:
    user_id = str(row[0]) if row[0] is not None else str(fallback_index)
    email = str(row[1] or "").strip()
    full_name = str(row[2]).strip() if row[2] else None

    is_active = bool(row[3]) if row[3] is not None else False
    is_email_verified = bool(row[4]) if row[4] is not None else False
    is_phone_verified = bool(row[5]) if row[5] is not None else False
    
    db_role_name = str(row[7] or "tenant").lower()
    role: Literal["Admin", "User"] = "Admin" if db_role_name == "admin" else "User"

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


def _load_user_plan_map(cursor: pyodbc.Cursor) -> dict[str, str]:
    if not table_exists(cursor, "user_subscription") or not table_exists(cursor, "plans"):
        return {}

    user_sub_columns = get_table_columns(cursor, "user_subscription")
    if "user_id" not in user_sub_columns or "plan_id" not in user_sub_columns:
        return {}

    order_column = "updated_at" if "updated_at" in user_sub_columns else "created_at" if "created_at" in user_sub_columns else "user_subscription_id"

    rows = execute_query(
        cursor,
        f"""
        WITH ranked_subscriptions AS (
            SELECT
                CAST(us.user_id AS NVARCHAR(64)) AS user_id,
                p.name AS plan_name,
                ROW_NUMBER() OVER (
                    PARTITION BY us.user_id
                    ORDER BY us.[{order_column}] DESC, us.user_subscription_id DESC
                ) AS row_number
            FROM dbo.user_subscription us
            INNER JOIN dbo.plans p
                ON p.plan_id = us.plan_id
            WHERE us.plan_id IS NOT NULL
        )
        SELECT user_id, plan_name
        FROM ranked_subscriptions
        WHERE row_number = 1
        """,
    ).fetchall()

    result: dict[str, str] = {}
    for row in rows:
        user_id = str(row[0] or "").strip()
        plan_name = str(row[1] or "").strip()
        if not user_id or not plan_name:
            continue
        if plan_name.lower() == "basic":
            plan_name = "Free"
        result[user_id] = plan_name
    return result


def _set_user_subscription_plan(cursor: pyodbc.Cursor, user_id: str, plan_name: str) -> None:
    normalized_plan_name = plan_name.strip()
    if normalized_plan_name.lower() == "basic":
        normalized_plan_name = "Free"

    if not normalized_plan_name:
        return
    if not table_exists(cursor, "user_subscription") or not table_exists(cursor, "plans"):
        return

    plan_row = execute_query(
        cursor,
        "SELECT TOP 1 plan_id FROM dbo.plans WHERE name = ?",
        (normalized_plan_name,),
    ).fetchone()
    if plan_row is None or plan_row[0] is None:
        return

    plan_id = int(plan_row[0])
    user_sub_columns = get_table_columns(cursor, "user_subscription")
    has_status = "status" in user_sub_columns
    has_starts_at = "starts_at" in user_sub_columns
    has_ends_at = "ends_at" in user_sub_columns
    has_created_at = "created_at" in user_sub_columns
    has_updated_at = "updated_at" in user_sub_columns

    existing_row = execute_query(
        cursor,
        "SELECT TOP 1 user_subscription_id FROM dbo.user_subscription WHERE user_id = ? ORDER BY COALESCE(updated_at, created_at) DESC, user_subscription_id DESC",
        (user_id,),
    ).fetchone()

    if existing_row and existing_row[0] is not None:
        set_clauses = ["plan_id = ?"]
        params: list[object] = [plan_id]
        if has_status:
            set_clauses.append("status = 'active'")
        if has_ends_at:
            set_clauses.append("ends_at = NULL")
        if has_updated_at:
            set_clauses.append("updated_at = SYSUTCDATETIME()")
        params.append(int(existing_row[0]))
        execute_query(
            cursor,
            f"UPDATE dbo.user_subscription SET {', '.join(set_clauses)} WHERE user_subscription_id = ?",
            tuple(params),
        )
        return

    insert_fields = ["user_id", "plan_id"]
    insert_values: list[object] = [user_id, plan_id]
    if has_status:
        insert_fields.append("status")
        insert_values.append("active")
    if has_starts_at:
        insert_fields.append("starts_at")
        insert_values.append(datetime.utcnow())
    if has_created_at:
        insert_fields.append("created_at")
        insert_values.append(datetime.utcnow())
    if has_updated_at:
        insert_fields.append("updated_at")
        insert_values.append(datetime.utcnow())

    execute_query(
        cursor,
        f"INSERT INTO dbo.user_subscription ({', '.join(insert_fields)}) VALUES ({', '.join(['?'] * len(insert_fields))})",
        tuple(insert_values),
    )


def _build_users_select(columns: set[str], where_clause: str = "", order_clause: str = "") -> str:
    name_column = pick_existing_column(columns, ["full_name", "name", "username", "display_name"])
    name_expr = f"u.[{name_column}]" if name_column else "NULL"
    is_active_expr = "u.is_active" if "is_active" in columns else "CAST(0 AS bit)"
    is_email_verified_expr = "u.is_email_verified" if "is_email_verified" in columns else "CAST(0 AS bit)"
    is_phone_verified_expr = "u.is_phone_verified" if "is_phone_verified" in columns else "CAST(0 AS bit)"
    is_super_admin_expr = "u.is_super_admin" if "is_super_admin" in columns else "CAST(0 AS bit)"

    return (
        "SELECT "
        "u.user_id, "
        "u.email, "
        f"{name_expr} AS full_name, "
        f"{is_active_expr} AS is_active, "
        f"{is_email_verified_expr} AS is_email_verified, "
        f"{is_phone_verified_expr} AS is_phone_verified, "
        f"{is_super_admin_expr} AS is_super_admin, "
        "r.role_name "
        "FROM dbo.[user] u "
        "LEFT JOIN dbo.[role] r ON r.role_id = u.role_id "
        f"{where_clause} "
        f"{order_clause}"
    )


def _get_user_row_by_id(cursor: pyodbc.Cursor, user_id: str, columns: set[str]):
    query = _build_users_select(columns, where_clause="WHERE u.user_id = ?")
    return execute_query(cursor, query, (user_id,)).fetchone()


# ── Organization owner emails ──────────────────────────────────────


def _load_organization_owner_emails(cursor: pyodbc.Cursor) -> dict[str, str]:
    if not table_exists(cursor, "user_organizations"):
        return {}

    user_org_columns = get_table_columns(cursor, "user_organizations")
    org_id_column = pick_existing_column(user_org_columns, ["organization_id"])
    email_column = pick_existing_column(user_org_columns, ["email"])
    created_column = pick_existing_column(user_org_columns, ["created_at", "updated_at"])

    if org_id_column is None or email_column is None:
        return {}

    order_by_parts = []
    if created_column:
        order_by_parts.append(f"uo.[{created_column}] DESC")
    order_by_parts.append(f"uo.[{org_id_column}]")
    order_by_sql = ", ".join(order_by_parts)

    rows = execute_query(
        cursor,
        f"""
        WITH ranked_owners AS (
            SELECT
                uo.[{org_id_column}] AS organization_id,
                uo.[{email_column}] AS email,
                ROW_NUMBER() OVER (
                    PARTITION BY uo.[{org_id_column}]
                    ORDER BY {order_by_sql}
                ) AS row_number
            FROM dbo.user_organizations uo
            WHERE uo.[{email_column}] IS NOT NULL
              AND LTRIM(RTRIM(uo.[{email_column}])) <> ''
        )
        SELECT organization_id, email
        FROM ranked_owners
        WHERE row_number = 1
        """,
    ).fetchall()

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
        org_cols = get_table_columns(cursor, "organization")
        has_is_active = "is_active" in org_cols
        owner_emails = _load_organization_owner_emails(cursor)

        if has_is_active:
            select_sql = """
            SELECT
                organization_id, organization_name, country, city, organization_type,
                created_at, updated_at, deleted_at, is_active
            FROM dbo.organization
            ORDER BY COALESCE(updated_at, created_at) DESC, organization_id DESC
            """
        else:
            select_sql = """
            SELECT
                organization_id, organization_name, country, city, organization_type,
                created_at, updated_at, deleted_at
            FROM dbo.organization
            ORDER BY COALESCE(updated_at, created_at) DESC, organization_id DESC
            """

        rows = execute_query(cursor, select_sql).fetchall()

        organizations: list[OrganizationSummary] = []
        for index, row in enumerate(rows, start=1):
            organization_id = str(row[0]) if row[0] is not None else str(index)
            organization_name = str(row[1]).strip() if row[1] else f"Organization {organization_id}"

            if has_is_active:
                is_active_val = row[8]
                if is_active_val is None:
                    status = "Pending"
                elif bool(is_active_val):
                    status = "Active"
                else:
                    status = "Inactive"
            else:
                status = _org_status_from_organization_row(row[5], row[7])

            organizations.append(
                OrganizationSummary(
                    id=organization_id,
                    name=organization_name,
                    owner=owner_emails.get(organization_id, ""),
                    usersCount=0,
                    status=status,
                )
            )

        return organizations

    if table_exists(cursor, "reviews"):
        rows = execute_query(
            cursor,
            """
            SELECT
                NULLIF(LTRIM(RTRIM(room_name)), '') AS orgName,
                COUNT(*) AS usersCount,
                MAX(CAST(posted_date AS datetime)) AS lastSeen
            FROM dbo.reviews
            WHERE NULLIF(LTRIM(RTRIM(room_name)), '') IS NOT NULL
            GROUP BY NULLIF(LTRIM(RTRIM(room_name)), '')
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
                    status=_org_status_from_date(row[2]),
                )
            )

        return organizations

    if table_exists(cursor, "processed_review"):
        rows = execute_query(
            cursor,
            f"""
            SELECT
                COALESCE(NULLIF(LTRIM(RTRIM(source)), ''), 'Unknown') AS orgName,
                COUNT(DISTINCT NULLIF(LTRIM(RTRIM(userName)), '')) AS usersCount,
                MAX({PROCESSED_ACTIVITY_EXPR}) AS lastSeen
            FROM dbo.processed_review
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
                    status=_org_status_from_date(row[2]),
                )
            )

        return organizations

    return []


# ── Load users ──────────────────────────────────────────────────────


def load_users(cursor: pyodbc.Cursor) -> list[AdminUser]:
    if table_exists(cursor, "[user]"):
        user_plan_map = _load_user_plan_map(cursor)
        columns = get_table_columns(cursor, "[user]")
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

    if not table_exists(cursor, "processed_review"):
        return []

    rows = execute_query(
        cursor,
        f"""
        SELECT
            NULLIF(LTRIM(RTRIM(userName)), '') AS userName,
            COALESCE(NULLIF(LTRIM(RTRIM(source)), ''), 'Unknown') AS source,
            {PROCESSED_ACTIVITY_EXPR} AS activityDate
        FROM dbo.processed_review
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
    if not table_exists(cursor, "[user]"):
        raise HTTPException(status_code=400, detail="Table dbo.[user] was not found.")

    if payload.role != "Admin":
        raise HTTPException(status_code=400, detail="Only admin accounts can be created from this panel.")

    if not payload.password or not payload.password.strip():
        raise HTTPException(status_code=400, detail="Password is required.")

    columns = get_table_columns(cursor, "[user]")

    email = payload.email.strip().lower()
    name = payload.name.strip() if payload.name else ""
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")

    if "user_id" not in columns or "email" not in columns:
        raise HTTPException(status_code=400, detail="Table dbo.[user] must include user_id and email columns.")

    is_super_admin, is_email_verified, is_phone_verified = _flags_for_role_plan(
        payload.role,
        payload.plan,
        current_is_email_verified=False,
        current_is_phone_verified=False,
    )

    user_id = str(uuid.uuid4())
    now = datetime.utcnow()

    name_column = pick_existing_column(columns, ["full_name", "name", "username", "display_name"])

    insert_fields = ["user_id", "email"]
    insert_values: list[object] = [user_id, email]

    db_role_name = "admin" if payload.role == "Admin" else "tenant"
    role_row = execute_query(cursor, "SELECT role_id FROM dbo.[role] WHERE role_name = ?", (db_role_name,)).fetchone()
    if not role_row:
        raise HTTPException(status_code=500, detail=f"Role '{db_role_name}' not found locally.")
    role_id = int(role_row[0])

    if "password_hash" in columns:
        insert_fields.append("password_hash")
        insert_values.append(hash_password(payload.password))
    else:
        raise HTTPException(status_code=400, detail="Table dbo.[user] must include password_hash to create admin accounts.")

    if "role_id" in columns:
        insert_fields.append("role_id")
        insert_values.append(role_id)
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
    if "is_super_admin" in columns:
        insert_fields.append("is_super_admin")
        insert_values.append(1 if is_super_admin else 0)
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
        _set_user_subscription_plan(cursor, user_id, payload.plan)
        conn.commit()
        row = _get_user_row_by_id(cursor, user_id, columns)

    user_plan_map = _load_user_plan_map(cursor)
    plan_name = user_plan_map.get(user_id)

    return _frontend_user_from_db_row(row, 1, plan_name)


# ── Update user ─────────────────────────────────────────────────────


def update_user_in_db(cursor: pyodbc.Cursor, conn: pyodbc.Connection, user_id: str, payload: AdminUserUpdatePayload) -> AdminUser:
    if not table_exists(cursor, "[user]"):
        raise HTTPException(status_code=400, detail="Table dbo.[user] was not found.")

    columns = get_table_columns(cursor, "[user]")

    existing_row = _get_user_row_by_id(cursor, user_id, columns)
    if existing_row is None:
        raise HTTPException(status_code=404, detail="User not found.")

    current_email = str(existing_row[1] or "").strip()
    current_name = str(existing_row[2]).strip() if existing_row[2] else None
    current_is_active = bool(existing_row[3]) if existing_row[3] is not None else False
    current_is_email_verified = bool(existing_row[4]) if existing_row[4] is not None else False
    current_is_phone_verified = bool(existing_row[5]) if existing_row[5] is not None else False
    current_is_super_admin = bool(existing_row[6]) if existing_row[6] is not None else False

    current_role = _role_from_user_flags(current_is_super_admin)
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

    db_role_name = "admin" if next_role == "Admin" else "tenant"
    role_row = execute_query(cursor, "SELECT role_id FROM dbo.[role] WHERE role_name = ?", (db_role_name,)).fetchone()
    if not role_row:
        raise HTTPException(status_code=500, detail=f"Role '{db_role_name}' not found locally.")
    next_role_id = int(role_row[0])

    next_is_super_admin, next_is_email_verified, next_is_phone_verified = _flags_for_role_plan(
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

    if "is_super_admin" in columns:
        set_clauses.append("is_super_admin = ?")
        params.append(1 if next_is_super_admin else 0)

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
        _set_user_subscription_plan(cursor, user_id, payload.plan)
    conn.commit()

    updated_row = _get_user_row_by_id(cursor, user_id, columns)
    if updated_row is None:
        raise HTTPException(status_code=500, detail="User was updated but could not be loaded.")

    user_plan_map = _load_user_plan_map(cursor)
    plan_name = user_plan_map.get(user_id)

    return _frontend_user_from_db_row(updated_row, 1, plan_name)


# ── Delete user ─────────────────────────────────────────────────────


def delete_user_in_db(cursor: pyodbc.Cursor, conn: pyodbc.Connection, user_id: str) -> DeleteUserResponse:
    if not table_exists(cursor, "[user]"):
        raise HTTPException(status_code=400, detail="Table dbo.[user] was not found.")

    columns = get_table_columns(cursor, "[user]")

    existing_row = _get_user_row_by_id(cursor, user_id, columns)
    if existing_row is None:
        raise HTTPException(status_code=404, detail="User not found.")

    execute_query(cursor, "DELETE FROM dbo.[user] WHERE user_id = ?", (user_id,))
    conn.commit()

    return DeleteUserResponse(status="success", userId=user_id)


# ── User stats ──────────────────────────────────────────────────────


def get_user_stats(cursor: pyodbc.Cursor) -> UserStatsData:
    if table_exists(cursor, "[user]"):
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

    if not table_exists(cursor, "processed_review"):
        return UserStatsData(allActiveUsers=0, todayActiveUsers=0, todayRegistered=0)

    row = execute_query(
        cursor,
        f"""
        WITH user_activity AS (
            SELECT
                NULLIF(LTRIM(RTRIM(userName)), '') AS userName,
                MAX({PROCESSED_ACTIVITY_EXPR}) AS lastActivity,
                MIN({PROCESSED_ACTIVITY_EXPR}) AS firstActivity
            FROM dbo.processed_review
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
