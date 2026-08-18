"""
Unit tests for group permission boundaries.

The groups domain is multi-tenant: a group's members are ORGANIZATIONS, and an
invited organization must never see more of the inviting organization than the
group settings explicitly share. These tests exercise the real authorization
guards in the router rather than schema shapes.

No database — repository calls are monkeypatched.
"""

import json

import pytest
from fastapi import HTTPException

from app.modules.groups import router as groups_router
from app.modules.groups.router import _require_member, _require_owner

GROUP_ID = "11111111-1111-1111-1111-111111111111"
OWNER_ORG = "22222222-2222-2222-2222-222222222222"
MEMBER_ORG = "33333333-3333-3333-3333-333333333333"
OUTSIDER_ORG = "44444444-4444-4444-4444-444444444444"


@pytest.fixture
def role_map(monkeypatch):
    """
    Patch get_org_group_role with a lookup table keyed by organization_id.
    Returns the dict so tests can adjust roles.
    """
    roles = {
        OWNER_ORG: "GROUP_OWNER",
        MEMBER_ORG: "GROUP_MEMBER",
        # OUTSIDER_ORG intentionally absent -> None (not a member)
    }

    def fake_get_org_group_role(db, group_id, organization_id):
        return roles.get(organization_id)

    monkeypatch.setattr(
        groups_router.repo, "get_org_group_role", fake_get_org_group_role
    )
    return roles


def _make_group(settings: dict | None):
    """Minimal stand-in for a Group ORM row — only .settings is read."""

    class _Group:
        group_name = "Test Group"

    g = _Group()
    g.settings = json.dumps(settings) if settings is not None else None
    return g


class TestRequireOwner:
    """_require_owner must admit only the owning organization."""

    def test_owner_org_allowed(self, role_map, mock_db):
        assert _require_owner(GROUP_ID, OWNER_ORG, mock_db) == "GROUP_OWNER"

    def test_member_org_rejected(self, role_map, mock_db):
        with pytest.raises(HTTPException) as exc:
            _require_owner(GROUP_ID, MEMBER_ORG, mock_db)
        assert exc.value.status_code == 403

    def test_non_member_org_rejected(self, role_map, mock_db):
        with pytest.raises(HTTPException) as exc:
            _require_owner(GROUP_ID, OUTSIDER_ORG, mock_db)
        assert exc.value.status_code == 403


class TestRequireMember:
    """_require_member must admit both roles but exclude outsiders."""

    def test_owner_org_allowed(self, role_map, mock_db):
        assert _require_member(GROUP_ID, OWNER_ORG, mock_db) == "GROUP_OWNER"

    def test_member_org_allowed(self, role_map, mock_db):
        assert _require_member(GROUP_ID, MEMBER_ORG, mock_db) == "GROUP_MEMBER"

    def test_non_member_org_rejected(self, role_map, mock_db):
        with pytest.raises(HTTPException) as exc:
            _require_member(GROUP_ID, OUTSIDER_ORG, mock_db)
        assert exc.value.status_code == 403
        assert "not a member" in exc.value.detail.lower()


class TestAnalyticsVisibilityBoundary:
    """
    A member organization may only read group analytics when the owner has
    switched show_analytics_to_members on. This is the tenant boundary that
    stops an invited peer from reading the host's aggregated data by default.
    """

    @pytest.fixture(autouse=True)
    def _patch_group_and_analytics(self, monkeypatch):
        self.group_settings = None

        monkeypatch.setattr(
            groups_router.repo,
            "get_group",
            lambda db, gid: _make_group(self.group_settings),
        )
        monkeypatch.setattr(
            groups_router.repo,
            "get_group_analytics",
            lambda db, gid: {"member_count": 3, "total_reviews": 120},
        )

    def _call(self, org_id, current_user, db):
        monkey_scope = lambda user, session, oid: org_id  # noqa: E731
        original = groups_router.resolve_tenant_scope
        groups_router.resolve_tenant_scope = monkey_scope
        try:
            return groups_router.get_analytics(
                group_id=GROUP_ID,
                organization_id=org_id,
                current_user=current_user,
                db=db,
            )
        finally:
            groups_router.resolve_tenant_scope = original

    def test_owner_always_sees_analytics(
        self, role_map, mock_db, mock_current_user
    ):
        self.group_settings = {"show_analytics_to_members": False}
        result = self._call(OWNER_ORG, mock_current_user, mock_db)
        assert result["total_reviews"] == 120

    def test_member_blocked_when_sharing_disabled(
        self, role_map, mock_db, mock_current_user
    ):
        self.group_settings = {"show_analytics_to_members": False}
        with pytest.raises(HTTPException) as exc:
            self._call(MEMBER_ORG, mock_current_user, mock_db)
        assert exc.value.status_code == 403

    def test_member_blocked_by_default_settings(
        self, role_map, mock_db, mock_current_user
    ):
        """Unset settings must fail closed, not open."""
        self.group_settings = None
        with pytest.raises(HTTPException) as exc:
            self._call(MEMBER_ORG, mock_current_user, mock_db)
        assert exc.value.status_code == 403

    def test_member_allowed_when_sharing_enabled(
        self, role_map, mock_db, mock_current_user
    ):
        self.group_settings = {"show_analytics_to_members": True}
        result = self._call(MEMBER_ORG, mock_current_user, mock_db)
        assert result["total_reviews"] == 120

    def test_outsider_blocked_even_when_sharing_enabled(
        self, role_map, mock_db, mock_current_user
    ):
        """Sharing with members must not leak to non-members."""
        self.group_settings = {"show_analytics_to_members": True}
        with pytest.raises(HTTPException) as exc:
            self._call(OUTSIDER_ORG, mock_current_user, mock_db)
        assert exc.value.status_code == 403
