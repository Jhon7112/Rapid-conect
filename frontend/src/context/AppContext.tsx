import React, { createContext, useContext, useState, useEffect } from 'react';
import { Employee, User, GoogleStatus, CampaignDraft } from '../types';
import { fetchCurrentUser, fetchGoogleStatus } from '../api';

export const DEFAULT_CAMPAIGN_DRAFT: CampaignDraft = {
  subject: 'Vendor Outreach Proposal & Partnership Opportunities',
  body: `We are reaching out to explore potential vendor collaboration opportunities with {{vendor_name}} at {{company_name}}.

Scope of Services:
- Provision of specialized software services and technical solutions.
- High-efficiency project execution and SLA compliance.
- Collaborative vendor relationship management.`,
  cc_recipients: 'namrata.pandey@tekinspirations.com',
  bcc_recipients: ''
};

interface AppContextType {
  user: User | null;
  selectedEmployees: Employee[];
  googleStatus: GoogleStatus;
  campaignDraft: CampaignDraft;
  setCampaignDraft: React.Dispatch<React.SetStateAction<CampaignDraft>>;
  resetCampaignDraft: () => void;
  toggleSelectEmployee: (employee: Employee) => void;
  selectAllEmployees: (employees: Employee[]) => void;
  clearSelection: () => void;
  isEmployeeSelected: (id: string) => boolean;
  refreshGoogleStatus: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus>({
    connected: true,
    google_email: 'recruiter.demo@gmail.com',
    account_id: 'demo',
    status: 'connected'
  });
  const [campaignDraft, setCampaignDraft] = useState<CampaignDraft>(DEFAULT_CAMPAIGN_DRAFT);

  const resetCampaignDraft = () => {
    setCampaignDraft(DEFAULT_CAMPAIGN_DRAFT);
  };

  const refreshCurrentUser = async () => {
    try {
      const { user: fetchedUser } = await fetchCurrentUser();
      setUser(fetchedUser);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');
    if (tokenFromUrl) {
      localStorage.setItem('reacher_token', tokenFromUrl);
    }

    refreshCurrentUser();
    refreshGoogleStatus();
  }, []);

  const refreshGoogleStatus = async () => {
    try {
      const status = await fetchGoogleStatus();
      setGoogleStatus(status);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSelectEmployee = (employee: Employee) => {
    setSelectedEmployees(prev => {
      const exists = prev.some(e => e.id === employee.id);
      if (exists) {
        return prev.filter(e => e.id !== employee.id);
      } else {
        return [...prev, employee];
      }
    });
  };

  const selectAllEmployees = (employees: Employee[]) => {
    setSelectedEmployees(prev => {
      const allSelected = employees.every(emp => prev.some(p => p.id === emp.id));
      if (allSelected) {
        // Deselect current visible page
        const empIds = new Set(employees.map(e => e.id));
        return prev.filter(p => !empIds.has(p.id));
      } else {
        // Merge without duplicates
        const map = new Map<string, Employee>();
        prev.forEach(e => map.set(e.id, e));
        employees.forEach(e => map.set(e.id, e));
        return Array.from(map.values());
      }
    });
  };

  const clearSelection = () => {
    setSelectedEmployees([]);
  };

  const isEmployeeSelected = (id: string) => {
    return selectedEmployees.some(e => e.id === id);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        selectedEmployees,
        googleStatus,
        campaignDraft,
        setCampaignDraft,
        resetCampaignDraft,
        toggleSelectEmployee,
        selectAllEmployees,
        clearSelection,
        isEmployeeSelected,
        refreshGoogleStatus,
        refreshCurrentUser
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
