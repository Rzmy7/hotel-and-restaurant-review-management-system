from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.auth_utils import get_current_user
from app.db import get_db

router = APIRouter(prefix="/api", tags=["user"])


@router.get("/user/organizations")
def get_user_orgs(
    db: Session = Depends(get_db),        # ✅ Correct way to get DB session
    user=Depends(get_current_user)        # ✅ Get logged-in user from token
):
    """
    Get all organizations related to the logged-in user
    """

    # Execute raw SQL safely using SQLAlchemy
    result = db.execute(
        text("""
            SELECT o.organization_id, o.organization_name
            FROM dbo.user_organizations uo
            JOIN dbo.organizations_source o 
                ON uo.organization_id = o.organization_id
            WHERE uo.user_id = :user_id
        """),
        {"user_id": user["user_id"]}  # pass parameter safely
    )

    rows = result.fetchall()

    # Convert DB rows to JSON response
    return [
        {
            "organization_id": str(row[0]),   # convert UUID to string
            "organization_name": row[1]
        }
        for row in rows
    ]