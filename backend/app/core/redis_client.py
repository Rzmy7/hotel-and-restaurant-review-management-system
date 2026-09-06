"""
Redis cache client — transparent caching layer with graceful degradation.

When Redis is available, caches function results with configurable TTL.
When Redis is unavailable, silently falls back to direct execution (no caching).

Configuration (in .env or environment):
    REDIS_URL=redis://localhost:6379/0   (optional — defaults to none / disabled)
    REDIS_CACHE_TTL=300                   (default TTL in seconds, default 5 min)
"""

import os
import json
import logging
import functools
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)

_redis_client: Optional[Any] = None
_redis_available: bool = False

REDIS_URL = os.getenv("REDIS_URL", "")
REDIS_CACHE_TTL = int(os.getenv("REDIS_CACHE_TTL", "300"))


def _get_redis():
    """Lazy-initialize Redis connection. Returns None if unavailable."""
    global _redis_client, _redis_available

    if _redis_client is not None:
        return _redis_client if _redis_available else None

    if not REDIS_URL:
        _redis_available = False
        return None

    try:
        import redis as redis_lib
        _redis_client = redis_lib.from_url(
            REDIS_URL,
            socket_connect_timeout=3,
            socket_timeout=3,
            decode_responses=True,
        )
        _redis_client.ping()
        _redis_available = True
        logger.info("Redis cache connected: %s", REDIS_URL)
        return _redis_client
    except ImportError:
        logger.info("redis-py not installed — caching disabled")
        _redis_available = False
        return None
    except Exception as e:
        logger.warning("Redis unavailable (%s) — caching disabled", e)
        _redis_available = False
        return None


def cache_get(key: str) -> Optional[Any]:
    """Get a cached value by key. Returns None on miss or if Redis is down."""
    client = _get_redis()
    if not client:
        return None
    try:
        raw = client.get(key)
        if raw is None:
            return None
        return json.loads(raw)
    except Exception:
        return None


def cache_set(key: str, value: Any, ttl: int = REDIS_CACHE_TTL) -> bool:
    """Set a cached value with TTL (seconds). Returns True on success."""
    client = _get_redis()
    if not client:
        return False
    try:
        client.setex(key, ttl, json.dumps(value, default=str))
        return True
    except Exception:
        return False


def cache_delete(key: str) -> bool:
    """Delete a cached key. Returns True on success."""
    client = _get_redis()
    if not client:
        return False
    try:
        client.delete(key)
        return True
    except Exception:
        return False


def cache_delete_pattern(pattern: str) -> int:
    """Delete all keys matching a pattern. Returns count deleted."""
    client = _get_redis()
    if not client:
        return 0
    try:
        keys = client.keys(pattern)
        if keys:
            return client.delete(*keys)
        return 0
    except Exception:
        return 0


# ──────────────────────────────────────────────────────────────────────
# Decorator: transparent caching for any function
# ──────────────────────────────────────────────────────────────────────


def cached(ttl: int = REDIS_CACHE_TTL, key_prefix: str = "cache"):
    """
    Decorator that caches the return value of a function in Redis.

    The cache key is built from {key_prefix}:{func_name}:{args_hash}.
    If Redis is unavailable, the function executes normally (no caching).

    Usage:
        @cached(ttl=600, key_prefix="reviews")
        def get_reviews(org_id: str, page: int):
            ...
    """

    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Build a cache key from function name + arguments
            key_parts = [key_prefix, func.__name__]
            for a in args:
                key_parts.append(str(a))
            for k in sorted(kwargs.keys()):
                key_parts.append(f"{k}={kwargs[k]}")
            cache_key = ":".join(key_parts)

            # Try cache
            cached_value = cache_get(cache_key)
            if cached_value is not None:
                return cached_value

            # Execute and cache
            result = func(*args, **kwargs)
            cache_set(cache_key, result, ttl=ttl)
            return result

        return wrapper

    return decorator


def invalidate_review_cache(org_id: Optional[str] = None):
    """Invalidate all cached review data for an organization or globally."""
    if org_id:
        cache_delete_pattern(f"reviews:*:{org_id}:*")
        cache_delete_pattern(f"dashboard:*:{org_id}:*")
        cache_delete_pattern(f"insights:*:{org_id}:*")
    else:
        cache_delete_pattern("reviews:*")
        cache_delete_pattern("dashboard:*")
        cache_delete_pattern("insights:*")


def invalidate_ai_cache(org_id: str):
    """Invalidate cached AI summaries for an organization."""
    cache_delete_pattern(f"ai:*:{org_id}:*")
