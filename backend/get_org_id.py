from app.core.pyodbc_connection import get_connection_string
import pyodbc

conn = pyodbc.connect(get_connection_string())
cursor = conn.cursor()
cursor.execute("SELECT TOP 1 organization_id FROM dbo.organization")
row = cursor.fetchone()
if row:
    print(row[0])
conn.close()
