import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)
    google_user_id = Column(String, nullable=True)
    role = Column(String, default="recruiter")
    company_name = Column(String, default="Rapid Conect", nullable=True)
    official_email = Column(String, nullable=True)
    company_logo = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    google_accounts = relationship("GoogleAccount", back_populates="user", cascade="all, delete-orphan")
    campaigns = relationship("EmailCampaign", back_populates="user", cascade="all, delete-orphan")


class GoogleAccount(Base):
    __tablename__ = "google_accounts"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    google_email = Column(String, nullable=False)
    google_subject_id = Column(String, nullable=True)
    encrypted_refresh_token = Column(Text, nullable=True)
    scopes = Column(Text, nullable=True)
    status = Column(String, default="connected")  # connected, disconnected, expired
    connected_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="google_accounts")
    campaigns = relationship("EmailCampaign", back_populates="sender_account")


class Employee(Base):
    __tablename__ = "employees"

    id = Column(String, primary_key=True, default=generate_uuid)
    employee_name = Column(String, nullable=False)
    email_id = Column(String, nullable=False, index=True)
    company_name = Column(String, nullable=True)
    contact_number = Column(String, nullable=True)
    whatsapp_number = Column(String, nullable=True)
    job_title = Column(String, nullable=True)
    status = Column(String, default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    recipients = relationship("CampaignRecipient", back_populates="employee")


class EmailCampaign(Base):
    __tablename__ = "email_campaigns"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    sender_google_account_id = Column(String, ForeignKey("google_accounts.id"), nullable=True)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    cc_recipients = Column(Text, nullable=True)  # comma separated or json
    bcc_recipients = Column(Text, nullable=True)  # comma separated or json
    status = Column(String, default="Draft")  # Draft, Queued, Sending, Completed, Completed With Errors, Failed, Cancelled
    total_recipients = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="campaigns")
    sender_account = relationship("GoogleAccount", back_populates="campaigns")
    recipients = relationship("CampaignRecipient", back_populates="campaign", cascade="all, delete-orphan")


class CampaignRecipient(Base):
    __tablename__ = "campaign_recipients"

    id = Column(String, primary_key=True, default=generate_uuid)
    campaign_id = Column(String, ForeignKey("email_campaigns.id"), nullable=False)
    employee_id = Column(String, ForeignKey("employees.id"), nullable=True)
    recipient_email = Column(String, nullable=False)
    personalized_subject = Column(String, nullable=True)
    personalized_body = Column(Text, nullable=True)
    status = Column(String, default="Pending")  # Pending, Sending, Sent, Failed, Retrying
    attempt_count = Column(Integer, default=0)
    last_error = Column(Text, nullable=True)
    sent_at = Column(DateTime, nullable=True)

    campaign = relationship("EmailCampaign", back_populates="recipients")
    employee = relationship("Employee", back_populates="recipients")
    events = relationship("EmailEvent", back_populates="recipient", cascade="all, delete-orphan")
    send_logs = relationship("EmailSendLog", back_populates="recipient", cascade="all, delete-orphan")


class EmailEvent(Base):
    __tablename__ = "email_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    campaign_recipient_id = Column(String, ForeignKey("campaign_recipients.id"), nullable=False)
    event_type = Column(String, nullable=False)  # sent, delivered, opened, bounced, failed
    payload = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    recipient = relationship("CampaignRecipient", back_populates="events")


class EmailSendLog(Base):
    __tablename__ = "email_send_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    campaign_recipient_id = Column(String, ForeignKey("campaign_recipients.id"), nullable=False)
    provider = Column(String, default="Gmail API")
    provider_message_id = Column(String, nullable=True)
    request_status = Column(String, nullable=True)
    response_code = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    attempted_at = Column(DateTime, default=datetime.utcnow)

    recipient = relationship("CampaignRecipient", back_populates="send_logs")


class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    name = Column(String, nullable=False)
    category = Column(String, default="General Outreach")
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
