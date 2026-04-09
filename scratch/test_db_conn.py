import pyodbc
import sys

def test_conn():
    server = '178.128.84.124'
    database = 'ReviewMate'
    username = 'sa'
    password = 'Qwer3552'
    driver = '{ODBC Driver 18 for SQL Server}'
    
    # Try different connection strings
    conn_strings = [
        f"DRIVER={driver};SERVER={server};DATABASE={database};UID={username};PWD={password};TrustServerCertificate=yes;Encrypt=no;",
        f"DRIVER={driver};SERVER={server};DATABASE={database};UID={username};PWD={password};TrustServerCertificate=yes;",
        f"DRIVER={driver};SERVER={server};DATABASE={database};UID={username};PWD={password};Encrypt=no;",
        f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={server};DATABASE={database};UID={username};PWD={password};TrustServerCertificate=yes;"
    ]
    
    for i, conn_str in enumerate(conn_strings):
        print(f"Testing Connection String {i+1}...")
        try:
            conn = pyodbc.connect(conn_str, timeout=5)
            print(f"SUCCESS with String {i+1}!")
            cursor = conn.cursor()
            cursor.execute("SELECT @@VERSION")
            row = cursor.fetchone()
            print(f"Version: {row[0]}")
            conn.close()
            return
        except Exception as e:
            print(f"FAILED String {i+1}: {e}")
            print("-" * 20)

if __name__ == "__main__":
    test_conn()
