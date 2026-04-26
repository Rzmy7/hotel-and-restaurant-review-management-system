import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

from app.core.db_utils import get_connection_string
import pyodbc


def run():
    connection_string = get_connection_string()
    conn = pyodbc.connect(connection_string, autocommit=True)
    cursor = conn.cursor()

    # 1. Add is_2fa_enabled to dbo.user
    print("Checking dbo.[user] for is_2fa_enabled...")
    cursor.execute("""
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'user' AND COLUMN_NAME = 'is_2fa_enabled'
    """)
    if not cursor.fetchone():
        print("Adding is_2fa_enabled column to dbo.[user]...")
        cursor.execute(
            "ALTER TABLE dbo.[user] ADD is_2fa_enabled BIT NOT NULL DEFAULT 0"
        )
    else:
        print("is_2fa_enabled column already exists in dbo.[user].")

    # 2. Add two_factor_token table
    print("Checking if dbo.two_factor_token exists...")
    cursor.execute("""
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'two_factor_token'
    """)
    if not cursor.fetchone():
        print("Creating two_factor_token table...")
        cursor.execute("""
            CREATE TABLE dbo.two_factor_token (
                token_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                user_id UNIQUEIDENTIFIER NOT NULL,
                code NVARCHAR(50) NOT NULL,
                expires_at DATETIME NOT NULL,
                used_at DATETIME NULL,
                created_at DATETIME NOT NULL DEFAULT GETUTCDATE(),
                CONSTRAINT FK_two_factor_token_user FOREIGN KEY (user_id) REFERENCES dbo.[user](user_id) ON DELETE CASCADE
            )
        """)
        print("Table dbo.two_factor_token created successfully.")
    else:
        print("Table dbo.two_factor_token already exists.")

    print("Migration completed.")


if __name__ == "__main__":
    run()
