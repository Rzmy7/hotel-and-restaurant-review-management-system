import logging

from app.modules.reviews.services.alert_rules_service import (
    get_orgs_with_enabled_rules,
    evaluate_and_notify,
)

logger = logging.getLogger(__name__)


def evaluate_alert_rules_job():
    """
    Evaluate all enabled alert rules across organizations. Scheduled, not manual.

    Runs on an interval (see scheduler/__init__.py) with a cooldown so a
    persistent condition (e.g. an always-overdue reply) does not re-alert
    on every run. Failures are isolated per org and never stop the job.
    """
    logger.info("Alert evaluation job: starting.")
    try:
        org_ids = get_orgs_with_enabled_rules()
    except Exception as e:
        logger.error(f"Alert evaluation job: failed to fetch orgs with rules: {e}")
        return

    if not org_ids:
        logger.info("Alert evaluation job: no organizations with enabled rules.")
        return

    total = 0
    for org_id in org_ids:
        try:
            triggered = evaluate_and_notify(org_id, cooldown_minutes=60)
            total += len(triggered)
        except Exception as e:
            logger.warning(f"Alert evaluation job: org {org_id} failed: {e}")

    logger.info(
        f"Alert evaluation job: complete. {total} alert(s) triggered "
        f"across {len(org_ids)} org(s)."
    )
