from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr

# Auth & User
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    company_name: Optional[str] = None
    official_email: Optional[str] = None
    company_logo: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    company_name: Optional[str] = "Rapid Conect"
    official_email: Optional[str] = None
    company_logo: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Google Account
class GoogleAccountResponse(BaseModel):
    id: str
    google_email: str
    status: str
    connected_at: datetime

    class Config:
        from_attributes = True

# Employee
class EmployeeBase(BaseModel):
    employee_name: str
    email_id: str
    company_name: Optional[str] = None
    contact_number: Optional[str] = None
    whatsapp_number: Optional[str] = None
    job_title: Optional[str] = None
    status: Optional[str] = "Active"

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(BaseModel):
    employee_name: Optional[str] = None
    email_id: Optional[str] = None
    company_name: Optional[str] = None
    contact_number: Optional[str] = None
    whatsapp_number: Optional[str] = None
    job_title: Optional[str] = None
    status: Optional[str] = None

class EmployeeResponse(EmployeeBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Campaign Recipient
class RecipientResponse(BaseModel):
    id: str
    campaign_id: str
    employee_id: Optional[str] = None
    recipient_email: str
    personalized_subject: Optional[str] = None
    personalized_body: Optional[str] = None
    status: str
    attempt_count: int
    last_error: Optional[str] = None
    sent_at: Optional[datetime] = None
    employee: Optional[EmployeeResponse] = None

    class Config:
        from_attributes = True

# Campaign
class CampaignCreate(BaseModel):
    employee_ids: List[str]
    subject: str
    body: str
    cc_recipients: Optional[str] = None
    bcc_recipients: Optional[str] = None
    sender_google_account_id: Optional[str] = None

class CampaignResponse(BaseModel):
    id: str
    user_id: str
    sender_google_account_id: Optional[str] = None
    subject: str
    body: str
    cc_recipients: Optional[str] = None
    bcc_recipients: Optional[str] = None
    status: str
    total_recipients: int
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    recipients: Optional[List[RecipientResponse]] = []

    class Config:
        from_attributes = True

class CampaignPreviewRequest(BaseModel):
    employee_id: str
    subject: str
    body: str
    cc_recipients: Optional[str] = None
    bcc_recipients: Optional[str] = None

class CampaignPreviewResponse(BaseModel):
    from_email: str
    to_name: str
    to_email: str
    cc: Optional[str]
    bcc: Optional[str]
    subject: str
    body: str

# Email Template
class TemplateBase(BaseModel):
    name: str
    category: Optional[str] = "General Outreach"
    subject: str
    body: str

class TemplateCreate(TemplateBase):
    pass

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None

class TemplateResponse(TemplateBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
