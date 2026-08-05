"""
📜 SOC2 & Enterprise Security Audit Logger
Records immutable security audit events (user logins, scrape triggers, lead views/exports, webhook updates)
both into PostgreSQL database audit_logs table and structured JSON console output for SIEM systems (Splunk/Datadog).
"""
import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import Request
import models

# Standard SIEM Structured Logger
logger = logging.getLogger("security_audit")
logger.setLevel(logging.INFO)
if not logger.handlers:
    ch = logging.StreamHandler()
    formatter = logging.Formatter('%(message)s')
    ch.setFormatter(formatter)
    logger.addHandler(ch)


def log_audit_event(
    db: Session,
    action: str,
    resource: str,
    user_email: Optional[str] = None,
    organization_id: Optional[int] = None,
    ip_address: Optional[str] = "127.0.0.1",
    user_agent: Optional[str] = "",
    details: Optional[Dict[str, Any]] = None
) -> models.AuditLog:
    """
    Creates an immutable audit log record in DB and emits SIEM JSON event.
    """
    details_str = json.dumps(details or {}, default=str)
    
    audit_entry = models.AuditLog(
        organization_id=organization_id,
        user_email=user_email,
        action=action,
        resource=resource,
        ip_address=ip_address or "127.0.0.1",
        user_agent=user_agent or "",
        details=details_str,
        created_at=datetime.utcnow()
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)

    # Emit SIEM JSON log
    siem_payload = {
        "event_type": "AUDIT_LOG",
        "audit_id": audit_entry.id,
        "timestamp": audit_entry.created_at.isoformat() + "Z",
        "organization_id": organization_id,
        "user_email": user_email,
        "action": action,
        "resource": resource,
        "ip_address": ip_address,
        "details": details or {}
    }
    logger.info(json.dumps(siem_payload))

    return audit_entry


def extract_client_info(request: Request) -> tuple[str, str]:
    """
    Extracts IP address and User-Agent from FastAPI request headers.
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
    else:
        ip = request.client.host if request.client else "127.0.0.1"

    ua = request.headers.get("User-Agent", "")
    return ip, ua
