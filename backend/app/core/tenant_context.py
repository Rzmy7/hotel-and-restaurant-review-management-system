import logging
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

def resolve_tenant_scope(user, db: Session, client_supplied_org_id: str = None) -> str:
    """
    Standard tenant-resolution flow for multi-tenant property isolation.
    
    1. If user is Admin / SYSTEM_ADMIN:
       - If client_supplied_org_id is provided, return it (permits cross-tenant query).
       - If not provided, use JWT organization_id context.
    2. For normal users:
       - If client_supplied_org_id is provided:
         - Verify ownership: Check if user owns/belongs to this organization.
         - If not owned, raise 403 Forbidden (prevents tenant leakage).
         - If owned, log a Deprecation Warning and return it.
       - If client_supplied_org_id is not provided:
         - Resolve organization_id from the user's JWT claims context.
         - If organization_id is missing in JWT context, fetch user's primary organization from database.
    """
    # ── Extract user attributes defensively ──
    if isinstance(user, dict):
        user_id = user.get("user_id")
        user_role = user.get("role")
        jwt_org_id = user.get("organization_id")
    else:
        user_id = str(user.user_id) if hasattr(user, "user_id") else None
        
        # User model may have 'role' relationship object or 'role_id' integer.
        # Safe extraction of string representation:
        if hasattr(user, "role") and user.role is not None:
            if hasattr(user.role, "role_name"):
                user_role = user.role.role_name
            else:
                user_role = str(user.role)
        else:
            user_role = "TENANT"
            
        jwt_org_id = user.organization_id if hasattr(user, "organization_id") else None

    # Check for empty/missing user_id
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User session is invalid or missing user identifier."
        )

    # Convert UUIDs/strings to string representation
    if client_supplied_org_id:
        client_supplied_org_id = str(client_supplied_org_id).strip()
    if jwt_org_id:
        jwt_org_id = str(jwt_org_id).strip()

    # 1. Admin Override (Admins operate across organizations)
    if user_role in ("SYSTEM_ADMIN", "Admin") and client_supplied_org_id:
        return client_supplied_org_id

    # 2. Parameter Supplied by Normal User -> Verify Ownership
    if client_supplied_org_id:
        # Check if the organization belongs to this user (tenant) or is mapped in user_organizations
        # In the modular monolith schema:
        # User is linked to organization either via organization.tenant_id = user_id (tenant owner)
        # OR via user_organizations mapping (member/admin).
        ownership = db.execute(
            text("""
                SELECT TOP 1 1 
                FROM dbo.organization 
                WHERE organization_id = :org_id 
                  AND (tenant_id = :tenant_id 
                       OR organization_id IN (
                           SELECT organization_id 
                           FROM dbo.user_organizations 
                           WHERE user_id = :tenant_id
                       ))
            """),
            {"org_id": client_supplied_org_id, "tenant_id": user_id}
        ).fetchone()

        if not ownership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this organization."
            )

        logger.debug(
            f"Tenant scope resolved: user_id={user_id}, organization_id={client_supplied_org_id}"
        )
        return client_supplied_org_id

    # 3. Parameter Omitted -> Auto-resolve via JWT context
    if jwt_org_id:
        return jwt_org_id

    # 4. Fallback to DB lookup (find primary organization linked to user's tenant or membership)
    fallback = db.execute(
        text("""
            SELECT TOP 1 organization_id 
            FROM dbo.organization 
            WHERE tenant_id = :tenant_id
            ORDER BY created_at ASC
        """),
        {"tenant_id": user_id}
    ).fetchone()

    if not fallback:
        # Try to locate via user_organizations junction table
        fallback = db.execute(
            text("""
                SELECT TOP 1 organization_id 
                FROM dbo.user_organizations 
                WHERE user_id = :user_id
                ORDER BY joined_at ASC
            """),
            {"user_id": user_id}
        ).fetchone()

    if not fallback:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No organization found for your account. Please complete setup first."
        )

    return str(fallback[0])
