"""
Unit tests for the Redis caching layer (app.core.redis_client).

Uses a tiny in-memory FakeRedis patched via _get_redis so no Redis
server is required. Covers round-trip, the @cached decorator,
invalidation patterns, graceful degradation, and the insights
full-response cache path.
"""

import fnmatch
import time
from unittest.mock import MagicMock, patch

import pytest

from app.core import redis_client


class FakeRedis:
    """Minimal in-memory Redis stand-in (get/setex/delete/keys)."""

    def __init__(self):
        self.store = {}

    def get(self, key):
        item = self.store.get(key)
        if item is None:
            return None
        value, expires = item
        if expires is not None and time.time() > expires:
            del self.store[key]
            return None
        return value

    def setex(self, key, ttl, value):
        self.store[key] = (value, time.time() + ttl)
        return True

    def delete(self, *keys):
        count = 0
        for key in keys:
            if key in self.store:
                del self.store[key]
                count += 1
        return count

    def keys(self, pattern):
        return [k for k in self.store if fnmatch.fnmatch(k, pattern)]


@pytest.fixture
def fake_redis():
    return FakeRedis()


@pytest.fixture
def patch_redis(fake_redis, monkeypatch):
    monkeypatch.setattr(redis_client, "_get_redis", lambda: fake_redis)
    return fake_redis


class TestCacheRoundTrip:
    def test_miss_returns_none(self, patch_redis):
        assert redis_client.cache_get("reviews:list:org1:10:any:any") is None

    def test_set_and_get_round_trip(self, patch_redis):
        value = {"data": [1, 2, 3], "label": "hi"}
        assert redis_client.cache_set("k:1", value, ttl=300) is True
        assert redis_client.cache_get("k:1") == value

    def test_get_returns_none_after_delete(self, patch_redis):
        redis_client.cache_set("k:1", {"x": 1})
        assert redis_client.cache_delete("k:1") is True
        assert redis_client.cache_get("k:1") is None


class TestCachedDecorator:
    def test_executes_once_then_serves_from_cache(self, patch_redis):
        calls = []

        @redis_client.cached(ttl=60, key_prefix="test")
        def compute(x):
            calls.append(x)
            return {"result": x * 2}

        assert compute(5) == {"result": 10}
        assert compute(5) == {"result": 10}
        assert calls == [5]  # executed only once

    def test_distinct_args_distinct_keys(self, patch_redis):
        @redis_client.cached(ttl=60, key_prefix="test")
        def compute(x):
            return {"result": x}

        compute(1)
        compute(2)
        assert redis_client.cache_get("test:compute:1") == {"result": 1}
        assert redis_client.cache_get("test:compute:2") == {"result": 2}


class TestInvalidation:
    def test_invalidate_review_cache_only_target_org(self, patch_redis):
        redis_client.cache_set("reviews:list:org-a:10:any:any", [])
        redis_client.cache_set("reviews:list:org-b:10:any:any", [])
        redis_client.cache_set("dashboard:metrics:org-a:30d", {})
        redis_client.cache_set("insights:summary:org-a:30d", {})
        redis_client.cache_set("reviews:list:org-b2:10:any:any", [])  # prefix-safe

        redis_client.invalidate_review_cache("org-a")

        assert redis_client.cache_get("reviews:list:org-a:10:any:any") is None
        assert redis_client.cache_get("dashboard:metrics:org-a:30d") is None
        assert redis_client.cache_get("insights:summary:org-a:30d") is None
        # Other orgs untouched
        assert redis_client.cache_get("reviews:list:org-b:10:any:any") is not None
        assert redis_client.cache_get("reviews:list:org-b2:10:any:any") is not None

    def test_invalidate_ai_cache_target_org(self, patch_redis):
        redis_client.cache_set("ai:actions:org-a:30d", [])
        redis_client.cache_set("ai:unified:org-a:dashboard", {})
        redis_client.cache_set("ai:actions:org-b:30d", [])

        redis_client.invalidate_ai_cache("org-a")

        assert redis_client.cache_get("ai:actions:org-a:30d") is None
        assert redis_client.cache_get("ai:unified:org-a:dashboard") is None
        assert redis_client.cache_get("ai:actions:org-b:30d") is not None


