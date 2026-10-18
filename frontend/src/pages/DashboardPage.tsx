import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Send,
  MailCheck,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { fetchDashboardSummary, fetchCampaigns } from '../api';
import { DashboardSummary, Campaign } from '../types';
import { useApp } from '../context/AppContext';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { googleStatus, selectedEmployees } = useApp();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchDashboardSummary(), fetchCampaigns()])
      .then(([sumData, campData]) => {
        setSummary(sumData);
        setRecentCampaigns(campData.slice(0, 5));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex items-center justify-between border border-slate-800">
        <div className="space-y-2">
          <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-semibold uppercase tracking-wider">
            Vendor Outreach Workspace
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Vendor Outreach Dashboard</h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Select vendor records, compose personalized email sequences, authorize your individual Google account, and track real-time delivery metrics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/vendors')}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Users className="w-4 h-4" />
            <span>Select Vendors</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Selected Vendors</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{selectedEmployees.length}</div>
            <div className="text-xs text-slate-500 mt-1">Ready for composition</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Campaigns</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{summary?.total_campaigns || 0}</div>
            <div className="text-xs text-emerald-600 mt-1 font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Active tracking
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <MailCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Emails Sent</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{summary?.total_sent || 0}</div>
            <div className="text-xs text-slate-500 mt-1">
              Out of {summary?.total_recipients || 0} total recipients
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gmail Authorization</div>
            <div className="text-sm font-bold text-slate-900 mt-1 truncate max-w-[140px]">
              {googleStatus.connected ? googleStatus.google_email : 'Disconnected'}
            </div>
            <div className="text-xs mt-1">
              {googleStatus.connected ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Authorized
                </span>
              ) : (
                <span className="text-amber-600 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Action Needed
                </span>
              )}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Launch & Recent Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Campaigns */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-semibold text-slate-900">Recent Email Campaigns</h2>
            <button
              onClick={() => navigate('/campaigns')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentCampaigns.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Send className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-600">No campaigns launched yet</p>
              <button
                onClick={() => navigate('/vendors')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold shadow"
              >
                Create First Campaign
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentCampaigns.map((camp) => (
                <div
                  key={camp.id}
                  onClick={() => navigate('/campaigns')}
                  className="p-4 rounded-xl border border-slate-100 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-slate-800 line-clamp-1">{camp.subject}</h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{camp.total_recipients} Recipients</span>
                      <span>•</span>
                      <span>{new Date(camp.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                        camp.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : camp.status === 'Sending'
                          ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {camp.status}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Campaign Workflow Panel */}
        <div className="bg-slate-900 text-white rounded-xl p-6 shadow-xl space-y-5 border border-slate-800 flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Workflow Step-by-Step</span>
            <h3 className="text-lg font-bold">Launch Bulk Campaign</h3>
            
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3 text-xs">
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center shrink-0 border border-indigo-500/30">
                  1
                </div>
                <div>
                  <div className="font-semibold text-slate-200">Select Vendors</div>
                  <div className="text-slate-400">Choose vendor records from the database using multi-select checkboxes.</div>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs">
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center shrink-0 border border-indigo-500/30">
                  2
                </div>
                <div>
                  <div className="font-semibold text-slate-200">Compose & Personalize</div>
                  <div className="text-slate-400">Add CC/BCC and insert placeholders like <code className="text-indigo-300">{"{{vendor_name}}"}</code>.</div>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs">
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center shrink-0 border border-indigo-500/30">
                  3
                </div>
                <div>
                  <div className="font-semibold text-slate-200">Review & Sequential Send</div>
                  <div className="text-slate-400">Review per-vendor output and dispatch sequentially via Gmail API.</div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/vendors')}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Start New Campaign</span>
          </button>
        </div>
      </div>
    </div>
  );
};
