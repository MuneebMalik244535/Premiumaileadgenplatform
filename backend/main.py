import os
import json
import asyncio
import uuid
from typing import List, Optional
from fastapi import FastAPI, BackgroundTasks, WebSocket, WebSocketDisconnect, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import Base, engine, get_db
import models
import crud
import auth
from scraper_service import LeadScraper
from redis_client import subscribe_log, publish_log
from tasks import scrape_leads_task

# ── Sentry Error Tracking Setup ────────────────────────────────────────────────
SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.celery import CeleryIntegration
        sentry_sdk.init(
            dsn=SENTRY_DSN,
            integrations=[FastApiIntegration(), CeleryIntegration()],
            traces_sample_rate=1.0,
            environment=os.getenv("ENVIRONMENT", "production")
        )
    except Exception as e:
        print(f"[Sentry Init Warning]: {e}")

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Lead Generator SaaS API",
    version="2.0.0",
    description="Production-grade B2B Lead Scraping & AI Qualification API"
)

# ── Prometheus Metrics & Telemetry Setup ──────────────────────────────────────
try:
    from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST
    from fastapi.responses import Response

    HTTP_REQUESTS_TOTAL = Counter(
        "http_requests_total",
        "Total HTTP requests handled by FastAPI server",
        ["method", "endpoint", "status"]
    )

    CELERY_TASKS_DISPATCHED = Counter(
        "celery_tasks_dispatched_total",
        "Total count of background Celery lead scraping tasks dispatched"
    )

    @app.middleware("http")
    async def prometheus_middleware(request, call_next):
        response = await call_next(request)
        endpoint = request.url.path
        if endpoint != "/metrics":
            HTTP_REQUESTS_TOTAL.labels(method=request.method, endpoint=endpoint, status=str(response.status_code)).inc()
        return response

    @app.get("/metrics")
    async def get_metrics():
        return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

except Exception as e:
    print(f"[Prometheus Init Warning]: {e}")

# CORS configuration from env
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,*").split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScrapeRequest(BaseModel):
    query: str
    num_results: int = 10

class LeadResponse(BaseModel):
    id: int
    name: str
    score: int
    email: str
    phone: str
    address: str
    link: str
    snippet: Optional[str] = ""
    query: Optional[str] = ""
    added_date: Optional[str] = ""

    class Config:
        from_attributes = True

# Fallback in-memory tracking if Redis/Celery is disabled
local_tasks = {}

def fallback_run_scrape_task(task_id: str, query: str):
    db = SessionLocal()
    crud.create_task(db, task_id=task_id, query=query)

    def update_progress(msg: str):
        local_tasks[task_id]["progress"] = msg
        crud.update_task_progress(db, task_id=task_id, message=msg)
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        loop.run_until_complete(publish_log(task_id, msg))
    
    scraper = LeadScraper(log_callback=update_progress)
    try:
        leads = scraper.run(query)
        crud.save_leads_batch(db, leads, search_query=query)
        crud.update_task_status(db, task_id=task_id, status="SUCCESS")
        local_tasks[task_id]["status"] = "SUCCESS"
        local_tasks[task_id]["result"] = {"leads": leads}
        loop = asyncio.get_event_loop()
        loop.run_until_complete(publish_log(task_id, "__TASK_COMPLETE__"))
    except Exception as e:
        crud.update_task_status(db, task_id=task_id, status="FAILURE", error=str(e))
        local_tasks[task_id]["status"] = "FAILURE"
        local_tasks[task_id]["error"] = str(e)
        loop = asyncio.get_event_loop()
        loop.run_until_complete(publish_log(task_id, f"__TASK_FAILED__:{str(e)}"))
    finally:
        db.close()


# ── Health Check Endpoint ───────────────────────────────────────────────────

@app.get("/api/healthz")
async def healthz(db: Session = Depends(get_db)):
    db_healthy = True
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_healthy = False

    return {
        "status": "healthy" if db_healthy else "degraded",
        "database": "connected" if db_healthy else "disconnected",
        "version": app.version
    }


# ── Auth Endpoints ────────────────────────────────────────────────────────────

