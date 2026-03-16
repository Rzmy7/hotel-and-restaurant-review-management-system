import re
import uuid
from datetime import date, datetime

import pyodbc
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.dashboard_router import _connection_string, _execute_query, _table_exists
from app.models import (
    AdminUser,
    AdminUserCreatePayload,
    AdminUserUpdatePayload,
    DeleteUserResponse,
    OrganizationStats,
    OrganizationSummary,
    UserStatsData,
)

router = APIRouter(prefix="/admin", tags=["Admin Data"])


class OrganizationUpdatePayload(BaseModel):
    name: str


class OrgSourcesUpdateItem(BaseModel):
    source_id: int
    external_url: str | None = None


class OrgSourcesUpdatePayload(BaseModel):
    sources: list[OrgSourcesUpdateItem]

PROCESSED_ACTIVITY_EXPR = (
    "COALESCE(CAST(lastUpdated AS datetime), CAST(firstSeen AS datetime), "
    "CAST(scrapedAt AS datetime), CAST(reviewDate AS datetime))"
)


def _to_datetime(value) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time())
    return None


def _get_table_columns(cursor: pyodbc.Cursor, table_name: str, schema: str = "dbo") -> set[str]:
    rows = _execute_query(
        cursor,
        """
        SELECT LOWER(COLUMN_NAME)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        """,
        (schema, table_name),
    ).fetchall()
    return {str(row[0]) for row in rows}


def _pick_existing_column(columns: set[str], candidates: list[str]) -> str | None:
    for candidate in candidates:
        if candidate.lower() in columns:
            return candidate
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


def _domain_from_name(name: str, index: int) -> str:
    slug = re.sub(r"[^a-z0-9]+", "", name.lower())
    if not slug:
        slug = f"org{index}"
    return f"{slug}.local"


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


def _role_from_user_flags(is_super_admin: bool) -> str:
    if is_super_admin:
        return "Admin"
    return "User"


def _plan_from_user_flags(is_email_verified: bool, is_phone_verified: bool) -> str:
    if is_email_verified and is_phone_verified:
        return "Pro"
    if is_email_verified:
        return "Basic"
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
        return False, True, False
    if plan in {"Pro", "Enterprise"}:
        return False, True, True

    return False, current_is_email_verified, current_is_phone_verified


def _frontend_user_from_db_row(row, fallback_index: int) -> AdminUser:
    user_id = str(row[0]) if row[0] is not None else str(fallback_index)
    email = str(row[1] or "").strip()
    full_name = str(row[2]).strip() if row[2] else None

    is_active = bool(row[3]) if row[3] is not None else False
    is_email_verified = bool(row[4]) if row[4] is not None else False
    is_phone_verified = bool(row[5]) if row[5] is not None else False
    is_super_admin = bool(row[6]) if row[6] is not None else False

    role = _role_from_user_flags(is_super_admin)
    plan = _plan_from_user_flags(is_email_verified, is_phone_verified) if role == "User" else None

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
    name_column = _pick_existing_column(columns, ["full_name", "name", "username", "display_name"])
    name_expr = f"[{name_column}]" if name_column else "NULL"
    is_active_expr = "is_active" if "is_active" in columns else "CAST(0 AS bit)"
    is_email_verified_expr = "is_email_verified" if "is_email_verified" in columns else "CAST(0 AS bit)"
    is_phone_verified_expr = "is_phone_verified" if "is_phone_verified" in columns else "CAST(0 AS bit)"
    is_super_admin_expr = "is_super_admin" if "is_super_admin" in columns else "CAST(0 AS bit)"

    return (
        "SELECT "
        "user_id, "
        "email, "
        f"{name_expr} AS full_name, "
        f"{is_active_expr} AS is_active, "
        f"{is_email_verified_expr} AS is_email_verified, "
        f"{is_phone_verified_expr} AS is_phone_verified, "
        f"{is_super_admin_expr} AS is_super_admin "
        "FROM dbo.users "
        f"{where_clause} "
        f"{order_clause}"
    )


