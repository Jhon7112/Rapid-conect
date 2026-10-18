import React from 'react';
import { FileText, History, BarChart3 } from 'lucide-react';

export const TemplatesPage: React.FC = () => (
  <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center space-y-3">
    <FileText className="w-10 h-10 text-indigo-600 mx-auto" />
    <h1 className="text-xl font-bold text-slate-900">Email Templates Library</h1>
    <p className="text-sm text-slate-500 max-w-md mx-auto">
      Pre-saved recruitment templates for software engineers, data scientists, product managers, and executive search.
    </p>
  </div>
);

export const HistoryPage: React.FC = () => (
  <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center space-y-3">
    <History className="w-10 h-10 text-indigo-600 mx-auto" />
    <h1 className="text-xl font-bold text-slate-900">Email Transmission Log Audit</h1>
    <p className="text-sm text-slate-500 max-w-md mx-auto">
      Granular technical audit trail showing individual Gmail API response codes, provider transaction IDs, vendor delivery logs, and timestamp traces across all historical campaigns.
    </p>
  </div>
);

export const ReportsPage: React.FC = () => (
  <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center space-y-3">
    <BarChart3 className="w-10 h-10 text-indigo-600 mx-auto" />
    <h1 className="text-xl font-bold text-slate-900">Recruitment Communication Analytics</h1>
    <p className="text-sm text-slate-500 max-w-md mx-auto">
      Metrics on campaign volume, candidate delivery success rates, and recruiter team activity over time.
    </p>
  </div>
);
