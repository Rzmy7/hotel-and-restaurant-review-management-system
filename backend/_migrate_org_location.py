from app.core.pyodbc_connection import get_connection_string
import pyodbc

conn = pyodbc.connect(get_connection_string(), autocommit=True)
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE dbo.organization ADD location_url NVARCHAR(1000) NULL")
    print("Added location_url")
except pyodbc.Error as e:
    print(f"Skipped location_url: {e}")

try:
    cursor.execute("ALTER TABLE dbo.organization ADD latitude FLOAT NULL")
    print("Added latitude")
except pyodbc.Error as e:
    print(f"Skipped latitude: {e}")

try:
    cursor.execute("ALTER TABLE dbo.organization ADD longitude FLOAT NULL")
    print("Added longitude")
except pyodbc.Error as e:
    print(f"Skipped longitude: {e}")

try:
    cursor.execute("ALTER TABLE dbo.organization DROP COLUMN city")
    print("Dropped city")
except pyodbc.Error as e:
    print(f"Skipped drop city: {e}")

try:
    cursor.execute("ALTER TABLE dbo.organization DROP COLUMN country")
    print("Dropped country")
except pyodbc.Error as e:
    print(f"Skipped drop country: {e}")

print("Migration complete.")
conn.close()
