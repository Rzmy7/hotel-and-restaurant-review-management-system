"""
Table Management Endpoints — Scraper Engine
=============================================
Allows the main backend to create review tables dynamically
in the ScraperEngine database.

POST  /api/tables/create   — create a new review table
GET   /api/tables           — list all user-created review tables
DELETE /api/tables/{name}   — drop a review table
"""
import re
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text

from core.config import setup_logger
from core.database import get_engine

logger = setup_logger("tables_api")
router = APIRouter(prefix="/tables", tags=["Table Management"])


# ── Schemas ──────────────────────────────────────────────────────────


class TableColumn(BaseModel):
    name: str
    type: str
    nullable: bool = True


class CreateTableRequest(BaseModel):
    table_name: str = Field(..., min_length=1, max_length=128)
    columns: list[TableColumn] = Field(..., min_length=1)


class CreateTableResponse(BaseModel):
    status: str
    table_name: str
    columns_created: int


# ── Validation helpers ───────────────────────────────────────────────

_VALID_IDENTIFIER = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

_SIMPLE_TYPES = {
    "int", "bigint", "smallint", "tinyint", "bit", "float", "real",
    "date", "time", "datetime", "datetime2", "smalldatetime",
    "text", "ntext", "money", "smallmoney",
    "uniqueidentifier",
}

_PARAMETRIC_TYPE = re.compile(
    r"^(varchar|nvarchar|char|nchar|varbinary)\((max|\d{1,5})\)$",
    re.IGNORECASE,
)

_DECIMAL_TYPE = re.compile(
    r"^(decimal|numeric)\((\d{1,2})\s*,\s*(\d{1,2})\)$",
    re.IGNORECASE,
)


def _is_valid_identifier(name: str) -> bool:
    return bool(_VALID_IDENTIFIER.match(name))


def _validate_sql_type(raw_type: str) -> str:
    """Validate and normalise a SQL type string. Returns the safe type or raises."""
    value = raw_type.strip().lower()

    if value in _SIMPLE_TYPES:
        return value.upper()

    m = _PARAMETRIC_TYPE.match(value)
    if m:
        base = m.group(1).upper()
        length = m.group(2)
        return f"{base}({length.upper()})"

    m = _DECIMAL_TYPE.match(value)
    if m:
        return f"DECIMAL({m.group(2)},{m.group(3)})"

    raise HTTPException(
        status_code=400,
        detail=f"Unsupported column type: '{raw_type}'. "
               f"Allowed: INT, BIGINT, VARCHAR(N), NVARCHAR(N), DECIMAL(P,S), etc.",
    )


# ── Endpoints ────────────────────────────────────────────────────────


@router.post("/create", response_model=CreateTableResponse)
def create_table(payload: CreateTableRequest):
    """
    Creates a new table in the ScraperEngine database with the given
    column definitions. The table is created under the dbo schema.
    """
    table_name = payload.table_name.strip()

    if not _is_valid_identifier(table_name):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid table name '{table_name}'. "
                   "Must start with a letter or underscore, and contain only letters, digits, or underscores.",
        )

    # Validate and build column definitions
    column_defs: list[str] = []
    seen_names: set[str] = set()

    for col in payload.columns:
        col_name = col.name.strip()
        if not _is_valid_identifier(col_name):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid column name '{col_name}'.",
            )

        lowered = col_name.lower()
        if lowered in seen_names:
            raise HTTPException(
                status_code=400,
                detail=f"Duplicate column name '{col_name}'.",
            )
        seen_names.add(lowered)

        sql_type = _validate_sql_type(col.type)
        null_clause = "NULL" if col.nullable else "NOT NULL"
        column_defs.append(f"[{col_name}] {sql_type} {null_clause}")

    # Add an auto-increment primary key
    id_col = "id"
    if id_col.lower() in seen_names:
        id_col = f"{table_name}_id"

    full_columns = [f"[{id_col}] INT IDENTITY(1,1) PRIMARY KEY"] + column_defs

    create_sql = f"CREATE TABLE dbo.[{table_name}] ({', '.join(full_columns)})"

    engine = get_engine()
    try:
        with engine.connect() as conn:
            # Check if table already exists
            exists = conn.execute(
                text(
                    "SELECT 1 FROM INFORMATION_SCHEMA.TABLES "
                    "WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = :tbl"
                ),
                {"tbl": table_name},
            ).fetchone()

            if exists:
                raise HTTPException(
                    status_code=409,
                    detail=f"Table '{table_name}' already exists in the ScraperEngine database.",
                )

            conn.execute(text(create_sql))
            conn.commit()
            logger.info(f"Created table dbo.[{table_name}] with {len(column_defs)} columns")

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Failed to create table '{table_name}': {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create table '{table_name}': {exc}",
        ) from exc

    return CreateTableResponse(
        status="created",
        table_name=table_name,
        columns_created=len(column_defs),
    )


