import pyodbc

def list_tables():
    conn_str = "DRIVER={ODBC Driver 18 for SQL Server};SERVER=178.128.84.124;DATABASE=ReviewMate;UID=sa;PWD=Qwer3552;TrustServerCertificate=yes;Encrypt=no;"
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")
        tables = cursor.fetchall()
        print("Tables in ReviewMate:")
        for table in tables:
            print(f"- {table[0]}")
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_tables()
