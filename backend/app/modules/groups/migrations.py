"""
Database migrations for the groups module.

Run via run_group_migrations(engine) called from app lifespan.
Each step is idempotent — safe to re-run on every startup.
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
        text(
            "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES "
            "WHERE TABLE_NAME = :t"
        ),
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
    Update group_member table:
      1. Remove role_id FK and column (from old GroupMemberRole relationship)
      2. Drop old CHECK constraint on role
      3. Add new CHECK constraint allowing GROUP_OWNER / GROUP_MEMBER
      4. Migrate any existing GROUP_MANAGER rows to GROUP_OWNER
    """
    # Step 1 — remove role_id FK and column
    if _column_exists(conn, "group_member", "role_id"):
        try:
            fk_result = conn.execute(
                text("""
                    SELECT kc.CONSTRAINT_NAME
                    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kc
                    JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
                        ON kc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
                    WHERE kc.TABLE_NAME = 'group_member'
                      AND kc.COLUMN_NAME = 'role_id'
                      AND tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
                """)
            )
            for row in fk_result:
                conn.execute(
                    text(f"ALTER TABLE group_member DROP CONSTRAINT [{row[0]}]")
                )
                logger.info("Dropped FK %s from group_member", row[0])

            conn.execute(text("ALTER TABLE group_member DROP COLUMN role_id"))
            logger.info("Dropped group_member.role_id column")
        except Exception as exc:
            logger.warning("Could not remove group_member.role_id: %s", exc)

    # Step 2 — drop old CHECK constraint
    old_check = "ck_group_member_role_valid"
    if _constraint_exists(conn, "group_member", old_check):
        try:
            conn.execute(
                text(f"ALTER TABLE group_member DROP CONSTRAINT {old_check}")
            )
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


def _drop_group_member_role_table(conn) -> None:
    """Drop the no-longer-needed group_member_role table."""
    if _table_exists(conn, "group_member_role"):
        try:
            conn.execute(text("DROP TABLE group_member_role"))
            logger.info("Dropped group_member_role table")
        except Exception as exc:
            logger.warning("Could not drop group_member_role table: %s", exc)
