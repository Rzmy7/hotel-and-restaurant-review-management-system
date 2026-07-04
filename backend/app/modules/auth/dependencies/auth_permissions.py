from fastapi import Depends, HTTPException, status
from app.modules.auth.constants.roles import SYSTEM_ADMIN, TENANT
from app.core.dependencies import get_current_user


# ---------------------------------------------------
# Require system admin role
# ---------------------------------------------------
def require_admin(current_user=Depends(get_current_user)):

    if current_user["role"] != SYSTEM_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return current_user


# ---------------------------------------------------
# Require tenant role
# ---------------------------------------------------
def require_tenant(current_user=Depends(get_current_user)):

    if current_user["role"] != TENANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant access required"
        )

    return current_user


# ---------------------------------------------------
# Require admin OR tenant
# ---------------------------------------------------
def require_admin_or_tenant(current_user=Depends(get_current_user)):

    if current_user["role"] not in {SYSTEM_ADMIN, TENANT}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    return current_user
