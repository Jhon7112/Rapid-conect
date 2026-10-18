import { Employee, Campaign, GoogleStatus, User, DashboardSummary, EmailTemplate } from './types';

const API_BASE = '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('reacher_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchCurrentUser(): Promise<{ token: string; user: User } | null> {
  const token = localStorage.getItem('reacher_token');
  if (!token) {
    return null;
  }

  try {
    const meResp = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders()
    });

    if (!meResp.ok) {
      localStorage.removeItem('reacher_token');
      return null;
    }

    const user = await meResp.json();
    return { token, user };
  } catch (err) {
    console.error('Error validating auth session:', err);
    return null;
  }
}

export async function fetchEmployees(params?: {
  search?: string;
  company?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: Employee[]; total: number; companies: string[] }> {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.set('search', params.search);
  if (params?.company) queryParams.set('company', params.company);
  if (params?.status) queryParams.set('status', params.status);
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());

  const resp = await fetch(`${API_BASE}/employees?${queryParams.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!resp.ok) throw new Error('Failed to fetch employees');
  return resp.json();
}

export async function updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee> {
  const resp = await fetch(`${API_BASE}/employees/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates)
  });
  if (!resp.ok) throw new Error('Failed to update employee');
  return resp.json();
}

export async function createEmployee(emp: Partial<Employee>): Promise<Employee> {
  const resp = await fetch(`${API_BASE}/employees`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(emp)
  });
  if (!resp.ok) {
    let errMsg = 'Failed to create employee';
    try {
      const err = await resp.json();
      errMsg = err.detail || errMsg;
    } catch (_) {
      errMsg = `Server error (${resp.status})`;
    }
    throw new Error(errMsg);
  }
  return resp.json();
}

export async function bulkImportEmployees(employees: Partial<Employee>[]): Promise<{ count: number; message?: string; duplicates_skipped?: number }> {
  const resp = await fetch(`${API_BASE}/employees/bulk-import`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(employees)
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.detail || 'Failed to bulk import candidates');
  }
  return resp.json();
}

export async function deleteEmployee(id: string): Promise<void> {
  const resp = await fetch(`${API_BASE}/employees/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!resp.ok) throw new Error('Failed to delete candidate');
}

export async function bulkDeleteEmployees(ids: string[]): Promise<void> {
  const resp = await fetch(`${API_BASE}/employees/bulk-delete`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ ids })
  });
  if (!resp.ok) throw new Error('Failed to delete selected candidates');
}

export async function clearAllEmployees(): Promise<void> {
  const resp = await fetch(`${API_BASE}/employees/clear-all`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!resp.ok) throw new Error('Failed to clear candidate directory');
}

export async function seedEmployees(): Promise<void> {
  await fetch(`${API_BASE}/employees/seed`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
}

export async function fetchGoogleStatus(): Promise<GoogleStatus> {
  const resp = await fetch(`${API_BASE}/google/status`, {
    headers: getAuthHeaders()
  });
  if (!resp.ok) return { connected: false, google_email: null, account_id: null, status: 'disconnected' };
  return resp.json();
}

export async function connectGoogle(): Promise<string> {
  const resp = await fetch(`${API_BASE}/google/connect`, {
    headers: getAuthHeaders()
  });
  const data = await resp.json();
  return data.auth_url;
}

export async function disconnectGoogle(): Promise<void> {
  await fetch(`${API_BASE}/google/disconnect`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
}

export async function createCampaign(data: {
  employee_ids: string[];
  subject: string;
  body: string;
  cc_recipients?: string;
  bcc_recipients?: string;
}): Promise<Campaign> {
  const resp = await fetch(`${API_BASE}/campaigns`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.detail || 'Failed to create campaign');
  }
  return resp.json();
}

export async function startCampaign(campaignId: string): Promise<void> {
  const resp = await fetch(`${API_BASE}/campaigns/${campaignId}/start`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!resp.ok) throw new Error('Failed to start campaign');
}

export async function fetchCampaigns(): Promise<Campaign[]> {
  const resp = await fetch(`${API_BASE}/campaigns`, {
    headers: getAuthHeaders()
  });
  if (!resp.ok) return [];
  return resp.json();
}

export async function fetchCampaign(id: string): Promise<Campaign> {
  const resp = await fetch(`${API_BASE}/campaigns/${id}`, {
    headers: getAuthHeaders()
  });
  if (!resp.ok) throw new Error('Campaign not found');
  return resp.json();
}

export async function retryRecipient(recipientId: string): Promise<void> {
  const resp = await fetch(`${API_BASE}/campaigns/recipients/${recipientId}/retry`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!resp.ok) throw new Error('Failed to retry recipient');
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const resp = await fetch(`${API_BASE}/campaigns/stats/summary`, {
    headers: getAuthHeaders()
  });
  if (!resp.ok) return { total_campaigns: 0, total_recipients: 0, total_sent: 0, total_failed: 0, connected_email: null, google_connected: false };
  return resp.json();
}

export async function fetchCampaignPreview(data: {
  employee_id: string;
  subject: string;
  body: string;
  cc_recipients?: string;
  bcc_recipients?: string;
}): Promise<{
  from_email: string;
  to_name: string;
  to_email: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
}> {
  const resp = await fetch(`${API_BASE}/campaigns/preview`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!resp.ok) throw new Error('Failed to generate email preview');
  return resp.json();
}

// Template API Functions
export async function fetchTemplates(category?: string): Promise<EmailTemplate[]> {
  const query = category && category !== 'All' ? `?category=${encodeURIComponent(category)}` : '';
  const resp = await fetch(`${API_BASE}/templates${query}`, {
    headers: getAuthHeaders()
  });
  if (!resp.ok) return [];
  return resp.json();
}

export async function createTemplate(data: {
  name: string;
  category?: string;
  subject: string;
  body: string;
}): Promise<EmailTemplate> {
  const resp = await fetch(`${API_BASE}/templates`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!resp.ok) throw new Error('Failed to create template');
  return resp.json();
}

export async function updateTemplate(id: string, data: Partial<EmailTemplate>): Promise<EmailTemplate> {
  const resp = await fetch(`${API_BASE}/templates/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!resp.ok) throw new Error('Failed to update template');
  return resp.json();
}

export async function deleteTemplate(id: string): Promise<void> {
  const resp = await fetch(`${API_BASE}/templates/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!resp.ok) throw new Error('Failed to delete template');
}

export async function updateUserProfile(data: {
  name?: string;
  email?: string;
  role?: string;
  company_name?: string;
  official_email?: string;
  company_logo?: string;
}): Promise<User> {
  const resp = await fetch(`${API_BASE}/auth/me`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.detail || 'Failed to update user profile');
  }
  return resp.json();
}
