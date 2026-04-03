import os
import re
import uuid
from datetime import date, datetime

import pyodbc
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

load_dotenv()

router = APIRouter(prefix="/admin", tags=["Admin Data"])

PROCESSED_ACTIVITY_EXPR = (
    "COALESCE(CAST(lastUpdated AS datetime), CAST(firstSeen AS datetime), "
    "CAST(scrapedAt AS datetime), CAST(reviewDate AS datetime))"
)


class AdminUserCreatePayload(BaseModel):
    name: str
    email: str
    role: str = "User"
    status: str = "Active"
    plan: str | None = None
    organizations: list[str] = []
    groups: list[str] = []


class AdminUserUpdatePayload(BaseModel):
    name: str | None = None
    email: str | None = None
    role: str | None = None
    status: str | None = None
    plan: str | None = None
    organizations: list[str] | None = None
    groups: list[str] | None = None


def _connection_string() -> str:
    return (
        f"DRIVER={{{os.getenv('DB_DRIVER', 'ODBC Driver 17 for SQL Server')}}};"
        f"SERVER={os.getenv('DB_SERVER')};"
        f"DATABASE={os.getenv('DB_NAME')};"
        f"UID={os.getenv('DB_UID')};"
        f"PWD={os.getenv('DB_PWD')};"
        "TrustServerCertificate=yes;"
    )


def _table_exists(cursor: pyodbc.Cursor, table_name: str, schema: str = "dbo") -> bool:
    row = cursor.execute(
        """
        SELECT 1
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        """,
        schema,
        table_name,
    ).fetchone()
    return row is not None


def _get_table_columns(cursor: pyodbc.Cursor, table_name: str, schema: str = "dbo") -> set[str]:
    rows = cursor.execute(
        """
        SELECT LOWER(COLUMN_NAME)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        """,
        schema,
        table_name,
    ).fetchall()
    return {str(row[0]) for row in rows}


def _pick_existing_column(columns: set[str], candidates: list[str]) -> str | None:
    for candidate in candidates:
        if candidate.lower() in columns:
            return candidate
    return None


def _to_datetime(value) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time())
    return None


def _org_status_from_date(value) -> str:
    dt_value = _to_datetime(value)
    if dt_value is None:
        return "Inactive"

    age_in_days = (date.today() - dt_value.date()).days
    if age_in_days <= 7:
        return "Active"
    if age_in_days <= 30:
        return "Pending"
    return "Inactive"


def _user_status_from_date(value) -> str:
    dt_value = _to_datetime(value)
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
    if _to_datetime(deleted_at_value) is not None:
        return "Inactive"

    created_at = _to_datetime(created_at_value)
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
    if review_count >= 10:
        return "Basic"
    return "Free"


def _name_from_user_row(full_name: str | None, email: str, fallback_index: int) -> str:
    if full_name and full_name.strip():
        return full_name.strip()

    local_part = email.split("@")[0] if "@" in email else email
    normalized = re.sub(r"[._-]+", " ", local_part).strip()
    if normalized:
        return normalized.title()

    return f"User {fallback_index}"


def _role_from_user_flags(is_super_admin: bool, is_email_verified: bool, is_phone_verified: bool) -> str:
    if is_super_admin:
        return "Admin"
    return "User"


def _plan_from_user_flags(is_email_verified: bool, is_phone_verified: bool) -> str:
    if is_email_verified and is_phone_verified:
        return "Pro"
    if is_email_verified:
        return "Basic"
    return "Free"


def _normalize_role(value: str | None, fallback: str = "User") -> str:
    if value in {"Admin", "User"}:
        return value
    return fallback


def _normalize_status(value: str | None, fallback: str = "Active") -> str:
    if value in {"Active", "Suspended"}:
        return value
    return fallback


def _flags_for_role_plan(
    role: str,
    plan: str | None,
    current_is_email_verified: bool,
    current_is_phone_verified: bool,
) -> tuple[bool, bool, bool]:
    normalized_role = _normalize_role(role)

    if normalized_role == "Admin":
        return True, True, True

    if plan == "Free":
        return False, False, False
    if plan == "Basic":
        return False, True, False
    if plan in {"Pro", "Enterprise"}:
        return False, True, True

    return False, current_is_email_verified, current_is_phone_verified


