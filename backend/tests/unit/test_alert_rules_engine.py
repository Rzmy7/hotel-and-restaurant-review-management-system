"""
Unit tests for the Alert Rules engine and automatic triggering.
Covers the three condition evaluators, cooldown behavior, and notification dispatch.
"""

from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from app.modules.reviews.services import alert_rules_service as ars


def _row(**kwargs):
    return SimpleNamespace(**kwargs)


def _rule(condition="low_rating", **overrides):
    rule = {
        "id": "rule-1",
        "name": "Test Rule",
        "condition_type": condition,
        "threshold": 2,
        "lookback_hours": 24,
        "last_triggered_at": None,
    }
    rule.update(overrides)
    return rule


class TestLowRatingEvaluator:
    def test_triggered_with_count(self):
        conn = MagicMock()
        conn.cursor().fetchone.return_value = _row(cnt=3, avg_rating=1.7)
        with patch.object(ars.pyodbc, "connect", return_value=conn):
            result = ars._eval_low_rating("org-1", 2, 24, _rule())
        assert result is not None
        assert result["severity"] == "warning"
        assert "3 reviews" in result["title"]
        assert result["trigger_data"]["avg_rating"] == 1.7

    def test_triggered_severity_error_when_5_or_more(self):
        conn = MagicMock()
        conn.cursor().fetchone.return_value = _row(cnt=6, avg_rating=1.2)
        with patch.object(ars.pyodbc, "connect", return_value=conn):
            result = ars._eval_low_rating("org-1", 2, 24, _rule())
        assert result["severity"] == "error"

    def test_not_triggered_when_no_reviews(self):
        conn = MagicMock()
        conn.cursor().fetchone.return_value = _row(cnt=0, avg_rating=0)
        with patch.object(ars.pyodbc, "connect", return_value=conn):
            result = ars._eval_low_rating("org-1", 2, 24, _rule())
        assert result is None


class TestNegativeSpikeEvaluator:
    def test_triggered_critical_on_big_spike(self):
        conn = MagicMock()
        conn.cursor().fetchone.side_effect = [
            _row(total=50, neg_cnt=25),   # current window: 50% negative
            _row(total=50, neg_cnt=5),    # previous window: 10%
        ]
        with patch.object(ars.pyodbc, "connect", return_value=conn):
            result = ars._eval_negative_spike("org-1", 10, 24, _rule("negative_sentiment_spike"))
        assert result is not None
        assert result["severity"] == "critical"
        assert result["trigger_data"]["spike"] == 40.0

    def test_triggered_warning_on_modest_spike(self):
        conn = MagicMock()
        conn.cursor().fetchone.side_effect = [
            _row(total=100, neg_cnt=25),
            _row(total=100, neg_cnt=20),
        ]
        with patch.object(ars.pyodbc, "connect", return_value=conn):
            result = ars._eval_negative_spike("org-1", 10, 24, _rule("negative_sentiment_spike"))
        assert result is not None
        assert result["severity"] == "warning"

    def test_not_triggered_below_min_count(self):
        conn = MagicMock()
        conn.cursor().fetchone.side_effect = [
            _row(total=100, neg_cnt=5),
            _row(total=100, neg_cnt=1),
        ]
        with patch.object(ars.pyodbc, "connect", return_value=conn):
            result = ars._eval_negative_spike("org-1", 10, 24, _rule("negative_sentiment_spike"))
        assert result is None


class TestResponseOverdueEvaluator:
    def test_triggered(self):
        conn = MagicMock()
        conn.cursor().fetchone.return_value = _row(cnt=7)
        with patch.object(ars.pyodbc, "connect", return_value=conn):
            result = ars._eval_response_overdue("org-1", 48, 72, _rule("response_overdue"))
        assert result is not None
        assert result["trigger_data"]["overdue_count"] == 7

    def test_not_triggered(self):
        conn = MagicMock()
        conn.cursor().fetchone.return_value = _row(cnt=0)
        with patch.object(ars.pyodbc, "connect", return_value=conn):
            result = ars._eval_response_overdue("org-1", 48, 72, _rule("response_overdue"))
        assert result is None


