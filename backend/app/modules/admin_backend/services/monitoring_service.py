"""
Monitoring service — business logic for scraping platforms, jobs, and server status.

Migrated from admin-backend/app/monitoring_router.py.
"""

import os
import re
from datetime import date, datetime
from urllib.parse import urlparse

import psutil
import pyodbc
import requests
from dotenv import load_dotenv
from fastapi import HTTPException

from app.modules.admin_backend.db_utils import (
    execute_query,
    get_connection_string,
    get_table_columns,
    is_valid_sql_identifier,
    table_exists,
)
from app.modules.admin_backend.schemas import ScrapingPlatformCreatePayload, ScrapingPlatformUpdatePayload, ScrapingTableAttributePayload

load_dotenv()

DEFAULT_SCRAPING_BACKEND_URL = os.getenv("SCRAPING_BACKEND_URL", "http://localhost:8001").rstrip("/")


# ── Visual helpers ──────────────────────────────────────────────────


def platform_visuals(platform_name: str) -> tuple[str, str]:
    key = platform_name.strip().lower()
    mapping = {
        "booking": ("B", "#003580"),
        "booking.com": ("B", "#003580"),
        "tripadvisor": ("T", "#00AF87"),
        "agoda": ("Ag", "#5E4B8B"),
        "google": ("G", "#4285F4"),
        "google maps": ("G", "#4285F4"),
        "expedia": ("E", "#FFCB00"),
    }
    return mapping.get(key, (platform_name[:2].upper() if platform_name else "P", "#6B7280"))


def to_relative_timestamp_short(value: datetime | date | None) -> str:
    if value is None:
        return "never"
    if isinstance(value, date) and not isinstance(value, datetime):
        value = datetime.combine(value, datetime.min.time())
    now = datetime.now(value.tzinfo) if isinstance(value, datetime) and value.tzinfo else datetime.now()
    delta = now - value
    seconds = int(delta.total_seconds())
    if seconds < 60:
        return "just now"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes}m ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours}h ago"
    days = hours // 24
    return f"{days}d ago"


# ── SQL type helpers ────────────────────────────────────────────────


def normalize_sql_type(raw_type: str) -> str:
    value = (raw_type or "").strip().lower()
    if not value:
        raise HTTPException(status_code=400, detail="Attribute type is required")

    simple_allowed = {
        "int", "bigint", "smallint", "tinyint", "bit", "float", "real",
        "date", "time", "datetime", "datetime2", "smalldatetime", "text", "ntext",
    }
    if value in simple_allowed:
        return value.upper()

    decimal_match = re.fullmatch(r"decimal\((\d{1,2})\s*,\s*(\d{1,2})\)", value)
    if decimal_match:
        precision = int(decimal_match.group(1))
        scale = int(decimal_match.group(2))
        if precision < 1 or precision > 38:
            raise HTTPException(status_code=400, detail="DECIMAL precision must be between 1 and 38")
        if scale < 0 or scale > precision:
            raise HTTPException(status_code=400, detail="DECIMAL scale must be between 0 and precision")
        return f"DECIMAL({precision},{scale})"

    length_match = re.fullmatch(r"(varbinary|varchar|nvarchar|char|nchar)\((max|\d{1,5})\)", value)
    if length_match:
        base_type = length_match.group(1).upper()
        length = length_match.group(2)
        if length == "max":
            return f"{base_type}(MAX)"
        length_value = int(length)
        if length_value <= 0:
            raise HTTPException(status_code=400, detail=f"{base_type} length must be greater than 0")
        if base_type in {"NCHAR", "NVARCHAR"} and length_value > 4000:
            raise HTTPException(status_code=400, detail=f"{base_type} length cannot exceed 4000")
        if base_type in {"CHAR", "VARCHAR", "VARBINARY"} and length_value > 8000:
            raise HTTPException(status_code=400, detail=f"{base_type} length cannot exceed 8000")
        return f"{base_type}({length_value})"

    raise HTTPException(
        status_code=400,
        detail=(
            "Unsupported attribute type. Allowed examples: INT, BIGINT, BIT, DATE, DATETIME, "
            "DECIMAL(10,2), VARCHAR(255), NVARCHAR(255), NVARCHAR(MAX)"
        ),
    )


