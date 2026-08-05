"""
CRUD Operations for Database Interaction.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
import models

# ── Multi-Tenant Organization & User CRUD ─────────────────────────────────────

def create_organization(db: Session, name: str, slug: str) -> models.Organization:
    org = models.Organization(name=name, slug=slug)
    db.add(org)
    db.commit()
    db.refresh(org)
    return org

def get_organization_by_slug(db: Session, slug: str) -> Optional[models.Organization]:
    return db.query(models.Organization).filter(models.Organization.slug == slug).first()

def create_user(db: Session, email: str, hashed_password: str, organization_id: int, full_name: Optional[str] = None, role: str = "member") -> models.User:
    user = models.User(
        email=email,
        hashed_password=hashed_password,
        organization_id=organization_id,
        full_name=full_name,
        role=role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()


# ── Tenant-Isolated Data Operations ───────────────────────────────────────────

def get_leads(db: Session, skip: int = 0, limit: int = 200, query: Optional[str] = None, min_score: int = 0, organization_id: Optional[int] = None) -> List[models.Lead]:
    q = db.query(models.Lead)
    if organization_id is not None:
        q = q.filter(models.Lead.organization_id == organization_id)
    if query:
        q = q.filter(models.Lead.query.ilike(f"%{query}%") | models.Lead.name.ilike(f"%{query}%") | models.Lead.email.ilike(f"%{query}%"))
    if min_score > 0:
        q = q.filter(models.Lead.score >= min_score)
    return q.order_by(models.Lead.score.desc()).offset(skip).limit(limit).all()

def save_lead(db: Session, lead_dict: dict, search_query: str, organization_id: Optional[int] = None) -> models.Lead:
    q = db.query(models.Lead).filter(models.Lead.link == lead_dict.get("link"))
    if organization_id is not None:
        q = q.filter(models.Lead.organization_id == organization_id)
    existing = q.first()

    if existing:
        existing.name = lead_dict.get("name", existing.name)
        existing.score = lead_dict.get("score", existing.score)
        existing.email = lead_dict.get("email", existing.email)
        existing.phone = lead_dict.get("phone", existing.phone)
        existing.address = lead_dict.get("address", existing.address)
        existing.snippet = lead_dict.get("snippet", existing.snippet)
        db.commit()
        db.refresh(existing)
        return existing
    
    new_lead = models.Lead(
        organization_id=organization_id,
        name=lead_dict.get("name", lead_dict.get("title", "Unknown")),
        score=lead_dict.get("score", 0),
        email=lead_dict.get("email", "N/A"),
        phone=lead_dict.get("phone", "N/A"),
        address=lead_dict.get("address", "N/A"),
        link=lead_dict.get("link", ""),
        snippet=lead_dict.get("snippet", ""),
        query=search_query
    )
    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)
    return new_lead

def save_leads_batch(db: Session, leads: List[dict], search_query: str, organization_id: Optional[int] = None) -> List[models.Lead]:
    saved = []
    for l in leads:
        saved.append(save_lead(db, l, search_query, organization_id=organization_id))
    return saved

def create_task(db: Session, task_id: str, query: str, organization_id: Optional[int] = None) -> models.ScrapeTask:
    task = models.ScrapeTask(task_id=task_id, query=query, status="PROGRESS", organization_id=organization_id)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

def update_task_progress(db: Session, task_id: str, message: str):
    task = db.query(models.ScrapeTask).filter(models.ScrapeTask.task_id == task_id).first()
    if task:
        task.progress_message = message
        db.commit()

def update_task_status(db: Session, task_id: str, status: str, error: Optional[str] = None):
    task = db.query(models.ScrapeTask).filter(models.ScrapeTask.task_id == task_id).first()
    if task:
        task.status = status
        if error:
            task.error_message = error
        db.commit()

def get_task(db: Session, task_id: str) -> Optional[models.ScrapeTask]:
    return db.query(models.ScrapeTask).filter(models.ScrapeTask.task_id == task_id).first()

def create_report(db: Session, title: str, report_type: str, leads_count: int, avg_score: float, filename: str, organization_id: Optional[int] = None) -> models.Report:
    rep = models.Report(
        organization_id=organization_id,
        title=title,
        report_type=report_type,
        leads_count=leads_count,
        avg_score=int(avg_score),
        filename=filename
    )
    db.add(rep)
    db.commit()
    db.refresh(rep)
    return rep

def get_reports(db: Session, organization_id: Optional[int] = None) -> List[models.Report]:
    q = db.query(models.Report)
    if organization_id is not None:
        q = q.filter(models.Report.organization_id == organization_id)
    return q.order_by(models.Report.created_at.desc()).all()


# ── Webhook Subscriptions CRUD ────────────────────────────────────────────────

def create_webhook_subscription(db: Session, organization_id: int, url: str, secret: str, events: str = "*") -> models.WebhookSubscription:
    sub = models.WebhookSubscription(
        organization_id=organization_id,
        url=url,
        secret=secret,
        events=events
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub

def get_webhook_subscriptions(db: Session, organization_id: int) -> List[models.WebhookSubscription]:
    return db.query(models.WebhookSubscription).filter(
        models.WebhookSubscription.organization_id == organization_id
    ).order_by(models.WebhookSubscription.created_at.desc()).all()

def delete_webhook_subscription(db: Session, subscription_id: int, organization_id: int) -> bool:
    sub = db.query(models.WebhookSubscription).filter(
        models.WebhookSubscription.id == subscription_id,
        models.WebhookSubscription.organization_id == organization_id
    ).first()
    if sub:
        db.delete(sub)
        db.commit()
        return True
    return False


# ── Audit Logs CRUD ──────────────────────────────────────────────────────────

def get_audit_logs(db: Session, organization_id: Optional[int] = None, skip: int = 0, limit: int = 100) -> List[models.AuditLog]:
    q = db.query(models.AuditLog)
    if organization_id is not None:
        q = q.filter(models.AuditLog.organization_id == organization_id)
    return q.order_by(models.AuditLog.created_at.desc()).offset(skip).limit(limit).all()


# ── User Behavior & Analytics CRUD ──────────────────────────────────────────

def track_page_view_event(
    db: Session,
    session_id: str,
    page_path: str,
    duration_seconds: int = 0,
    click_target: str = "",
    user_email: Optional[str] = None,
    ip_address: str = "127.0.0.1",
    user_agent: str = "",
    referrer: str = ""
) -> models.PageViewEvent:
    evt = models.PageViewEvent(
        session_id=session_id,
        user_email=user_email,
        page_path=page_path,
        duration_seconds=duration_seconds,
        click_target=click_target,
        referrer=referrer,
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(evt)
    db.commit()
    db.refresh(evt)
    return evt

def get_analytics_summary(db: Session) -> dict:
    from sqlalchemy import func
    
    total_events = db.query(func.count(models.PageViewEvent.id)).scalar() or 0
    unique_sessions = db.query(func.count(func.distinct(models.PageViewEvent.session_id))).scalar() or 0
    
    page_stats = db.query(
        models.PageViewEvent.page_path,
        func.count(models.PageViewEvent.id).label("views"),
        func.avg(models.PageViewEvent.duration_seconds).label("avg_duration")
    ).group_by(models.PageViewEvent.page_path).order_by(func.count(models.PageViewEvent.id).desc()).all()
    
    pages = [
        {"page_path": p[0], "views": p[1], "avg_duration_seconds": round(float(p[2] or 0), 1)}
        for p in page_stats
    ]

    click_stats = db.query(
        models.PageViewEvent.click_target,
        func.count(models.PageViewEvent.id).label("clicks")
    ).filter(models.PageViewEvent.click_target != "").group_by(models.PageViewEvent.click_target).order_by(func.count(models.PageViewEvent.id).desc()).limit(10).all()

    clicks = [
        {"target": c[0], "clicks": c[1]}
        for c in click_stats
    ]

    recent_events = db.query(models.PageViewEvent).order_by(models.PageViewEvent.created_at.desc()).limit(50).all()

    return {
        "total_events": total_events,
        "unique_sessions": unique_sessions,
        "page_performance": pages,
        "popular_clicks": clicks,
        "recent_events": recent_events
    }
