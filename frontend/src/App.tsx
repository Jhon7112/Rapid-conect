import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardPage } from './pages/DashboardPage';
import { VendorsPage } from './pages/VendorsPage';
import { ComposePage } from './pages/ComposePage';
import { ReviewPage } from './pages/ReviewPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { CampaignProgressPage } from './pages/CampaignProgressPage';
import { SettingsPage } from './pages/SettingsPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { ReportsPage } from './pages/ReportsPage';
import { HistoryPage } from './pages/PlaceholderPages';

import { LoginPage } from './pages/LoginPage';

import { useLocation } from 'react-router-dom';
import { useApp } from './context/AppContext';

const NavigationResetHandler: React.FC = () => {
  const location = useLocation();
  const { resetCampaignDraft } = useApp();

  React.useEffect(() => {
    if (!location.pathname.startsWith('/email-campaigns')) {
      resetCampaignDraft();
    }
  }, [location.pathname, resetCampaignDraft]);

  return null;
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <Router>
        <NavigationResetHandler />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <div className="flex min-h-screen bg-slate-50">
                <Sidebar />
                <div className="flex-1 flex flex-col min-w-0">
                  <Header />
                  <main className="flex-1 p-6 md:p-8 overflow-y-auto">
                    <Routes>
                      <Route path="/" element={<DashboardPage />} />
                      <Route path="/employees" element={<VendorsPage />} />
                      <Route path="/email-campaigns/compose" element={<ComposePage />} />
                      <Route path="/email-campaigns/review" element={<ReviewPage />} />
                      <Route path="/campaigns" element={<CampaignsPage />} />
                      <Route path="/campaigns/:id" element={<CampaignProgressPage />} />
                      <Route path="/templates" element={<TemplatesPage />} />
                      <Route path="/history" element={<HistoryPage />} />
                      <Route path="/reports" element={<ReportsPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                    </Routes>
                  </main>
                </div>
              </div>
            }
          />
        </Routes>
      </Router>
    </AppProvider>
  );
};

export default App;
