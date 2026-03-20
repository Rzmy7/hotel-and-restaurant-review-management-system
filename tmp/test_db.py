import pyodbc
import os
from dotenv import load_dotenv

load_dotenv()

# Build connection string for Driver 18 with Encrypt=no
server = os.getenv("DB_SERVER", "178.128.84.124")
database = os.getenv("DB_NAME", "BookingScraper")
username = os.getenv("DB_UID", "sa")
password = os.getenv("DB_PWD", "Qwer3552")
driver = os.getenv("DB_DRIVER", "ODBC Driver 18 for SQL Server")

conn_str = (
    f"DRIVER={{{driver}}};"
    f"SERVER={server};"
    f"DATABASE={database};"
    f"UID={username};"
    f"PWD={password};"
    "Encrypt=no;"
    "TrustServerCertificate=yes;"
)

print(f"Attempting to connect to {server} with driver {driver}...")
try:
    conn = pyodbc.connect(conn_str, timeout=10)
    print("SUCCESS: Connected to database!")
    conn.close()
except Exception as e:
    print(f"FAILURE: {e}")
