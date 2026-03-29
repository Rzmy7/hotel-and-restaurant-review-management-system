import pyodbc
from app.core.pyodbc_connection import get_connection_string

def check_schema():
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()
    cursor.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ProcessedReviews'")
    columns = [row[0] for row in cursor.fetchall()]
    print("Columns:", columns)
    conn.close()

if __name__ == "__main__":
    check_schema()
