"""
🔔 Enterprise Webhook Dispatcher & HMAC-SHA256 Delivery Engine
Handles real-time webhook event dispatching, payload signing, and exponential retry delivery
for SaaS integrations (Zapier, HubSpot, Salesforce, Slack, Make).
"""
import hmac
import hashlib
import json
import time
from datetime import datetime
from typing import List, Dict, Any, Optional
import requests
from sqlalchemy.orm import Session
import models


def sign_payload(payload_bytes: bytes, secret: str) -> str:
    """
    Computes an HMAC-SHA256 signature for secure webhook payload validation.
    Returns: 'sha256=<hex_digest>'
    """
    digest = hmac.new(
        secret.encode("utf-8"),
        msg=payload_bytes,
        digestmod=hashlib.sha256
    ).hexdigest()
    return f"sha256={digest}"


def dispatch_webhook_event(
    db: Session,
    organization_id: Optional[int],
    event_type: str,
    data: Dict[str, Any],
    max_retries: int = 2,
    timeout: int = 5
) -> List[Dict[str, Any]]:
    """
    Queries active tenant webhook subscriptions and dispatches signed HTTP POST events.
    """
    if not organization_id:
        return []

    subscriptions = db.query(models.WebhookSubscription).filter(
        models.WebhookSubscription.organization_id == organization_id,
        models.WebhookSubscription.is_active == True
    ).all()

    if not subscriptions:
        return []

    delivery_results = []
    
    payload_dict = {
        "event": event_type,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "organization_id": organization_id,
        "data": data
    }
    payload_bytes = json.dumps(payload_dict, default=str).encode("utf-8")

    for sub in subscriptions:
        # Match specific event type or wildcard '*'
        allowed_events = [e.strip() for e in sub.events.split(",")]
        if "*" not in allowed_events and event_type not in allowed_events:
            continue

        signature = sign_payload(payload_bytes, sub.secret)
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "LeadGen-Webhook-Dispatcher/2.0",
            "X-LeadGen-Event": event_type,
            "X-LeadGen-Signature": signature
        }

        success = False
        last_status = 0
        attempts = 0

        for attempt in range(1, max_retries + 1):
            attempts = attempt
            try:
                resp = requests.post(sub.url, data=payload_bytes, headers=headers, timeout=timeout)
                last_status = resp.status_code
                if 200 <= resp.status_code < 300:
                    success = True
                    break
            except Exception as e:
                last_status = 0

            time.sleep(attempt * 0.5)

        delivery_results.append({
            "subscription_id": sub.id,
            "url": sub.url,
            "event": event_type,
            "attempts": attempts,
            "success": success,
            "status_code": last_status
        })

    return delivery_results
