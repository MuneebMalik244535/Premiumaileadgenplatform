"""
Celery Task Definition for Background Lead Scraping with Redis PubSub Progress Updates.
"""
from celery import Celery
import os
import asyncio
from scraper_service import LeadScraper
from database import SessionLocal
import crud
from redis_client import publish_log

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "lead_generator",
    broker=REDIS_URL,
    backend=REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,
)

def run_async(coro):
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)

@celery_app.task(bind=True)
def scrape_leads_task(self, query: str):
    task_id = self.request.id or "standalone"
    db = SessionLocal()
    
    # Ensure task record exists in database
    crud.create_task(db, task_id=task_id, query=query)

    def log_progress(message: str):
        print(f"[{task_id}]: {message}")
        crud.update_task_progress(db, task_id=task_id, message=message)
        # Publish log to Redis channel for WebSocket consumers
        run_async(publish_log(task_id, message))

    try:
        scraper = LeadScraper(log_callback=log_progress)
        leads = scraper.run(query)
        
        # Save leads to DB
        crud.save_leads_batch(db, leads, search_query=query)
        crud.update_task_status(db, task_id=task_id, status="SUCCESS")
        
        # Publish completion event
        run_async(publish_log(task_id, "__TASK_COMPLETE__"))
        
        return {"status": "SUCCESS", "count": len(leads)}
    except Exception as e:
        error_msg = str(e)
        crud.update_task_status(db, task_id=task_id, status="FAILURE", error=error_msg)
        run_async(publish_log(task_id, f"__TASK_FAILED__:{error_msg}"))
        db.close()
        raise e
    finally:
        db.close()
