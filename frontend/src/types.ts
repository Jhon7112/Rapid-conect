export interface Employee {
  id: string;
  employee_name: string;
  email_id: string;
  company_name: string | null;
  contact_number: string | null;
  whatsapp_number: string | null;
  job_title: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  company_name?: string | null;
  official_email?: string | null;
  company_logo?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface GoogleStatus {
  connected: boolean;
  google_email: string | null;
  account_id: string | null;
  status: string;
  connected_at?: string;
}

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  employee_id?: string;
  recipient_email: string;
  personalized_subject?: string;
  personalized_body?: string;
  status: 'Pending' | 'Sending' | 'Sent' | 'Failed' | 'Retrying';
  attempt_count: number;
  last_error?: string;
  sent_at?: string;
  employee?: Employee;
}

export interface Campaign {
  id: string;
  user_id: string;
  sender_google_account_id?: string;
  subject: string;
  body: string;
  cc_recipients?: string;
  bcc_recipients?: string;
  status: 'Draft' | 'Queued' | 'Sending' | 'Completed' | 'Completed With Errors' | 'Failed' | 'Cancelled';
  total_recipients: number;
  sent_count?: number;
  failed_count?: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  recipients?: CampaignRecipient[];
}

export interface DashboardSummary {
  total_campaigns: number;
  total_recipients: number;
  total_sent: number;
  total_failed: number;
  connected_email: string | null;
  google_connected: boolean;
}

export interface EmailTemplate {
  id: string;
  user_id?: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignDraft {
  subject: string;
  body: string;
  cc_recipients: string;
  bcc_recipients: string;
}
