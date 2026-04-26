"""
Schema validation tests for source module Pydantic models.

Tests SourceCreate, SourceUpdate, SourceStatus, PlatformStatus,
SyncStatusRequest, and related enums.
"""

import uuid
from datetime import datetime

import pytest
from pydantic import ValidationError

from app.modules.source.schemas import (
    SourceCreate,
    SourceUpdate,
    SourceStatus,
    PlatformStatus,
    SourceType,
    SyncStatusRequest,
    SyncStatus,
    SyncFrequencyRead,
)


class TestSourceStatusEnum:
    """Tests for SourceStatus enum values."""

    def test_active(self):
        assert SourceStatus.ACTIVE == "active"

    def test_paused(self):
        assert SourceStatus.PAUSED == "paused"

    def test_error(self):
        assert SourceStatus.ERROR == "error"

    def test_queued(self):
        assert SourceStatus.QUEUED == "queued"

    def test_running(self):
        assert SourceStatus.RUNNING == "running"

    def test_verify_duplication(self):
        assert SourceStatus.VERIFY_DUPLICATION == "verify duplication"

    def test_all_values_are_strings(self):
        for member in SourceStatus:
            assert isinstance(member.value, str)


class TestSourceTypeEnum:
    """Tests for SourceType enum."""

    def test_api(self):
        assert SourceType.API == "API"

    def test_scraping(self):
        assert SourceType.SCRAPING == "SCRAPING"

    def test_both(self):
        assert SourceType.BOTH == "BOTH"


class TestPlatformStatusEnum:
    """Tests for PlatformStatus enum."""

    def test_active(self):
        assert PlatformStatus.ACTIVE == "active"

    def test_inactive(self):
        assert PlatformStatus.INACTIVE == "inactive"


class TestSourceCreate:
    """Tests for SourceCreate schema."""

    def test_valid_source(self):
        org_id = uuid.uuid4()
        model = SourceCreate(
            organization_id=org_id,
            platform_id=1,
            source_url="https://www.booking.com/hotel/lk/test",
        )
        assert model.organization_id == org_id
        assert model.platform_id == 1
        assert model.source_status == SourceStatus.ACTIVE  # default

    def test_custom_status(self):
        model = SourceCreate(
            organization_id=uuid.uuid4(),
            platform_id=2,
            source_url="https://www.tripadvisor.com/test",
            source_status=SourceStatus.PAUSED,
        )
        assert model.source_status == SourceStatus.PAUSED

    def test_default_fetching_frequency(self):
        model = SourceCreate(
            organization_id=uuid.uuid4(),
            platform_id=1,
            source_url="https://example.com",
        )
        assert model.fetching_frequency == 1

    def test_rejects_missing_organization_id(self):
        with pytest.raises(ValidationError):
            SourceCreate(platform_id=1, source_url="https://example.com")

    def test_rejects_missing_platform_id(self):
        with pytest.raises(ValidationError):
            SourceCreate(organization_id=uuid.uuid4(), source_url="https://example.com")

    def test_rejects_missing_source_url(self):
        with pytest.raises(ValidationError):
            SourceCreate(organization_id=uuid.uuid4(), platform_id=1)


class TestSourceUpdate:
    """Tests for SourceUpdate schema."""

    def test_all_none_by_default(self):
        model = SourceUpdate()
        assert model.source_url is None
        assert model.source_status is None
        assert model.fetching_frequency is None

    def test_partial_update(self):
        model = SourceUpdate(source_status=SourceStatus.PAUSED)
        assert model.source_status == SourceStatus.PAUSED
        assert model.source_url is None


class TestSyncStatusRequest:
    """Tests for SyncStatusRequest schema."""

    def test_valid_completed(self):
        model = SyncStatusRequest(status=SyncStatus.COMPLETED, new_review_count=10)
        assert model.status == SyncStatus.COMPLETED
        assert model.new_review_count == 10

    def test_default_new_review_count(self):
        model = SyncStatusRequest(status=SyncStatus.QUEUED)
        assert model.new_review_count == 0

    def test_failed_with_error(self):
        model = SyncStatusRequest(
            status=SyncStatus.FAILED,
            error_message="Connection timeout",
        )
        assert model.error_message == "Connection timeout"


class TestSyncFrequencyRead:
    """Tests for SyncFrequencyRead schema."""

    def test_valid(self):
        model = SyncFrequencyRead(frq_id=1, name="Daily")
        assert model.frq_id == 1
        assert model.name == "Daily"
        assert model.info is None

    def test_with_optional_fields(self):
        model = SyncFrequencyRead(
            frq_id=2,
            name="Weekly",
            info="Every 7 days",
            description="Runs weekly on Monday",
        )
        assert model.info == "Every 7 days"
