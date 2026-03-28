from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db
from app.modules.auth.utils.auth_utils import get_current_user

router = APIRouter(prefix="/api", tags=["user-organizations"])


@router.get("/user/organizations")
def get_user_organizations(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    user_id = user.user_id

    result = db.execute(
        text("""
            SELECT 
                o.organization_id,
                o.organization_name,
                uo.role
            FROM dbo.user_organizations uo
            JOIN dbo.organizations_source o
                ON uo.organization_id = o.organization_id
            WHERE uo.user_id = :user_id
        """),
        {"user_id": user_id}
    )

    rows = result.fetchall()

    organizations = [
        {
            "organization_id": str(row[0]),  
            "organization_name": row[1],      
            "role": row[2]                  
        }
        for row in rows
    ]

    return organizations