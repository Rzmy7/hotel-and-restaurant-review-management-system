"""
Admin routes — user and organization CRUD.

Migrated from admin-backend/app/admin_router.py.
"""

from datetime import datetime

from app.modules.admin.services.admin_activity_logger import log_admin_activity

import pyodbc
from fastapi import APIRouter, HTTPException

from app.core.db_utils import (
    execute_query,
    get_connection_string,
    get_table_columns,
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
    PaginatedOrganizations,
    PaginatedUsers,
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

router = APIRouter(tags=["Admin - Organizations"])


# ── Organization endpoints ──────────────────────────────────────────


@router.get("/organizations", response_model=PaginatedOrganizations, summary="List all organizations")
def get_organizations(
    page: int = 1,
    limit: int = 8,
    search: str | None = None,
) -> dict:
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            return load_organizations(cursor, page=page, limit=limit, search=search)
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to fetch organizations: {error}")


@router.get("/organizations/stats", response_model=OrganizationStats, summary="Get aggregated organization statistics")
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
                {
                    "source_id": int(row[0]),
                    "platform_name": str(row[1] or "").strip(),
                    "base_url": "",
                }
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
                    "organization_source_id": idx,
                    "source_id": int(row[1]),
                    "platform_name": str(row[2] or "Unknown").strip(),
                    "external_url": str(row[3]).strip() if row[3] else None,
                    "last_synced_at": str(row[4]) if row[4] else None,
                }
                for idx, row in enumerate(rows)
            ]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch org sources: {exc}") from exc


@router.patch("/organizations/{org_id}", summary="Update an organization's name")
def update_organization(org_id: str, payload: OrganizationUpdatePayload) -> dict:
    """Updates an organization's name."""
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Organization name cannot be empty")

    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            if not table_exists(cursor, "organization"):
                raise HTTPException(status_code=400, detail="organization table not found")

            row = execute_query(
                cursor,
                "SELECT TOP 1 organization_id FROM dbo.organization WHERE organization_id = ?",
                (org_id,),
            ).fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="Organization not found")

            org_cols = get_table_columns(cursor, "organization")
            if "updated_at" in org_cols:
                execute_query(
                    cursor,
                    "UPDATE dbo.organization SET organization_name = ?, updated_at = ? WHERE organization_id = ?",
                    (name, datetime.utcnow(), org_id),
                )
            else:
                execute_query(
                    cursor,
                    "UPDATE dbo.organization SET organization_name = ? WHERE organization_id = ?",
                    (name, org_id),
                )
            conn.commit()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to update organization: {exc}") from exc

    log_admin_activity("org_created", "Organization Updated", f"Renamed to '{name}' (ID: {org_id})")
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

            log_admin_activity(
                "org_created",
                "Organization Sources Updated",
                f"{len(payload.sources)} source(s) linked to org {org_id}",
            )

            return [
                {
                    "organization_source_id": idx,
                    "source_id": int(row[1]),
                    "platform_name": str(row[2] or "Unknown").strip(),
                    "external_url": str(row[3]).strip() if row[3] else None,
                    "last_synced_at": str(row[4]) if row[4] else None,
                }
                for idx, row in enumerate(rows)
            ]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to update org sources: {exc}") from exc


@router.delete("/organizations/{org_id}", summary="Delete an organization and its linked data")
def delete_organization(org_id: str) -> dict:
    """Deletes an organization and its linked source entries and reviews."""
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            if not table_exists(cursor, "organization"):
                raise HTTPException(status_code=400, detail="organization table not found")

            row = execute_query(
                cursor,
                "SELECT TOP 1 organization_id, organization_name FROM dbo.organization WHERE organization_id = ?",
                (org_id,),
            ).fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="Organization not found")

            found_name = str(row[1] or "").strip()

            if table_exists(cursor, "source"):
                # Delete all processed reviews that belong to this org's sources
                if table_exists(cursor, "processed_review"):
                    execute_query(
                        cursor,
                        """
                        DELETE FROM dbo.processed_review
                        WHERE source_id IN (
                            SELECT source_id FROM dbo.source WHERE organization_id = ?
                        )
                        """,
                        (org_id,),
                    )

                execute_query(
                    cursor,
                    "DELETE FROM dbo.source WHERE organization_id = ?",
                    (org_id,),
                )

            execute_query(
                cursor,
                "DELETE FROM dbo.organization WHERE organization_id = ?",
                (org_id,),
            )
            conn.commit()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete organization: {exc}") from exc

    log_admin_activity("org_deleted", "Organization Deleted", f"'{found_name}' (ID: {org_id})")
    return {"status": "deleted", "id": org_id, "name": found_name}


