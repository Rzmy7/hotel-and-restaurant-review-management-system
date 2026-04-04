from sqlalchemy import text
from app.modules.admin.services.subscription_service import increment_feature_usage
from app.core.db_utils import get_connection_string
import pyodbc


def create_organization(db, user_id, data):
    try:
        name = data.get("name")

        # 1️⃣ Insert organization
        result = db.execute(text("""
            INSERT INTO dbo.organization (organization_name, tenant_id, created_at)
            OUTPUT INSERTED.organization_id
            VALUES (:name, :tenant_id, GETDATE())
        """), {"name": name, "tenant_id": str(user_id)})

        organization_id = result.fetchone()[0]

        # 2️⃣ Insert user-organization mapping
        db.execute(text("""
            INSERT INTO dbo.user_organizations (user_id, organization_id, role, created_at)
            VALUES (:user_id, :org_id, 'owner', GETDATE())
        """), {
            "user_id": user_id,
            "org_id": organization_id
        })

        db.commit()

        # 3️⃣ Increment usage
        try:
            with pyodbc.connect(get_connection_string()) as conn:
                cursor = conn.cursor()
                increment_feature_usage(cursor, str(user_id), "organizations")
                conn.commit()
        except Exception as e:
            print(f"FAILED TO INCREMENT ORG USAGE: {e}")

        return {
            "organization_id": str(organization_id),
            "name": name
        }

    except Exception as e:
        db.rollback()
        print("ERROR:", str(e))
        raise

def get_organization_types(db):
    """Fetch all organization types from the database."""
    result = db.execute(text("SELECT type_code, type_name, description FROM dbo.organization_type"))
    return [{"type_code": row[0], "type_name": row[1], "description": row[2]} for row in result.fetchall()]
