"""
Competitor scoring primitives — scale normalization and volume-weighted means.

Pure functions with no database or network dependencies, so they can be unit
tested directly (the test suite runs without a live DB).

Two problems are solved here:

1. **Disparate rating scales.** Platforms publish on different ranges — Booking.com
   and Agoda score out of 10, TripAdvisor and Google out of 5. `normalize_to_five`
   Min-Max scales any native range onto a standardized 1.0–5.0 float space so
   scores from different platforms are directly comparable.

2. **Disparate review volumes.** A property with 2 reviews averaging 5.0 is not
   demonstrably better than one with 500 reviews averaging 4.8 — the small sample
   simply carries less evidence. `bayesian_mean` shrinks low-volume averages
   toward the population prior, so rankings reflect confidence, not luck.
"""

from __future__ import annotations

from typing import Dict, Iterable, Optional

# Native maximum of each platform's published rating scale, keyed by lowercased
# platform_name. Platforms not listed here are assumed to already be on a 5-point
# scale, which is the majority case.
PLATFORM_SCALES: Dict[str, float] = {
    "booking.com": 10.0,
    "booking": 10.0,
    "agoda": 10.0,
    "tripadvisor": 5.0,
    "google": 5.0,
    "google maps": 5.0,
    "expedia": 5.0,
}

DEFAULT_NATIVE_MAX = 5.0

# Standardized target space.
TARGET_MIN = 1.0
TARGET_MAX = 5.0

# Bayesian prior weight: the number of reviews at which a property's own average
# carries equal weight with the population prior. Higher = more conservative.
DEFAULT_CONFIDENCE = 20.0


def platform_native_max(platform_name: Optional[str]) -> float:
    """Return the native maximum of a platform's rating scale."""
    if not platform_name:
        return DEFAULT_NATIVE_MAX
    return PLATFORM_SCALES.get(platform_name.strip().lower(), DEFAULT_NATIVE_MAX)


def normalize_to_five(
    raw: Optional[float],
    native_max: float = DEFAULT_NATIVE_MAX,
    native_min: float = 1.0,
) -> Optional[float]:
    """
    Min-Max scale a raw rating from its native range onto the 1.0–5.0 float space.

        normalized = TARGET_MIN + (raw - native_min) / (native_max - native_min) * (TARGET_MAX - TARGET_MIN)

    Returns a float (precision preserved — no integer rounding), or None when the
    input is None. Values outside the native range are clamped rather than allowed
    to escape the target space.
    """
    if raw is None:
        return None

    try:
        raw = float(raw)
        native_max = float(native_max)
        native_min = float(native_min)
    except (TypeError, ValueError):
        return None

    span = native_max - native_min
    if span <= 0:
        # Degenerate scale — nothing meaningful to interpolate.
        return TARGET_MAX

    ratio = (raw - native_min) / span
    scaled = TARGET_MIN + ratio * (TARGET_MAX - TARGET_MIN)
    return round(_clamp(scaled, TARGET_MIN, TARGET_MAX), 4)


def bayesian_mean(
    avg: Optional[float],
    count: Optional[int],
    prior_mean: Optional[float],
    confidence: float = DEFAULT_CONFIDENCE,
) -> Optional[float]:
    """
    Volume-weighted Bayesian adjustment of a sample mean.

        adjusted = (C * m + n * x) / (C + n)

    where C is the confidence weight, m the population prior, n the review count
    and x the property's own average. As n grows the result converges on x; as n
    approaches zero it falls back to the prior m.

    Returns None only when there is neither an average nor a prior to work from.
    """
    n = float(count or 0)

    if avg is None and prior_mean is None:
        return None
    if prior_mean is None:
        return round(float(avg), 4)
    if avg is None or n <= 0:
        return round(float(prior_mean), 4)

    c = float(confidence)
    if c < 0:
        c = 0.0

    adjusted = (c * float(prior_mean) + n * float(avg)) / (c + n)
    return round(adjusted, 4)


def population_mean(
    entries: Iterable[tuple[Optional[float], Optional[int]]],
) -> Optional[float]:
    """
    Review-count-weighted mean across a population, used as the Bayesian prior.

    Takes (avg_rating, review_count) pairs and returns the pooled average — that
    is, the mean each review would produce if all reviews were combined. Entries
    with no rating or no reviews contribute nothing. Returns None for an empty
    population, in which case callers should skip the adjustment.
    """
    total_score = 0.0
    total_count = 0

    for avg, count in entries:
        if avg is None:
            continue
        n = int(count or 0)
        if n <= 0:
            continue
        total_score += float(avg) * n
        total_count += n

    if total_count == 0:
        return None

    return round(total_score / total_count, 4)


def aspect_delta(mine: Optional[float], theirs: Optional[float]) -> Optional[float]:
    """
    Signed performance gap for one aspect: positive means we lead.

    Returns None when either side has no data for the aspect. Absent data is not
    the same as a score of zero — coercing it would fabricate a gap.
    """
    if mine is None or theirs is None:
        return None
    return round(float(mine) - float(theirs), 4)


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))
