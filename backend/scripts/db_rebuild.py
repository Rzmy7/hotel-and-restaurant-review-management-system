import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

# Add current directory to path for imports
sys.path.append(os.getcwd())

from app.database.session import Base
# Import ALL models to ensure they are registered with Base.metadata
from app.modules.auth.models import Role, Session as UserSession, PasswordResetToken
from app.modules.user.models.user_models import User
from app.modules.groups.models import Group, GroupMember, GroupMemberRole
from app.modules.source.models import Tenant, Organization, Platform, Source, SyncLog
from app.modules.reviews.models import ProcessedReview, ReviewMedia

from dotenv import load_dotenv

# Load local environment variables
load_dotenv()

# Use DATABASE_URL from .env or fallback for local development
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Use the known connection string format as fallback
    print("No DATABASE_URL found in .env file")
    sys.exit(1)

def wipe_and_rebuild():
    engine = create_engine(DATABASE_URL, connect_args={"timeout": 30})
    
    print("Connecting to database...")
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        # 1. Drop all Foreign Key constraints first
        print("Dropping all foreign key constraints...")
        fk_drop_query = """
            DECLARE @sql NVARCHAR(MAX) = N'';
            SELECT @sql += N'ALTER TABLE ' 
                + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + '.' + QUOTENAME(OBJECT_NAME(parent_object_id)) 
                + ' DROP CONSTRAINT ' + QUOTENAME(name) + ';'
            FROM sys.foreign_keys;
            EXEC sp_executesql @sql;
        """
        try:
            conn.execute(text(fk_drop_query))
            print("Foreign keys dropped.")
        except Exception as e:
            print(f"Note: Error dropping constraints: {e}")

        # 2. Drop all tables
        print("Dropping all tables...")
        table_drop_query = """
            DECLARE @sql NVARCHAR(MAX) = N'';
            SELECT @sql += N'DROP TABLE ' 
                + QUOTENAME(TABLE_SCHEMA) + '.' + QUOTENAME(TABLE_NAME) + ';'
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_SCHEMA = 'dbo';
            EXEC sp_executesql @sql;
        """
        try:
            conn.execute(text(table_drop_query))
            print("All tables dropped.")
        except Exception as e:
            print(f"Error dropping tables: {e}")

    # 3. Re-create all tables from ORM metadata
    print("Re-creating all tables from current ORM metadata...")
    Base.metadata.create_all(engine)
    print(f"Successfully created {len(Base.metadata.tables)} tables.")

    # 4. Seed required roles
    print("Seeding mandatory roles ('tenant', 'admin')...")
    with Session(engine) as session:
        # tenant role (ID 1)
        tenant_role = Role(role_name="tenant", description="Default user role")
        # admin role (ID 2)
        admin_role = Role(role_name="admin", description="System administrator role")
        
        session.add(tenant_role)
        session.add(admin_role)
        session.commit()
        print("Roles seeded successfully.")

    print("\n--- DATABASE REBUILD COMPLETE ---")

if __name__ == "__main__":
    wipe_and_rebuild()
