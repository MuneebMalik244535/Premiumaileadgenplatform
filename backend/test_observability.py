"""
Unit & Integration Tests for Prometheus Metrics (/metrics) & Sentry Error Tracking.
"""
import os
import pytest
from fastapi.testclient import TestClient

def test_prometheus_metrics_endpoint():
    # Import app
    from main import app
    client = TestClient(app)
    
    # 1. Trigger healthcheck route to generate request metric
    resp = client.get("/api/healthz")
    assert resp.status_code == 200
    
    # 2. Query /metrics endpoint
    metrics_resp = client.get("/metrics")
    assert metrics_resp.status_code == 200
    assert "text/plain" in metrics_resp.headers.get("content-type", "")
    
    # 3. Assert presence of standard Prometheus metric signatures
    content = metrics_resp.text
    assert "http_requests_total" in content or "http_request_duration_seconds" in content or "celery_tasks_dispatched_total" in content
    print("Prometheus /metrics endpoint Test PASSED!")

def test_sentry_initialization():
    from main import SENTRY_DSN
    # Should safely handle empty or present DSN without runtime crashes
    assert SENTRY_DSN is None or isinstance(SENTRY_DSN, str)
    print("Sentry SDK Initialization Check PASSED!")

if __name__ == "__main__":
    test_prometheus_metrics_endpoint()
    test_sentry_initialization()
    print("All Observability Tests Passed Successfully!")
