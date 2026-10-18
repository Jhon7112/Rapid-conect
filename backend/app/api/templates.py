from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.models import EmailTemplate, User
from app.schemas.schemas import TemplateCreate, TemplateUpdate, TemplateResponse

router = APIRouter(prefix="/templates", tags=["Templates"])

@router.get("", response_model=List[TemplateResponse])
def get_templates(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(EmailTemplate)
    if category and category != "All":
        query = query.filter(EmailTemplate.category == category)

    return query.order_by(EmailTemplate.created_at.desc()).all()

@router.get("/{template_id}", response_model=TemplateResponse)
def get_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.post("", response_model=TemplateResponse)
def create_template(
    template_in: TemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    template = EmailTemplate(
        user_id=current_user.id,
        name=template_in.name,
        category=template_in.category or "General Outreach",
        subject=template_in.subject,
        body=template_in.body
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template

@router.patch("/{template_id}", response_model=TemplateResponse)
def update_template(
    template_id: str,
    template_in: TemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    update_data = template_in.dict(exclude_unset=True)
    for field, val in update_data.items():
        if val is not None:
            setattr(template, field, val)

    db.commit()
    db.refresh(template)
    return template

@router.delete("/{template_id}")
def delete_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    db.delete(template)
    db.commit()
    return {"message": "Template deleted successfully"}