def _frontend_user_from_db_row(row, fallback_index: int) -> dict:
    user_id = str(row[0]) if row[0] is not None else str(fallback_index)
    email = str(row[1] or "").strip()
    full_name = str(row[2]).strip() if row[2] else None

    is_active = bool(row[3]) if row[3] is not None else False
    is_email_verified = bool(row[4]) if row[4] is not None else False
    is_phone_verified = bool(row[5]) if row[5] is not None else False
    is_super_admin = (int(row[6]) == 1) if row[6] is not None else False

    role = _role_from_user_flags(is_super_admin, is_email_verified, is_phone_verified)
    user_data = {
        "id": user_id,
        "name": _name_from_user_row(full_name, email, fallback_index),
        "email": email,
        "role": role,
        "status": "Active" if is_active else "Suspended",
        "organizations": [],
        "groups": [],
    }

    if role == "User":
        user_data["plan"] = _plan_from_user_flags(is_email_verified, is_phone_verified)

    return user_data


def _get_user_row_by_id(cursor: pyodbc.Cursor, user_id: str):
    return cursor.execute(
        """
        SELECT
            user_id,
            email,
            LTRIM(RTRIM(COALESCE(first_name, '') + ' ' + COALESCE(last_name, ''))) as full_name,
            is_active,
            is_email_verified,
            is_phone_verified,
            role_id
        FROM dbo.[user]
        WHERE user_id = ?
        """,
        user_id,
    ).fetchone()


