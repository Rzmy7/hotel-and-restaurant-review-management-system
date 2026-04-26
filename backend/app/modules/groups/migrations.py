"""
Database migrations for the groups module.

Run via run_group_migrations(engine) called from app lifespan.
Each step is idempotent — safe to re-run on every startup.

v2 migration: Convert group_member from user_id-based to organization_id-based.
"""

import logging
from sqlalchemy import text

logger = logging.getLogger(__name__)


def run_group_migrations(engine) -> None:
    """Apply all group-table schema migrations."""
    try:
        with engine.connect() as conn:
            _migrate_group_table(conn)
            _migrate_group_member_table(conn)
            _migrate_group_member_to_org(conn)
            _migrate_group_invite_to_org(conn)
            _drop_group_member_role_table(conn)
            conn.commit()
        logger.info("Group migrations completed successfully.")
    except Exception as exc:
        logger.error("Group migrations failed: %s", exc)


# ── Helpers ──────────────────────────────────────────────────────────


def _column_exists(conn, table: str, column: str) -> bool:
    result = conn.execute(
        text(
            "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS "
            "WHERE TABLE_NAME = :t AND COLUMN_NAME = :c"
        ),
        {"t": table, "c": column},
    )
    return result.scalar() > 0


def _table_exists(conn, table: str) -> bool:
    result = conn.execute(
        text("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES " "WHERE TABLE_NAME = :t"),
        {"t": table},
    )
    return result.scalar() > 0


def _constraint_exists(conn, table: str, constraint: str) -> bool:
    result = conn.execute(
        text(
            "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS "
            "WHERE TABLE_NAME = :t AND CONSTRAINT_NAME = :c"
        ),
        {"t": table, "c": constraint},
    )
    return result.scalar() > 0


def _index_exists(conn, index_name: str) -> bool:
    result = conn.execute(
        text("SELECT COUNT(*) FROM sys.indexes WHERE name = :n"),
        {"n": index_name},
    )
    return result.scalar() > 0


# ── Migration steps ───────────────────────────────────────────────────


def _migrate_group_table(conn) -> None:
    """Add new columns to the [group] table."""
    new_cols = [
        ("description", "NVARCHAR(1000) NULL"),
        ("avatar_url", "VARCHAR(500) NULL"),
        ("is_private", "BIT NOT NULL DEFAULT 1"),
        ("settings", "NVARCHAR(MAX) NULL"),
        ("invite_link_token", "VARCHAR(64) NULL"),
        ("invite_link_expires_at", "DATETIME NULL"),
    ]
    for col_name, col_def in new_cols:
        if not _column_exists(conn, "group", col_name):
            try:
                conn.execute(text(f"ALTER TABLE [group] ADD {col_name} {col_def}"))
                logger.info("Added column [group].%s", col_name)
            except Exception as exc:
                logger.warning("Could not add [group].%s: %s", col_name, exc)


