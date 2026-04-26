import urllib.parse
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()


def get_engine():
    params = urllib.parse.quote_plus(
        f"DRIVER={{ODBC Driver 18 for SQL Server}};"
        f"SERVER={os.getenv('DB_SERVER')};"
        f"DATABASE={os.getenv('DB_NAME')};"
        f"UID={os.getenv('DB_UID')};"
        f"PWD={os.getenv('DB_PWD')};"
        f"TrustServerCertificate=yes;"
    )
    conn_str = f"mssql+pyodbc:///?odbc_connect={params}"
    return create_engine(conn_str, echo=False)


def check_fks():
    engine = get_engine()
    with engine.connect() as conn:
        print("--- Foreign Keys ---")
        query = """
        SELECT 
            OBJECT_NAME(f.parent_object_id) AS TableName,
            f.name AS ForeignKeyName,
            OBJECT_NAME(f.referenced_object_id) AS ReferencedTableName
        FROM sys.foreign_keys AS f
        """
        result = conn.execute(text(query))
        for row in result:
            print(f"{row[0]} -> {row[2]} ({row[1]})")


if __name__ == "__main__":
    check_fks()
