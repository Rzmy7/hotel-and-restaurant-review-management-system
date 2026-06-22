"""
Schema validation tests for admin module Pydantic models.

Tests BroadcastCreate, SecuritySettingsPayload,
SubscriptionPlanUpsertPayload, AdminUserCreatePayload,
AdminPasswordChangePayload, FeatureFlagUpdatePayload, and more.
"""

import pytest
from pydantic import ValidationError

from app.modules.admin.schemas import (
    BroadcastCreate,
    SecuritySettingsPayload,
    SecuritySettingsResponse,
    SubscriptionPlanUpsertPayload,
    SubscriptionPlanFeatureUpsertPayload,
    AdminUserCreatePayload,
    AdminUserUpdatePayload,
    AdminPasswordChangePayload,
    AdminProfileUpdatePayload,
    FeatureFlagUpdatePayload,
    GeneralSettingsPayload,
    ReplyGenerationSettingsPayload,
    GeminiApiKeySavePayload,
    GeminiApiKeyTestPayload,
    DashboardStats,
    OrganizationUpdatePayload,
    DeleteUserResponse,
    StatisticsResponse,
)


# ── Broadcast schemas ────────────────────────────────────────────────


class TestBroadcastCreate:
    """Tests for BroadcastCreate schema."""

    def test_valid_broadcast(self):
        model = BroadcastCreate(
            subject="System Maintenance",
            body="The system will be down for maintenance tonight.",
            channel="notification",
            audienceType="all",
            messageType="maintenance",
            scheduleType="now",
        )
        assert model.subject == "System Maintenance"
        assert model.channel == "notification"

    def test_scheduled_broadcast(self):
        model = BroadcastCreate(
            subject="Upcoming Feature",
            body="We are launching a new feature next week.",
            channel="both",
            audienceType="role",
            audienceValue="admin",
            messageType="announcement",
            scheduleType="scheduled",
            scheduledAt="2026-05-01T10:00:00Z",
        )
        assert model.scheduleType == "scheduled"

    def test_rejects_empty_subject(self):
        with pytest.raises(ValidationError):
            BroadcastCreate(
                subject="",
                body="Some body text here.",
                channel="email",
                audienceType="all",
                messageType="info",
                scheduleType="now",
            )

    def test_rejects_empty_body(self):
        with pytest.raises(ValidationError):
            BroadcastCreate(
                subject="Test",
                body="",
                channel="email",
                audienceType="all",
                messageType="info",
                scheduleType="now",
            )

    def test_rejects_invalid_channel(self):
        with pytest.raises(ValidationError):
            BroadcastCreate(
                subject="Test",
                body="Body text.",
                channel="sms",  # invalid
                audienceType="all",
                messageType="info",
                scheduleType="now",
            )

    def test_rejects_invalid_audience_type(self):
        with pytest.raises(ValidationError):
            BroadcastCreate(
                subject="Test",
                body="Body.",
                channel="email",
                audienceType="custom",  # invalid
                messageType="info",
                scheduleType="now",
            )

    def test_rejects_invalid_message_type(self):
        with pytest.raises(ValidationError):
            BroadcastCreate(
                subject="Test",
                body="Body.",
                channel="email",
                audienceType="all",
                messageType="urgent",  # invalid
                scheduleType="now",
            )

    def test_subject_max_length(self):
        """Subject over 120 chars should be rejected."""
        with pytest.raises(ValidationError):
            BroadcastCreate(
                subject="A" * 121,
                body="Body.",
                channel="email",
                audienceType="all",
                messageType="info",
                scheduleType="now",
            )


# ── Security settings ───────────────────────────────────────────────


