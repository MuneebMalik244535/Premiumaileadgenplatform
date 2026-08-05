"""
Unit & Integration Tests for Enterprise Webhook Dispatcher & HMAC-SHA256 Signing.
"""
import pytest
import json
from unittest.mock import patch, MagicMock
from sqlalchemy.orm import Session
from database import Base, engine, SessionLocal
import models
import crud
from webhooks import sign_payload, dispatch_webhook_event

def setup_module(module):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

def test_hmac_sha256_payload_signing():
    secret = "whsec_test_secret_key_12345"
    payload = b'{"event":"lead.qualified","data":{"name":"Test Lead"}}'
    
    signature = sign_payload(payload, secret)
    assert signature.startswith("sha256=")
    
    # Recompute to verify math
    import hmac, hashlib
    expected_digest = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    assert signature == f"sha256={expected_digest}"
    print("HMAC-SHA256 Payload Signing Test PASSED!")

def test_webhook_subscription_and_dispatch():
    db = SessionLocal()
    
    # 1. Create Organization
    org = crud.create_organization(db, name="Webhook Corp", slug="webhook-corp")
    
    # 2. Add Webhook Subscription
    sub_url = "https://hooks.zapier.com/hooks/catch/12345/abcde/"
    sub_secret = "whsec_zapier_secret_999"
    sub = crud.create_webhook_subscription(db, organization_id=org.id, url=sub_url, secret=sub_secret, events="lead.qualified,task.completed")
    
    assert sub.id is not None
    assert sub.organization_id == org.id

    # 3. Mock external Webhook Endpoint using unittest.mock
    with patch("webhooks.requests.post") as mock_post:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response

        results = dispatch_webhook_event(
            db,
            organization_id=org.id,
            event_type="lead.qualified",
            data={"lead_name": "Acme Tech", "score": 95, "email": "info@acme.com"}
        )
        
        assert len(results) == 1
        assert results[0]["success"] is True
        assert results[0]["status_code"] == 200
        assert results[0]["url"] == sub_url
        
        # Verify request headers sent to webhook receiver
        assert mock_post.called
        call_args = mock_post.call_args
        headers = call_args.kwargs.get("headers", {})
        assert headers.get("X-LeadGen-Event") == "lead.qualified"
        assert "X-LeadGen-Signature" in headers
        assert headers["X-LeadGen-Signature"].startswith("sha256=")

    db.close()
    print("Webhook Subscription & Event Dispatcher Test PASSED!")

if __name__ == "__main__":
    setup_module(None)
    test_hmac_sha256_payload_signing()
    test_webhook_subscription_and_dispatch()
    print("All Webhook Tests Passed Successfully!")
