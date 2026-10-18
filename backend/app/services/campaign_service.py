import re
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.models import (
    EmailCampaign, CampaignRecipient, Employee, User,
    GoogleAccount, EmailSendLog, EmailEvent
)
from app.services.gmail_service import GmailService

class CampaignService:
    @staticmethod
    def build_full_email_body(job_description: str) -> str:
        if not job_description:
            return "{{company_logo}}"
        trimmed = job_description.strip()
        lower = trimmed.lower()
        
        has_logo_tag = ("{{company_logo}}" in lower or "cid:company_logo" in lower or "<img" in lower)
        has_footer = (
            "thanks & regards" in lower or
            "thanks regards" in lower or
            "thanks," in lower or
            "regards," in lower or
            "for quicker communication" in lower or
            "email:" in lower
        )

        if not has_logo_tag and not has_footer:
            intro = "Hi {{employee_name}},\n\nThis is {{loggedin_username}} from {{loggedin_user_company}}. I’m reaching out regarding a Below job opportunity with our client."
            footer = "For quicker communication regarding this opportunity, could you please share your WhatsApp number, if you’re comfortable doing so?\n\nThanks & Regards,\n{{loggedin_username}}\nEmail: {{official_email}}\n{{company_logo}}"
            return f"{intro}\n\n{trimmed}\n\n{footer}"
        elif not has_logo_tag:
            return f"{trimmed}\n\n{{company_logo}}"

        return trimmed

    @staticmethod
    def interpolate_template(template_str: str, variables: Dict[str, Any]) -> str:
        if not template_str:
            return ""

        def replace_var(match):
            key = match.group(1).strip()
            val = variables.get(key)
            if val is None or val == "":
                if key in ["company_logo", "loggedin_user_logo", "job_description"]:
                    return ""
                return "NA"
            return str(val)

        return re.sub(r"\{\{\s*([a-zA-Z0-9_]+)\s*\}\}", replace_var, template_str)

    @staticmethod
    def process_campaign_sequential(db: Session, campaign_id: str):
        campaign = db.query(EmailCampaign).filter(EmailCampaign.id == campaign_id).first()
        if not campaign:
            return

        campaign.status = "Sending"
        campaign.started_at = datetime.utcnow()
        db.commit()

        # Retrieve sender google account refresh token and email
        sender_account = None
        if campaign.sender_google_account_id:
            sender_account = db.query(GoogleAccount).filter(GoogleAccount.id == campaign.sender_google_account_id).first()
        
        if not sender_account:
            # Fallback to user's first connected account or mock sender
            sender_account = db.query(GoogleAccount).filter(
                GoogleAccount.user_id == campaign.user_id,
                GoogleAccount.status == "connected"
            ).first()

        sender_email = sender_account.google_email if sender_account else "recruiter.demo@gmail.com"
        encrypted_token = sender_account.encrypted_refresh_token if sender_account else "mock_encrypted_refresh_token"

        user = db.query(User).filter(User.id == campaign.user_id).first()
        recruiter_name = user.name if user else "Recruiter"
        recruiter_company = (user.company_name if (user and hasattr(user, 'company_name') and user.company_name) else "Rapid Conect")

        recipients = db.query(CampaignRecipient).filter(
            CampaignRecipient.campaign_id == campaign_id,
            CampaignRecipient.status.in_(["Pending", "Retrying"])
        ).all()

        has_failure = False

        for recipient in recipients:
            recipient.status = "Sending"
            recipient.attempt_count += 1
            db.commit()

            employee = db.query(Employee).filter(Employee.id == recipient.employee_id).first() if recipient.employee_id else None

            logo_val = getattr(user, "company_logo", None) or ""

            # Prepare variables for interpolation
            variables = {
                "employee_name": employee.employee_name if employee else "Valued Contact",
                "email": recipient.recipient_email,
                "company_name": employee.company_name if employee else None,
                "contact_number": employee.contact_number if employee else None,
                "whatsapp_number": employee.whatsapp_number if employee else None,
                "job_title": employee.job_title if employee else None,
                "recruiter_name": recruiter_name,
                "loggedin_username": recruiter_name,
                "loggedin_user_company": recruiter_company,
                "official_email": getattr(user, "official_email", None) or (user.email if user else ""),
                "loggedin_user_official_email": getattr(user, "official_email", None) or (user.email if user else ""),
                "company_logo": "{{company_logo}}",
                "loggedin_user_logo": "{{company_logo}}",
                "job_description": campaign.body
            }

            # Personalized subject and body
            full_body_template = CampaignService.build_full_email_body(campaign.body)
            personalized_sub = CampaignService.interpolate_template(campaign.subject, variables)
            personalized_body = CampaignService.interpolate_template(full_body_template, variables)

            recipient.personalized_subject = personalized_sub
            recipient.personalized_body = personalized_body

            # Attempt sending via Gmail API
            success, message_id_or_err, raw_err = GmailService.send_email_via_gmail_api(
                encrypted_refresh_token=encrypted_token,
                sender_email=sender_email,
                to_email=recipient.recipient_email,
                subject=personalized_sub,
                body=personalized_body,
                company_logo=logo_val,
                cc=campaign.cc_recipients,
                bcc=campaign.bcc_recipients
            )

            # Record audit log
            send_log = EmailSendLog(
                campaign_recipient_id=recipient.id,
                provider="Gmail API",
                provider_message_id=message_id_or_err if success else None,
                request_status="200 OK" if success else "500 Error",
                response_code=200 if success else 500,
                error_message=raw_err if not success else None,
                attempted_at=datetime.utcnow()
            )
            db.add(send_log)

            if success:
                recipient.status = "Sent"
                recipient.sent_at = datetime.utcnow()
                recipient.last_error = None
                
                event = EmailEvent(
                    campaign_recipient_id=recipient.id,
                    event_type="sent",
                    payload=f"Provider Message ID: {message_id_or_err}"
                )
                db.add(event)
            else:
                recipient.status = "Failed"
                recipient.last_error = raw_err or message_id_or_err
                has_failure = True
                
                event = EmailEvent(
                    campaign_recipient_id=recipient.id,
                    event_type="failed",
                    payload=raw_err or message_id_or_err
                )
                db.add(event)

            db.commit()

        # Update overall campaign status
        all_recipients = db.query(CampaignRecipient).filter(CampaignRecipient.campaign_id == campaign_id).all()
        failed_count = sum(1 for r in all_recipients if r.status == "Failed")
        pending_count = sum(1 for r in all_recipients if r.status in ["Pending", "Sending"])

        if pending_count == 0:
            campaign.completed_at = datetime.utcnow()
            if failed_count > 0:
                campaign.status = "Completed With Errors"
            else:
                campaign.status = "Completed"
        
        db.commit()

    @staticmethod
    def retry_single_recipient(db: Session, recipient_id: str) -> bool:
        recipient = db.query(CampaignRecipient).filter(CampaignRecipient.id == recipient_id).first()
        if not recipient:
            return False

        recipient.status = "Retrying"
        db.commit()

        campaign = recipient.campaign
        sender_account = None
        if campaign.sender_google_account_id:
            sender_account = db.query(GoogleAccount).filter(GoogleAccount.id == campaign.sender_google_account_id).first()
        if not sender_account:
            sender_account = db.query(GoogleAccount).filter(
                GoogleAccount.user_id == campaign.user_id,
                GoogleAccount.status == "connected"
            ).first()

        sender_email = sender_account.google_email if sender_account else "recruiter.demo@gmail.com"
        encrypted_token = sender_account.encrypted_refresh_token if sender_account else "mock_encrypted_refresh_token"

        user = db.query(User).filter(User.id == campaign.user_id).first() if campaign else None
        logo_val = getattr(user, "company_logo", None) or "" if user else ""

        recipient.attempt_count += 1
        
        success, msg_id, raw_err = GmailService.send_email_via_gmail_api(
            encrypted_refresh_token=encrypted_token,
            sender_email=sender_email,
            to_email=recipient.recipient_email,
            subject=recipient.personalized_subject or campaign.subject,
            body=recipient.personalized_body or campaign.body,
            company_logo=logo_val,
            cc=campaign.cc_recipients,
            bcc=campaign.bcc_recipients
        )

        send_log = EmailSendLog(
            campaign_recipient_id=recipient.id,
            provider="Gmail API (Retry)",
            provider_message_id=msg_id if success else None,
            request_status="200 OK" if success else "500 Error",
            response_code=200 if success else 500,
            error_message=raw_err if not success else None,
            attempted_at=datetime.utcnow()
        )
        db.add(send_log)

        if success:
            recipient.status = "Sent"
            recipient.sent_at = datetime.utcnow()
            recipient.last_error = None
        else:
            recipient.status = "Failed"
            recipient.last_error = raw_err or msg_id

        db.commit()

        # Recalculate campaign status
        all_recipients = db.query(CampaignRecipient).filter(CampaignRecipient.campaign_id == campaign.id).all()
        failed_count = sum(1 for r in all_recipients if r.status == "Failed")
        if failed_count == 0:
            campaign.status = "Completed"
        else:
            campaign.status = "Completed With Errors"
        db.commit()

        return success