class TestSecuritySettingsPayload:
    """Tests for SecuritySettingsPayload schema."""

    def test_valid_settings(self):
        model = SecuritySettingsPayload(
            userSessionTimeoutMinutes=60,
            adminSessionTimeoutMinutes=30,
            requireTwoFactorAuth=True,
        )
        assert model.userSessionTimeoutMinutes == 60
        assert model.requireTwoFactorAuth is True

    def test_rejects_too_low_user_timeout(self):
        """Below 5 minutes should be rejected."""
        with pytest.raises(ValidationError):
            SecuritySettingsPayload(
                userSessionTimeoutMinutes=3,
                adminSessionTimeoutMinutes=30,
            )

    def test_rejects_too_high_timeout(self):
        """Above 10080 minutes (7 days) should be rejected."""
        with pytest.raises(ValidationError):
            SecuritySettingsPayload(
                userSessionTimeoutMinutes=60,
                adminSessionTimeoutMinutes=20000,
            )

    def test_boundary_min_value(self):
        """Exactly 5 minutes should be accepted."""
        model = SecuritySettingsPayload(
            userSessionTimeoutMinutes=5,
            adminSessionTimeoutMinutes=5,
        )
        assert model.userSessionTimeoutMinutes == 5

    def test_boundary_max_value(self):
        """Exactly 10080 minutes should be accepted."""
        model = SecuritySettingsPayload(
            userSessionTimeoutMinutes=10080,
            adminSessionTimeoutMinutes=10080,
        )
        assert model.adminSessionTimeoutMinutes == 10080

    def test_default_2fa_false(self):
        model = SecuritySettingsPayload(
            userSessionTimeoutMinutes=60,
            adminSessionTimeoutMinutes=60,
        )
        assert model.requireTwoFactorAuth is False


# ── Subscription plan ────────────────────────────────────────────────


class TestSubscriptionPlanUpsertPayload:
    """Tests for SubscriptionPlanUpsertPayload schema."""

    def test_valid_plan(self):
        model = SubscriptionPlanUpsertPayload(name="Pro Plan")
        assert model.name == "Pro Plan"
        assert model.monthlyPrice == 0.0  # default
        assert model.isPopular is False
        assert model.isActive is True

    def test_with_all_fields(self):
        model = SubscriptionPlanUpsertPayload(
            name="Enterprise",
            description="Full access plan",
            monthlyPrice=99.99,
            annualPrice=999.99,
            currency="USD",
            isPopular=True,
            isActive=True,
            color="from-purple-500 to-purple-600",
            iconName="crown",
            features=[
                SubscriptionPlanFeatureUpsertPayload(
                    featureId="f1", enabled=True, limit=100,
                ),
            ],
        )
        assert model.iconName == "crown"
        assert len(model.features) == 1

    def test_rejects_negative_price(self):
        with pytest.raises(ValidationError):
            SubscriptionPlanUpsertPayload(name="Bad", monthlyPrice=-10)

    def test_rejects_invalid_icon(self):
        with pytest.raises(ValidationError):
            SubscriptionPlanUpsertPayload(name="Bad", iconName="invalid-icon")

    def test_valid_icon_names(self):
        for icon in ["zap", "star", "crown", "building"]:
            model = SubscriptionPlanUpsertPayload(name="Test", iconName=icon)
            assert model.iconName == icon


# ── Admin user ───────────────────────────────────────────────────────


class TestAdminUserCreatePayload:
    """Tests for AdminUserCreatePayload schema."""

    def test_valid_user(self):
        model = AdminUserCreatePayload(
            name="New User",
            email="new@example.com",
        )
        assert model.role == "User"  # default
        assert model.status == "Active"  # default

    def test_with_all_fields(self):
        model = AdminUserCreatePayload(
            name="Admin User",
            email="admin@example.com",
            role="Admin",
            status="Active",
            password="StrongPass1!",
            plan="Enterprise",
        )
        assert model.role == "Admin"
        assert model.password == "StrongPass1!"

    def test_rejects_invalid_role(self):
        with pytest.raises(ValidationError):
            AdminUserCreatePayload(
                name="Test",
                email="test@example.com",
                role="SuperAdmin",
            )

    def test_rejects_invalid_status(self):
        with pytest.raises(ValidationError):
            AdminUserCreatePayload(
                name="Test",
                email="test@example.com",
                status="Deleted",
            )

    def test_rejects_short_password(self):
        with pytest.raises(ValidationError):
            AdminUserCreatePayload(
                name="Test",
                email="test@example.com",
                password="short",
            )


