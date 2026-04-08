"""
Auth repository — user and role data access.

Merged from users_repo.py and roles_repo.py.
"""

from sqlalchemy.orm import Session
from sqlalchemy import text, func
from app.modules.auth.models import User, UserRole, Role
from app.modules.auth.constants.roles import TENANT, SYSTEM_ADMIN


# ── Users ───────────────────────────────────────────────────────────

def _ensure_users_schema_compatibility(db: Session) -> None:
    db.execute(
        text(
            """
            IF OBJECT_ID('dbo.users', 'U') IS NOT NULL
            BEGIN
                IF COL_LENGTH('dbo.users', 'password_hash') IS NULL
                    ALTER TABLE dbo.users ADD password_hash NVARCHAR(255) NULL;

                IF COL_LENGTH('dbo.users', 'full_name') IS NULL
                BEGIN
                    ALTER TABLE dbo.users ADD full_name NVARCHAR(200) NULL;
                END

                IF COL_LENGTH('dbo.users', 'full_name') IS NOT NULL
                    AND COL_LENGTH('dbo.users', 'name') IS NOT NULL
                BEGIN
                    EXEC(N'
                        UPDATE dbo.users
                        SET full_name = [name]
                        WHERE full_name IS NULL AND [name] IS NOT NULL;
                    ');
                END

                IF COL_LENGTH('dbo.users', 'phone') IS NULL
                    ALTER TABLE dbo.users ADD phone NVARCHAR(30) NULL;

                IF COL_LENGTH('dbo.users', 'profile_image_url') IS NULL
                    ALTER TABLE dbo.users ADD profile_image_url NVARCHAR(500) NULL;

                IF COL_LENGTH('dbo.users', 'google_id') IS NULL
                    ALTER TABLE dbo.users ADD google_id NVARCHAR(255) NULL;

                IF COL_LENGTH('dbo.users', 'is_active') IS NULL
                    ALTER TABLE dbo.users ADD is_active BIT NOT NULL CONSTRAINT DF_users_is_active DEFAULT (1);

                IF COL_LENGTH('dbo.users', 'is_email_verified') IS NULL
                    ALTER TABLE dbo.users ADD is_email_verified BIT NOT NULL CONSTRAINT DF_users_is_email_verified DEFAULT (0);

                IF COL_LENGTH('dbo.users', 'is_phone_verified') IS NULL
                    ALTER TABLE dbo.users ADD is_phone_verified BIT NOT NULL CONSTRAINT DF_users_is_phone_verified DEFAULT (0);

                IF COL_LENGTH('dbo.users', 'last_login_at') IS NULL
                    ALTER TABLE dbo.users ADD last_login_at DATETIME2(7) NULL;

                IF COL_LENGTH('dbo.users', 'created_at') IS NULL
                    ALTER TABLE dbo.users ADD created_at DATETIME2(7) NOT NULL CONSTRAINT DF_users_created_at DEFAULT SYSUTCDATETIME();

                IF COL_LENGTH('dbo.users', 'updated_at') IS NULL
                    ALTER TABLE dbo.users ADD updated_at DATETIME2(7) NOT NULL CONSTRAINT DF_users_updated_at DEFAULT SYSUTCDATETIME();
            END
            """
        )
    )
    db.commit()


def _ensure_roles_schema_compatibility(db: Session) -> None:
    db.execute(
        text(
            """
            IF OBJECT_ID('dbo.roles', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.roles (
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
                IF COL_LENGTH('dbo.roles', 'description') IS NULL
                    ALTER TABLE dbo.roles ADD description NVARCHAR(255) NULL;

                IF COL_LENGTH('dbo.roles', 'created_at') IS NULL
                    ALTER TABLE dbo.roles ADD created_at DATETIME2(7) NOT NULL CONSTRAINT DF_roles_created_at DEFAULT SYSUTCDATETIME();
            END

            IF OBJECT_ID('dbo.user_roles', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.user_roles (
                    user_id UNIQUEIDENTIFIER NOT NULL,
                    role_id INT NOT NULL,
                    assigned_at DATETIME2(7) NOT NULL
                        CONSTRAINT DF_user_roles_assigned_at DEFAULT SYSUTCDATETIME(),
                    CONSTRAINT PK_user_roles PRIMARY KEY (user_id, role_id),
                    CONSTRAINT FK_user_roles_users FOREIGN KEY (user_id)
                        REFERENCES dbo.users(user_id) ON DELETE CASCADE,
                    CONSTRAINT FK_user_roles_roles FOREIGN KEY (role_id)
                        REFERENCES dbo.roles(role_id) ON DELETE CASCADE
                );
            END
            ELSE
            BEGIN
                IF COL_LENGTH('dbo.user_roles', 'assigned_at') IS NULL
                    ALTER TABLE dbo.user_roles ADD assigned_at DATETIME2(7) NOT NULL CONSTRAINT DF_user_roles_assigned_at DEFAULT SYSUTCDATETIME();
            END
            """
        )
    )

    db.execute(
        text(
            """
            IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE role_name = :tenant_role)
            BEGIN
                INSERT INTO dbo.roles (role_name, description)
                VALUES (:tenant_role, 'Default tenant role');
            END

            IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE role_name = :system_admin_role)
            BEGIN
                INSERT INTO dbo.roles (role_name, description)
                VALUES (:system_admin_role, 'System administrator role');
            END
            """
        ),
        {
            "tenant_role": TENANT,
            "system_admin_role": SYSTEM_ADMIN,
        },
    )

    db.commit()

def get_user_by_email(db: Session, email: str):
    _ensure_users_schema_compatibility(db)
    normalized_email = email.strip().lower()
    return db.query(User).filter(func.lower(User.email) == normalized_email).first()


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

    # check if role already assigned
    existing = (
        db.query(UserRole)
        .filter(
            UserRole.user_id == user_id,
            UserRole.role_id == role.role_id
        )
        .first()
    )

    if existing:
        return existing

    user_role = UserRole(
        user_id=user_id,
        role_id=role.role_id
    )

    db.add(user_role)
    db.commit()
    db.refresh(user_role)

    return user_role


def get_user_role_names(db: Session, user_id):
    _ensure_roles_schema_compatibility(db)
    rows = (
        db.query(Role.role_name)
        .join(UserRole, UserRole.role_id == Role.role_id)
        .filter(UserRole.user_id == user_id)
        .all()
    )

    return [row[0] for row in rows]


def get_user_primary_role(db: Session, user_id):
    _ensure_roles_schema_compatibility(db)
    role = (
        db.query(Role.role_name)
        .join(UserRole, UserRole.role_id == Role.role_id)
        .filter(UserRole.user_id == user_id)
        .first()
    )

    if role:
        return role[0]

    return None


def user_has_role(db: Session, user_id, role_name: str):
    role = (
        db.query(UserRole)
        .join(Role, Role.role_id == UserRole.role_id)
        .filter(
            UserRole.user_id == user_id,
            Role.role_name == role_name
        )
        .first()
    )

    return role is not None
