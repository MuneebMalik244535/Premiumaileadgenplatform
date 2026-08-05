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
