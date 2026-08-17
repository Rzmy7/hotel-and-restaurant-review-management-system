"""
Integration tests for the Review Replies routes (/api/reviews/{id}/replies...).
Covers history, latest (incl. legacy ai_reply fallback), save, edit, and delete.
"""

import os
import uuid
from datetime import datetime
from unittest.mock import MagicMock, patch
from contextlib import asynccontextmanager

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", "sqlite:///test.db")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests")

TEST_USER_ID = "11111111-1111-1111-1111-111111111111"
TEST_OWNED_ORG_ID = "22222222-2222-2222-2222-222222222222"
TEST_UNOWNED_ORG_ID = "33333333-3333-3333-3333-333333333333"
TEST_REVIEW_ID = "44444444-4444-4444-4444-444444444444"
TEST_FOREIGN_REVIEW_ID = "55555555-5555-5555-5555-555555555555"
TEST_REPLY_ID = "66666666-6666-6666-6666-666666666666"

RegularUser = {
    "user_id": TEST_USER_ID,
    "role": "Tenant",
    "organization_id": TEST_OWNED_ORG_ID,
}


class _Row:
    """Simple attribute-access row, like a SQLAlchemy Row."""

    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


def make_execute(overrides=None):
    """Build a db.execute side_effect. overrides: {substring: handler}."""
    overrides = overrides or {}

    def _exec(stmt, params=None):
        p = params or {}
        s = str(stmt).lower()

        # Tenant-scope ownership check (resolve_tenant_scope)
        if "org_id" in p:
            if str(p.get("org_id")) == TEST_OWNED_ORG_ID:
                return MagicMock(fetchone=lambda: (1,))
            return MagicMock(fetchone=lambda: None)

        # Review ownership lookup (route-level _verify_review_ownership) —
        # requires the source join so other processed_review queries (e.g. legacy ai_reply) don't match
        if "join dbo.source" in s and "update" not in s and "insert" not in s:
            rid = str(p.get("review_id", ""))
            if TEST_FOREIGN_REVIEW_ID in rid:
                return MagicMock(fetchone=lambda: (TEST_UNOWNED_ORG_ID,))
            if TEST_REVIEW_ID in rid:
                return MagicMock(fetchone=lambda: (TEST_OWNED_ORG_ID,))
            return MagicMock(fetchone=lambda: None)

        for key, handler in overrides.items():
            if key in s:
                return handler()

        return MagicMock(fetchone=lambda: None, fetchall=lambda: [])

    return _exec


@pytest.fixture(scope="module")
def reply_session():
    return MagicMock()


@pytest.fixture(scope="module")
def replies_client(reply_session):
    """TestClient for review_replies routes with mocked db + auth."""
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

        reply_session.execute = MagicMock(side_effect=make_execute())

        def _override_get_db():
            yield reply_session

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


class TestGetReplyHistory:
    def test_history_returns_replies_desc(self, replies_client, reply_session):
        now = datetime(2026, 8, 17, 12, 0, 0)
        rows = [
            _Row(id=TEST_REPLY_ID, reply_text="Newest", tone="professional",
                 created_at=now, updated_at=None, is_edited=False),
            _Row(id=str(uuid.uuid4()), reply_text="Older", tone="casual",
                 created_at=now, updated_at=now, is_edited=True),
        ]
        reply_session.execute.side_effect = make_execute(
            {"from dbo.review_reply": lambda: MagicMock(fetchall=lambda: rows)}
        )
        resp = replies_client.get(f"/api/reviews/{TEST_REVIEW_ID}/replies")
        assert resp.status_code == 200
        body = resp.json()
        assert body["review_id"] == TEST_REVIEW_ID
        assert len(body["replies"]) == 2
        assert body["replies"][0]["replyText"] == "Newest"
        assert body["replies"][1]["isEdited"] is True

    def test_history_empty(self, replies_client, reply_session):
        reply_session.execute.side_effect = make_execute(
            {"from dbo.review_reply": lambda: MagicMock(fetchall=lambda: [])}
        )
        resp = replies_client.get(f"/api/reviews/{TEST_REVIEW_ID}/replies")
        assert resp.status_code == 200
        assert resp.json()["replies"] == []

    def test_history_foreign_review_returns_403(self, replies_client, reply_session):
        resp = replies_client.get(f"/api/reviews/{TEST_FOREIGN_REVIEW_ID}/replies")
        assert resp.status_code == 403

    def test_history_missing_review_returns_404(self, replies_client, reply_session):
        missing = "77777777-7777-7777-7777-777777777777"
        reply_session.execute.side_effect = make_execute(
            {"dbo.processed_review": lambda: MagicMock(fetchone=lambda: None)}
        )
        resp = replies_client.get(f"/api/reviews/{missing}/replies")
        assert resp.status_code == 404


