"""
Unit & Integration Tests for Redis Sliding Window Rate Limiter & Tiered Quotas.
"""
import pytest
from rate_limiter import RedisRateLimiter, check_rate_limit, TIER_QUOTAS
from fastapi import HTTPException

class MockRedisPipeline:
    def __init__(self, parent):
        self.parent = parent
        self.count_at = len(parent.zset)
    def zremrangebyscore(self, key, min_s, max_s):
        self.parent.zremrangebyscore(key, min_s, max_s)
        self.count_at = len(self.parent.zset)
        return self
    def zcard(self, key):
        return self
    def zadd(self, key, mapping):
        self.parent.zadd(key, mapping)
        return self
    def expire(self, key, sec):
        return self
    def execute(self):
        return [0, self.count_at, True, True]

class MockRedis:
    def __init__(self):
        self.zset = {}
    def pipeline(self):
        return MockRedisPipeline(self)
    def zremrangebyscore(self, key, min_s, max_s):
        self.zset = {k: v for k, v in self.zset.items() if v > max_s}
    def zadd(self, key, mapping):
        self.zset.update(mapping)
    def zrange(self, key, start, end, withscores=False):
        sorted_items = sorted(self.zset.items(), key=lambda x: x[1])
        if withscores:
            return sorted_items[start:end+1] if sorted_items else []
        return [k for k, v in sorted_items[start:end+1]]
    def zrem(self, key, member):
        self.zset.pop(member, None)
    def delete(self, key):
        self.zset.clear()

def test_rate_limiter_sliding_window():
    limiter = RedisRateLimiter()
    limiter.redis = MockRedis()
    test_user = "user_test_quota@example.com"
    endpoint = "test_scrape"
    tier = "tier1_free" # 5 requests / hour max

    # 1. First 5 requests should pass
    for i in range(5):
        is_limited, remaining, retry_after = limiter.is_rate_limited(test_user, endpoint, tier)
        assert is_limited is False
        assert remaining == 5 - (i + 1)

    # 2. 6th request should fail (exceed quota)
    is_limited_6, remaining_6, retry_after_6 = limiter.is_rate_limited(test_user, endpoint, tier)
    assert is_limited_6 is True
    assert remaining_6 == 0
    assert retry_after_6 >= 0

    print("Sliding Window Rate Limiter Quota Test PASSED!")

def test_rate_limit_exception_raising():
    test_user_exceeded = "exceeded_quota@example.com"
    limiter = RedisRateLimiter()
    limiter.redis = MockRedis()
    
    # Fill quota
    for _ in range(5):
        limiter.is_rate_limited(test_user_exceeded, "scrape", "tier1_free")

    # Patch global rate_limiter with mocked instance
    import rate_limiter
    rate_limiter.rate_limiter = limiter

    with pytest.raises(HTTPException) as exc_info:
        check_rate_limit(test_user_exceeded, "scrape", "tier1_free")
    
    assert exc_info.value.status_code == 429
    assert "Rate limit exceeded" in exc_info.value.detail
    assert "X-RateLimit-Limit" in exc_info.value.headers
    print("HTTP 429 Exception Test PASSED!")

if __name__ == "__main__":
    test_rate_limiter_sliding_window()
    test_rate_limit_exception_raising()
    print("All Rate Limiter Tests Passed Successfully!")