def _load_organization_owner_emails(cursor: pyodbc.Cursor) -> dict[str, str]:
    if not _table_exists(cursor, "user_organizations"):
        return {}

    user_org_columns = _get_table_columns(cursor, "user_organizations")
    org_id_column = _pick_existing_column(user_org_columns, ["organization_id"])
    email_column = _pick_existing_column(user_org_columns, ["email"])
    created_column = _pick_existing_column(user_org_columns, ["created_at", "updated_at"])

    if org_id_column is None or email_column is None:
        return {}

    order_by_parts = []
    if created_column:
        order_by_parts.append(f"uo.[{created_column}] DESC")
    order_by_parts.append(f"uo.[{org_id_column}]")
    order_by_sql = ", ".join(order_by_parts)

    rows = cursor.execute(
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
        """
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


def _load_organizations(cursor: pyodbc.Cursor) -> list[dict]:
    if _table_exists(cursor, "organizations"):
        owner_emails = _load_organization_owner_emails(cursor)
        rows = cursor.execute(
            """
            SELECT
                organization_id,
                organization_name,
                country,
                city,
                organization_type,
                created_at,
                updated_at,
                deleted_at
            FROM dbo.organizations
            ORDER BY COALESCE(updated_at, created_at) DESC, organization_id DESC
            """
        ).fetchall()

        organizations = []
        for index, row in enumerate(rows, start=1):
            organization_id = str(row[0]) if row[0] is not None else str(index)
            organization_name = str(row[1]).strip() if row[1] else f"Organization {organization_id}"

            organizations.append(
                {
                    "id": organization_id,
                    "name": organization_name,
                    "owner": owner_emails.get(organization_id, ""),
                    "usersCount": 0,
                    "status": _org_status_from_organization_row(row[5], row[7]),
                }
            )

        return organizations

    if _table_exists(cursor, "reviews"):
        rows = cursor.execute(
            """
            SELECT
                NULLIF(LTRIM(RTRIM(room_name)), '') AS orgName,
                COUNT(*) AS usersCount,
                MAX(CAST(posted_date AS datetime)) AS lastSeen
            FROM dbo.reviews
            WHERE NULLIF(LTRIM(RTRIM(room_name)), '') IS NOT NULL
            GROUP BY NULLIF(LTRIM(RTRIM(room_name)), '')
            ORDER BY COUNT(*) DESC
            """
        ).fetchall()

        organizations = []
        for index, row in enumerate(rows, start=1):
            name = str(row[0])
            organizations.append(
                {
                    "id": str(index),
                    "name": name,
                    "owner": "",
                    "usersCount": int(row[1]) if row[1] is not None else 0,
                    "status": _org_status_from_date(row[2]),
                }
            )

        return organizations

    if _table_exists(cursor, "ProcessedReviews"):
        rows = cursor.execute(
            f"""
            SELECT
                COALESCE(NULLIF(LTRIM(RTRIM(source)), ''), 'Unknown') AS orgName,
                COUNT(DISTINCT NULLIF(LTRIM(RTRIM(userName)), '')) AS usersCount,
                MAX({PROCESSED_ACTIVITY_EXPR}) AS lastSeen
            FROM dbo.ProcessedReviews
            GROUP BY COALESCE(NULLIF(LTRIM(RTRIM(source)), ''), 'Unknown')
            ORDER BY COUNT(*) DESC
            """
        ).fetchall()

        organizations = []
        for index, row in enumerate(rows, start=1):
            name = str(row[0])
            organizations.append(
                {
                    "id": str(index),
                    "name": name,
                    "owner": "",
                    "usersCount": int(row[1]) if row[1] is not None else 0,
                    "status": _org_status_from_date(row[2]),
                }
            )

        return organizations

    return []


@router.get("/organizations")
def get_organizations():
    try:
        with pyodbc.connect(_connection_string()) as conn:
            cursor = conn.cursor()
            return _load_organizations(cursor)
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to fetch organizations: {error}")


@router.get("/organizations/stats")
def get_organization_stats():
    try:
        with pyodbc.connect(_connection_string()) as conn:
            cursor = conn.cursor()
            organizations = _load_organizations(cursor)

            total_count = len(organizations)
            active_count = sum(1 for org in organizations if org["status"] == "Active")
            pending_count = sum(1 for org in organizations if org["status"] == "Pending")

            return {
                "total": total_count,
                "active": active_count,
                "pending": pending_count,
            }
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to fetch organization stats: {error}")


@router.get("/users")
def get_users():
    try:
        with pyodbc.connect(_connection_string()) as conn:
            cursor = conn.cursor()

            if _table_exists(cursor, "user"):
                rows = cursor.execute(
                    """
                    SELECT
                        user_id,
                        email,
                        LTRIM(RTRIM(COALESCE(first_name, '') + ' ' + COALESCE(last_name, ''))) as full_name,
                        is_active,
                        is_email_verified,
                        is_phone_verified,
                        role_id
                    FROM dbo.[user]
                    ORDER BY COALESCE(updated_at, created_at) DESC
                    """
                ).fetchall()
                return [_frontend_user_from_db_row(row, index) for index, row in enumerate(rows, start=1)]

            if not _table_exists(cursor, "ProcessedReviews"):
                return []

            rows = cursor.execute(
                f"""
                SELECT
                    NULLIF(LTRIM(RTRIM(userName)), '') AS userName,
                    COALESCE(NULLIF(LTRIM(RTRIM(source)), ''), 'Unknown') AS source,
                    {PROCESSED_ACTIVITY_EXPR} AS activityDate
                FROM dbo.ProcessedReviews
                WHERE NULLIF(LTRIM(RTRIM(userName)), '') IS NOT NULL
                """
            ).fetchall()

            user_map: dict[str, dict] = {}
            for row in rows:
                user_name = str(row[0])
                source_name = str(row[1])
                activity_date = _to_datetime(row[2])

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

            result = []
            for index, (name, meta) in enumerate(sorted_users, start=1):
                review_count = int(meta["reviewCount"])
                role = _role_from_count(review_count)
                user_data = {
                    "id": str(index),
                    "name": name,
                    "email": _email_from_name(name, index),
                    "role": role,
                    "status": _user_status_from_date(meta["lastActivity"]),
                    "organizations": sorted(list(meta["organizations"])),
                    "groups": ["Review Team"],
                }

                if role == "User":
                    user_data["plan"] = _plan_from_count(review_count)

                result.append(user_data)

            return result

    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to fetch users: {error}")


@router.post("/users")
def create_user(payload: AdminUserCreatePayload):
    try:
        with pyodbc.connect(_connection_string()) as conn:
            cursor = conn.cursor()

            if not _table_exists(cursor, "user"):
                raise HTTPException(status_code=400, detail="Table dbo.[user] was not found.")

            email = payload.email.strip().lower()
            name = payload.name.strip() if payload.name else ""
            if not email:
                raise HTTPException(status_code=400, detail="Email is required.")

            role_str = _normalize_role(payload.role, "User")
            status = _normalize_status(payload.status, "Active")
            is_super_admin, is_email_verified, is_phone_verified = _flags_for_role_plan(
                role_str,
                payload.plan,
                current_is_email_verified=False,
                current_is_phone_verified=False,
            )

            user_id = str(uuid.uuid4())
            now = datetime.utcnow()

            cursor.execute(
                """
                INSERT INTO dbo.[user] (
                    user_id,
                    email,
                    password_hash,
                    first_name,
                    last_name,
                    phone,
                    profile_image_url,
                    is_active,
                    is_email_verified,
                    is_phone_verified,
                    role_id,
                    last_login_at,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                user_id,
                email,
                None,
                name or None,
                '',
                None,
                None,
                1 if status == "Active" else 0,
                1 if is_email_verified else 0,
                1 if is_phone_verified else 0,
                1 if is_super_admin else 2,
                None,
                now,
                now,
            )
            conn.commit()

            row = _get_user_row_by_id(cursor, user_id)
            if row is None:
                raise HTTPException(status_code=500, detail="User was created but could not be loaded.")

            return _frontend_user_from_db_row(row, 1)

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to create user: {error}")


@router.patch("/users/{user_id}")
def update_user(user_id: str, payload: AdminUserUpdatePayload):
    try:
        with pyodbc.connect(_connection_string()) as conn:
            cursor = conn.cursor()

            if not _table_exists(cursor, "users"):
                raise HTTPException(status_code=400, detail="Table dbo.users was not found.")

            existing_row = _get_user_row_by_id(cursor, user_id)
            if existing_row is None:
                raise HTTPException(status_code=404, detail="User not found.")

            current_email = str(existing_row[1] or "").strip()
            current_name = str(existing_row[2]).strip() if existing_row[2] else None
            current_is_active = bool(existing_row[3]) if existing_row[3] is not None else False
            current_is_email_verified = bool(existing_row[4]) if existing_row[4] is not None else False
            current_is_phone_verified = bool(existing_row[5]) if existing_row[5] is not None else False
            current_is_super_admin = bool(existing_row[6]) if existing_row[6] is not None else False

            current_role = _role_from_user_flags(
                current_is_super_admin,
                current_is_email_verified,
                current_is_phone_verified,
            )
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

            next_role = _normalize_role(payload.role, current_role)
            next_status = _normalize_status(payload.status, current_status)
            next_is_super_admin, next_is_email_verified, next_is_phone_verified = _flags_for_role_plan(
                next_role,
                payload.plan,
                current_is_email_verified=current_is_email_verified,
                current_is_phone_verified=current_is_phone_verified,
            )

            cursor.execute(
                """
                UPDATE dbo.[user]
                SET
                    email = ?,
                    first_name = ?,
                    is_active = ?,
                    is_email_verified = ?,
                    is_phone_verified = ?,
                    role_id = ?,
                    updated_at = SYSUTCDATETIME()
                WHERE user_id = ?
                """,
                next_email,
                next_name,
                1 if next_status == "Active" else 0,
                1 if next_is_email_verified else 0,
                1 if next_is_phone_verified else 0,
                1 if next_is_super_admin else 2,
                user_id,
            )
            conn.commit()

            updated_row = _get_user_row_by_id(cursor, user_id)
            if updated_row is None:
                raise HTTPException(status_code=500, detail="User was updated but could not be loaded.")

            return _frontend_user_from_db_row(updated_row, 1)

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to update user: {error}")


@router.delete("/users/{user_id}")
def delete_user(user_id: str):
    try:
        with pyodbc.connect(_connection_string()) as conn:
            cursor = conn.cursor()

            if not _table_exists(cursor, "user"):
                raise HTTPException(status_code=400, detail="Table dbo.[user] was not found.")

            existing_row = _get_user_row_by_id(cursor, user_id)
            if existing_row is None:
                raise HTTPException(status_code=404, detail="User not found.")

            cursor.execute("DELETE FROM dbo.[user] WHERE user_id = ?", user_id)
            conn.commit()

            return {
                "status": "success",
                "userId": user_id,
            }

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to delete user: {error}")


@router.get("/users/stats")
def get_user_stats():
    try:
        with pyodbc.connect(_connection_string()) as conn:
            cursor = conn.cursor()

            if _table_exists(cursor, "user"):
                row = cursor.execute(
                    """
                    SELECT
                        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS allActiveUsers,
                        SUM(CASE WHEN is_active = 1 AND CAST(last_login_at AS date) = CAST(GETDATE() AS date) THEN 1 ELSE 0 END) AS todayActiveUsers,
                        SUM(CASE WHEN CAST(created_at AS date) = CAST(GETDATE() AS date) THEN 1 ELSE 0 END) AS todayRegistered
                    FROM dbo.[user]
                    """
                ).fetchone()

                return {
                    "allActiveUsers": int(row[0]) if row and row[0] is not None else 0,
                    "todayActiveUsers": int(row[1]) if row and row[1] is not None else 0,
                    "todayRegistered": int(row[2]) if row and row[2] is not None else 0,
                }

            if not _table_exists(cursor, "ProcessedReviews"):
                return {
                    "allActiveUsers": 0,
                    "todayActiveUsers": 0,
                    "todayRegistered": 0,
                }

            row = cursor.execute(
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
                """
            ).fetchone()

            return {
                "allActiveUsers": int(row[0]) if row and row[0] is not None else 0,
                "todayActiveUsers": int(row[1]) if row and row[1] is not None else 0,
                "todayRegistered": int(row[2]) if row and row[2] is not None else 0,
            }

    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to fetch user stats: {error}")
