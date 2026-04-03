"""
Admin routes — user and organization CRUD.

Migrated from admin-backend/app/admin_router.py.
"""

from datetime import datetime

import pyodbc
from fastapi import APIRouter, HTTPException

from app.modules.admin.db_utils import (
    execute_query,
    get_connection_string,
    table_exists,
)
from app.modules.admin.schemas import (
    AdminUser,
    AdminUserCreatePayload,
    AdminUserUpdatePayload,
    DeleteUserResponse,
    OrgSourcesUpdatePayload,
    OrganizationStats,
    OrganizationSummary,
    OrganizationUpdatePayload,
    UserStatsData,
)
from app.modules.admin.services.admin_service import (
    create_user_in_db,
    delete_user_in_db,
    get_user_stats,
    get_organization_stats_data,
    load_organizations,
    load_users,
    update_user_in_db,
)

router = APIRouter(tags=["Admin Data"])


# ── Organization endpoints ──────────────────────────────────────────


@router.get("/organizations", response_model=list[OrganizationSummary])
def get_organizations() -> list[OrganizationSummary]:
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            return load_organizations(cursor)
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to fetch organizations: {error}")


@router.get("/organizations/stats", response_model=OrganizationStats)
def get_organization_stats() -> OrganizationStats:
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            return get_organization_stats_data(cursor)
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to fetch organization stats: {error}")


@router.get("/sources")
def get_all_sources() -> list[dict]:
    """Returns all available platforms."""
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            if not table_exists(cursor, "platform"):
                return []
            rows = execute_query(
                cursor,
                "SELECT platform_id, platform_name FROM dbo.platform ORDER BY platform_name",
            ).fetchall()
            return [
                {"platform_id": int(row[0]), "platform_name": str(row[1] or "").strip()}
                for row in rows
            ]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch platforms: {exc}") from exc


@router.get("/organizations/{org_id}/sources")
def get_org_sources(org_id: str) -> list[dict]:
    """Returns sources linked to an organization."""
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()

            if not table_exists(cursor, "source"):
                return []

            rows = execute_query(
                cursor,
                """
                SELECT s.source_id, s.platform_id, p.platform_name,
                       s.source_url, CAST(s.last_synced_at AS NVARCHAR(50))
                FROM dbo.source s
                JOIN dbo.platform p ON p.platform_id = s.platform_id
                WHERE s.organization_id = ?
                ORDER BY p.platform_name
                """,
                (org_id,),
            ).fetchall()

            return [
                {
                    "source_id": str(row[0]),
                    "platform_id": int(row[1]),
                    "platform_name": str(row[2] or "Unknown").strip(),
                    "source_url": str(row[3]).strip() if row[3] else None,
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
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            if not table_exists(cursor, "organization"):
                raise HTTPException(status_code=400, detail="organization table not found")

            row = execute_query(
                cursor,
                "SELECT TOP 1 organization_id FROM dbo.organization WHERE organization_id = ?",
                (org_id_int,),
            ).fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="Organization not found")

            org_cols = get_table_columns(cursor, "organization")
            if "updated_at" in org_cols:
                execute_query(
                    cursor,
                    "UPDATE dbo.organization SET organization_name = ?, updated_at = ? WHERE organization_id = ?",
                    (name, datetime.utcnow(), org_id_int),
                )
            else:
                execute_query(
                    cursor,
                    "UPDATE dbo.organization SET organization_name = ? WHERE organization_id = ?",
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
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()

            if not table_exists(cursor, "source"):
                raise HTTPException(status_code=400, detail="source table not found")

            # Delete existing sources for the organization
            execute_query(
                cursor,
                "DELETE FROM dbo.source WHERE organization_id = ?",
                (org_id,),
            )

            now = datetime.utcnow()

            for item in payload.sources:
                execute_query(
                    cursor,
                    """
                    INSERT INTO dbo.source
                        (organization_id, platform_id, source_url, created_at)
                    VALUES (?, ?, ?, ?)
                    """,
                    (org_id, item.source_id, item.external_url, now),
                )

            conn.commit()

            rows = execute_query(
                cursor,
                """
                SELECT s.source_id, s.platform_id, p.platform_name,
                       s.source_url, CAST(s.last_synced_at AS DATETIME2)
                FROM dbo.source s
                JOIN dbo.platform p ON p.platform_id = s.platform_id
                WHERE s.organization_id = ?
                ORDER BY p.platform_name
                """,
                (org_id,),
            ).fetchall()

            return [
                {
                    "source_id": str(row[0]),
                    "platform_id": int(row[1]),
                    "platform_name": str(row[2] or "Unknown").strip(),
                    "source_url": str(row[3]).strip() if row[3] else None,
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
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            if not table_exists(cursor, "organization"):
                raise HTTPException(status_code=400, detail="organization table not found")

            row = execute_query(
                cursor,
                "SELECT TOP 1 organization_id, organization_name FROM dbo.organization WHERE organization_id = ?",
                (org_id_int,),
            ).fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="Organization not found")

            found_name = str(row[1] or "").strip()

            if table_exists(cursor, "source"):
                execute_query(
                    cursor,
                    "DELETE FROM dbo.source WHERE organization_id = ?",
                    (org_id_int,),
                )

            execute_query(
                cursor,
                "DELETE FROM dbo.organization WHERE organization_id = ?",
                (org_id_int,),
            )
            conn.commit()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete organization: {exc}") from exc

    return {"status": "deleted", "id": org_id, "name": found_name}


# ── User endpoints ──────────────────────────────────────────────────


@router.get("/users", response_model=list[AdminUser])
def get_users() -> list[AdminUser]:
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            return load_users(cursor)
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to fetch users: {error}")


@router.post("/users", response_model=AdminUser)
def create_user(payload: AdminUserCreatePayload) -> AdminUser:
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            return create_user_in_db(cursor, conn, payload)
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to create user: {error}")


@router.patch("/users/{user_id}", response_model=AdminUser)
def update_user(user_id: str, payload: AdminUserUpdatePayload) -> AdminUser:
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            return update_user_in_db(cursor, conn, user_id, payload)
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to update user: {error}")


@router.delete("/users/{user_id}", response_model=DeleteUserResponse)
def delete_user(user_id: str) -> DeleteUserResponse:
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            return delete_user_in_db(cursor, conn, user_id)
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to delete user: {error}")


@router.get("/users/stats", response_model=UserStatsData)
def get_user_stats_endpoint() -> UserStatsData:
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            return get_user_stats(cursor)
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to fetch user stats: {error}")
