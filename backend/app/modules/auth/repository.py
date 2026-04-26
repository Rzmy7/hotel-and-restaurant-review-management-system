"""
Auth repository — user and role data access.

Merged from users_repo.py and roles_repo.py.
"""

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.modules.auth.models import User, Role
from app.modules.auth.constants.roles import TENANT, SYSTEM_ADMIN

# ── Users ───────────────────────────────────────────────────────────


def _ensure_users_schema_compatibility(db: Session) -> None:
    db.execute(text("""
            IF OBJECT_ID('dbo.[user]', 'U') IS NOT NULL
            BEGIN
                IF COL_LENGTH('dbo.[user]', 'password_hash') IS NULL
                    ALTER TABLE dbo.[user] ADD password_hash NVARCHAR(255) NULL;

                IF COL_LENGTH('dbo.[user]', 'full_name') IS NULL
                BEGIN
                    ALTER TABLE dbo.[user] ADD full_name NVARCHAR(200) NULL;
                END

                IF COL_LENGTH('dbo.[user]', 'full_name') IS NOT NULL
                    AND COL_LENGTH('dbo.[user]', 'name') IS NOT NULL
                BEGIN
                    EXEC(N'
                        UPDATE dbo.[user]
                        SET full_name = [name]
                        WHERE full_name IS NULL AND [name] IS NOT NULL;
                    ');
                END

                IF COL_LENGTH('dbo.[user]', 'phone') IS NULL
                    ALTER TABLE dbo.[user] ADD phone NVARCHAR(30) NULL;

                IF COL_LENGTH('dbo.[user]', 'profile_image_url') IS NULL
                    ALTER TABLE dbo.[user] ADD profile_image_url NVARCHAR(500) NULL;

                IF COL_LENGTH('dbo.[user]', 'google_id') IS NULL
                    ALTER TABLE dbo.[user] ADD google_id NVARCHAR(255) NULL;

                IF COL_LENGTH('dbo.[user]', 'is_active') IS NULL
                    ALTER TABLE dbo.[user] ADD is_active BIT NOT NULL CONSTRAINT DF_users_is_active DEFAULT (1);

                IF COL_LENGTH('dbo.[user]', 'is_email_verified') IS NULL
                    ALTER TABLE dbo.[user] ADD is_email_verified BIT NOT NULL CONSTRAINT DF_users_is_email_verified DEFAULT (0);

                IF COL_LENGTH('dbo.[user]', 'is_phone_verified') IS NULL
                    ALTER TABLE dbo.[user] ADD is_phone_verified BIT NOT NULL CONSTRAINT DF_users_is_phone_verified DEFAULT (0);

                IF COL_LENGTH('dbo.[user]', 'last_login_at') IS NULL
                    ALTER TABLE dbo.[user] ADD last_login_at DATETIME2(7) NULL;

                IF COL_LENGTH('dbo.[user]', 'created_at') IS NULL
                    ALTER TABLE dbo.[user] ADD created_at DATETIME2(7) NOT NULL CONSTRAINT DF_users_created_at DEFAULT SYSUTCDATETIME();

                IF COL_LENGTH('dbo.[user]', 'updated_at') IS NULL
                    ALTER TABLE dbo.[user] ADD updated_at DATETIME2(7) NOT NULL CONSTRAINT DF_users_updated_at DEFAULT SYSUTCDATETIME();

                IF COL_LENGTH('dbo.[user]', 'role_id') IS NULL
                    ALTER TABLE dbo.[user] ADD role_id INT NULL;
            END
            """))
    db.commit()


def _ensure_roles_schema_compatibility(db: Session) -> None:
    db.execute(text("""
            IF OBJECT_ID('dbo.[role]', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.[role] (
                    role_id INT IDENTITY(1,1) NOT NULL
                        CONSTRAINT PK_roles PRIMARY KEY,
                    role_name NVARCHAR(100) NOT NULL
                        CONSTRAINT UQ_roles_role_name UNIQUE,
                    description NVARCHAR(255) NULL,
                    created_at DATETIME2(7) NOT NULL
                        CONSTRAINT DF_roles_created_at DEFAULT SYSUTCDATETIME()
                );
            END
            ELSE
            BEGIN
                IF COL_LENGTH('dbo.[role]', 'description') IS NULL
                    ALTER TABLE dbo.[role] ADD description NVARCHAR(255) NULL;

                IF COL_LENGTH('dbo.[role]', 'created_at') IS NULL
                    ALTER TABLE dbo.[role] ADD created_at DATETIME2(7) NOT NULL CONSTRAINT DF_roles_created_at DEFAULT SYSUTCDATETIME();
            END

            -- Drop legacy user_role if it exists
            IF OBJECT_ID('dbo.user_role', 'U') IS NOT NULL
                DROP TABLE dbo.user_role;
            """))

    db.execute(
        text("""
            IF NOT EXISTS (SELECT 1 FROM dbo.[role] WHERE role_name = :tenant_role)
            BEGIN
                INSERT INTO dbo.[role] (role_name, description)
                VALUES (:tenant_role, 'Default tenant role');
            END

            IF NOT EXISTS (SELECT 1 FROM dbo.[role] WHERE role_name = :system_admin_role)
            BEGIN
                INSERT INTO dbo.[role] (role_name, description)
                VALUES (:system_admin_role, 'System administrator role');
            END
            """),
        {
            "tenant_role": TENANT,
            "system_admin_role": SYSTEM_ADMIN,
        },
    )

    db.commit()


def get_user_by_email(db: Session, email: str):
    _ensure_users_schema_compatibility(db)
    return db.query(User).filter(User.email == email).first()


def create_user(
    db: Session,
    email: str,
    password_hash: str | None = None,
    full_name: str | None = None,
    phone: str | None = None,
    profile_image_url: str | None = None,
    google_id: str | None = None,
    is_email_verified: bool = False,
):
    _ensure_users_schema_compatibility(db)
    _ensure_roles_schema_compatibility(db)
    user = User(
        email=email,
        password_hash=password_hash,
        full_name=full_name,
        phone=phone,
        profile_image_url=profile_image_url,
        google_id=google_id,
        is_email_verified=is_email_verified,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    assign_role_to_user(db, user.user_id, TENANT)

    return user


# ── Roles ───────────────────────────────────────────────────────────


def get_role_by_name(db: Session, role_name: str):
    _ensure_roles_schema_compatibility(db)
    return db.query(Role).filter(Role.role_name == role_name).first()


def assign_role_to_user(db: Session, user_id, role_name: str):
    _ensure_roles_schema_compatibility(db)
    role = get_role_by_name(db, role_name)

    if not role:
        return None

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return None

    user.role_id = role.role_id
    db.commit()
    db.refresh(user)

    return user


def get_user_role_names(db: Session, user_id):
    _ensure_roles_schema_compatibility(db)
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user or not user.role:
        return []

    return [user.role.role_name]


def get_user_primary_role(db: Session, user_id):
    _ensure_roles_schema_compatibility(db)
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user or not user.role:
        return None

    return user.role.role_name


def user_has_role(db: Session, user_id, role_name: str):
    user = (
        db.query(User)
        .join(Role, Role.role_id == User.role_id)
        .filter(User.user_id == user_id, Role.role_name == role_name)
        .first()
    )

    return user is not None