# ── User endpoints ──────────────────────────────────────────────────


@router.get("/users", response_model=PaginatedUsers, tags=["Admin - Users"], summary="List all users")
def get_users(
    page: int = 1,
    limit: int = 8,
    search: str | None = None,
    role: str | None = None,
    plan: str | None = None,
    status: str | None = None,
) -> dict:
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            return load_users(
                cursor,
                page=page,
                limit=limit,
                search=search,
                role=role,
                plan=plan,
                status=status,
            )
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to fetch users: {error}")


@router.post("/users", response_model=AdminUser, status_code=201, tags=["Admin - Users"], summary="Create a new user")
def create_user(payload: AdminUserCreatePayload) -> AdminUser:
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            result = create_user_in_db(cursor, conn, payload)
            log_admin_activity(
                "user_joined",
                "Admin Created User",
                f"{payload.email} ({payload.role})",
            )
            return result
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to create user: {error}")


@router.patch("/users/{user_id}", response_model=AdminUser, tags=["Admin - Users"], summary="Update a user's role, status, or plan")
def update_user(user_id: str, payload: AdminUserUpdatePayload) -> AdminUser:
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            result = update_user_in_db(cursor, conn, user_id, payload)
            changes = []
            if payload.role: changes.append(f"role={payload.role}")
            if payload.status: changes.append(f"status={payload.status}")
            if payload.plan: changes.append(f"plan={payload.plan}")
            log_admin_activity(
                "user_joined",
                "User Updated",
                f"User {result.email} updated" + (f" ({', '.join(changes)})" if changes else ""),
            )
            return result
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to update user: {error}")


@router.delete("/users/{user_id}", response_model=DeleteUserResponse, tags=["Admin - Users"], summary="Delete a user")
def delete_user(user_id: str) -> DeleteUserResponse:
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            result = delete_user_in_db(cursor, conn, user_id)
            log_admin_activity(
                "user_deleted",
                "User Deleted",
                f"User ID: {user_id}",
            )
            return result
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to delete user: {error}")


@router.get("/users/stats", response_model=UserStatsData, tags=["Admin - Users"], summary="Get aggregated user statistics")
def get_user_stats_endpoint() -> UserStatsData:
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            return get_user_stats(cursor)
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unable to fetch user stats: {error}")

# ── Embeddings endpoints ────────────────────────────────────────────

@router.post("/embeddings/trigger-pending", tags=["Admin - Organizations"], summary="Trigger embedding for all unembedded reviews")
def trigger_pending_embeddings() -> dict:
    """Manually triggers embedding for all unembedded, processed reviews."""
    try:
        from app.modules.source.services.embedding_client import trigger_embedding_for_source
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            
            # Find all sources that have unembedded reviews
            query = """
                SELECT DISTINCT CAST(source_id AS VARCHAR(36))
                FROM dbo.processed_review
                WHERE is_embedded = 0
            """
            rows = execute_query(cursor, query).fetchall()
            
            source_ids = [row[0] for row in rows if row[0]]
            
            for source_id in source_ids:
                trigger_embedding_for_source(source_id)

            log_admin_activity(
                "embeddings_triggered",
                "Embeddings Triggered",
                f"Triggered embedding for {len(source_ids)} source(s)",
            )
                
            return {
                "triggered_sources_count": len(source_ids),
                "message": f"Successfully triggered embedding for {len(source_ids)} sources"
            }
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to trigger embeddings: {error}")


@router.post("/embeddings/re-embed-all", tags=["Admin - Organizations"], summary="Trigger re-embedding for all processed reviews (whether is_embedded is 0 or 1)")
def re_embed_all_reviews() -> dict:
    """Manually triggers re-embedding for all processed reviews regardless of is_embedded status."""
    try:
        from app.modules.source.services.embedding_client import trigger_embedding_for_source
        with pyodbc.connect(get_connection_string()) as conn:
            cursor = conn.cursor()
            
            # Find all sources that have any processed reviews (is_embedded = 0 or 1)
            query = """
                SELECT DISTINCT CAST(source_id AS VARCHAR(36))
                FROM dbo.processed_review
            """
            rows = execute_query(cursor, query).fetchall()
            
            source_ids = [row[0] for row in rows if row[0]]
            
            for source_id in source_ids:
                trigger_embedding_for_source(source_id, force_all=True)

            log_admin_activity(
                "embeddings_triggered",
                "Re-Embed All Triggered",
                f"Triggered re-embedding for {len(source_ids)} source(s) (all reviews)",
            )
                
            return {
                "triggered_sources_count": len(source_ids),
                "message": f"Successfully triggered re-embedding for {len(source_ids)} sources"
            }
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to trigger re-embedding: {error}")