def sql_type_from_information_schema_row(
    data_type: str | None,
    char_len: int | None,
    numeric_precision: int | None,
    numeric_scale: int | None,
) -> str:
    normalized = (data_type or "").strip().lower()
    if normalized in {"varchar", "nvarchar", "char", "nchar", "varbinary"}:
        if char_len == -1:
            return f"{normalized.upper()}(MAX)"
        if char_len is None:
            return normalized.upper()
        return f"{normalized.upper()}({int(char_len)})"
    if normalized in {"decimal", "numeric"}:
        precision = int(numeric_precision) if numeric_precision is not None else 18
        scale = int(numeric_scale) if numeric_scale is not None else 0
        return f"DECIMAL({precision},{scale})"
    return normalized.upper()


def normalize_table_attributes(attributes: list[ScrapingTableAttributePayload]) -> list[dict[str, str | bool]]:
    if not attributes:
        raise HTTPException(status_code=400, detail="At least one table attribute is required")

    normalized_attrs: list[dict[str, str | bool]] = []
    seen_names: set[str] = set()

    for attr in attributes:
        column_name = (attr.name or "").strip()
        if not is_valid_sql_identifier(column_name):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid attribute name '{column_name}'. Use letters, numbers, and underscore only; must start with letter/underscore.",
            )
        normalized_name = column_name.lower()
        if normalized_name in seen_names:
            raise HTTPException(status_code=400, detail=f"Duplicate attribute name '{column_name}'")
        seen_names.add(normalized_name)

        normalized_attrs.append({
            "name": column_name,
            "type": normalize_sql_type(attr.type),
            "nullable": bool(attr.nullable),
        })

    return normalized_attrs


def fetch_table_attributes(cursor: pyodbc.Cursor, table_name: str | None) -> list[dict[str, str | bool]]:
    sanitized = (table_name or "").strip()
    if not sanitized or not is_valid_sql_identifier(sanitized) or not table_exists(cursor, sanitized):
        return []

    rows = execute_query(
        cursor,
        """
        SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
        """,
        (sanitized,),
    ).fetchall()

    return [
        {
            "name": str(row[0]),
            "type": sql_type_from_information_schema_row(row[1], row[2], row[3], row[4]),
            "nullable": str(row[5] or "YES").upper() == "YES",
        }
        for row in rows
    ]


# ── Table management ────────────────────────────────────────────────


def resolve_sources_review_table_column(columns: set[str]) -> str | None:
    for candidate in (
        "review_table", "table_name", "review_table_name", "reviews_table",
        "source_table", "source_table_name", "target_table", "scrape_table",
    ):
        if candidate in columns:
            return candidate
    return None


def create_dynamic_platform_table(
    cursor: pyodbc.Cursor,
    table_name: str,
    attributes: list[ScrapingTableAttributePayload],
) -> None:
    if not is_valid_sql_identifier(table_name):
        raise HTTPException(
            status_code=400,
            detail="Invalid table name. Use letters, numbers, and underscore only; must start with letter/underscore.",
        )
    if table_exists(cursor, table_name):
        raise HTTPException(status_code=409, detail=f"Table '{table_name}' already exists")
    if not attributes:
        raise HTTPException(status_code=400, detail="At least one table attribute is required")

    column_sql: list[str] = []
    seen_names: set[str] = set()
    for attr in attributes:
        column_name = (attr.name or "").strip()
        if not is_valid_sql_identifier(column_name):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid attribute name '{column_name}'. Use letters, numbers, and underscore only; must start with letter/underscore.",
            )
        normalized_name = column_name.lower()
        if normalized_name in seen_names:
            raise HTTPException(status_code=400, detail=f"Duplicate attribute name '{column_name}'")
        seen_names.add(normalized_name)

        sql_type = normalize_sql_type(attr.type)
        null_sql = "NULL" if attr.nullable else "NOT NULL"
        column_sql.append(f"[{column_name}] {sql_type} {null_sql}")

    create_sql = f"CREATE TABLE dbo.[{table_name}] ({', '.join(column_sql)})"
    try:
        cursor.execute(create_sql)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to create table '{table_name}': {exc}") from exc

    if not table_exists(cursor, table_name):
        raise HTTPException(status_code=500, detail=f"Table '{table_name}' was not created")


