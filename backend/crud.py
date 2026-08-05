"""
CRUD Operations for Database Interaction.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
import models

def get_leads(db: Session, skip: int = 0, limit: int = 200, query: Optional[str] = None, min_score: int = 0) -> List[models.Lead]:
    q = db.query(models.Lead)
    if query:
        q = q.filter(models.Lead.query.ilike(f"%{query}%") | models.Lead.name.ilike(f"%{query}%") | models.Lead.email.ilike(f"%{query}%"))
    if min_score > 0:
        q = q.filter(models.Lead.score >= min_score)
    return q.order_by(models.Lead.score.desc()).offset(skip).limit(limit).all()

def save_lead(db: Session, lead_dict: dict, search_query: str) -> models.Lead:
    existing = db.query(models.Lead).filter(models.Lead.link == lead_dict.get("link")).first()
    if existing:
        # Update existing lead fields
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

def save_leads_batch(db: Session, leads: List[dict], search_query: str) -> List[models.Lead]:
    saved = []
    for l in leads:
        saved.append(save_lead(db, l, search_query))
    return saved

def create_task(db: Session, task_id: str, query: str) -> models.ScrapeTask:
    task = models.ScrapeTask(task_id=task_id, query=query, status="PROGRESS")
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

def create_report(db: Session, title: str, report_type: str, leads_count: int, avg_score: float, filename: str) -> models.Report:
    rep = models.Report(
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

def get_reports(db: Session) -> List[models.Report]:
    return db.query(models.Report).order_by(models.Report.created_at.desc()).all()
