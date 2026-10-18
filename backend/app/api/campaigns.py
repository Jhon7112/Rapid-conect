from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.models import (
    User, EmailCampaign, CampaignRecipient, Employee, GoogleAccount
)
from app.schemas.schemas import (
    CampaignCreate, CampaignResponse, RecipientResponse,
    CampaignPreviewRequest, CampaignPreviewResponse
)
from app.services.campaign_service import CampaignService

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])

@router.post("", response_model=CampaignResponse)
def create_campaign(
    campaign_in: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not campaign_in.employee_ids:
        raise HTTPException(status_code=400, detail="At least one employee must be selected")

    # Find recruiter's connected Google account
    google_acc = db.query(GoogleAccount).filter(
        GoogleAccount.user_id == current_user.id,
        GoogleAccount.status == "connected"
    ).first()

    campaign = EmailCampaign(
        user_id=current_user.id,
        sender_google_account_id=google_acc.id if google_acc else None,
        subject=campaign_in.subject,
        body=campaign_in.body,
        cc_recipients=campaign_in.cc_recipients or None,
        bcc_recipients=campaign_in.bcc_recipients or None,
        status="Draft",
        total_recipients=len(campaign_in.employee_ids)
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    # Attach recipients
    employees = db.query(Employee).filter(Employee.id.in_(campaign_in.employee_ids)).all()
    for emp in employees:
        recipient = CampaignRecipient(
            campaign_id=campaign.id,
            employee_id=emp.id,
            recipient_email=emp.email_id,
            status="Pending"
        )
        db.add(recipient)

    db.commit()
    db.refresh(campaign)
    return campaign

@router.get("", response_model=List[CampaignResponse])
def get_campaigns(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    campaigns = db.query(EmailCampaign).filter(
        EmailCampaign.user_id == current_user.id
    ).order_by(EmailCampaign.created_at.desc()).all()
    return campaigns

@router.get("/stats/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    campaigns = db.query(EmailCampaign).filter(EmailCampaign.user_id == current_user.id).all()
    campaign_ids = [c.id for c in campaigns]

    total_recipients = db.query(CampaignRecipient).filter(CampaignRecipient.campaign_id.in_(campaign_ids)).count() if campaign_ids else 0
    total_sent = db.query(CampaignRecipient).filter(
        CampaignRecipient.campaign_id.in_(campaign_ids),
        CampaignRecipient.status == "Sent"
    ).count() if campaign_ids else 0

    total_failed = db.query(CampaignRecipient).filter(
        CampaignRecipient.campaign_id.in_(campaign_ids),
        CampaignRecipient.status == "Failed"
    ).count() if campaign_ids else 0

    google_acc = db.query(GoogleAccount).filter(
        GoogleAccount.user_id == current_user.id,
        GoogleAccount.status == "connected"
    ).first()

    return {
        "total_campaigns": len(campaigns),
        "total_recipients": total_recipients,
        "total_sent": total_sent,
        "total_failed": total_failed,
        "connected_email": google_acc.google_email if google_acc else None,
        "google_connected": google_acc is not None
    }

from sqlalchemy.orm import Session, joinedload

@router.get("/{campaign_id}", response_model=CampaignResponse)
def get_campaign(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    campaign = db.query(EmailCampaign).options(
        joinedload(EmailCampaign.recipients).joinedload(CampaignRecipient.employee)
    ).filter(
        EmailCampaign.id == campaign_id,
        EmailCampaign.user_id == current_user.id
    ).first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign

@router.post("/{campaign_id}/start")
def start_campaign(
    campaign_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    campaign = db.query(EmailCampaign).filter(
        EmailCampaign.id == campaign_id,
        EmailCampaign.user_id == current_user.id
    ).first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if campaign.status in ["Sending"]:
        raise HTTPException(status_code=400, detail="Campaign is already sending")

    # Verify sender has an authorized Google account with a real refresh token
    sender_account = None
    if campaign.sender_google_account_id:
        sender_account = db.query(GoogleAccount).filter(GoogleAccount.id == campaign.sender_google_account_id).first()

    if not sender_account:
        sender_account = db.query(GoogleAccount).filter(
            GoogleAccount.user_id == current_user.id,
            GoogleAccount.status == "connected"
        ).first()

    has_real_token = bool(
        sender_account and
        sender_account.encrypted_refresh_token and
        not sender_account.encrypted_refresh_token.startswith("mock_")
    )

    if not has_real_token:
        raise HTTPException(
            status_code=400,
            detail="Cannot start campaign: No authorized Gmail account found. Please go to Settings and click 'Connect Google Account' to authorize email sending."
        )

    campaign.status = "Queued"
    db.commit()

    # Launch sequential sending engine in background task with dedicated session
    background_tasks.add_task(CampaignService.process_campaign_sequential, campaign_id)
    return {"message": "Campaign queued and background sequential sending started", "campaign_id": campaign_id}

@router.post("/{campaign_id}/cancel")
def cancel_campaign(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    campaign = db.query(EmailCampaign).filter(
        EmailCampaign.id == campaign_id,
        EmailCampaign.user_id == current_user.id
    ).first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign.status = "Cancelled"
    db.commit()
    return {"message": "Campaign status updated to Cancelled"}

@router.post("/recipients/{recipient_id}/retry")
def retry_recipient(
    recipient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    recipient = db.query(CampaignRecipient).filter(CampaignRecipient.id == recipient_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    success = CampaignService.retry_single_recipient(db, recipient_id)
    return {"success": success, "status": recipient.status, "last_error": recipient.last_error}

@router.post("/preview", response_model=CampaignPreviewResponse)
def preview_campaign(
    req: CampaignPreviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    employee = db.query(Employee).filter(Employee.id == req.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Selected sample employee not found")

    google_acc = db.query(GoogleAccount).filter(
        GoogleAccount.user_id == current_user.id,
        GoogleAccount.status == "connected"
    ).first()

    from_email = google_acc.google_email if google_acc else current_user.email

    from app.services.logo_service import LogoService
    logo_val = getattr(current_user, "company_logo", None) or ""
    processed_logo = LogoService.process_and_fix_logo(logo_val)
    logo_html = f'<img src="{processed_logo["data_uri"]}" width="{processed_logo["width"]}" height="{processed_logo["height"]}" alt="Company Logo" style="max-height: 60px; max-width: 220px; height: auto; margin-top: 10px; display: block; border: 0; outline: none; border-radius: 4px;" />'

    variables = {
        "employee_name": employee.employee_name,
        "email": employee.email_id,
        "company_name": employee.company_name,
        "contact_number": employee.contact_number,
        "whatsapp_number": employee.whatsapp_number,
        "job_title": employee.job_title,
        "recruiter_name": current_user.name,
        "loggedin_username": current_user.name,
        "loggedin_user_company": getattr(current_user, "company_name", None) or "Reacher",
        "official_email": getattr(current_user, "official_email", None) or current_user.email,
        "loggedin_user_official_email": getattr(current_user, "official_email", None) or current_user.email,
        "company_logo": logo_html,
        "loggedin_user_logo": logo_html,
        "job_description": req.body
    }

    full_body_template = CampaignService.build_full_email_body(req.body)
    personalized_sub = CampaignService.interpolate_template(req.subject, variables)
    personalized_body = CampaignService.interpolate_template(full_body_template, variables)

    return {
        "from_email": from_email,
        "to_name": employee.employee_name,
        "to_email": employee.email_id,
        "cc": req.cc_recipients or None,
        "bcc": req.bcc_recipients or None,
        "subject": personalized_sub,
        "body": personalized_body
    }