def _migrate_group_member_table(conn) -> None:
    """
    Update group_member role column:
      1. Remove role_id FK and column (from old GroupMemberRole relationship)
      2. Drop old CHECK constraint on role
      3. Add new CHECK constraint allowing GROUP_OWNER / GROUP_MEMBER
      4. Migrate any existing GROUP_MANAGER rows to GROUP_OWNER
    """
    # Step 1 — remove role_id FK and column
    if _column_exists(conn, "group_member", "role_id"):
        try:
            fk_result = conn.execute(text("""
                    SELECT kc.CONSTRAINT_NAME
                    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kc
                    JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
                        ON kc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
                    WHERE kc.TABLE_NAME = 'group_member'
                      AND kc.COLUMN_NAME = 'role_id'
                      AND tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
                """))
            for row in fk_result:
                conn.execute(
                    text(f"ALTER TABLE group_member DROP CONSTRAINT [{row[0]}]")
                )
                logger.info("Dropped FK %s from group_member", row[0])

            conn.execute(text("ALTER TABLE group_member DROP COLUMN role_id"))
            logger.info("Dropped group_member.role_id column")
        except Exception as exc:
            logger.warning("Could not remove group_member.role_id: %s", exc)

    # Step 2 — drop old CHECK constraint on role
    old_check = "ck_group_member_role_valid"
    if _constraint_exists(conn, "group_member", old_check):
        try:
            conn.execute(text(f"ALTER TABLE group_member DROP CONSTRAINT {old_check}"))
            logger.info("Dropped old CHECK constraint %s", old_check)
        except Exception as exc:
            logger.warning("Could not drop CHECK constraint %s: %s", old_check, exc)

    # Step 3 — add new CHECK constraint
    if not _constraint_exists(conn, "group_member", old_check):
        try:
            conn.execute(
                text(
                    "ALTER TABLE group_member ADD CONSTRAINT ck_group_member_role_valid "
                    "CHECK (role IN ('GROUP_OWNER', 'GROUP_MEMBER'))"
                )
            )
            logger.info("Added new CHECK constraint on group_member.role")
        except Exception as exc:
            logger.warning("Could not add CHECK constraint: %s", exc)

    # Step 4 — migrate GROUP_MANAGER → GROUP_OWNER
    try:
        conn.execute(
            text(
                "UPDATE group_member SET role = 'GROUP_OWNER' "
                "WHERE role IN ('GROUP_MANAGER', 'GROUP_OWNER_LEGACY')"
            )
        )
        logger.info("Migrated GROUP_MANAGER rows to GROUP_OWNER")
    except Exception as exc:
        logger.warning("Could not migrate role values: %s", exc)


def _migrate_group_member_to_org(conn) -> None:
    """
    v2: Convert group_member primary key from user_id to organization_id.

    Strategy:
      1. Add organization_id column (nullable first)
      2. Populate it from the tenant→organization join
      3. Delete rows where we cannot resolve an org (user owns no org)
      4. Drop old PK constraint
      5. Drop user_id FK constraint and column
      6. Make organization_id NOT NULL, add FK, add new PK
    """
    if _column_exists(conn, "group_member", "organization_id"):
        logger.info(
            "group_member.organization_id already exists - skipping v2 migration"
        )
        return

    if not _column_exists(conn, "group_member", "user_id"):
        logger.info("group_member.user_id not found — table may already be on v2")
        return

    logger.info("Starting group_member v2 migration: user_id → organization_id")

    try:
        # 1. Add organization_id column (nullable)
        conn.execute(
            text("ALTER TABLE group_member ADD organization_id UNIQUEIDENTIFIER NULL")
        )
        logger.info("Added group_member.organization_id (nullable)")

        # 2. Populate organization_id from tenant→organization mapping
        conn.execute(text("""
            UPDATE gm
            SET gm.organization_id = o.organization_id
            FROM group_member gm
            JOIN organization o ON o.tenant_id = gm.user_id
        """))
        logger.info("Populated group_member.organization_id from tenant mapping")

        # 3. Delete rows where no organization could be resolved
        conn.execute(text("DELETE FROM group_member WHERE organization_id IS NULL"))
        logger.info("Deleted group_member rows with no resolvable organization")

        # 4. Drop old PK (group_id + user_id)
        pk_result = conn.execute(text("""
            SELECT tc.CONSTRAINT_NAME
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
            WHERE tc.TABLE_NAME = 'group_member' AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
        """)).fetchone()
        if pk_result:
            conn.execute(
                text(f"ALTER TABLE group_member DROP CONSTRAINT [{pk_result[0]}]")
            )
            logger.info("Dropped old PK constraint %s", pk_result[0])

        # 5. Drop FK on user_id and the user_id column
        fk_rows = conn.execute(text("""
            SELECT kc.CONSTRAINT_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kc
            JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
                ON kc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
            WHERE kc.TABLE_NAME = 'group_member'
              AND kc.COLUMN_NAME = 'user_id'
              AND tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
        """)).fetchall()
        for row in fk_rows:
            conn.execute(text(f"ALTER TABLE group_member DROP CONSTRAINT [{row[0]}]"))
            logger.info("Dropped FK %s on group_member.user_id", row[0])

        conn.execute(text("ALTER TABLE group_member DROP COLUMN user_id"))
        logger.info("Dropped group_member.user_id column")

        # 6. Make organization_id NOT NULL, add FK, add new composite PK
        conn.execute(
            text(
                "ALTER TABLE group_member ALTER COLUMN organization_id UNIQUEIDENTIFIER NOT NULL"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE group_member ADD CONSTRAINT pk_group_member "
                "PRIMARY KEY (group_id, organization_id)"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE group_member ADD CONSTRAINT fk_group_member_org "
                "FOREIGN KEY (organization_id) REFERENCES organization(organization_id) ON DELETE CASCADE"
            )
        )
        logger.info("group_member v2 migration complete: now uses organization_id PK")

    except Exception as exc:
        logger.error("group_member v2 migration failed: %s", exc)