class TestGracefulDegradation:
    def test_cache_get_returns_none_when_redis_down(self, monkeypatch):
        monkeypatch.setattr(redis_client, "_get_redis", lambda: None)
        assert redis_client.cache_get("k:1") is None
        assert redis_client.cache_set("k:1", {"x": 1}) is False
        assert redis_client.cache_delete("k:1") is False
        assert redis_client.cache_delete_pattern("x:*") == 0

    def test_cached_decorator_runs_function_when_redis_down(self, monkeypatch):
        monkeypatch.setattr(redis_client, "_get_redis", lambda: None)
        calls = []

        @redis_client.cached(ttl=60, key_prefix="test")
        def compute(x):
            calls.append(x)
            return x + 1

        assert compute(1) == 2
        assert compute(1) == 2
        assert calls == [1, 1]  # never cached, executed each time


class TestInsightsFullResponseCache:
    """Cache-first behavior of /organizations/{org}/insights (full response)."""

    ORG = "22222222-2222-2222-2222-222222222222"
    CANNED_RESPONSE = {
        "overallScore": 80,
        "overallScoreChange": "+5%",
        "totalReviews": "10",
        "totalReviewsChange": "+10%",
        "avgRating": "4.0",
        "avgRatingChange": "+1%",
        "responseRate": 70,
        "responseRateChange": "+2%",
        "sentimentMonths": [],
        "sentimentPositive": [],
        "sentimentNeutral": [],
        "sentimentNegative": [],
        "ratingDistribution": [],
        "categories": [],
        "sources": [],
        "positiveKeywords": [],
        "negativeKeywords": [],
        "responseMetrics": {"avgTime": "12h", "rate": 70, "ratingImpact": 1.5},
        "heatmapWeeks": [[0, 0, 0, 0, 0, 0, 0]],
    }

    def _patched_call(self, cache_hit):
        from app.modules.dashboard.routes import insights as insights_route

        db = MagicMock()
        patches = [
            patch.object(insights_route, "get_avg_rating", return_value=4.0),
            patch.object(insights_route, "get_review_count", return_value=10),
            patch.object(insights_route, "get_response_rate", return_value=0.8),
            patch.object(
                insights_route, "get_weekly_sentiment_series",
                return_value={"labels": [], "positive": [], "neutral": [], "negative": []},
            ),
            patch.object(
                insights_route, "get_rating_distribution",
                return_value=[{"rating": 5, "count": 2, "percentage": 40.0}],
            ),
            patch.object(
                insights_route, "get_category_performance",
                return_value=[{"name": "Staff", "score": 85, "trend": "+5%"}],
            ),
            patch.object(
                insights_route, "get_source_comparison_metrics",
                return_value=[{
                    "name": "Google", "rating": 4.5, "reviews": 3, "pct": 50,
                    "color": "#fff", "sentiment": {"pos": 1, "neu": 1, "neg": 1},
                }],
            ),
            patch.object(
                insights_route, "get_keywords",
                return_value={"positiveKeywords": [], "negativeKeywords": []},
            ),
            patch.object(
                insights_route, "get_review_volume_heatmap",
                return_value=[[0, 0, 0, 0, 0, 0, 0]],
            ),
            patch.object(
                insights_route, "_get_response_metrics",
                return_value={"rate": 0.7, "rateChange": "+2%", "avgTime": "12h"},
            ),
            patch.object(insights_route, "_compute_rating_impact", return_value=1.5),
            patch.object(
                insights_route, "cache_get",
                return_value=dict(self.CANNED_RESPONSE) if cache_hit else None,
            ),
        ]
        cache_set_patch = patch.object(insights_route, "cache_set")
        cache_set_mock = cache_set_patch.start()
        for p in patches:
            p.start()
        try:
            result = insights_route.get_insights(
                org_id=self.ORG, timeRange="30d", user={"user_id": "u1"}, db=db
            )
            cache_set_calls = list(cache_set_mock.call_args_list)
        finally:
            cache_set_patch.stop()
            for p in patches:
                p.stop()
        return result, cache_set_calls

    def test_cache_hit_serves_without_compute(self):
        result, cache_set_calls = self._patched_call(cache_hit=True)
        assert result == self.CANNED_RESPONSE
        # Early return — nothing recomputed, so nothing re-set
        assert cache_set_calls == []

    def test_cache_miss_computes_and_sets(self):
        from app.modules.dashboard.routes import insights as insights_route

        result, cache_set_calls = self._patched_call(cache_hit=False)
        assert result["overallScore"] == 80
        assert result["positiveKeywords"] == []
        assert len(cache_set_calls) == 1
        key, kwargs = cache_set_calls[0].args[0], cache_set_calls[0].kwargs
        assert key == f"insights:full:{self.ORG}:30d"
        assert kwargs.get("ttl") == 600