class TestGetLatestReply:
    def test_latest_returns_most_recent(self, replies_client, reply_session):
        now = datetime(2026, 8, 17, 12, 0, 0)
        row = _Row(id=TEST_REPLY_ID, reply_text="Thanks!", tone="standard",
                   created_at=now, updated_at=None, is_edited=False)
        reply_session.execute.side_effect = make_execute(
            {"from dbo.review_reply": lambda: MagicMock(fetchone=lambda: row)}
        )
        resp = replies_client.get(f"/api/reviews/{TEST_REVIEW_ID}/replies/latest")
        assert resp.status_code == 200
        reply = resp.json()["reply"]
        assert reply["replyText"] == "Thanks!"
        assert reply["id"] == TEST_REPLY_ID

    def test_latest_falls_back_to_legacy_ai_reply(self, replies_client, reply_session):
        reply_session.execute.side_effect = make_execute(
            {
                "from dbo.review_reply": lambda: MagicMock(fetchone=lambda: None),
                "select ai_reply": lambda: MagicMock(
                    fetchone=lambda: _Row(ai_reply="Legacy response")
                ),
            }
        )
        resp = replies_client.get(f"/api/reviews/{TEST_REVIEW_ID}/replies/latest")
        assert resp.status_code == 200
        reply = resp.json()["reply"]
        assert reply["replyText"] == "Legacy response"
        assert reply["id"] is None

    def test_latest_none_when_no_reply(self, replies_client, reply_session):
        reply_session.execute.side_effect = make_execute(
            {
                "from dbo.review_reply": lambda: MagicMock(fetchone=lambda: None),
                "select ai_reply": lambda: MagicMock(fetchone=lambda: _Row(ai_reply=None)),
            }
        )
        resp = replies_client.get(f"/api/reviews/{TEST_REVIEW_ID}/replies/latest")
        assert resp.status_code == 200
        assert resp.json()["reply"] is None


class TestSaveReply:
    def test_save_inserts_and_updates_ai_reply(self, replies_client, reply_session):
        reply_session.commit.reset_mock()
        reply_session.execute.side_effect = make_execute()
        resp = replies_client.post(
            f"/api/reviews/{TEST_REVIEW_ID}/reply",
            json={"replyText": "Thank you for your feedback!", "tone": "professional"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["message"] == "Reply saved successfully"
        assert body["review_id"] == TEST_REVIEW_ID
        assert uuid.UUID(body["reply_id"])
        reply_session.commit.assert_called_once()

    def test_save_requires_reply_text(self, replies_client, reply_session):
        resp = replies_client.post(
            f"/api/reviews/{TEST_REVIEW_ID}/reply", json={"replyText": "   "}
        )
        assert resp.status_code == 400
        assert "replyText" in resp.json()["detail"]

    def test_save_foreign_review_returns_403(self, replies_client, reply_session):
        resp = replies_client.post(
            f"/api/reviews/{TEST_FOREIGN_REVIEW_ID}/reply",
            json={"replyText": "nope"},
        )
        assert resp.status_code == 403


class TestEditReply:
    def test_edit_marks_is_edited(self, replies_client, reply_session):
        reply_session.commit.reset_mock()
        existing = _Row(id=TEST_REPLY_ID)
        reply_session.execute.side_effect = make_execute(
            {
                "select id from dbo.review_reply": lambda: MagicMock(fetchone=lambda: existing),
            }
        )
        resp = replies_client.put(
            f"/api/reviews/{TEST_REVIEW_ID}/reply/{TEST_REPLY_ID}",
            json={"replyText": "Edited response"},
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "Reply updated successfully"
        reply_session.commit.assert_called_once()

    def test_edit_missing_reply_returns_404(self, replies_client, reply_session):
        reply_session.execute.side_effect = make_execute(
            {
                "select id from dbo.review_reply": lambda: MagicMock(fetchone=lambda: None),
            }
        )
        resp = replies_client.put(
            f"/api/reviews/{TEST_REVIEW_ID}/reply/{TEST_REPLY_ID}",
            json={"replyText": "x"},
        )
        assert resp.status_code == 404

    def test_edit_requires_text(self, replies_client, reply_session):
        resp = replies_client.put(
            f"/api/reviews/{TEST_REVIEW_ID}/reply/{TEST_REPLY_ID}",
            json={"replyText": ""},
        )
        assert resp.status_code == 400


class TestDeleteReply:
    def test_delete_with_remaining_reply(self, replies_client, reply_session):
        remaining = _Row(reply_text="Latest remaining")
        reply_session.execute.side_effect = make_execute(
            {
                "delete from dbo.review_reply": lambda: MagicMock(rowcount=1),
                "select top 1 reply_text": lambda: MagicMock(fetchone=lambda: remaining),
            }
        )
        resp = replies_client.delete(
            f"/api/reviews/{TEST_REVIEW_ID}/reply/{TEST_REPLY_ID}"
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "Reply deleted successfully"

    def test_delete_clears_ai_reply_when_last(self, replies_client, reply_session):
        reply_session.execute.side_effect = make_execute(
            {
                "delete from dbo.review_reply": lambda: MagicMock(rowcount=1),
                "select top 1 reply_text": lambda: MagicMock(fetchone=lambda: None),
            }
        )
        resp = replies_client.delete(
            f"/api/reviews/{TEST_REVIEW_ID}/reply/{TEST_REPLY_ID}"
        )
        assert resp.status_code == 200

    def test_delete_missing_reply_returns_404(self, replies_client, reply_session):
        reply_session.execute.side_effect = make_execute(
            {"delete from dbo.review_reply": lambda: MagicMock(rowcount=0)}
        )
        resp = replies_client.delete(
            f"/api/reviews/{TEST_REVIEW_ID}/reply/{TEST_REPLY_ID}"
        )
        assert resp.status_code == 404
