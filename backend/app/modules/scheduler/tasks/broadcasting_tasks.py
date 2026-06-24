"""Scheduled tasks for processing pending broadcast events."""

import asyncio
import logging
from datetime import datetime

import pyodbc

from app.core.db_utils import get_connection_string
from app.modules.admin.services.broadcasting_service import (
    create_notifications,
    ensure_broadcast_events_table,
    ensure_notifications_schema,
    get_recipient_ids,
)
from app.modules.admin.services.system_settings_service import get_system_timezone

logger = logging.getLogger(__name__)


async def process_pending_broadcasts():
    """
    Scheduled task to find pending broadcasts and send them.
    Runs every minute to check for broadcasts with scheduled_at <= now (in system timezone).

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
    connection = None
    try:
        connection = pyodbc.connect(get_connection_string())
        cursor = connection.cursor()

        ensure_broadcast_events_table(cursor)
        ensure_notifications_schema(cursor)

        tz_name = get_system_timezone(cursor)
        now_utc = datetime.utcnow()

        logger.info(f"Broadcast check: system tz={tz_name}, now_utc={now_utc.isoformat()}")

        # scheduled_at is stored as UTC, so compare directly against UTC now.
        pending_rows = cursor.execute(
            """
            SELECT
                broadcast_id, subject, body, channel,
                audience_type, audience_value, audience_label,
                message_type, recipient_count, status,
                schedule_type, scheduled_at, sent_at, sent_by, created_at
            FROM dbo.broadcast_event
            WHERE status = 'pending'
            AND scheduled_at IS NOT NULL
            AND scheduled_at <= ?
            ORDER BY scheduled_at ASC
            """,
            now_utc
        ).fetchall()

        if not pending_rows:
            return

        logger.info(f"Worker: Found {len(pending_rows)} broadcasts ready to send.")

        sent_count = 0
        failed_count = 0

        for row in pending_rows:
            try:
                broadcast_id = row[0]
                subject = row[1]
                body = row[2]
                channel = row[3]
                audience_type = row[4]
                audience_value = row[5]
                message_type = row[7]

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
        logger.info(f"Worker: Broadcast processing complete: {sent_count} sent, {failed_count} failed.")

    finally:
        if connection:
            try:
                connection.close()
            except Exception:
                pass

