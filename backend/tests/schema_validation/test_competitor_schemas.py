"""
Schema validation tests for competitor module Pydantic models.

Tests AddCompetitorRequest, EditCompetitorRequest,
TrackCompetitorRequest, and related schemas.
"""

import pytest
from pydantic import ValidationError

from app.modules.competitors.schemas import (
    AddCompetitorRequest,
    CompetitorSourceInput,
    TrackCompetitorRequest,
    AddFromOrganizationRequest,
    ScrapeCompetitorRequest,
    EditCompetitorRequest,
)


class TestCompetitorSourceInput:
    """Tests for CompetitorSourceInput schema."""

    def test_valid(self):
        model = CompetitorSourceInput(
            platform_id=1,
            source_url="https://www.booking.com/hotel/lk/test",
        )
        assert model.platform_id == 1
        assert model.source_url.startswith("https://")

    def test_rejects_missing_platform_id(self):
        with pytest.raises(ValidationError):
            CompetitorSourceInput(source_url="https://example.com")

    def test_rejects_missing_source_url(self):
        with pytest.raises(ValidationError):
            CompetitorSourceInput(platform_id=1)


class TestAddCompetitorRequest:
    """Tests for AddCompetitorRequest schema."""

    def test_valid_request(self):
        model = AddCompetitorRequest(
            name="Rival Hotel",
            organization_type_id=1,
            location_url="https://maps.google.com/?q=6.9,79.8",
            sources=[
                CompetitorSourceInput(platform_id=1, source_url="https://booking.com/rival"),
            ],
        )
        assert model.name == "Rival Hotel"
        assert len(model.sources) == 1

    def test_default_organization_type(self):
        model = AddCompetitorRequest(
            name="Rival",
            location_url="https://maps.google.com",
            sources=[CompetitorSourceInput(platform_id=1, source_url="https://x.com")],
        )
        assert model.organization_type_id == 1

    def test_multiple_sources(self):
        model = AddCompetitorRequest(
            name="Big Rival",
            location_url="https://maps.google.com",
            sources=[
                CompetitorSourceInput(platform_id=1, source_url="https://booking.com/x"),
                CompetitorSourceInput(platform_id=2, source_url="https://tripadvisor.com/x"),
            ],
        )
        assert len(model.sources) == 2

    def test_rejects_missing_name(self):
        with pytest.raises(ValidationError):
            AddCompetitorRequest(
                location_url="https://maps.google.com",
                sources=[CompetitorSourceInput(platform_id=1, source_url="https://x.com")],
            )

    def test_rejects_missing_location(self):
        with pytest.raises(ValidationError):
            AddCompetitorRequest(
                name="Rival",
                sources=[CompetitorSourceInput(platform_id=1, source_url="https://x.com")],
            )

    def test_rejects_missing_sources(self):
        with pytest.raises(ValidationError):
            AddCompetitorRequest(
                name="Rival",
                location_url="https://maps.google.com",
            )


class TestEditCompetitorRequest:
    """Tests for EditCompetitorRequest schema."""

    def test_valid(self):
        model = EditCompetitorRequest(
            name="Updated Name",
            location_url="https://maps.google.com/updated",
        )
        assert model.name == "Updated Name"

    def test_rejects_missing_name(self):
        with pytest.raises(ValidationError):
            EditCompetitorRequest(location_url="https://maps.google.com")

    def test_rejects_missing_location(self):
        with pytest.raises(ValidationError):
            EditCompetitorRequest(name="Test")


class TestTrackCompetitorRequest:
    """Tests for TrackCompetitorRequest schema."""

    def test_valid(self):
        model = TrackCompetitorRequest(competitorId="comp-123")
        assert model.competitorId == "comp-123"

    def test_rejects_missing_competitor_id(self):
        with pytest.raises(ValidationError):
            TrackCompetitorRequest()


class TestAddFromOrganizationRequest:
    """Tests for AddFromOrganizationRequest schema."""

    def test_valid(self):
        model = AddFromOrganizationRequest(organization_id="org-456")
        assert model.organization_id == "org-456"

    def test_rejects_missing_org_id(self):
        with pytest.raises(ValidationError):
            AddFromOrganizationRequest()


class TestScrapeCompetitorRequest:
    """Tests for ScrapeCompetitorRequest schema."""

    def test_default_headless(self):
        model = ScrapeCompetitorRequest()
        assert model.headless is True

    def test_headless_override(self):
        model = ScrapeCompetitorRequest(headless=False)
        assert model.headless is False