@app.post("/api/auth/register", response_model=auth.Token)
async def register_organization(
    request: auth.RegisterRequest,
    db: Session = Depends(get_db)
):
    import re
    slug = re.sub(r"[^a-z0-9]+", "-", request.organization_name.lower()).strip("-")
    if not slug:
        slug = f"org-{uuid.uuid4().hex[:6]}"

    existing_org = crud.get_organization_by_slug(db, slug)
    if existing_org:
        slug = f"{slug}-{uuid.uuid4().hex[:4]}"

    existing_user = crud.get_user_by_email(db, request.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )

    org = crud.create_organization(db, name=request.organization_name, slug=slug)
    hashed_pw = auth.get_password_hash(request.password)
    user = crud.create_user(
        db,
        email=request.email,
        hashed_password=hashed_pw,
        organization_id=org.id,
        full_name=request.full_name,
        role="owner"
    )

    access_token = auth.create_access_token(data={"sub": user.email, "org_id": org.id})
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/api/auth/login", response_model=auth.Token)
async def login(request: auth.LoginRequest, db: Session = Depends(get_db)):
    # 1. Check if login matches registered tenant user
    user = crud.get_user_by_email(db, request.username)
    if user and auth.verify_password(request.password, user.hashed_password):
        access_token = auth.create_access_token(data={"sub": user.email, "org_id": user.organization_id})
        return {"access_token": access_token, "token_type": "bearer"}

    # 2. Fallback check for single admin account
    if auth.authenticate_admin(request.username, request.password):
        access_token = auth.create_access_token(data={"sub": request.username, "org_id": None})
        return {"access_token": access_token, "token_type": "bearer"}

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password",
        headers={"WWW-Authenticate": "Bearer"},
    )


# ── Leads Endpoints ───────────────────────────────────────────────────────────

@app.get("/api/leads")
async def get_leads(
    query: Optional[str] = None,
    min_score: int = 0,
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    tenant_user: auth.TokenData = Depends(auth.get_current_tenant_user)
):
    leads = crud.get_leads(
        db,
        skip=skip,
        limit=limit,
        query=query,
        min_score=min_score,
        organization_id=tenant_user.organization_id
    )
    return leads


from rate_limiter import check_rate_limit

@app.post("/api/scrape")
async def start_scrape(
    request: ScrapeRequest,
    bg_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    tenant_user: auth.TokenData = Depends(auth.get_current_tenant_user)
):
    # Enforce Redis Sliding Window Rate Limit
    check_rate_limit(identifier=tenant_user.username, endpoint="scrape", tier="tier1_free")

    use_celery = os.getenv("USE_CELERY", "false").lower() == "true"
    
    if use_celery:
        celery_task = scrape_leads_task.delay(request.query)
        task_id = celery_task.id
        crud.create_task(db, task_id=task_id, query=request.query, organization_id=tenant_user.organization_id)
    else:
        task_id = str(uuid.uuid4())
        local_tasks[task_id] = {
            "status": "PROGRESS",
            "progress": "Task queued...",
            "result": None,
            "error": None
        }
        bg_tasks.add_task(fallback_run_scrape_task, task_id, request.query)
        
    return {
        "status": "queued",
        "task_id": task_id,
        "query": request.query
    }


@app.get("/api/tasks/{task_id}")
async def get_task_status(
    task_id: str,
    db: Session = Depends(get_db),
    tenant_user: auth.TokenData = Depends(auth.get_current_tenant_user)
):
    task = crud.get_task(db, task_id)
    if task:
        return {
            "task_id": task.task_id,
            "status": task.status,
            "progress": task.progress_message,
            "error": task.error_message
        }
    
    task_data = local_tasks.get(task_id)
    if not task_data:
        raise HTTPException(status_code=404, detail="Task not found")
        
    return {
        "task_id": task_id,
        "status": task_data["status"],
        "result": task_data.get("result"),
        "progress": task_data.get("progress"),
        "error": task_data.get("error")
    }


# ── WebSockets for Task Logs ──────────────────────────────────────────────────

@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "monitor_task":
                    task_id = msg.get("task_id")
                    asyncio.create_task(stream_task_logs(task_id, websocket))
            except Exception as e:
                print(f"[WS Error]: {e}")
    except WebSocketDisconnect:
        pass

async def stream_task_logs(task_id: str, websocket: WebSocket):
    """
    Listens to Redis PubSub channel and streams log updates directly to WebSocket.
    """
    try:
        async for log in subscribe_log(task_id):
            if log == "__TASK_COMPLETE__":
                from database import SessionLocal
                db = SessionLocal()
                task = crud.get_task(db, task_id)
                leads = crud.get_leads(db, query=task.query if task else None, organization_id=task.organization_id if task else None)
                db.close()
                lead_dicts = [
                    {
                        "id": l.id, "name": l.name, "score": l.score,
                        "email": l.email, "phone": l.phone, "address": l.address,
                        "link": l.link, "snippet": l.snippet
                    }
                    for l in leads
                ]
                await websocket.send_json({"type": "complete", "leads": lead_dicts, "task_id": task_id})
                break
            elif log.startswith("__TASK_FAILED__"):
                err = log.replace("__TASK_FAILED__:", "")
                await websocket.send_json({"type": "status", "status": "FAILURE", "error": err, "task_id": task_id})
                break
            else:
                await websocket.send_json({"type": "log", "message": log, "task_id": task_id})
    except Exception as e:
        print(f"[Log Stream Error]: {e}")


