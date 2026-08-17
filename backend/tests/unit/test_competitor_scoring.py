"""
Unit tests for competitor scoring primitives.

Covers the two problems the competitor benchmarking subsystem has to solve:
normalizing disparate platform rating scales onto one comparable space, and
preventing low-volume properties from dominating rankings on raw average alone.

Pure functions — no database, no network.
"""

import pytest

from app.modules.competitors.services.scoring import (
    DEFAULT_CONFIDENCE,
    PLATFORM_SCALES,
    aspect_delta,
    bayesian_mean,
    normalize_to_five,
    platform_native_max,
    population_mean,
)


class TestPlatformNativeMax:
    """Platform scale lookup."""

    def test_ten_point_platforms(self):
        assert platform_native_max("Booking.com") == 10.0
        assert platform_native_max("Agoda") == 10.0

    def test_five_point_platforms(self):
        assert platform_native_max("TripAdvisor") == 5.0
        assert platform_native_max("Google") == 5.0

    def test_lookup_is_case_and_whitespace_insensitive(self):
        assert platform_native_max("  BOOKING.COM  ") == 10.0

    def test_unknown_platform_defaults_to_five(self):
        assert platform_native_max("SomeNewSite") == 5.0

    def test_none_defaults_to_five(self):
        assert platform_native_max(None) == 5.0


class TestNormalizeToFive:
    """Min-Max scaling onto the standardized 1.0-5.0 float space."""

    def test_ten_point_maximum_maps_to_five(self):
        assert normalize_to_five(10.0, native_max=10.0) == 5.0

    def test_ten_point_minimum_maps_to_one(self):
        assert normalize_to_five(1.0, native_max=10.0) == 1.0

    def test_ten_point_midpoint_maps_to_midpoint(self):
        # 1 + (5.5 - 1) / (10 - 1) * 4 = 3.0
        assert normalize_to_five(5.5, native_max=10.0) == 3.0

    def test_five_point_scale_is_identity(self):
        """A property already on a 5-point scale must be left untouched."""
        for value in (1.0, 2.5, 3.0, 4.25, 5.0):
            assert normalize_to_five(value, native_max=5.0) == value

    def test_preserves_float_precision(self):
        """The point of the rewrite: no integer rounding."""
        result = normalize_to_five(8.0, native_max=10.0)
        assert result == pytest.approx(4.1111, abs=1e-4)
        assert isinstance(result, float)

    def test_clamps_above_native_max(self):
        assert normalize_to_five(12.0, native_max=10.0) == 5.0

    def test_clamps_below_native_min(self):
        assert normalize_to_five(0.0, native_max=10.0) == 1.0

    def test_none_in_none_out(self):
        assert normalize_to_five(None) is None

    def test_non_numeric_returns_none(self):
        assert normalize_to_five("not a number") is None

    def test_degenerate_scale_does_not_divide_by_zero(self):
        assert normalize_to_five(5.0, native_max=1.0, native_min=1.0) == 5.0

    def test_result_always_within_target_space(self):
        for raw in (-50, 0, 1, 4, 7, 10, 99):
            result = normalize_to_five(raw, native_max=10.0)
            assert 1.0 <= result <= 5.0


class TestBayesianMean:
    """Volume-weighted shrinkage toward a population prior."""

    def test_low_volume_perfect_score_loses_to_high_volume_strong_score(self):
        """
        The defect this function exists to fix: 2 reviews at 5.0 must not
        outrank 500 reviews at 4.8.
        """
        prior = 4.0
        boutique = bayesian_mean(5.0, 2, prior)
        established = bayesian_mean(4.8, 500, prior)

        assert established > boutique

    def test_known_values(self):
        # (20*4.0 + 2*5.0) / 22 = 4.0909
        assert bayesian_mean(5.0, 2, 4.0) == pytest.approx(4.0909, abs=1e-4)
        # (20*4.0 + 500*4.8) / 520 = 4.7692
        assert bayesian_mean(4.8, 500, 4.0) == pytest.approx(4.7692, abs=1e-4)

    def test_converges_to_raw_average_at_high_volume(self):
        assert bayesian_mean(4.8, 1_000_000, 3.0) == pytest.approx(4.8, abs=1e-3)

    def test_zero_reviews_falls_back_to_prior(self):
        assert bayesian_mean(5.0, 0, 4.2) == 4.2

    def test_no_average_falls_back_to_prior(self):
        assert bayesian_mean(None, 10, 4.2) == 4.2

    def test_no_prior_returns_raw_average(self):
        assert bayesian_mean(4.5, 10, None) == 4.5

    def test_no_data_at_all_returns_none(self):
        assert bayesian_mean(None, 0, None) is None

    def test_confidence_controls_shrinkage_strength(self):
        """Higher confidence pulls a small sample harder toward the prior."""
        weak = bayesian_mean(5.0, 5, 4.0, confidence=1.0)
        strong = bayesian_mean(5.0, 5, 4.0, confidence=100.0)

        assert weak > strong
        assert strong < 4.5

    def test_adjustment_never_escapes_the_bounds_of_its_inputs(self):
        adjusted = bayesian_mean(5.0, 3, 4.0)
        assert 4.0 <= adjusted <= 5.0

    def test_default_confidence_is_applied(self):
        assert bayesian_mean(5.0, 2, 4.0) == bayesian_mean(
            5.0, 2, 4.0, confidence=DEFAULT_CONFIDENCE
        )


class TestPopulationMean:
    """Review-count-weighted prior across a comparison set."""

    def test_weights_by_review_count(self):
        # (2*5.0 + 500*4.8) / 502 = 4.8008 — dominated by the larger sample
        assert population_mean([(5.0, 2), (4.8, 500)]) == pytest.approx(4.8008, abs=1e-4)

    def test_single_entry_returns_its_average(self):
        assert population_mean([(4.3, 100)]) == 4.3

    def test_ignores_entries_with_no_reviews(self):
        assert population_mean([(4.0, 10), (5.0, 0)]) == 4.0

    def test_ignores_entries_with_no_rating(self):
        assert population_mean([(4.0, 10), (None, 500)]) == 4.0

    def test_empty_population_returns_none(self):
        assert population_mean([]) is None

    def test_population_with_no_reviews_returns_none(self):
        assert population_mean([(4.0, 0), (5.0, 0)]) is None


class TestAspectDelta:
    """Signed per-aspect performance gap."""

    def test_positive_when_we_lead(self):
        assert aspect_delta(4.5, 4.0) == 0.5

    def test_negative_when_competitor_leads(self):
        assert aspect_delta(4.0, 4.5) == -0.5

    def test_zero_when_level(self):
        assert aspect_delta(4.2, 4.2) == 0.0

    def test_none_when_our_data_missing(self):
        assert aspect_delta(None, 4.5) is None

    def test_none_when_competitor_data_missing(self):
        assert aspect_delta(4.5, None) is None

    def test_missing_data_is_not_treated_as_zero(self):
        """Absent evidence must not fabricate a maximum-width gap."""
        assert aspect_delta(4.5, None) != 4.5


class TestScalesTableIntegrity:
    """Guard against typos in the platform scale map."""

    def test_all_scales_are_positive_floats(self):
        for name, scale in PLATFORM_SCALES.items():
            assert isinstance(scale, float), name
            assert scale > 1.0, name
