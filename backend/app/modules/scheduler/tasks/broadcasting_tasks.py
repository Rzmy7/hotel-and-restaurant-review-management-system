"""Scheduled tasks for processing pending broadcast events."""

import asyncio
import logging
from datetime import datetime

import pyodbc

from app.core.pyodbc_connection import get_raw_connection
from app.modules.admin.services.broadcasting_service import (
    create_notifications,
    ensure_broadcast_events_table,
    ensure_notifications_schema,
    get_recipient_ids,
)
from app.modules.auth.services.email_service import send_broadcast_email, send_in_background

logger = logging.getLogger(__name__)

# ── Schema bootstrap (run once at startup, not on every scheduler tick) ───────
_tables_ensured: bool = False


def _ensure_tables_once() -> None:
    """
    Create broadcast/notification tables the first time this worker runs.
    Uses a separate, short-lived connection so DDL schema locks do NOT
    bleed into the main processing transaction (which caused the lock
    timeout errors seen in production).
    """
    global _tables_ensured
    if _tables_ensured:
        return
    try:
        with get_raw_connection() as conn:
            cursor = conn.cursor()
            ensure_broadcast_events_table(cursor)
            ensure_notifications_schema(cursor)
            conn.commit()
        _tables_ensured = True
        logger.info("Broadcast scheduler: DB tables verified.")
    except Exception as exc:
        logger.warning("Broadcast scheduler: Could not verify tables: %s", exc)


def _send_emails_for_broadcast(
    cursor: pyodbc.Cursor,
    recipient_ids: list[str],
    subject: str,
    body: str,
    message_type: str,
) -> None:
    """
    Send broadcast emails via SMTP to every recipient who has email
    notifications enabled.  Best-effort — individual failures are logged
    but do not abort the broadcast processing loop.
    """
    if not recipient_ids:
        return

    placeholders = ",".join(["?"] * len(recipient_ids))
    try:
        rows = cursor.execute(
            f"""
            SELECT email
            FROM dbo.[user]
            WHERE CAST(user_id AS NVARCHAR(36)) IN ({placeholders})
              AND is_email_notifications_enabled = 1
            """,
            recipient_ids,
        ).fetchall()
    except Exception as exc:
        logger.error("Broadcast scheduler: Failed to fetch emails: %s", exc)
        return

    for row in rows:
        email = str(row[0]).strip() if row[0] else ""
        if email:
            send_in_background(send_broadcast_email, email, subject, body, message_type)


# ── Async entry point ─────────────────────────────────────────────────────────

async def process_pending_broadcasts():
    """
    Scheduled task to find pending broadcasts and send them.
    Runs every minute to check for broadcasts with scheduled_at <= now
    (in system timezone).

    This function is async and delegates the blocking DB work to a thread pool.
    """
    logger.info("Running broadcast scheduler check...")

    try:
        await asyncio.to_thread(_process_broadcasts_sync_worker)
        logger.info("Broadcast processing worker completed successfully.")
    except Exception as e:
        logger.error(f"Error during broadcast scheduler processing: {e}")


def _process_broadcasts_sync_worker():
    """Synchronous worker that performs the actual DB transactions."""
    # Ensure tables exist using a separate connection (avoids DDL lock contention)
    _ensure_tables_once()

    try:
        with get_raw_connection() as connection:
            cursor = connection.cursor()

            now_utc = datetime.utcnow()

            pending_rows = cursor.execute(
                """
                SELECT
                    broadcast_id, subject, body, channel,
                    audience_type, audience_value, audience_label,
                    message_type, recipient_count, status,
                    schedule_type, scheduled_at, sent_at, sent_by, created_at
                FROM dbo.broadcast_event WITH (UPDLOCK, READPAST)
                WHERE status = 'pending'
                  AND scheduled_at IS NOT NULL
                  AND scheduled_at <= ?
                ORDER BY scheduled_at ASC
                """,
                now_utc,
            ).fetchall()

            if not pending_rows:
                return

            logger.info(f"Worker: Found {len(pending_rows)} broadcasts ready to send.")

            sent_count = 0
            failed_count = 0

            for row in pending_rows:
                try:
                    broadcast_id  = row[0]
                    subject       = row[1]
                    body          = row[2]
                    channel       = row[3]
                    audience_type = row[4]
                    audience_value = row[5]
                    message_type  = row[7]

                    recipient_ids = get_recipient_ids(cursor, audience_type, audience_value)

                    if channel in {"notification", "both"} and recipient_ids:
                        create_notifications(
                            cursor,
                            recipient_ids,
                            subject,
                            body,
                            message_type,
                            now_utc,
                        )

                    if channel in {"email", "both"} and recipient_ids:
                        _send_emails_for_broadcast(
                            cursor,
                            recipient_ids,
                            subject,
                            body,
                            message_type,
                        )

                    cursor.execute(
                        "UPDATE dbo.broadcast_event SET status = 'sent', sent_at = ? WHERE broadcast_id = ?",
                        now_utc,
                        broadcast_id,
                    )
                    sent_count += 1
                except Exception as e:
                    failed_count += 1
                    logger.error(f"Worker: Error processing broadcast {row[0]}: {e}")
                    try:
                        cursor.execute(
                            "UPDATE dbo.broadcast_event SET status = 'failed', sent_at = ? WHERE broadcast_id = ?",
                            now_utc,
                            row[0],
                        )
                    except Exception:
                        pass

            connection.commit()
            logger.info(
                f"Worker: Broadcast processing complete: {sent_count} sent, {failed_count} failed."
            )
    except Exception as e:
        logger.error(f"Error during broadcast worker run: {e}")
