from app.core.db_utils import get_connection_string
import pyodbc


def run_sql():
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()

    try:
        # Add reply column to processed_review table
        print("Checking for reply column in processed_review...")
        cursor.execute(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'processed_review' AND COLUMN_NAME = 'reply'"
        )
        if not cursor.fetchone():
            print("Adding reply column to processed_review...")
            cursor.execute(
                "ALTER TABLE dbo.processed_review ADD [reply] [nvarchar](max) NULL"
            )
        else:
            print("Reply column already exists in processed_review.")

        conn.commit()
        print("SQL execution successful.")
    except Exception as e:
        conn.rollback()
        print(f"Error executing SQL: {e}")
    finally:
        conn.close()


if __name__ == "__main__":
    run_sql()
