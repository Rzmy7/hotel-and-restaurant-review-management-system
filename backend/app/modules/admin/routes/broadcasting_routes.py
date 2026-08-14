"""
Broadcasting routes — send, resend, cancel broadcasts and view history.

Migrated from admin-backend/app/broadcasting_router.py.
"""

from app.modules.admin.services.admin_activity_logger import log_admin_activity

import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

import pyodbc
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Request

from app.core.db_utils import get_connection_string
from app.modules.admin.schemas import (
    BroadcastCreate,
    EstimatedRecipientsResponse,
    StatisticsResponse,
)
from app.modules.admin.services.broadcasting_service import (
    create_notifications,
    ensure_broadcast_events_table,
    ensure_notifications_schema,
    get_audience_label,
    get_recipient_ids,
    to_record,
)
from app.modules.admin.services.system_settings_service import get_system_timezone
from app.modules.auth.services.email_service import send_broadcast_email, send_in_background

router = APIRouter(prefix="/broadcasting", tags=["Admin - Settings"])


def _send_emails_for_broadcast_bg(
    recipient_ids: list[str],
    subject: str,
    body: str,
    message_type: str,
) -> None:
    """
    Background-safe version: opens its own DB connection so it can run
    after the HTTP response has already been returned to the client.
    Best-effort — individual failures are printed, not raised.
    """
    if not recipient_ids:
        return

    placeholders = ",".join(["?"] * len(recipient_ids))
    try:
        with pyodbc.connect(get_connection_string()) as conn:
            rows = conn.cursor().execute(
                f"""
                SELECT email
                FROM dbo.[user]
                WHERE CAST(user_id AS NVARCHAR(36)) IN ({placeholders})
                  AND is_email_notifications_enabled = 1
                """,
                recipient_ids,
            ).fetchall()
    except Exception as exc:
        print(f"[broadcast-email] Failed to fetch recipient emails: {exc}")
        return

    for row in rows:
        email = str(row[0]).strip() if row[0] else ""
        if email:
            send_in_background(send_broadcast_email, email, subject, body, message_type)


def _parse_scheduled_at_to_utc(value: str | None, timezone_name: str) -> datetime | None:
    """Parse the scheduled-at string from the frontend and convert it to UTC.

    The frontend ``datetime-local`` input produces a naive datetime string
    that is expressed in the *system* timezone (the UI label tells the admin
    "Interpreted in system timezone: …").  All other datetime columns
    (``sent_at``, ``created_at``) are stored as UTC, so we convert the
    user-supplied system-local time to UTC before persisting.
    """
    if not value:
        return None

    candidate = value.strip()
    if not candidate:
        return None

    try:
        parsed = datetime.fromisoformat(candidate)
    except ValueError:
        return None

    if parsed.tzinfo is None:
        # Naive datetime from datetime-local — treat as system timezone.
        system_tz = ZoneInfo(timezone_name)
        aware = parsed.replace(tzinfo=system_tz)
        return aware.astimezone(ZoneInfo("UTC")).replace(tzinfo=None)

    # Already tz-aware — convert to UTC and strip tz.
    return parsed.astimezone(ZoneInfo("UTC")).replace(tzinfo=None)