def drop_dynamic_platform_table(cursor: pyodbc.Cursor, table_name: str | None) -> None:
    if not table_name:
        return
    sanitized = table_name.strip()
    if not sanitized or not is_valid_sql_identifier(sanitized) or not table_exists(cursor, sanitized):
        return
    try:
        cursor.execute(f"DROP TABLE dbo.[{sanitized}]")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to drop table '{sanitized}': {exc}") from exc


def sync_dynamic_platform_table(
    cursor: pyodbc.Cursor,
    current_table_name: str | None,
    next_table_name: str,
    attributes: list[ScrapingTableAttributePayload],
) -> str:
    target_table_name = (next_table_name or "").strip()
    if not target_table_name:
        raise HTTPException(status_code=400, detail="Table name is required")
    if not is_valid_sql_identifier(target_table_name):
        raise HTTPException(
            status_code=400,
            detail="Invalid table name. Use letters, numbers, and underscore only; must start with letter/underscore.",
        )

    desired_attributes = normalize_table_attributes(attributes)
    desired_by_lower = {str(attr["name"]).lower(): attr for attr in desired_attributes}

    existing_table_name = (current_table_name or "").strip()
    if existing_table_name and not is_valid_sql_identifier(existing_table_name):
        raise HTTPException(status_code=500, detail="Stored platform table name is invalid")
    if existing_table_name and not table_exists(cursor, existing_table_name):
        existing_table_name = ""

    if not existing_table_name:
        if table_exists(cursor, target_table_name):
            raise HTTPException(status_code=409, detail=f"Table '{target_table_name}' already exists")
        create_dynamic_platform_table(cursor, target_table_name, attributes)
        return target_table_name

    if existing_table_name.lower() != target_table_name.lower():
        if table_exists(cursor, target_table_name):
            raise HTTPException(status_code=409, detail=f"Table '{target_table_name}' already exists")
        try:
            cursor.execute("EXEC sp_rename ?, ?", (f"dbo.{existing_table_name}", target_table_name))
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to rename table '{existing_table_name}' to '{target_table_name}': {exc}",
            ) from exc

    if not table_exists(cursor, target_table_name):
        raise HTTPException(status_code=500, detail=f"Table '{target_table_name}' was not found after rename")

    existing_rows = execute_query(
        cursor,
        """
        SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
        """,
        (target_table_name,),
    ).fetchall()

    existing_by_lower: dict[str, dict[str, str | bool]] = {}
    for row in existing_rows:
        column_name = str(row[0])
        existing_by_lower[column_name.lower()] = {
            "name": column_name,
            "type": sql_type_from_information_schema_row(row[1], row[2], row[3], row[4]),
            "nullable": str(row[5] or "YES").upper() == "YES",
        }

    row_count = int(execute_query(cursor, f"SELECT COUNT(1) FROM dbo.[{target_table_name}]").fetchone()[0] or 0)

    for key, desired in desired_by_lower.items():
        existing = existing_by_lower.get(key)
        desired_name = str(desired["name"])
        desired_type = str(desired["type"])
        desired_nullable = bool(desired["nullable"])

        if existing is None:
            if not desired_nullable and row_count > 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot add NOT NULL column '{desired_name}' to non-empty table '{target_table_name}'. Add it as nullable first or clear existing rows.",
                )
            try:
                cursor.execute(
                    f"ALTER TABLE dbo.[{target_table_name}] ADD [{desired_name}] {desired_type} {'NULL' if desired_nullable else 'NOT NULL'}"
                )
            except Exception as exc:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to add column '{desired_name}' on table '{target_table_name}': {exc}",
                ) from exc
            continue

        existing_name = str(existing["name"])
        existing_type = str(existing["type"])
        existing_nullable = bool(existing["nullable"])
        if existing_type != desired_type or existing_nullable != desired_nullable:
            try:
                cursor.execute(
                    f"ALTER TABLE dbo.[{target_table_name}] ALTER COLUMN [{existing_name}] {desired_type} {'NULL' if desired_nullable else 'NOT NULL'}"
                )
            except Exception as exc:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to alter column '{existing_name}' on table '{target_table_name}': {exc}",
                ) from exc

    for key, existing in existing_by_lower.items():
        if key in desired_by_lower:
            continue
        existing_name = str(existing["name"])
        try:
            cursor.execute(f"ALTER TABLE dbo.[{target_table_name}] DROP COLUMN [{existing_name}]")
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to drop column '{existing_name}' from table '{target_table_name}': {exc}",
            ) from exc

    return target_table_name


