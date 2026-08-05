"""
Unit & Integration Tests for Immutable Audit Logging & SOC2 Compliance.
"""
import pytest
import json
from database import Base, engine, SessionLocal
import models
import crud
from audit import log_audit_event

def setup_module(module):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

def test_audit_event_logging():
    db = SessionLocal()
    
    # 1. Create Organization
    org = crud.create_organization(db, name="Security Audit Corp", slug="audit-corp")

    # 2. Log Audit Events
    log_1 = log_audit_event(
        db,
        action="USER_LOGIN",
        resource="/api/auth/login",
        user_email="sec_admin@auditcorp.com",
        organization_id=org.id,
        ip_address="192.168.1.50",
        user_agent="Mozilla/5.0 (Windows NT 10.0)",
        details={"login_method": "password_bearer"}
    )
    assert log_1.id is not None
    assert log_1.action == "USER_LOGIN"

    log_2 = log_audit_event(
        db,
        action="SCRAPE_TRIGGERED",
        resource="/api/scrape",
        user_email="sec_admin@auditcorp.com",
        organization_id=org.id,
        ip_address="192.168.1.50",
        details={"query": "AI SaaS Startups", "tier": "tier2_pro"}
    )
    assert log_2.id is not None

    # 3. Query Audit Logs via CRUD
    audit_logs = crud.get_audit_logs(db, organization_id=org.id)
    assert len(audit_logs) == 2
    
    actions = [l.action for l in audit_logs]
    assert "USER_LOGIN" in actions
    assert "SCRAPE_TRIGGERED" in actions
    
    # Verify details JSON payload stringification
    parsed_details = json.loads(audit_logs[0].details)
    assert "query" in parsed_details or "login_method" in parsed_details

    db.close()
    print("SOC2 Security Audit Trail Test PASSED!")

if __name__ == "__main__":
    setup_module(None)
    test_audit_event_logging()
    print("All Audit Logging Tests Passed Successfully!")
