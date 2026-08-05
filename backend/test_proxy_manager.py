"""
Unit & Integration Tests for ProxyPoolManager and Anti-CAPTCHA features.
"""
import pytest
from proxy_manager import ProxyPoolManager, USER_AGENTS

def test_user_agent_rotation():
    manager = ProxyPoolManager()
    ua1 = manager.get_random_user_agent()
    ua2 = manager.get_random_user_agent()
    
    assert ua1 in USER_AGENTS
    assert ua2 in USER_AGENTS
    
    headers = manager.get_headers({"X-Test-Header": "TestValue"})
    assert "User-Agent" in headers
    assert headers["X-Test-Header"] == "TestValue"
    assert "Sec-Fetch-Dest" in headers

def test_proxy_pool_rotation_and_failure():
    test_proxies = [
        "http://proxy1.example.com:8080",
        "http://proxy2.example.com:8080"
    ]
    manager = ProxyPoolManager(proxy_list=test_proxies)
    
    # Get proxy
    p1 = manager.get_next_proxy()
    assert p1 is not None
    assert p1["http"] in test_proxies
    
    # Mark proxy failed
    manager.mark_proxy_failed(p1)
    assert len(manager.failed_proxies) == 1
    
    # Get remaining proxy
    p2 = manager.get_next_proxy()
    assert p2 is not None
    assert p2["http"] != p1["http"]
    
    # Mark second failed -> circuit breaker should reset automatically
    manager.mark_proxy_failed(p2)
    p3 = manager.get_next_proxy()
    assert p3 is not None
    assert len(manager.failed_proxies) == 0

def test_fetch_with_retry_mock(requests_mock):
    manager = ProxyPoolManager(proxy_list=["http://mock-proxy:8080"])
    target_url = "https://httpbin.org/get"
    
    # Mock 1st attempt 429 Rate Limit, 2nd attempt 200 OK
    requests_mock.get(target_url, [
        {"status_code": 429, "text": "Rate Limited"},
        {"status_code": 200, "text": "OK"}
    ])
    
    resp = manager.fetch_with_retry(target_url, max_retries=2, timeout=5)
    assert resp is not None
    assert resp.status_code == 200
    assert resp.text == "OK"
    print("Proxy & Anti-CAPTCHA test PASSED!")

if __name__ == "__main__":
    test_user_agent_rotation()
    test_proxy_pool_rotation_and_failure()
    print("ProxyManager Unit Tests Passed Successfully!")
