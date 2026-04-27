"""
Unit tests for app.core.geo_utils — Google Maps URL coordinate parsing.

Tests various URL formats for latitude/longitude extraction.
"""

import pytest

from app.core.geo_utils import parse_google_maps_url


class TestParseGoogleMapsUrl:
    """Tests for parse_google_maps_url()."""

    # ── @ format ──────────────────────────────────────────────────

    def test_parse_at_format(self):
        """/@lat,lng format should be correctly parsed."""
        url = "https://www.google.com/maps/place/Some+Place/@6.9271,79.8612,17z/data=..."
        result = parse_google_maps_url(url)
        assert result == (6.9271, 79.8612)

    def test_parse_at_format_negative_lat(self):
        """Negative latitude should be parsed correctly."""
        url = "https://www.google.com/maps/place/Place/@-33.8688,151.2093,15z"
        result = parse_google_maps_url(url)
        assert result == (-33.8688, 151.2093)

    def test_parse_at_format_negative_both(self):
        """Both negative lat and lng should be parsed correctly."""
        url = "https://www.google.com/maps/@-15.7942,-47.8822,14z"
        result = parse_google_maps_url(url)
        assert result == (-15.7942, -47.8822)

    # ── ?q= format ────────────────────────────────────────────────

    def test_parse_q_format(self):
        """?q=lat,lng format should be correctly parsed."""
        url = "https://maps.google.com/?q=6.9271,79.8612"
        result = parse_google_maps_url(url)
        assert result == (6.9271, 79.8612)

    def test_parse_q_format_with_ampersand(self):
        """&q=lat,lng format should be correctly parsed."""
        url = "https://maps.google.com/maps?hl=en&q=6.9271,79.8612"
        result = parse_google_maps_url(url)
        assert result == (6.9271, 79.8612)

    # ── ?ll= format ───────────────────────────────────────────────

    def test_parse_ll_format(self):
        """?ll=lat,lng format should be correctly parsed."""
        url = "https://www.google.com/maps?ll=6.9271,79.8612"
        result = parse_google_maps_url(url)
        assert result == (6.9271, 79.8612)

    def test_parse_ll_format_with_ampersand(self):
        """&ll=lat,lng format should be correctly parsed."""
        url = "https://www.google.com/maps?hl=en&ll=6.9271,79.8612&z=14"
        result = parse_google_maps_url(url)
        assert result == (6.9271, 79.8612)

    # ── Edge cases ────────────────────────────────────────────────

    def test_empty_string_returns_none(self):
        """Empty string should return None."""
        assert parse_google_maps_url("") is None

    def test_none_input_returns_none(self):
        """None input should return None."""
        assert parse_google_maps_url(None) is None

    def test_no_coordinates_returns_none(self):
        """URL without coordinates should return None."""
        assert parse_google_maps_url("https://www.google.com") is None

    def test_plain_text_returns_none(self):
        """Plain text without URL format should return None."""
        assert parse_google_maps_url("just a random string") is None

    def test_high_precision_coordinates(self):
        """High-precision coordinates should be parsed."""
        url = "https://www.google.com/maps/@51.507351,-0.127758,15z"
        result = parse_google_maps_url(url)
        assert result == (51.507351, -0.127758)