def _get_user_row_by_id(cursor: pyodbc.Cursor, user_id: str, columns: set[str]):
    query = _build_users_select(columns, where_clause="WHERE user_id = ?")
    return _execute_query(cursor, query, (user_id,)).fetchone()


def _load_organizations(cursor: pyodbc.Cursor) -> list[OrganizationSummary]:
    if _table_exists(cursor, "organizations"):
        rows = _execute_query(
            cursor,
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
            """,
        ).fetchall()

        organizations: list[OrganizationSummary] = []
        for index, row in enumerate(rows, start=1):
            organization_id = str(row[0]) if row[0] is not None else str(index)
            organization_name = str(row[1]).strip() if row[1] else f"Organization {organization_id}"
            country = str(row[2]).strip() if row[2] else ""
            city = str(row[3]).strip() if row[3] else ""
            organization_type = str(row[4]).strip() if row[4] else ""

            location_bits = [value for value in [city, country] if value]
            location_slug = re.sub(r"[^a-z0-9]+", "-", "-".join(location_bits).lower()).strip("-")
            domain = _domain_from_name(organization_name, index)
            if location_slug:
                domain = f"{location_slug}.{domain}"
            elif organization_type:
                type_slug = re.sub(r"[^a-z0-9]+", "-", organization_type.lower()).strip("-")
                if type_slug:
                    domain = f"{type_slug}.{domain}"

            organizations.append(
                OrganizationSummary(
                    id=organization_id,
                    name=organization_name,
                    domain=domain,
                    usersCount=0,
                    status=_org_status_from_organization_row(row[5], row[7]),
                )
            )

        return organizations

    if _table_exists(cursor, "reviews"):
        rows = _execute_query(
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
                    domain=_domain_from_name(name, index),
                    usersCount=int(row[1]) if row[1] is not None else 0,
                    status=_org_status_from_date(row[2]),
                )
            )

        return organizations

    if _table_exists(cursor, "ProcessedReviews"):
        rows = _execute_query(
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
                    domain=_domain_from_name(name, index),
                    usersCount=int(row[1]) if row[1] is not None else 0,
                    status=_org_status_from_date(row[2]),
                )
            )

        return organizations

    return []


@router.get("/organizations", response_model=list[OrganizationSummary])
def get_organizations() -> list[OrganizationSummary]:
    try:
        with pyodbc.connect(_connection_string()) as conn:
            cursor = conn.cursor()
            return _load_organizations(cursor)
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to fetch organizations: {error}")


@router.get("/organizations/stats", response_model=OrganizationStats)
def get_organization_stats() -> OrganizationStats:
    try:
        with pyodbc.connect(_connection_string()) as conn:
            cursor = conn.cursor()
            organizations = _load_organizations(cursor)

            total_count = len(organizations)
            active_count = sum(1 for org in organizations if org.status == "Active")
            pending_count = sum(1 for org in organizations if org.status == "Pending")

            return OrganizationStats(
                total=total_count,
                active=active_count,
                pending=pending_count,
            )
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to fetch organization stats: {error}")


@router.get("/sources")
def get_all_sources() -> list[dict]:
    """Returns all available scraping sources/platforms."""
    try:
        with pyodbc.connect(_connection_string()) as conn:
            cursor = conn.cursor()
            if not _table_exists(cursor, "sources"):
                return []
            rows = _execute_query(
                cursor,
                "SELECT source_id, platform_name FROM dbo.sources ORDER BY platform_name",
            ).fetchall()
            return [
                {"source_id": int(row[0]), "platform_name": str(row[1] or "").strip()}
                for row in rows
            ]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch sources: {exc}") from exc


@router.get("/organizations/{org_id}/sources")
def get_org_sources(org_id: str) -> list[dict]:
    """Returns sources linked to an organization via organization_sources."""
    try:
        org_id_int = int(org_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="org_id must be numeric")

    try:
        with pyodbc.connect(_connection_string()) as conn:
            cursor = conn.cursor()
            if not _table_exists(cursor, "organization_sources"):
                return []

            if _table_exists(cursor, "sources"):
                rows = _execute_query(
                    cursor,
                    """
                    SELECT os.organization_source_id, os.source_id, s.platform_name,
                           os.external_url, os.last_synced_at
                    FROM dbo.organization_sources os
                    JOIN dbo.sources s ON s.source_id = os.source_id
                    WHERE os.organization_id = ?
                    ORDER BY s.platform_name
                    """,
                    (org_id_int,),
                ).fetchall()
            else:
                rows = _execute_query(
                    cursor,
                    """
                    SELECT organization_source_id, source_id, NULL,
                           external_url, last_synced_at
                    FROM dbo.organization_sources
                    WHERE organization_id = ?
                    """,
                    (org_id_int,),
                ).fetchall()

            return [
                {
                    "organization_source_id": int(row[0]),
                    "source_id": int(row[1]),
                    "platform_name": str(row[2] or "Unknown").strip(),
                    "external_url": str(row[3]).strip() if row[3] else None,
                    "last_synced_at": str(row[4]) if row[4] else None,
                }
                for row in rows
            ]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch org sources: {exc}") from exc


@router.patch("/organizations/{org_id}")
def update_organization(org_id: str, payload: OrganizationUpdatePayload) -> dict:
    """Updates an organization's name."""
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Organization name cannot be empty")

    try:
        org_id_int = int(org_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="org_id must be numeric")

    try:
        with pyodbc.connect(_connection_string()) as conn:
            cursor = conn.cursor()
            if not _table_exists(cursor, "organizations"):
                raise HTTPException(status_code=400, detail="organizations table not found")

            row = _execute_query(
                cursor,
                "SELECT TOP 1 organization_id FROM dbo.organizations WHERE organization_id = ?",
                (org_id_int,),
            ).fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="Organization not found")

            org_cols = _get_table_columns(cursor, "organizations")
            if "updated_at" in org_cols:
                _execute_query(
                    cursor,
                    "UPDATE dbo.organizations SET organization_name = ?, updated_at = ? WHERE organization_id = ?",
                    (name, datetime.utcnow(), org_id_int),
                )
            else:
                _execute_query(
                    cursor,
                    "UPDATE dbo.organizations SET organization_name = ? WHERE organization_id = ?",
                    (name, org_id_int),
                )
            conn.commit()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to update organization: {exc}") from exc

    return {"id": org_id, "name": name, "status": "updated"}


