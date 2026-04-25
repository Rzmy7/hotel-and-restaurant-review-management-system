from app.core.db_utils import get_connection_string
import pyodbc

conn = pyodbc.connect(get_connection_string())
cursor = conn.cursor()
cursor.execute("SELECT platform_id, platform_name FROM platform")
for row in cursor.fetchall():
    print(f"ID: {row[0]}, Name: {row[1]}")
conn.close()
