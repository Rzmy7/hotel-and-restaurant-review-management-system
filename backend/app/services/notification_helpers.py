"""
Centralized notification helper — provides a single entry point for creating
in-app notifications from any backend module.

All sends are best-effort: a failure to create a notification NEVER crashes
the primary operation.
"""

import logging
import time
import uuid
from app.modules.auth.constants.roles import ADMIN_ROLE_ID

logger = logging.getLogger(__name__)

# ── Cooldown deduplication ──────────────────────────────────────────
# Prevents the same notification from being sent repeatedly within a
# short time window. Key = (user_id, dedup_key), value = epoch timestamp.
_sent_cache: dict[tuple[str, str], float] = {}
_DEFAULT_COOLDOWN_SECONDS = 24 * 60 * 60  # 24 hours


def _should_send(user_id: str, dedup_key: str, cooldown_seconds: int = _DEFAULT_COOLDOWN_SECONDS) -> bool:
    """Return True if this notification hasn't been sent recently."""
    cache_key = (user_id, dedup_key)
    now = time.monotonic()
    last_sent = _sent_cache.get(cache_key)
    if last_sent is not None and (now - last_sent) < cooldown_seconds:
        return False
    _sent_cache[cache_key] = now
    # Prune old entries periodically (keep cache small)
    if len(_sent_cache) > 500:
        cutoff = now - cooldown_seconds
        to_remove = [k for k, v in _sent_cache.items() if v < cutoff]
        for k in to_remove:
            del _sent_cache[k]
    return True


def send_notification(
    user_id: str,
    title: str,
    message: str,
    notification_type: str = "info",
) -> None:
    """
    Create an in-app notification for a user.

    Parameters
    ----------
    user_id : str
        UUID of the target user.
    title : str
        Short notification headline (max 200 chars).
    message : str
        Longer description (max 4000 chars).
    notification_type : str
        One of: info, success, warning, error, maintenance, announcement.
    """
    from app.database.session import SessionLocal
    from app.modules.auth.repositories.notifications_repo import create_notification

    try:
        db = SessionLocal()
        try:
            create_notification(
                db=db,
                user_id=uuid.UUID(user_id),
                title=title,
                message=message,
                notification_type=notification_type,
            )
        finally:
            db.close()
    except Exception as exc:
        logger.warning("Failed to send notification [%s] to %s: %s", title, user_id, exc)


# ── Pre-built notification helpers ──────────────────────────────────


def notify_welcome(user_id: str, user_name: str) -> None:
    """Welcome notification sent right after signup."""
    send_notification(
        user_id=user_id,
        title="Welcome to ReviewHub! 🎉",
        message=(
            f"Hi {user_name}! Welcome aboard. Your account has been created successfully. "
            "Start by adding your first organization and connecting a review source to begin "
            "monitoring your online reputation."
        ),
        notification_type="success",
    )


def notify_password_changed(user_id: str) -> None:
    """Notification sent after a successful password reset."""
    send_notification(
        user_id=user_id,
        title="Password Changed Successfully",
        message=(
            "Your password has been reset successfully. If you did not make this change, "
            "please contact support immediately."
        ),
        notification_type="info",
    )


def notify_plan_changed_by_user(user_id: str, plan_name: str) -> None:
    """Notification when the user updates their own subscription plan."""
    send_notification(
        user_id=user_id,
        title="Subscription Plan Updated",
        message=(
            f"Your subscription plan has been changed to {plan_name}. "
            "Your new feature limits are now in effect. Visit the Subscription page to see details."
        ),
        notification_type="success",
    )


def notify_plan_changed_by_admin(user_id: str, plan_name: str) -> None:
    """Notification when an admin changes a user's plan."""
    send_notification(
        user_id=user_id,
        title="Your Plan Has Been Updated",
        message=(
            f"An administrator has updated your subscription plan to {plan_name}. "
            "Your feature limits have been adjusted accordingly."
        ),
        notification_type="info",
    )


def notify_scrape_failed(user_id: str, platform_name: str, error_message: str | None = None, org_name: str | None = None) -> None:
    """Notification when a scraping job fails.
    Sent at most once per hour per user per platform to avoid spam on repeated failures."""
    if not _should_send(user_id, f"scrape_failed_{platform_name}", cooldown_seconds=3600):
        return
    detail = f" Error: {error_message}" if error_message else ""
    org_info = f" for '{org_name}'" if org_name else ""
    send_notification(
        user_id=user_id,
        title="Data Sync Failed",
        message=(
            f"A data synchronization job for {platform_name}{org_info} has failed.{detail} "
            "The system will retry on the next scheduled sync. If the issue persists, "
            "please check your source URL and try again."
        ),
        notification_type="error",
    )


def notify_new_reviews_ingested(user_id: str, count: int, platform_name: str | None = None, org_name: str | None = None) -> None:
    """Notification when new reviews are ingested from the scraper."""
    source_info = f" from {platform_name}" if platform_name else ""
    org_info = f" for '{org_name}'" if org_name else ""
    plural = count != 1
    send_notification(
        user_id=user_id,
        title="New Reviews Received",
        message=(
            f"{count} new review{'s' if plural else ''}{source_info}{org_info} "
            f"ha{'ve' if plural else 's'} been ingested and {'are' if plural else 'is'} "
            f"being analyzed by our AI. You can view them on the Reviews page shortly."
        ),
        notification_type="info",
    )