@router.put("/organizations/{org_id}/sources")
def update_org_sources(org_id: str, payload: OrgSourcesUpdatePayload) -> list[dict]:
    """Replaces all source links for an organization."""
    try:
        org_id_int = int(org_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="org_id must be numeric")

    try:
        with pyodbc.connect(_connection_string()) as conn:
            cursor = conn.cursor()
            if not _table_exists(cursor, "organization_sources"):
                raise HTTPException(status_code=400, detail="organization_sources table not found")

            _execute_query(
                cursor,
                "DELETE FROM dbo.organization_sources WHERE organization_id = ?",
                (org_id_int,),
            )

            now = datetime.utcnow()
            org_src_cols = _get_table_columns(cursor, "organization_sources")
            has_created_at = "created_at" in org_src_cols

            for item in payload.sources:
                if has_created_at:
                    _execute_query(
                        cursor,
                        """
                        INSERT INTO dbo.organization_sources
                            (organization_id, source_id, external_url, created_at)
                        VALUES (?, ?, ?, ?)
                        """,
                        (org_id_int, item.source_id, item.external_url, now),
                    )
                else:
                    _execute_query(
                        cursor,
                        """
                        INSERT INTO dbo.organization_sources
                            (organization_id, source_id, external_url)
                        VALUES (?, ?, ?)
                        """,
                        (org_id_int, item.source_id, item.external_url),
                    )

            conn.commit()

            if _table_exists(cursor, "sources"):
                rows = _execute_query(
                    cursor,
                    """
                    SELECT os.organization_source_id, os.source_id, s.platform_name,
                           os.external_url, os.last_synced_at
                    FROM dbo.organization_sources os
                    JOIN dbo.sources s ON s.source_id = os.source_id
                    WHERE os.organization_id = ?
                    ORDER BY s.platform_name
                    """,
                    (org_id_int,),
                ).fetchall()
            else:
                rows = []

            return [
                {
                    "organization_source_id": int(row[0]),
                    "source_id": int(row[1]),
                    "platform_name": str(row[2] or "Unknown").strip(),
                    "external_url": str(row[3]).strip() if row[3] else None,
                    "last_synced_at": str(row[4]) if row[4] else None,
                }
                for row in rows
            ]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to update org sources: {exc}") from exc