# ── Platform lookup ─────────────────────────────────────────────────


def find_platform_row(cursor: pyodbc.Cursor, platform_id: str, select_cols_sql: str) -> pyodbc.Row | None:
    try:
        source_id = int(platform_id)
        return execute_query(
            cursor,
            f"SELECT TOP 1 {select_cols_sql} FROM dbo.sources WHERE source_id = ?",
            (source_id,),
        ).fetchone()
    except ValueError:
        return execute_query(
            cursor,
            f"SELECT TOP 1 {select_cols_sql} FROM dbo.sources WHERE LOWER(platform_name) = LOWER(?)",
            (platform_id,),
        ).fetchone()


# ── Fetch & manage platforms ────────────────────────────────────────


def fetch_platforms_from_db() -> list[dict[str, object]]:
    try:
        with pyodbc.connect(get_connection_string()) as connection:
            cursor = connection.cursor()

            if table_exists(cursor, "sources"):
                columns = get_table_columns(cursor, "sources")
                is_active_col = (
                    "is_enabled" if "is_enabled" in columns
                    else "is_active" if "is_active" in columns
                    else None
                )

                select_cols = "source_id, platform_name"
                has_base_url = "base_url" in columns
                if has_base_url:
                    select_cols += ", base_url"
                table_name_col = resolve_sources_review_table_column(columns)
                if table_name_col:
                    select_cols += f", {table_name_col}"

                rows = execute_query(cursor, f"SELECT {select_cols} FROM dbo.sources ORDER BY source_id").fetchall()

                last_synced: dict[int, datetime | date | None] = {}
                if table_exists(cursor, "organization_sources"):
                    org_cols = get_table_columns(cursor, "organization_sources")
                    sync_ts_col = next(
                        (c for c in ("last_synced_at", "synced_at", "updated_at", "last_run_at") if c in org_cols),
                        None,
                    )
                    if sync_ts_col:
                        sync_rows = execute_query(
                            cursor,
                            f"""
                            SELECT source_id, MAX({sync_ts_col}) AS last_synced_at
                            FROM dbo.organization_sources
                            GROUP BY source_id
                            """,
                        ).fetchall()
                        last_synced = {int(row[0]): row[1] for row in sync_rows if row[0] is not None}

                platforms: list[dict[str, object]] = []
                for row in rows:
                    source_id = int(row[0])
                    pname = str(row[1] or "Platform").strip()
                    icon, color = platform_visuals(pname)

                    row_index = 2
                    base_url = ""
                    if has_base_url:
                        base_url = str(row[row_index]).strip() if row[row_index] is not None else ""
                        row_index += 1

                    t_name = ""
                    if table_name_col:
                        t_name = str(row[row_index]).strip() if row[row_index] is not None else ""
                        row_index += 1

                    table_attributes = fetch_table_attributes(cursor, t_name)

                    enabled = True
                    if is_active_col:
                        active_value = execute_query(
                            cursor,
                            f"SELECT TOP 1 {is_active_col} FROM dbo.sources WHERE source_id = ?",
                            (source_id,),
                        ).fetchone()
                        if active_value is not None:
                            enabled = bool(active_value[0])

                    platforms.append({
                        "id": str(source_id),
                        "name": pname,
                        "icon": icon,
                        "color": color,
                        "enabled": enabled,
                        "lastRun": to_relative_timestamp_short(last_synced.get(source_id)),
                        "status": "active" if enabled else "maintenance",
                        "baseUrl": base_url,
                        "tableName": t_name,
                        "attributes": table_attributes,
                    })
                return platforms

            if table_exists(cursor, "ProcessedReviews"):
                rows = execute_query(
                    cursor,
                    """
                    SELECT
                        NULLIF(LTRIM(RTRIM(source)), '') AS platform_name,
                        MAX(COALESCE(
                            CAST(lastUpdated AS datetime),
                            CAST(scrapedAt AS datetime),
                            CAST(reviewDate AS datetime)
                        )) AS last_run
                    FROM dbo.ProcessedReviews
                    WHERE NULLIF(LTRIM(RTRIM(source)), '') IS NOT NULL
                    GROUP BY NULLIF(LTRIM(RTRIM(source)), '')
                    ORDER BY platform_name
                    """,
                ).fetchall()

                platforms = []
                for index, row in enumerate(rows, start=1):
                    pname = str(row[0]).strip()
                    icon, color = platform_visuals(pname)
                    platforms.append({
                        "id": str(index),
                        "name": pname,
                        "icon": icon,
                        "color": color,
                        "enabled": True,
                        "lastRun": to_relative_timestamp_short(row[1]),
                        "status": "active",
                        "baseUrl": "",
                        "tableName": "",
                        "attributes": [],
                    })
                return platforms

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch platforms from database: {exc}") from exc

    return []