# ── Reports Endpoints ─────────────────────────────────────────────────────────

@app.get("/api/reports")
async def get_reports(
    db: Session = Depends(get_db),
    tenant_user: auth.TokenData = Depends(auth.get_current_tenant_user)
):
    return crud.get_reports(db, organization_id=tenant_user.organization_id)


@app.post("/api/reports/generate")
async def generate_report(
    report_type: str = "Custom",
    title: str = "AI Lead Generation Report",
    db: Session = Depends(get_db),
    tenant_user: auth.TokenData = Depends(auth.get_current_tenant_user)
):
    leads = crud.get_leads(db, limit=50, organization_id=tenant_user.organization_id)
    if not leads:
        raise HTTPException(status_code=400, detail="No leads available to generate report")
    
    lead_dicts = [
        {
            "name": l.name, "score": l.score, "email": l.email,
            "phone": l.phone, "address": l.address, "link": l.link
        }
        for l in leads
    ]
    
    scraper = LeadScraper()
    filename = f"report_{uuid.uuid4().hex[:8]}.pdf"
    filepath = os.path.join("reports", filename)
    os.makedirs("reports", exist_ok=True)
    
    scraper.generate_pdf(lead_dicts, filename=filepath)
    
    avg_score = sum(l.score for l in leads) / len(leads) if leads else 0
    report = crud.create_report(
        db, title=title, report_type=report_type,
        leads_count=len(leads), avg_score=avg_score, filename=filepath,
        organization_id=tenant_user.organization_id
    )
    return report


@app.get("/api/download-report")
async def download_report(
    db: Session = Depends(get_db),
    tenant_user: auth.TokenData = Depends(auth.get_current_tenant_user)
):
    leads = crud.get_leads(db, limit=50, organization_id=tenant_user.organization_id)
    if not leads:
        return {"error": "No leads found."}
    
    lead_dicts = [
        {
            "name": l.name, "score": l.score, "email": l.email,
            "phone": l.phone, "address": l.address, "link": l.link
        }
        for l in leads
    ]
    scraper = LeadScraper()
    filename = scraper.generate_pdf(lead_dicts)
    return FileResponse(filename, media_type="application/pdf", filename="leads_report.pdf")


# ── Webhook Management Endpoints ─────────────────────────────────────────────

from webhooks import dispatch_webhook_event

class WebhookCreateRequest(BaseModel):
    url: str
    secret: Optional[str] = None
    events: Optional[str] = "*"


@app.post("/api/webhooks")
async def create_webhook(
    request: WebhookCreateRequest,
    db: Session = Depends(get_db),
    tenant_user: auth.TokenData = Depends(auth.get_current_tenant_user)
):
    if not tenant_user.organization_id:
        raise HTTPException(status_code=400, detail="Organization ID required for webhooks")
    secret = request.secret or f"whsec_{uuid.uuid4().hex}"
    sub = crud.create_webhook_subscription(
        db,
        organization_id=tenant_user.organization_id,
        url=request.url,
        secret=secret,
        events=request.events or "*"
    )
    return {
        "id": sub.id,
        "url": sub.url,
        "secret": sub.secret,
        "events": sub.events,
        "created_at": sub.created_at
    }


@app.get("/api/webhooks")
async def get_webhooks(
    db: Session = Depends(get_db),
    tenant_user: auth.TokenData = Depends(auth.get_current_tenant_user)
):
    if not tenant_user.organization_id:
        return []
    subs = crud.get_webhook_subscriptions(db, organization_id=tenant_user.organization_id)
    return subs


@app.delete("/api/webhooks/{subscription_id}")
async def delete_webhook(
    subscription_id: int,
    db: Session = Depends(get_db),
    tenant_user: auth.TokenData = Depends(auth.get_current_tenant_user)
):
    if not tenant_user.organization_id:
        raise HTTPException(status_code=400, detail="Organization ID required")
    success = crud.delete_webhook_subscription(db, subscription_id=subscription_id, organization_id=tenant_user.organization_id)
    if not success:
        raise HTTPException(status_code=404, detail="Webhook subscription not found")
    return {"status": "deleted", "id": subscription_id}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