class TestAdminUserUpdatePayload:
    """Tests for AdminUserUpdatePayload schema."""

    def test_all_none_defaults(self):
        model = AdminUserUpdatePayload()
        assert model.name is None
        assert model.email is None
        assert model.role is None

    def test_partial_update(self):
        model = AdminUserUpdatePayload(name="Updated Name")
        assert model.name == "Updated Name"
        assert model.email is None


# ── Admin password ───────────────────────────────────────────────────


class TestAdminPasswordChangePayload:
    """Tests for AdminPasswordChangePayload schema."""

    def test_valid(self):
        model = AdminPasswordChangePayload(
            currentPassword="OldPass123!",
            newPassword="NewPass456!",
        )
        assert model.newPassword == "NewPass456!"

    def test_rejects_short_new_password(self):
        with pytest.raises(ValidationError):
            AdminPasswordChangePayload(
                currentPassword="OldPass123!",
                newPassword="short",
            )

    def test_rejects_empty_current_password(self):
        with pytest.raises(ValidationError):
            AdminPasswordChangePayload(
                currentPassword="",
                newPassword="NewPass456!",
            )


# ── Feature flags ────────────────────────────────────────────────────


class TestFeatureFlagUpdatePayload:
    """Tests for FeatureFlagUpdatePayload schema."""

    def test_enabled(self):
        model = FeatureFlagUpdatePayload(status="Enabled")
        assert model.status == "Enabled"

    def test_disabled(self):
        model = FeatureFlagUpdatePayload(status="Disabled")
        assert model.status == "Disabled"

    def test_with_limit(self):
        model = FeatureFlagUpdatePayload(status="Enabled", limit=50)
        assert model.limit == 50

    def test_rejects_invalid_status(self):
        with pytest.raises(ValidationError):
            FeatureFlagUpdatePayload(status="Paused")

    def test_rejects_zero_limit(self):
        with pytest.raises(ValidationError):
            FeatureFlagUpdatePayload(status="Enabled", limit=0)


# ── General settings ────────────────────────────────────────────────


class TestGeneralSettingsPayload:
    """Tests for GeneralSettingsPayload schema."""

    def test_valid(self):
        model = GeneralSettingsPayload(
            timezone="Asia/Colombo",
            language="en",
            dateFormat="YYYY-MM-DD",
            currency="LKR",
        )
        assert model.timezone == "Asia/Colombo"

    def test_rejects_empty_timezone(self):
        with pytest.raises(ValidationError):
            GeneralSettingsPayload(
                timezone="",
                language="en",
                dateFormat="YYYY-MM-DD",
                currency="LKR",
            )


# ── Reply generation settings ───────────────────────────────────────


class TestReplyGenerationSettingsPayload:
    """Tests for ReplyGenerationSettingsPayload schema."""

    def test_defaults(self):
        model = ReplyGenerationSettingsPayload()
        assert model.similarReviewsCount == 3
        assert model.useEmbeddingRules is True
        assert model.useSimilarReviews is True

    def test_custom_values(self):
        model = ReplyGenerationSettingsPayload(
            similarReviewsCount=5,
        )
        assert model.similarReviewsCount == 5


# ── Simple response models ──────────────────────────────────────────


class TestDeleteUserResponse:
    """Tests for DeleteUserResponse schema."""

    def test_valid(self):
        model = DeleteUserResponse(status="deleted", userId="u-1")
        assert model.status == "deleted"


class TestStatisticsResponse:
    """Tests for StatisticsResponse schema."""

    def test_valid(self):
        model = StatisticsResponse(total=100, sent=80, scheduled=10, failed=10)
        assert model.total == 100
