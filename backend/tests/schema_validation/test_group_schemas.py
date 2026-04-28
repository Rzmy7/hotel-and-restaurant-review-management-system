"""
Schema validation tests for groups module Pydantic models.

Tests GroupCreate, GroupUpdate, GroupSettings, InviteCreate,
MemberResponse, InviteResponse, GroupResponse, and GroupAnalytics.
"""

import pytest
from pydantic import ValidationError

from app.modules.groups.schemas import (
    GroupCreate,
    GroupUpdate,
    GroupSettings,
    InviteCreate,
    MemberResponse,
    InviteResponse,
    GroupResponse,
    GroupAnalytics,
)


class TestGroupSettings:
    """Tests for GroupSettings schema."""

    def test_defaults(self):
        model = GroupSettings()
        assert model.can_members_invite is False
        assert model.show_members_to_members is True
        assert model.show_analytics_to_members is False

    def test_custom_settings(self):
        model = GroupSettings(
            can_members_invite=True,
            show_members_to_members=False,
            show_analytics_to_members=True,
        )
        assert model.can_members_invite is True
        assert model.show_analytics_to_members is True


class TestGroupCreate:
    """Tests for GroupCreate schema."""

    def test_valid_minimal(self):
        model = GroupCreate(group_name="My Group")
        assert model.group_name == "My Group"
        assert model.is_private is True  # default
        assert model.description is None

    def test_with_all_fields(self):
        model = GroupCreate(
            group_name="Team Alpha",
            description="Our main team group",
            is_private=False,
            settings=GroupSettings(can_members_invite=True),
            organization_id="org-123",
        )
        assert model.is_private is False
        assert model.settings.can_members_invite is True
        assert model.organization_id == "org-123"

    def test_rejects_missing_name(self):
        with pytest.raises(ValidationError):
            GroupCreate()

    def test_with_default_settings(self):
        model = GroupCreate(
            group_name="Test Group",
            settings=GroupSettings(),
        )
        assert model.settings.can_members_invite is False


class TestGroupUpdate:
    """Tests for GroupUpdate schema."""

    def test_all_none_by_default(self):
        model = GroupUpdate()
        assert model.group_name is None
        assert model.description is None
        assert model.is_private is None

    def test_partial_update_name(self):
        model = GroupUpdate(group_name="New Name")
        assert model.group_name == "New Name"
        assert model.description is None

    def test_partial_update_privacy(self):
        model = GroupUpdate(is_private=False)
        assert model.is_private is False

    def test_full_update(self):
        model = GroupUpdate(
            group_name="Updated",
            description="Updated description",
            is_private=True,
        )
        assert model.group_name == "Updated"
        assert model.description == "Updated description"


class TestInviteCreate:
    """Tests for InviteCreate schema."""

    def test_valid(self):
        model = InviteCreate(organization_id="org-123")
        assert model.organization_id == "org-123"
        assert model.message is None

    def test_with_message(self):
        model = InviteCreate(
            organization_id="org-456",
            message="Join our group!",
        )
        assert model.message == "Join our group!"

    def test_rejects_missing_org_id(self):
        with pytest.raises(ValidationError):
            InviteCreate()


class TestMemberResponse:
    """Tests for MemberResponse schema."""

    def test_valid(self):
        model = MemberResponse(
            user_id="u-1",
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            profile_image_url=None,
            role="GROUP_MEMBER",
            joined_at="2026-04-15T10:00:00",
        )
        assert model.email == "john@example.com"
        assert model.role == "GROUP_MEMBER"

    def test_nullable_names(self):
        model = MemberResponse(
            user_id="u-2",
            first_name=None,
            last_name=None,
            email="anon@example.com",
            profile_image_url=None,
            role="GROUP_OWNER",
            joined_at="2026-04-15T10:00:00",
        )
        assert model.first_name is None


class TestInviteResponse:
    """Tests for InviteResponse schema."""

    def test_valid(self):
        model = InviteResponse(
            invite_id="inv-1",
            group_id="grp-1",
            group_name="Test Group",
            invited_by_name="Admin",
            invited_user_id="u-2",
            invited_user_name="John",
            invited_user_email="john@example.com",
            invite_type="direct",
            status="pending",
            message=None,
            expires_at=None,
            created_at="2026-04-15T10:00:00",
        )
        assert model.status == "pending"


class TestGroupResponse:
    """Tests for GroupResponse schema."""

    def test_valid(self):
        model = GroupResponse(
            group_id="grp-1",
            group_name="Team Alpha",
            description="Main team",
            avatar_url=None,
            is_private=True,
            settings=GroupSettings(),
            has_invite_link=False,
            invite_link_token=None,
            created_by="u-1",
            created_at="2026-04-15T10:00:00",
            member_count=5,
            my_role="GROUP_OWNER",
        )
        assert model.member_count == 5
        assert model.my_role == "GROUP_OWNER"


class TestGroupAnalytics:
    """Tests for GroupAnalytics schema."""

    def test_valid(self):
        model = GroupAnalytics(
            member_count=10,
            total_reviews=250,
            avg_rating=4.2,
            positive_count=180,
            negative_count=30,
            neutral_count=40,
            invite_stats={"pending": 5, "accepted": 20},
            recent_members=[{"user_id": "u-1", "name": "Test"}],
            member_orgs=[{"org_id": "org-1", "name": "Hotel A"}],
            reviews_over_time=[{"month": "Jan", "count": 50}],
            rating_distribution=[{"rating": 5, "count": 100}],
        )
        assert model.member_count == 10
        assert model.avg_rating == 4.2

    def test_nullable_avg_rating(self):
        model = GroupAnalytics(
            member_count=0,
            total_reviews=0,
            avg_rating=None,
            positive_count=0,
            negative_count=0,
            neutral_count=0,
            invite_stats={},
            recent_members=[],
            member_orgs=[],
            reviews_over_time=[],
            rating_distribution=[],
        )
        assert model.avg_rating is None