def get_platform_details_from_db(platform_id: str) -> dict[str, object]:
    try:
        with pyodbc.connect(get_connection_string()) as connection:
            cursor = connection.cursor()
            if not table_exists(cursor, "sources"):
                raise HTTPException(status_code=400, detail="sources table does not exist in the configured database")

            columns = get_table_columns(cursor, "sources")
            table_name_col = resolve_sources_review_table_column(columns)
            if not table_name_col:
                raise HTTPException(status_code=400, detail="sources table has no review_table or table_name column")

            enabled_col = (
                "is_enabled" if "is_enabled" in columns
                else "is_active" if "is_active" in columns
                else None
            )
            has_base_url = "base_url" in columns

            select_cols = "source_id, platform_name"
            if has_base_url:
                select_cols += ", base_url"
            select_cols += f", {table_name_col}"
            if enabled_col:
                select_cols += f", {enabled_col}"

            row = find_platform_row(cursor, platform_id, select_cols)
            if row is None:
                raise HTTPException(status_code=404, detail=f"Platform '{platform_id}' not found")

            found_id = int(row[0])
            found_name = str(row[1] or "").strip()

            index = 2
            base_url = str(row[index]).strip() if has_base_url and row[index] is not None else ""
            if has_base_url:
                index += 1

            t_name = str(row[index]).strip() if row[index] is not None else ""
            index += 1

            enabled = True
            if enabled_col:
                enabled = bool(row[index]) if row[index] is not None else True

            return {
                "id": str(found_id),
                "name": found_name,
                "baseUrl": base_url,
                "tableName": t_name,
                "attributes": fetch_table_attributes(cursor, t_name),
                "enabled": enabled,
            }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch platform details: {exc}") from exc