@router.delete("/organizations/{org_id}")
def delete_organization(org_id: str) -> dict:
    """Deletes an organization and its linked source entries."""
    try:
        org_id_int = int(org_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="org_id must be numeric")

    try:
        with pyodbc.connect(_connection_string()) as conn:
            cursor = conn.cursor()
            if not _table_exists(cursor, "organizations"):
                raise HTTPException(status_code=400, detail="organizations table not found")

            row = _execute_query(
                cursor,
                "SELECT TOP 1 organization_id, organization_name FROM dbo.organizations WHERE organization_id = ?",
                (org_id_int,),
            ).fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="Organization not found")

            found_name = str(row[1] or "").strip()

            if _table_exists(cursor, "organization_sources"):
                _execute_query(
                    cursor,
                    "DELETE FROM dbo.organization_sources WHERE organization_id = ?",
                    (org_id_int,),
                )

            _execute_query(
                cursor,
                "DELETE FROM dbo.organizations WHERE organization_id = ?",
                (org_id_int,),
            )
            conn.commit()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete organization: {exc}") from exc

    return {"status": "deleted", "id": org_id, "name": found_name}


@router.get("/users", response_model=list[AdminUser])
def get_users() -> list[AdminUser]:
    try:
        with pyodbc.connect(_connection_string()) as conn:
            cursor = conn.cursor()

            if _table_exists(cursor, "users"):
                columns = _get_table_columns(cursor, "users")
                if "updated_at" in columns and "created_at" in columns:
                    order_clause = "ORDER BY COALESCE(updated_at, created_at) DESC"
                elif "updated_at" in columns:
                    order_clause = "ORDER BY updated_at DESC"
                elif "created_at" in columns:
                    order_clause = "ORDER BY created_at DESC"
                else:
                    order_clause = "ORDER BY user_id DESC"

                rows = _execute_query(cursor, _build_users_select(columns, order_clause=order_clause)).fetchall()
                return [_frontend_user_from_db_row(row, index) for index, row in enumerate(rows, start=1)]

            if not _table_exists(cursor, "ProcessedReviews"):
                return []

            rows = _execute_query(
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

    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to fetch users: {error}")


@router.post("/users", response_model=AdminUser)
def create_user(payload: AdminUserCreatePayload) -> AdminUser:
    try:
        with pyodbc.connect(_connection_string()) as conn:
            cursor = conn.cursor()

            if not _table_exists(cursor, "users"):
                raise HTTPException(status_code=400, detail="Table dbo.users was not found.")

            columns = _get_table_columns(cursor, "users")

            email = payload.email.strip().lower()
            name = payload.name.strip() if payload.name else ""
            if not email:
                raise HTTPException(status_code=400, detail="Email is required.")

            if "user_id" not in columns or "email" not in columns:
                raise HTTPException(status_code=400, detail="Table dbo.users must include user_id and email columns.")

            is_super_admin, is_email_verified, is_phone_verified = _flags_for_role_plan(
                payload.role,
                payload.plan,
                current_is_email_verified=False,
                current_is_phone_verified=False,
            )

            user_id = str(uuid.uuid4())
            now = datetime.utcnow()

            name_column = _pick_existing_column(columns, ["full_name", "name", "username", "display_name"])

            insert_fields = ["user_id", "email"]
            insert_values: list[object] = [user_id, email]

            if "password_hash" in columns:
                insert_fields.append("password_hash")
                insert_values.append(None)
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

            _execute_query(
                cursor,
                f"INSERT INTO dbo.users ({field_sql}) VALUES ({placeholders})",
                tuple(insert_values),
            )
            conn.commit()

            row = _get_user_row_by_id(cursor, user_id, columns)
            if row is None:
                raise HTTPException(status_code=500, detail="User was created but could not be loaded.")

            return _frontend_user_from_db_row(row, 1)

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to create user: {error}")


@router.patch("/users/{user_id}", response_model=AdminUser)
def update_user(user_id: str, payload: AdminUserUpdatePayload) -> AdminUser:
    try:
        with pyodbc.connect(_connection_string()) as conn:
            cursor = conn.cursor()

            if not _table_exists(cursor, "users"):
                raise HTTPException(status_code=400, detail="Table dbo.users was not found.")

            columns = _get_table_columns(cursor, "users")

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

            name_column = _pick_existing_column(columns, ["full_name", "name", "username", "display_name"])
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

            if "updated_at" in columns:
                set_clauses.append("updated_at = SYSUTCDATETIME()")

            if not set_clauses:
                raise HTTPException(status_code=400, detail="Table dbo.users has no updatable admin columns.")

            params.append(user_id)

            _execute_query(
                cursor,
                f"UPDATE dbo.users SET {', '.join(set_clauses)} WHERE user_id = ?",
                tuple(params),
            )
            conn.commit()

            updated_row = _get_user_row_by_id(cursor, user_id, columns)
            if updated_row is None:
                raise HTTPException(status_code=500, detail="User was updated but could not be loaded.")

            return _frontend_user_from_db_row(updated_row, 1)

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to update user: {error}")


@router.delete("/users/{user_id}", response_model=DeleteUserResponse)
def delete_user(user_id: str) -> DeleteUserResponse:
    try:
        with pyodbc.connect(_connection_string()) as conn:
            cursor = conn.cursor()

            if not _table_exists(cursor, "users"):
                raise HTTPException(status_code=400, detail="Table dbo.users was not found.")

            columns = _get_table_columns(cursor, "users")

            existing_row = _get_user_row_by_id(cursor, user_id, columns)
            if existing_row is None:
                raise HTTPException(status_code=404, detail="User not found.")

            _execute_query(cursor, "DELETE FROM dbo.users WHERE user_id = ?", (user_id,))
            conn.commit()

            return DeleteUserResponse(status="success", userId=user_id)

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to delete user: {error}")


@router.get("/users/stats", response_model=UserStatsData)
def get_user_stats() -> UserStatsData:
    try:
        with pyodbc.connect(_connection_string()) as conn:
            cursor = conn.cursor()

            if _table_exists(cursor, "users"):
                row = _execute_query(
                    cursor,
                    """
                    SELECT
                        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS allActiveUsers,
                        SUM(CASE WHEN is_active = 1 AND CAST(last_login_at AS date) = CAST(GETDATE() AS date) THEN 1 ELSE 0 END) AS todayActiveUsers,
                        SUM(CASE WHEN CAST(created_at AS date) = CAST(GETDATE() AS date) THEN 1 ELSE 0 END) AS todayRegistered
                    FROM dbo.users
                    """,
                ).fetchone()

                return UserStatsData(
                    allActiveUsers=int(row[0]) if row and row[0] is not None else 0,
                    todayActiveUsers=int(row[1]) if row and row[1] is not None else 0,
                    todayRegistered=int(row[2]) if row and row[2] is not None else 0,
                )

            if not _table_exists(cursor, "ProcessedReviews"):
                return UserStatsData(
                    allActiveUsers=0,
                    todayActiveUsers=0,
                    todayRegistered=0,
                )

            row = _execute_query(
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

    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to fetch user stats: {error}")