@router.get("")
def list_tables():
    """Lists all user-created review tables (excludes system tables)."""
    system_tables = {
        "sources", "reviews", "review_media", "audit_log",
        "agoda_reviews", "booking_reviews", "google_reviews", "tripadvisor_reviews",
    }

    engine = get_engine()
    try:
        with engine.connect() as conn:
            rows = conn.execute(
                text(
                    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES "
                    "WHERE TABLE_SCHEMA = 'dbo' AND TABLE_TYPE = 'BASE TABLE' "
                    "ORDER BY TABLE_NAME"
                )
            ).fetchall()

            tables = []
            for row in rows:
                name = str(row[0])
                if name.lower() not in system_tables:
                    # Get column count
                    col_count = conn.execute(
                        text(
                            "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS "
                            "WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = :tbl"
                        ),
                        {"tbl": name},
                    ).scalar()

                    # Get row count
                    row_count = conn.execute(
                        text(f"SELECT COUNT(*) FROM dbo.[{name}]")
                    ).scalar()

                    tables.append({
                        "table_name": name,
                        "column_count": col_count,
                        "row_count": row_count,
                    })

            return {"total": len(tables), "tables": tables}

    except Exception as exc:
        logger.error(f"Failed to list tables: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/row-counts")
def get_row_counts(table_names: str | None = None):
    """
    Returns row counts for one or more tables in the ScraperEngine database.

    Query parameter:
      table_names — optional, comma-separated list of table names.
                    If omitted, counts are returned for ALL user-created tables.

    Response: { "counts": { "<table_name>": <int>, ... } }
    """
    engine = get_engine()
    try:
        with engine.connect() as conn:
            if table_names:
                # Filter to explicitly requested names only (validate each one)
                requested = [t.strip() for t in table_names.split(",") if t.strip()]
                invalid = [t for t in requested if not _is_valid_identifier(t)]
                if invalid:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid table name(s): {', '.join(invalid)}",
                    )
                names_to_count = requested
            else:
                # Fall back to all non-system tables
                system_tables = {
                    "sources", "reviews", "review_media", "audit_log",
                    "agoda_reviews", "booking_reviews", "google_reviews", "tripadvisor_reviews",
                }
                rows = conn.execute(
                    text(
                        "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES "
                        "WHERE TABLE_SCHEMA = 'dbo' AND TABLE_TYPE = 'BASE TABLE' "
                        "ORDER BY TABLE_NAME"
                    )
                ).fetchall()
                names_to_count = [
                    str(row[0]) for row in rows
                    if str(row[0]).lower() not in system_tables
                ]

            counts: dict[str, int] = {}
            for name in names_to_count:
                # Table exists check before counting
                exists = conn.execute(
                    text(
                        "SELECT 1 FROM INFORMATION_SCHEMA.TABLES "
                        "WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = :tbl"
                    ),
                    {"tbl": name},
                ).fetchone()
                if exists:
                    count = conn.execute(
                        text(f"SELECT COUNT(*) FROM dbo.[{name}]")
                    ).scalar()
                    counts[name] = int(count or 0)
                else:
                    counts[name] = 0

            return {"counts": counts}

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Failed to get row counts: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/{table_name}")
def drop_table(table_name: str):
    """Drops a user-created review table from the database."""
    system_tables = {
        "sources", "reviews", "review_media", "audit_log",
        "agoda_reviews", "booking_reviews", "google_reviews", "tripadvisor_reviews",
    }

    if not _is_valid_identifier(table_name):
        raise HTTPException(status_code=400, detail=f"Invalid table name '{table_name}'")

    if table_name.lower() in system_tables:
        raise HTTPException(status_code=403, detail=f"Cannot drop system table '{table_name}'")

    engine = get_engine()
    try:
        with engine.connect() as conn:
            exists = conn.execute(
                text(
                    "SELECT 1 FROM INFORMATION_SCHEMA.TABLES "
                    "WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = :tbl"
                ),
                {"tbl": table_name},
            ).fetchone()

            if not exists:
                raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found")

            conn.execute(text(f"DROP TABLE dbo.[{table_name}]"))
            conn.commit()
            logger.info(f"Dropped table dbo.[{table_name}]")

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Failed to drop table '{table_name}': {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))

    return {"status": "dropped", "table_name": table_name}
