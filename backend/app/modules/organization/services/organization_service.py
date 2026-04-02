from sqlalchemy import text

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

        return {
            "organization_id": str(organization_id),
            "name": name
        }

    except Exception as e:
        db.rollback()
        print("ERROR:", str(e))
        raise