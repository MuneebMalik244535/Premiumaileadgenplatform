"""
Unit & Integration Tests for Multi-Tenant Team Architecture & Row-Level Data Isolation.
"""
import pytest
from fastapi.testclient import TestClient
from database import Base, engine, SessionLocal
import models
import crud

def setup_module(module):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

def test_multi_tenant_data_isolation():
    from main import app
    client = TestClient(app)

    # 1. Register Organization Alpha
    resp_alpha = client.post("/api/auth/register", json={
        "organization_name": "Alpha Corp",
        "email": "owner@alphacorp.com",
        "password": "password123",
        "full_name": "Alpha Owner"
    })
    assert resp_alpha.status_code == 200
    token_alpha = resp_alpha.json()["access_token"]
    headers_alpha = {"Authorization": f"Bearer {token_alpha}"}

    # 2. Register Organization Beta
    resp_beta = client.post("/api/auth/register", json={
        "organization_name": "Beta Inc",
        "email": "owner@betainc.com",
        "password": "password123",
        "full_name": "Beta Owner"
    })
    assert resp_beta.status_code == 200
    token_beta = resp_beta.json()["access_token"]
    headers_beta = {"Authorization": f"Bearer {token_beta}"}

    # 3. Create leads directly for Alpha and Beta in DB
    db = SessionLocal()
    org_alpha = crud.get_organization_by_slug(db, "alpha-corp")
    org_beta = crud.get_organization_by_slug(db, "beta-inc")
    
    assert org_alpha is not None
    assert org_beta is not None

    crud.save_lead(db, {"name": "Alpha Lead 1", "score": 90, "email": "contact@alpha.com", "link": "https://alpha.com"}, "alpha search", organization_id=org_alpha.id)
    crud.save_lead(db, {"name": "Beta Lead 1", "score": 85, "email": "contact@beta.com", "link": "https://beta.com"}, "beta search", organization_id=org_beta.id)
    db.close()

    # 4. Fetch leads using Alpha's token
    res_alpha_leads = client.get("/api/leads", headers=headers_alpha)
    assert res_alpha_leads.status_code == 200
    leads_alpha = res_alpha_leads.json()
    alpha_names = [l["name"] for l in leads_alpha]
    assert "Alpha Lead 1" in alpha_names
    assert "Beta Lead 1" not in alpha_names  # TENANT ISOLATION VERIFIED!

    # 5. Fetch leads using Beta's token
    res_beta_leads = client.get("/api/leads", headers=headers_beta)
    assert res_beta_leads.status_code == 200
    leads_beta = res_beta_leads.json()
    beta_names = [l["name"] for l in leads_beta]
    assert "Beta Lead 1" in beta_names
    assert "Alpha Lead 1" not in beta_names  # TENANT ISOLATION VERIFIED!

    print("Multi-Tenant Data Isolation Test PASSED Successfully!")

if __name__ == "__main__":
    test_multi_tenant_data_isolation()
