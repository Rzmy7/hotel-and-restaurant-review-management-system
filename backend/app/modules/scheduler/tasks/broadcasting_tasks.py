"""Scheduled tasks for processing pending broadcast events."""

import logging
from datetime import datetime
from zoneinfo import ZoneInfo
import pyodbc

from app.core.pyodbc_connection import get_raw_connection
from app.modules.admin.services.broadcasting_service import (
    create_notifications,
    ensure_broadcast_events_table,
    ensure_notifications_schema,
    get_recipient_ids,
)
from app.modules.admin.services.system_settings_service import get_system_timezone

logger = logging.getLogger(__name__)


def _get_timezone_offset(tz_name: str, utc_dt: datetime) -> object:
    """
    Get the timedelta offset for a given IANA timezone at a specific UTC time.
    
    Args:
        tz_name: IANA timezone name (e.g., 'Asia/Colombo')
        utc_dt: UTC datetime to calculate offset for
    
    Returns:
        timedelta representing the offset from UTC
    """
    try:
        tz = ZoneInfo(tz_name)
        # Create aware datetime in target timezone from UTC
        aware_dt = utc_dt.replace(tzinfo=None).replace(tzinfo=None)
        utc_aware = utc_dt.replace(tzinfo=ZoneInfo('UTC'))
        local_aware = utc_aware.astimezone(tz)
        # Offset is the difference between the local time and UTC
        return local_aware.utcoffset()
    except Exception as e:
        logger.warning(f"Failed to get timezone offset for {tz_name}: {e}, defaulting to UTC")
        from datetime import timedelta
        return timedelta(0)


import asyncio

async def process_pending_broadcasts():
    """
    Scheduled task to find pending broadcasts and send them.
    Runs every minute to check for broadcasts with scheduled_at <= now (in system timezone).
    
    This function is now async and delegates the blocking DB work to a thread pool.
    """
    logger.info("Running broadcast scheduler check...")
    
    try:
        # Wrap the entire synchronous logic in a thread to avoid blocking the main loop
        await asyncio.to_thread(_process_broadcasts_sync_worker)
        logger.info("Broadcast processing worker completed successfully.")
    except Exception as e:
        logger.error(f"Error during broadcast scheduler processing: {e}")


def _process_broadcasts_sync_worker():
    """Synchronous worker that performs the actual DB transactions."""
    try:
        with get_raw_connection() as connection:
            cursor = connection.cursor()
            
            ensure_broadcast_events_table(cursor)
            ensure_notifications_schema(cursor)
            
            tz_name = get_system_timezone(cursor)
            now_utc = datetime.utcnow()
            tz_offset = _get_timezone_offset(tz_name, now_utc)
            now_in_system_tz = now_utc + tz_offset
            
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
                now_in_system_tz
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
            
            logger.info(f"Worker: Broadcast processing complete: {sent_count} sent, {failed_count} failed.")
    except Exception as e:
        logger.error(f"Error during broadcast worker run: {e}")