@router.post("/send")
def send_broadcast(payload: BroadcastCreate, request: Request, background_tasks: BackgroundTasks) -> dict:
    admin_identifier = request.headers.get("x-admin-user", "Admin User")

    connection = pyodbc.connect(get_connection_string())
    try:
        cursor = connection.cursor()
        ensure_broadcast_events_table(cursor)
        ensure_notifications_schema(cursor)

        recipient_ids = get_recipient_ids(cursor, payload.audienceType, payload.audienceValue)
        recipient_count = len(recipient_ids)
        audience_label = get_audience_label(payload.audienceType, payload.audienceValue)

        timezone_name = get_system_timezone(cursor)
        now_utc = datetime.utcnow()
        scheduled_at = _parse_scheduled_at_to_utc(payload.scheduledAt, timezone_name)

        status = "pending" if payload.scheduleType == "scheduled" else "sent"
        sent_at = now_utc if status == "sent" else None

        broadcast_id = str(uuid.uuid4())
        cursor.execute(
            """
            INSERT INTO dbo.broadcast_event (
                broadcast_id, subject, body, channel,
                audience_type, audience_value, audience_label,
                message_type, recipient_count, status,
                schedule_type, scheduled_at, sent_at, sent_by, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                broadcast_id,
                payload.subject,
                payload.body,
                payload.channel,
                payload.audienceType,
                payload.audienceValue,
                audience_label,
                payload.messageType,
                recipient_count,
                status,
                payload.scheduleType,
                scheduled_at,
                sent_at,
                admin_identifier,
                now_utc,
            ),
        )

        if status == "sent" and payload.channel in {"notification", "both"}:
            create_notifications(
                cursor, recipient_ids, payload.subject, payload.body, payload.messageType, now_utc,
            )

        if status == "sent" and payload.channel in {"email", "both"}:
            # Queue email delivery as a background task so the HTTP response
            # is returned immediately — the modal closes without waiting.
            background_tasks.add_task(
                _send_emails_for_broadcast_bg,
                list(recipient_ids),
                payload.subject,
                payload.body,
                payload.messageType,
            )

        connection.commit()
        log_admin_activity(
            "broadcast_sent",
            "Broadcast Sent",
            f"'{payload.subject}' to {recipient_count} recipient(s) via {payload.channel}",
            admin_user=admin_identifier,
        )
        return {
            "success": True,
            "broadcastId": broadcast_id,
            "message": f"Broadcast {status} for {recipient_count} recipients",
        }
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Error sending broadcast: {exc}")
    finally:
        connection.close()


@router.get("/estimate-recipients", response_model=EstimatedRecipientsResponse)
def estimate_recipients(
    audienceType: str = Query(...),
    audienceValue: str | None = Query(None),
) -> EstimatedRecipientsResponse:
    connection = pyodbc.connect(get_connection_string())
    try:
        cursor = connection.cursor()
        recipient_ids = get_recipient_ids(cursor, audienceType, audienceValue)
        return EstimatedRecipientsResponse(count=len(recipient_ids))
    finally:
        connection.close()


@router.get("/statistics", response_model=StatisticsResponse)
def get_statistics() -> StatisticsResponse:
    connection = pyodbc.connect(get_connection_string())
    try:
        cursor = connection.cursor()
        ensure_broadcast_events_table(cursor)
        row = cursor.execute(
            """
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS scheduled,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
            FROM dbo.broadcast_event
            """
        ).fetchone()

        return StatisticsResponse(
            total=int(row[0] or 0),
            sent=int(row[1] or 0),
            scheduled=int(row[2] or 0),
            failed=int(row[3] or 0),
        )
    finally:
        connection.close()


@router.get("/history")
def get_history(
    page: int = 1,
    limit: int = 10,
    search: str | None = None,
) -> dict:
    page = max(1, page)
    limit = max(1, limit)
    offset = (page - 1) * limit

    connection = pyodbc.connect(get_connection_string())
    try:
        cursor = connection.cursor()
        ensure_broadcast_events_table(cursor)

        where_clauses = []
        params = []
        if search:
            search_pattern = f"%{search.strip()}%"
            where_clauses.append(
                "(subject LIKE ? OR body LIKE ? OR audience_label LIKE ? OR sent_by LIKE ?)"
            )
            params.extend([search_pattern] * 4)

        where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

        # Total count query
        count_query = f"SELECT COUNT(*) FROM dbo.broadcast_event {where_sql}"
        cursor.execute(count_query, params)
        total = int(cursor.fetchone()[0] or 0)

        # Paginated query
        query = f"""
            SELECT
                broadcast_id, subject, body, channel,
                audience_type, audience_value, audience_label,
                message_type, recipient_count, status,
                schedule_type,
                CAST(scheduled_at AS NVARCHAR(50)) AS scheduled_at,
                CAST(sent_at AS NVARCHAR(50)) AS sent_at,
                sent_by,
                CAST(created_at AS NVARCHAR(50)) AS created_at
            FROM dbo.broadcast_event
            {where_sql}
            ORDER BY created_at DESC, broadcast_id DESC
            OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
        """
        cursor.execute(query, params + [offset, limit])
        rows = cursor.fetchall()

        data = [to_record(row) for row in rows]
        return {
            "data": data,
            "total": total,
            "page": page,
            "limit": limit
        }
    finally:
        connection.close()


@router.get("/{broadcast_id}")
def get_broadcast_detail(broadcast_id: str) -> dict:
    try:
        parsed_id = str(uuid.UUID(broadcast_id))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid broadcast id")

    connection = pyodbc.connect(get_connection_string())
    try:
        cursor = connection.cursor()
        ensure_broadcast_events_table(cursor)
        row = cursor.execute(
            """
            SELECT
                broadcast_id, subject, body, channel,
                audience_type, audience_value, audience_label,
                message_type, recipient_count, status,
                schedule_type,
                CAST(scheduled_at AS NVARCHAR(50)) AS scheduled_at,
                CAST(sent_at AS NVARCHAR(50)) AS sent_at,
                sent_by,
                CAST(created_at AS NVARCHAR(50)) AS created_at
            FROM dbo.broadcast_event
            WHERE broadcast_id = ?
            """,
            parsed_id,
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Broadcast not found")
        return to_record(row)
    finally:
        connection.close()


@router.post("/{broadcast_id}/resend")
def resend_broadcast(broadcast_id: str, background_tasks: BackgroundTasks) -> dict:
    try:
        parsed_id = str(uuid.UUID(broadcast_id))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid broadcast id")

    connection = pyodbc.connect(get_connection_string())
    try:
        cursor = connection.cursor()
        ensure_broadcast_events_table(cursor)
        ensure_notifications_schema(cursor)

        event = cursor.execute(
            """
            SELECT subject, body, channel, audience_type, audience_value, message_type
            FROM dbo.broadcast_event
            WHERE broadcast_id = ?
            """,
            parsed_id,
        ).fetchone()

        if not event:
            raise HTTPException(status_code=404, detail="Broadcast not found")

        recipient_ids = get_recipient_ids(
            cursor,
            str(event.audience_type),
            str(event.audience_value) if event.audience_value is not None else None,
        )
        now_utc = datetime.utcnow()

        if str(event.channel) in {"notification", "both"}:
            create_notifications(
                cursor, recipient_ids, str(event.subject), str(event.body), str(event.message_type), now_utc,
            )

        if str(event.channel) in {"email", "both"}:
            background_tasks.add_task(
                _send_emails_for_broadcast_bg,
                list(recipient_ids),
                str(event.subject),
                str(event.body),
                str(event.message_type),
            )

        cursor.execute(
            """
            UPDATE dbo.broadcast_event
            SET status = 'sent',
                sent_at = ?,
                recipient_count = ?,
                schedule_type = 'now'
            WHERE broadcast_id = ?
            """,
            now_utc,
            len(recipient_ids),
            parsed_id,
        )

        connection.commit()
        log_admin_activity(
            "broadcast_sent",
            "Broadcast Resent",
            f"Broadcast {broadcast_id} resent to {len(recipient_ids)} recipient(s)",
        )
        return {
            "success": True,
            "message": f"Broadcast resent to {len(recipient_ids)} recipients",
        }
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Error resending broadcast: {exc}")
    finally:
        connection.close()


@router.post("/{broadcast_id}/cancel")
def cancel_broadcast(broadcast_id: str) -> dict:
    try:
        parsed_id = str(uuid.UUID(broadcast_id))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid broadcast id")

    connection = pyodbc.connect(get_connection_string())
    try:
        cursor = connection.cursor()
        ensure_broadcast_events_table(cursor)

        row = cursor.execute(
            """
            SELECT status
            FROM dbo.broadcast_event
            WHERE broadcast_id = ?
            """,
            parsed_id,
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Broadcast not found")

        if str(row.status) != "pending":
            return {
                "success": False,
                "message": "Only scheduled/pending broadcasts can be cancelled",
            }

        cursor.execute(
            """
            UPDATE dbo.broadcast_event
            SET status = 'failed'
            WHERE broadcast_id = ?
            """,
            parsed_id,
        )
        connection.commit()

        log_admin_activity(
            "broadcast_sent",
            "Broadcast Cancelled",
            f"Broadcast {broadcast_id} was cancelled",
        )
        return {
            "success": True,
            "message": "Broadcast cancelled",
        }
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Error cancelling broadcast: {exc}")
    finally:
        connection.close()