class TestEvaluateAllRulesForOrg:
    def test_triggered_rules_update_stats(self):
        with patch.object(ars, "get_rules_for_org", return_value=[_rule()]), \
             patch.object(ars, "evaluate_rule", return_value={"severity": "warning", "title": "x"}), \
             patch.object(ars, "_update_rule_trigger") as upd:
            triggered = ars.evaluate_all_rules_for_org("org-1")
        assert len(triggered) == 1
        upd.assert_called_once_with("rule-1")

    def test_no_rules_returns_empty(self):
        with patch.object(ars, "get_rules_for_org", return_value=[]):
            assert ars.evaluate_all_rules_for_org("org-1") == []

    def test_rule_error_does_not_break_other_rules(self):
        with patch.object(ars, "get_rules_for_org", return_value=[_rule(), _rule(name="Second")]), \
             patch.object(
                 ars, "evaluate_rule",
                 side_effect=[RuntimeError("boom"), {"severity": "warning", "title": "ok"}],
             ), \
             patch.object(ars, "_update_rule_trigger"):
            triggered = ars.evaluate_all_rules_for_org("org-1")
        assert len(triggered) == 1

    def test_cooldown_skips_recently_triggered_rule(self):
        fresh = datetime.utcnow() - timedelta(minutes=5)
        rule = _rule(last_triggered_at=fresh.isoformat())
        with patch.object(ars, "get_rules_for_org", return_value=[rule]), \
             patch.object(ars, "evaluate_rule") as ev, \
             patch.object(ars, "_update_rule_trigger"):
            triggered = ars.evaluate_all_rules_for_org("org-1", cooldown_minutes=60)
        assert triggered == []
        ev.assert_not_called()

    def test_cooldown_zero_evaluates_regardless(self):
        old = datetime.utcnow() - timedelta(minutes=5)
        rule = _rule(last_triggered_at=old.isoformat())
        with patch.object(ars, "get_rules_for_org", return_value=[rule]), \
             patch.object(ars, "evaluate_rule", return_value={"severity": "warning", "title": "x"}), \
             patch.object(ars, "_update_rule_trigger"):
            triggered = ars.evaluate_all_rules_for_org("org-1", cooldown_minutes=0)
        assert len(triggered) == 1

    def test_expired_cooldown_evaluates(self):
        stale = datetime.utcnow() - timedelta(hours=5)
        rule = _rule(last_triggered_at=stale.isoformat())
        with patch.object(ars, "get_rules_for_org", return_value=[rule]), \
             patch.object(ars, "evaluate_rule", return_value={"severity": "warning", "title": "x"}), \
             patch.object(ars, "_update_rule_trigger"):
            triggered = ars.evaluate_all_rules_for_org("org-1", cooldown_minutes=60)
        assert len(triggered) == 1


class TestEvaluateAndNotify:
    def test_dispatches_system_alert(self):
        alert = {"severity": "warning", "title": "Low Rating Alert", "message": "msg",
                 "trigger_data": {"count": 2}}
        with patch.object(ars, "evaluate_all_rules_for_org", return_value=[alert]), \
             patch("app.modules.admin.services.system_alert_logger.log_system_alert") as log:
            triggered = ars.evaluate_and_notify("org-1")
        assert triggered == [alert]
        log.assert_called_once_with(
            severity="warning", title="Low Rating Alert", message="msg",
            category="alert_rule", metadata={"count": 2},
        )

    def test_dispatch_failure_is_swallowed(self):
        alert = {"severity": "error", "title": "t", "message": "m", "trigger_data": {}}
        with patch.object(ars, "evaluate_all_rules_for_org", return_value=[alert]), \
             patch("app.modules.admin.services.system_alert_logger.log_system_alert",
                   side_effect=RuntimeError("nope")):
            triggered = ars.evaluate_and_notify("org-1")
        assert triggered == [alert]


class TestRunAlertEvaluationForOrgs:
    def test_evaluates_each_org(self):
        with patch.object(ars, "evaluate_and_notify") as ev:
            ev.return_value = [{"severity": "warning", "title": "x"}]
            triggered = ars.run_alert_evaluation_for_orgs(["org-1", "org-2"], cooldown_minutes=60)
        assert len(triggered) == 2
        assert ev.call_args_list[0] == (("org-1",), {"cooldown_minutes": 60})

    def test_failure_in_one_org_does_not_block_others(self):
        with patch.object(ars, "evaluate_and_notify", side_effect=RuntimeError("boom")):
            # Must not raise — failures are logged and swallowed
            assert ars.run_alert_evaluation_for_orgs(["org-1"]) == []
