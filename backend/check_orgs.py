from app.core.pyodbc_connection import get_connection_string
import pyodbc, json

conn = pyodbc.connect(get_connection_string())
cur = conn.cursor()

orgs = cur.execute("""
    SELECT o.organization_id, o.organization_name, CAST(o.tenant_id AS VARCHAR(36)) as t_id,
           o.is_competitor,
           (SELECT COUNT(*) FROM dbo.processed_review WHERE organization_id=o.organization_id) as cnt
    FROM dbo.organization o ORDER BY cnt DESC
""").fetchall()

users = cur.execute("SELECT CAST(user_id AS VARCHAR(36)) as uid, first_name, last_name, email FROM dbo.[user]").fetchall()

results = {
    "orgs": [{"name": r.organization_name, "tenant_id": r.t_id, "is_comp": r.is_competitor, "reviews": r.cnt} for r in orgs],
    "users": [{"uid": r.uid, "name": f"{r.first_name} {r.last_name}", "email": r.email} for r in users],
}

with open("org_report.json", "w") as f:
    json.dump(results, f, indent=2)
print("Written to org_report.json")