def create_platform_in_db(payload: ScrapingPlatformCreatePayload) -> dict[str, str | bool]:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Platform name is required")

    t_name = (payload.tableName or "").strip()
    if not t_name:
        raise HTTPException(status_code=400, detail="Table name is required")
    if not payload.attributes:
        raise HTTPException(status_code=400, detail="At least one table attribute is required")

    base_url = payload.baseUrl.strip() if payload.baseUrl else None

    try:
        with pyodbc.connect(get_connection_string()) as connection:
            cursor = connection.cursor()
            if not table_exists(cursor, "sources"):
                raise HTTPException(status_code=400, detail="sources table does not exist in the configured database")

            columns = get_table_columns(cursor, "sources")
            if "platform_name" not in columns:
                raise HTTPException(status_code=500, detail="sources table is missing required platform_name column")

            existing = execute_query(
                cursor,
                "SELECT TOP 1 source_id FROM dbo.sources WHERE LOWER(platform_name) = LOWER(?)",
                (name,),
            ).fetchone()
            if existing is not None:
                raise HTTPException(status_code=409, detail=f"Platform '{name}' already exists")

            create_dynamic_platform_table(cursor, t_name, payload.attributes)

            insert_columns = ["platform_name"]
            insert_values: list[str | bool | None] = [name]

            if "base_url" in columns:
                insert_columns.append("base_url")
                insert_values.append(base_url)

            table_name_col = resolve_sources_review_table_column(columns)
            if table_name_col:
                insert_columns.append(table_name_col)
                insert_values.append(t_name)

            enabled_col = (
                "is_enabled" if "is_enabled" in columns
                else "is_active" if "is_active" in columns
                else None
            )
            if enabled_col:
                insert_columns.append(enabled_col)
                insert_values.append(payload.enabled)

            placeholders = ", ".join("?" for _ in insert_columns)
            columns_sql = ", ".join(insert_columns)
            execute_query(
                cursor,
                f"INSERT INTO dbo.sources ({columns_sql}) VALUES ({placeholders})",
                tuple(insert_values),
            )
            connection.commit()

            created = execute_query(
                cursor,
                "SELECT TOP 1 source_id FROM dbo.sources WHERE LOWER(platform_name) = LOWER(?) ORDER BY source_id DESC",
                (name,),
            ).fetchone()
            created_id = str(created[0]) if created is not None else name.lower().replace(" ", "-")

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to create platform: {exc}") from exc

    icon, color = platform_visuals(name)
    return {
        "id": created_id,
        "name": name,
        "icon": icon,
        "color": color,
        "enabled": payload.enabled,
        "lastRun": "never",
        "status": "active" if payload.enabled else "maintenance",
    }


