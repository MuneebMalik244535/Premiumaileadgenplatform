"""
Unit & Integration Tests for User Behavior & Analytics Telemetry Engine.
"""
import pytest
from database import Base, engine, SessionLocal
import models
import crud

def setup_module(module):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

def test_page_view_and_dwell_time_tracking():
    db = SessionLocal()
    session_1 = "sess_test_12345"
    
    # 1. Track Page View on '/' for 25s
    evt1 = crud.track_page_view_event(
        db,
        session_id=session_1,
        page_path="/",
        duration_seconds=25,
        user_email="user1@analytics.com",
        ip_address="10.0.0.1"
    )
    assert evt1.id is not None
    assert evt1.page_path == "/"
    assert evt1.duration_seconds == 25

    # 2. Track Page View on '/leads' for 40s with click_target
    evt2 = crud.track_page_view_event(
        db,
        session_id=session_1,
        page_path="/leads",
        duration_seconds=40,
        click_target="export_csv_btn",
        user_email="user1@analytics.com",
        ip_address="10.0.0.1"
    )
    assert evt2.id is not None

    # 3. Track Page View on '/' for 15s from Session 2
    evt3 = crud.track_page_view_event(
        db,
        session_id="sess_test_67890",
        page_path="/",
        duration_seconds=15,
        user_email="user2@analytics.com",
        ip_address="10.0.0.2"
    )
    assert evt3.id is not None

    # 4. Get Analytics Summary
    summary = crud.get_analytics_summary(db)
    assert summary["total_events"] == 3
    assert summary["unique_sessions"] == 2
    
    # Check page performance aggregation
    page_paths = [p["page_path"] for p in summary["page_performance"]]
    assert "/" in page_paths
    assert "/leads" in page_paths
    
    # Verify average dwell duration math on '/' (avg of 25s and 15s = 20.0s)
    home_page_stat = next(p for p in summary["page_performance"] if p["page_path"] == "/")
    assert home_page_stat["views"] == 2
    assert home_page_stat["avg_duration_seconds"] == 20.0

    # Verify click target tracking
    assert len(summary["popular_clicks"]) > 0
    assert summary["popular_clicks"][0]["target"] == "export_csv_btn"

    db.close()
    print("User Behavior & Analytics Engine Test PASSED!")

if __name__ == "__main__":
    setup_module(None)
    test_page_view_and_dwell_time_tracking()
    print("All Analytics Tests Passed Successfully!")
