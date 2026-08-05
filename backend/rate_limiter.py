"""
⏱️ Redis Sliding-Window Rate Limiter & Tiered Quota Manager
Implements distributed sliding-window rate limiting using Redis ZSETs for API endpoints.
"""
import os
import time
import random
import redis
from typing import Tuple, Dict, Optional
from fastapi import HTTPException, status, Header, Request

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Tiered Quotas Configuration (Max Requests per Window)
TIER_QUOTAS: Dict[str, Dict[str, int]] = {
    "tier1_free": {"max_requests": 5, "window_seconds": 3600},       # 5 scrapes / hour
    "tier2_pro": {"max_requests": 50, "window_seconds": 3600},      # 50 scrapes / hour
    "tier3_enterprise": {"max_requests": 500, "window_seconds": 3600} # 500 scrapes / hour
}


class RedisRateLimiter:
    """
    Distributed Sliding Window Rate Limiter powered by Redis Sorted Sets (ZSET).
    """
    def __init__(self, redis_url: str = REDIS_URL):
        try:
            self.redis = redis.from_url(redis_url, decode_responses=True)
        except Exception as e:
            print(f"[RateLimiter Init Warning]: {e}")
            self.redis = None

    def is_rate_limited(self, identifier: str, endpoint: str = "scrape", tier: str = "tier1_free") -> Tuple[bool, int, int]:
        """
        Checks if request from identifier is allowed under sliding window quota.
        Returns: (is_limited: bool, remaining_quota: int, retry_after: int)
        """
        quota = TIER_QUOTAS.get(tier, TIER_QUOTAS["tier1_free"])
        max_requests = quota["max_requests"]
        window_seconds = quota["window_seconds"]

        if not self.redis:
            # Fallback if Redis is unreachable (fail open for local dev)
            return False, max_requests, 0

        now = time.time()
        clear_before = now - window_seconds
        key = f"ratelimit:{identifier}:{endpoint}"

        try:
            pipeline = self.redis.pipeline()
            # 1. Remove timestamps older than window boundary
            pipeline.zremrangebyscore(key, 0, clear_before)
            # 2. Count requests in current sliding window
            pipeline.zcard(key)
            # 3. Add current request timestamp with unique member identifier
            member_id = f"{now}_{random.random()}"
            pipeline.zadd(key, {member_id: now})
            # 4. Set expiration on key
            pipeline.expire(key, window_seconds + 10)
            
            results = pipeline.execute()
            current_count = results[1]

            if current_count >= max_requests:
                # Quota exceeded! Fetch oldest timestamp in window to compute retry_after
                oldest_entries = self.redis.zrange(key, 0, 0, withscores=True)
                if oldest_entries:
                    oldest_score = oldest_entries[0][1]
                    retry_after = int((oldest_score + window_seconds) - now)
                else:
                    retry_after = window_seconds

                # Remove the current request timestamp we added in pipeline since it was rejected
                self.redis.zrem(key, member_id)
                return True, 0, max(1, retry_after)

            remaining = max_requests - (current_count + 1)
            return False, remaining, 0

        except Exception as e:
            print(f"[RateLimiter Error]: {e}")
            return False, max_requests, 0


# Global Rate Limiter instance
rate_limiter = RedisRateLimiter()


def check_rate_limit(identifier: str, endpoint: str = "scrape", tier: str = "tier1_free"):
    """
    Enforces rate limit and raises HTTP 429 Too Many Requests if quota exceeded.
    """
    is_limited, remaining, retry_after = rate_limiter.is_rate_limited(identifier, endpoint, tier)
    if is_limited:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded for tier '{tier}'. Maximum {TIER_QUOTAS.get(tier, {}).get('max_requests', 5)} requests per hour allowed.",
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(TIER_QUOTAS.get(tier, {}).get("max_requests", 5)),
                "X-RateLimit-Remaining": "0",
            }
        )