def _migrate_group_invite_to_org(conn) -> None:
    """
    v2: Add org-based columns to group_invite:
      - invited_org_id   (the target organization)
      - invited_by_org_id (the inviting organization)
    Update invite_type check to allow 'organization'.
    """
    # Add invited_org_id
    if not _column_exists(conn, "group_invite", "invited_org_id"):
        try:
            conn.execute(
                text(
                    "ALTER TABLE group_invite ADD invited_org_id UNIQUEIDENTIFIER NULL"
                )
            )
            logger.info("Added group_invite.invited_org_id")
            # Back-fill from old invited_user_id via tenant
            conn.execute(text("""
                UPDATE gi
                SET gi.invited_org_id = o.organization_id
                FROM group_invite gi
                JOIN organization o ON o.tenant_id = gi.invited_user_id
                WHERE gi.invited_user_id IS NOT NULL
            """))
            logger.info("Back-filled group_invite.invited_org_id from invited_user_id")
        except Exception as exc:
            logger.warning("Could not add group_invite.invited_org_id: %s", exc)

    # Add invited_by_org_id
    if not _column_exists(conn, "group_invite", "invited_by_org_id"):
        try:
            conn.execute(
                text(
                    "ALTER TABLE group_invite ADD invited_by_org_id UNIQUEIDENTIFIER NULL"
                )
            )
            logger.info("Added group_invite.invited_by_org_id")
            # Back-fill from invited_by user via tenant
            conn.execute(text("""
                UPDATE gi
                SET gi.invited_by_org_id = o.organization_id
                FROM group_invite gi
                JOIN organization o ON o.tenant_id = gi.invited_by
                WHERE gi.invited_by IS NOT NULL
            """))
            logger.info("Back-filled group_invite.invited_by_org_id from invited_by")
        except Exception as exc:
            logger.warning("Could not add group_invite.invited_by_org_id: %s", exc)

    # Update invite_type CHECK constraint to allow 'organization'
    old_inv_check = "ck_group_invite_type_valid"
    if _constraint_exists(conn, "group_invite", old_inv_check):
        try:
            conn.execute(
                text(f"ALTER TABLE group_invite DROP CONSTRAINT {old_inv_check}")
            )
            logger.info("Dropped old invite_type CHECK constraint")
        except Exception as exc:
            logger.warning("Could not drop invite_type constraint: %s", exc)

    if not _constraint_exists(conn, "group_invite", old_inv_check):
        try:
            conn.execute(
                text(
                    "ALTER TABLE group_invite ADD CONSTRAINT ck_group_invite_type_valid "
                    "CHECK (invite_type IN ('organization', 'link', 'user'))"
                )
            )
            logger.info(
                "Added new invite_type CHECK constraint (organization|link|user)"
            )
        except Exception as exc:
            logger.warning("Could not add invite_type constraint: %s", exc)

    # Migrate old 'user' invite_type to 'organization' where org is now resolved
    try:
        conn.execute(text("""
            UPDATE group_invite
            SET invite_type = 'organization'
            WHERE invite_type = 'user' AND invited_org_id IS NOT NULL
        """))
        logger.info("Migrated 'user' invite_type -> 'organization' where org resolved")
    except Exception as exc:
        logger.warning("Could not migrate invite_type values: %s", exc)


def _drop_group_member_role_table(conn) -> None:
    """Drop the no-longer-needed group_member_role table."""
    if _table_exists(conn, "group_member_role"):
        try:
            conn.execute(text("DROP TABLE group_member_role"))
            logger.info("Dropped group_member_role table")
        except Exception as exc:
            logger.warning("Could not drop group_member_role table: %s", exc)