def update_platform_in_db(platform_id: str, payload: ScrapingPlatformUpdatePayload) -> dict[str, object]:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Platform name is required")

    t_name = (payload.tableName or "").strip()
    if not t_name:
        raise HTTPException(status_code=400, detail="Table name is required")
    if not payload.attributes:
        raise HTTPException(status_code=400, detail="At least one table attribute is required")

    base_url = payload.baseUrl.strip() if payload.baseUrl else None

    try:
        with pyodbc.connect(get_connection_string()) as connection:
            cursor = connection.cursor()
            if not table_exists(cursor, "sources"):
                raise HTTPException(status_code=400, detail="sources table does not exist in the configured database")

            columns = get_table_columns(cursor, "sources")
            if "platform_name" not in columns:
                raise HTTPException(status_code=500, detail="sources table is missing required platform_name column")

            table_name_col = resolve_sources_review_table_column(columns)
            if not table_name_col:
                raise HTTPException(status_code=400, detail="sources table has no review_table or table_name column")

            enabled_col = (
                "is_enabled" if "is_enabled" in columns
                else "is_active" if "is_active" in columns
                else None
            )
            has_base_url = "base_url" in columns

            select_cols = "source_id, platform_name"
            if has_base_url:
                select_cols += ", base_url"
            select_cols += f", {table_name_col}"
            if enabled_col:
                select_cols += f", {enabled_col}"

            row = find_platform_row(cursor, platform_id, select_cols)
            if row is None:
                raise HTTPException(status_code=404, detail=f"Platform '{platform_id}' not found")

            found_id = int(row[0])
            index = 2
            if has_base_url:
                index += 1
            current_table_name = str(row[index]).strip() if row[index] is not None else ""
            index += 1

            current_enabled = True
            if enabled_col:
                current_enabled = bool(row[index]) if row[index] is not None else True

            duplicate = execute_query(
                cursor,
                "SELECT TOP 1 source_id FROM dbo.sources WHERE LOWER(platform_name) = LOWER(?) AND source_id <> ?",
                (name, found_id),
            ).fetchone()
            if duplicate is not None:
                raise HTTPException(status_code=409, detail=f"Platform '{name}' already exists")

            resolved_table_name = sync_dynamic_platform_table(cursor, current_table_name, t_name, payload.attributes)

            update_columns = ["platform_name = ?"]
            update_values: list[str | bool | None] = [name]

            if has_base_url:
                update_columns.append("base_url = ?")
                update_values.append(base_url)

            update_columns.append(f"{table_name_col} = ?")
            update_values.append(resolved_table_name)

            effective_enabled = current_enabled
            if enabled_col:
                effective_enabled = payload.enabled
                update_columns.append(f"{enabled_col} = ?")
                update_values.append(payload.enabled)

            update_values.append(found_id)
            execute_query(
                cursor,
                f"UPDATE dbo.sources SET {', '.join(update_columns)} WHERE source_id = ?",
                tuple(update_values),
            )
            connection.commit()

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to update platform: {exc}") from exc

    icon, color = platform_visuals(name)
    return {
        "id": str(found_id),
        "name": name,
        "icon": icon,
        "color": color,
        "enabled": effective_enabled,
        "lastRun": "never",
        "status": "active" if effective_enabled else "maintenance",
        "baseUrl": base_url or "",
        "tableName": resolved_table_name,
        "attributes": normalize_table_attributes(payload.attributes),
    }


# ── Server usage ────────────────────────────────────────────────────


def server_usage() -> tuple[float, float]:
    cpu_percent = psutil.cpu_percent(interval=0.2)
    ram_percent = psutil.virtual_memory().percent
    return cpu_percent, ram_percent


# ── Scraping backend proxy ──────────────────────────────────────────


def scraping_backend_get(path: str) -> dict | list:
    target = f"{DEFAULT_SCRAPING_BACKEND_URL}{path}"
    try:
        response = requests.get(target, timeout=8)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Scraping backend request failed for {path}: {exc}") from exc
    try:
        return response.json()
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=f"Invalid JSON from scraping backend for {path}") from exc


def job_status_to_ui(raw_status: str) -> str:
    normalized = (raw_status or "").strip().lower()
    if normalized in {"running", "pending"}:
        return "Running"
    if normalized == "failed":
        return "Failed"
    return "Completed"


def format_job_start_time(value: str | None) -> str:
    if not value:
        return "--"
    try:
        dt_value = datetime.fromisoformat(value)
    except ValueError:
        return value
    return dt_value.strftime("%b %d, %Y %I:%M %p")


def format_duration_from_created_at(value: str | None) -> str:
    if not value:
        return "--"
    try:
        created = datetime.fromisoformat(value)
    except ValueError:
        return "--"
    elapsed = max(0, int((datetime.now(created.tzinfo) - created).total_seconds()))
    minutes = elapsed // 60
    seconds = elapsed % 60
    return f"{minutes}m {seconds:02d}s"


def organization_from_url(url: str | None) -> str:
    if not url:
        return "Unknown"
    parsed = urlparse(url)
    host = parsed.netloc or parsed.path
    host = host.replace("www.", "").strip()
    return host or "Unknown"
