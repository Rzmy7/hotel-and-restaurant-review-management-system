"""
Integration tests for the Alert Rules routes (/api/reviews/alert-rules/*).
Covers CRUD and manual evaluation with mocked services + tenant scope.
"""

import os
import uuid
from unittest.mock import MagicMock, patch
from contextlib import asynccontextmanager

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", "sqlite:///test.db")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests")

TEST_USER_ID = "11111111-1111-1111-1111-111111111111"
TEST_OWNED_ORG_ID = "22222222-2222-2222-2222-222222222222"
TEST_RULE_ID = "88888888-8888-8888-8888-888888888888"

RegularUser = {
    "user_id": TEST_USER_ID,
    "role": "Tenant",
    "organization_id": TEST_OWNED_ORG_ID,
}

RULE = {
    "id": TEST_RULE_ID,
    "organization_id": TEST_OWNED_ORG_ID,
    "name": "Low Rating Alert",
    "description": "Alert on ratings <= 2 stars",
    "condition_type": "low_rating",
    "threshold": 2.0,
    "lookback_hours": 24,
    "action_type": "notification",
    "is_enabled": True,
}


@pytest.fixture(scope="module")
def alert_client():
    """TestClient for alert-rule routes with mocked db + auth."""
    @asynccontextmanager
    async def _noop_lifespan(app):
        yield

    with patch("app.database.session.engine", None), patch("app.main.engine", None):
        import app.main as main_module

        original_lifespan = main_module.app.router.lifespan_context
        main_module.app.router.lifespan_context = _noop_lifespan

        from app.database.session import get_db
        from app.database import get_db as get_db_core
        from app.core.dependencies import get_current_user as core_get_user
        from app.modules.auth.utils.auth_utils import get_current_user as auth_get_user

        mock_session = MagicMock()

        def _override_get_db():
            yield mock_session

        def _override_get_user():
            return RegularUser

        main_module.app.dependency_overrides[get_db] = _override_get_db
        main_module.app.dependency_overrides[get_db_core] = _override_get_db
        main_module.app.dependency_overrides[core_get_user] = _override_get_user
        main_module.app.dependency_overrides[auth_get_user] = _override_get_user

        with TestClient(main_module.app, raise_server_exceptions=False) as c:
            yield c

        main_module.app.dependency_overrides.clear()
        main_module.app.router.lifespan_context = original_lifespan


class TestAlertRuleCRUD:
    def test_list_rules(self, alert_client):
        with patch(
            "app.modules.reviews.routes.alert_rules.get_rules_for_org",
            return_value=[RULE],
        ):
            resp = alert_client.get(f"/api/reviews/alert-rules/{TEST_OWNED_ORG_ID}")
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 1
        assert body["rules"][0]["condition_type"] == "low_rating"

    def test_create_rule_success(self, alert_client):
        with patch(
            "app.modules.reviews.routes.alert_rules.create_rule", return_value=RULE
        ):
            resp = alert_client.post(
                f"/api/reviews/alert-rules/{TEST_OWNED_ORG_ID}",
                json={"name": "Low Rating Alert", "condition_type": "low_rating",
                      "threshold": 2, "lookback_hours": 24},
            )
        assert resp.status_code == 200
        assert resp.json()["rule"]["id"] == TEST_RULE_ID

    def test_create_rule_requires_name(self, alert_client):
        resp = alert_client.post(
            f"/api/reviews/alert-rules/{TEST_OWNED_ORG_ID}",
            json={"condition_type": "low_rating"},
        )
        assert resp.status_code == 400
        assert "name is required" in resp.json()["detail"]

    def test_create_rule_invalid_condition(self, alert_client):
        resp = alert_client.post(
            f"/api/reviews/alert-rules/{TEST_OWNED_ORG_ID}",
            json={"name": "Bad", "condition_type": "not_a_condition"},
        )
        assert resp.status_code == 400
        assert "Invalid condition_type" in resp.json()["detail"]

    def test_get_rule_success(self, alert_client):
        with patch(
            "app.modules.reviews.routes.alert_rules.get_rule_by_id", return_value=RULE
        ):
            resp = alert_client.get(
                f"/api/reviews/alert-rules/{TEST_OWNED_ORG_ID}/{TEST_RULE_ID}"
            )
        assert resp.status_code == 200
        assert resp.json()["rule"]["name"] == "Low Rating Alert"

    def test_get_rule_not_found(self, alert_client):
        with patch(
            "app.modules.reviews.routes.alert_rules.get_rule_by_id",
            return_value=None,
        ):
            resp = alert_client.get(
                f"/api/reviews/alert-rules/{TEST_OWNED_ORG_ID}/{TEST_RULE_ID}"
            )
        assert resp.status_code == 404

    def test_get_rule_foreign_org_returns_404(self, alert_client):
        foreign_rule = dict(RULE, organization_id="33333333-3333-3333-3333-333333333333")
        with patch(
            "app.modules.reviews.routes.alert_rules.get_rule_by_id",
            return_value=foreign_rule,
        ):
            resp = alert_client.get(
                f"/api/reviews/alert-rules/{TEST_OWNED_ORG_ID}/{TEST_RULE_ID}"
            )
        assert resp.status_code == 404

    def test_update_rule_success(self, alert_client):
        with patch(
            "app.modules.reviews.routes.alert_rules.get_rule_by_id", return_value=RULE
        ), patch(
            "app.modules.reviews.routes.alert_rules.update_rule",
            return_value={**RULE, "threshold": 3.0},
        ):
            resp = alert_client.put(
                f"/api/reviews/alert-rules/{TEST_OWNED_ORG_ID}/{TEST_RULE_ID}",
                json={"threshold": 3},
            )
        assert resp.status_code == 200
        assert resp.json()["rule"]["threshold"] == 3.0

    def test_delete_rule_success(self, alert_client):
        with patch(
            "app.modules.reviews.routes.alert_rules.get_rule_by_id", return_value=RULE
        ), patch(
            "app.modules.reviews.routes.alert_rules.delete_rule", return_value=True
        ):
            resp = alert_client.delete(
                f"/api/reviews/alert-rules/{TEST_OWNED_ORG_ID}/{TEST_RULE_ID}"
            )
        assert resp.status_code == 200
        assert "deleted successfully" in resp.json()["message"]


class TestAlertRuleEvaluate:
    def test_evaluate_returns_triggered(self, alert_client):
        triggered = [{"severity": "warning", "title": "Low Rating Alert: 3 reviews"}]
        with patch(
            "app.modules.reviews.routes.alert_rules.evaluate_and_notify",
            return_value=triggered,
        ):
            resp = alert_client.post(
                f"/api/reviews/alert-rules/{TEST_OWNED_ORG_ID}/evaluate"
            )
        assert resp.status_code == 200
        body = resp.json()
        assert body["message"] == "Evaluation complete. 1 rule(s) triggered."
        assert body["triggered"][0]["severity"] == "warning"

    def test_evaluate_none_triggered(self, alert_client):
        with patch(
            "app.modules.reviews.routes.alert_rules.evaluate_and_notify",
            return_value=[],
        ):
            resp = alert_client.post(
                f"/api/reviews/alert-rules/{TEST_OWNED_ORG_ID}/evaluate"
            )
        assert resp.status_code == 200
        assert resp.json()["triggered"] == []