def notify_organization_created(user_id: str, org_name: str) -> None:
    """Notification when a new organization is created."""
    send_notification(
        user_id=user_id,
        title="Organization Created",
        message=(
            f'Your organization "{org_name}" has been created successfully. '
            "You can now add review sources and start monitoring reviews."
        ),
        notification_type="success",
    )


def notify_group_created(user_id: str, group_name: str) -> None:
    """Notification when a new group is created."""
    send_notification(
        user_id=user_id,
        title="Group Created",
        message=(
            f'Your group "{group_name}" has been created successfully. '
            "You can now add members and start collaborating."
        ),
        notification_type="success",
    )


def notify_approaching_review_limit(user_id: str, used: int, limit: int) -> None:
    """Warning notification when review count usage reaches 80% of the plan limit.
    Sent at most once every 24 hours per user to avoid spam."""
    if not _should_send(user_id, "approaching_review_limit"):
        return
    percentage = round((used / limit) * 100)
    send_notification(
        user_id=user_id,
        title="Review Limit Almost Reached",
        message=(
            f"You have used {used} out of {limit} reviews ({percentage}%) on your current plan. "
            "Consider upgrading your subscription plan to avoid hitting the limit and losing new reviews."
        ),
        notification_type="warning",
    )


def notify_source_added(user_id: str, platform_name: str, source_url: str, org_name: str | None = None) -> None:
    """Notification when a new review source is connected."""
    org_info = f" to '{org_name}'" if org_name else ""
    send_notification(
        user_id=user_id,
        title="New Source Connected",
        message=(
            f"A new {platform_name} source has been connected{org_info}: {source_url}. "
            "Reviews will be synced automatically based on your configured frequency."
        ),
        notification_type="info",
    )


def notify_group_invite(user_id: str, inviter_name: str, group_name: str) -> None:
    """Notification sent to a user when they receive a group invite."""
    send_notification(
        user_id=user_id,
        title="You Have a Group Invitation",
        message=(
            f"{inviter_name} has invited you to join the group \"{group_name}\". "
            "Visit your Groups page to accept or decline the invitation."
        ),
        notification_type="info",
    )


def notify_group_invite_accepted(
    owner_id: str,
    member_name: str,
    group_name: str,
    db_for_name=None,
    user_id: str = None,
) -> None:
    """Notification sent to the group owner when someone accepts their invite."""
    display_name = member_name
    if db_for_name and user_id:
        try:
            from sqlalchemy import text as _text
            row = db_for_name.execute(
                _text("SELECT first_name, last_name FROM [user] WHERE user_id = :uid"),
                {"uid": user_id},
            ).fetchone()
            if row:
                display_name = f"{row.first_name or ''} {row.last_name or ''}".strip() or member_name
        except Exception:
            pass

    send_notification(
        user_id=owner_id,
        title="Group Invitation Accepted",
        message=(
            f"{display_name} has accepted your invitation and joined \"{group_name}\"."
        ),
        notification_type="success",
    )


def notify_group_member_removed(user_id: str, group_name: str) -> None:
    """Notification sent to a user when they are removed from a group."""
    send_notification(
        user_id=user_id,
        title="Removed from Group",
        message=(
            f"You have been removed from the group \"{group_name}\" by the group owner."
        ),
        notification_type="warning",
    )


def notify_source_removed(user_id: str, platform_name: str, org_name: str | None = None) -> None:
    """Notification when a review source is removed."""
    org_info = f" from '{org_name}'" if org_name else ""
    send_notification(
        user_id=user_id,
        title="Source Removed",
        message=(
            f"A {platform_name} review source has been disconnected{org_info}. "
            "No further reviews will be synced from this source."
        ),
        notification_type="warning",
    )


def notify_admin_gemini_quota_exceeded() -> None:
    """Specialized alert for system admins when Gemini API quota is hit."""
    from app.database.session import SessionLocal
    from app.modules.user.models.user_models import User
    from app.modules.auth.repositories.notifications_repo import create_notification

    try:
        db = SessionLocal()
        try:
            # Find all users with Admin role
            admins = db.query(User).filter(User.role_id == ADMIN_ROLE_ID).all()
            if not admins:
                logger.warning("No administrators found to notify about Gemini quota issue.")
                return

            title = "Gemini API Quota Exceeded"
            message = "The Gemini API quota has been exceeded for review processing. Please check the API billing or plan limits."

            for admin in admins:
                try:
                    create_notification(
                        db=db,
                        user_id=admin.user_id,
                        title=title,
                        message=message,
                        notification_type="error",
                    )
                except Exception as e:
                    logger.warning(f"Failed to notify admin {admin.user_id}: {e}")
        finally:
            db.close()
    except Exception as exc:
        logger.error(f"Failed to process admin Gemini quota notifications: {exc}")
