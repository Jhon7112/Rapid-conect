import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
  AlertTriangle,
  ArrowLeft,
  MailCheck,
  Send,
  RefreshCw
} from 'lucide-react';
import { Campaign, CampaignRecipient } from '../types';
import { fetchCampaign, retryRecipient } from '../api';

export const CampaignProgressPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadCampaignData = () => {
    if (!id) return;
    fetchCampaign(id)
      .then(res => setCampaign(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCampaignData();
    // Live polling every 1.5 seconds while campaign is Sending or Queued
    const interval = setInterval(() => {
      if (campaign?.status === 'Sending' || campaign?.status === 'Queued' || campaign?.status === 'Draft') {
        loadCampaignData();
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [id, campaign?.status]);

  if (loading) {
    return <div className="text-center py-20 text-slate-500 font-medium">Loading campaign metrics...</div>;
  }

  if (!campaign) {
    return (
      <div className="text-center py-20 space-y-3">
        <div className="text-slate-800 font-bold text-lg">Campaign Not Found</div>
        <button onClick={() => navigate('/campaigns')} className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg">
          Return to Campaigns List
        </button>
      </div>
    );
  }

  const recipients = campaign.recipients || [];
  const completedCount = recipients.filter(r => r.status === 'Sent' || r.status === 'Failed').length;
  const sentCount = recipients.filter(r => r.status === 'Sent').length;
  const failedCount = recipients.filter(r => r.status === 'Failed').length;
  const pendingCount = recipients.filter(r => r.status === 'Pending' || r.status === 'Sending' || r.status === 'Retrying').length;
  
  const percentage = campaign.total_recipients > 0
    ? Math.round((completedCount / campaign.total_recipients) * 100)
    : 0;

  const handleRetrySingle = async (recipientId: string) => {
    setRetryingId(recipientId);
    try {
      await retryRecipient(recipientId);
      loadCampaignData();
    } catch (e) {
      alert('Failed to retry recipient');
    } finally {
      setRetryingId(null);
    }
  };

  const renderStatusBadge = (status: CampaignRecipient['status']) => {
    switch (status) {
      case 'Sent':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sent</span>
          </span>
        );
      case 'Sending':
      case 'Retrying':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
            <RotateCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            <span>{status === 'Retrying' ? 'Retrying...' : 'Sending...'}</span>
          </span>
        );
      case 'Failed':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Pending</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/campaigns')} className="p-2 hover:bg-slate-200 rounded-lg text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{campaign.subject}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400">Reference:</span>
              <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px] rounded font-medium">
                #{campaign.id.slice(0, 8)}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={loadCampaignData}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Progress Metric Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sequential Delivery Progress</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {completedCount} / {campaign.total_recipients} completed ({percentage}%)
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Sent: <strong>{sentCount}</strong></span>
            </div>

            <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>Failed: <strong>{failedCount}</strong></span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div
            className={`h-full transition-all duration-500 ${
              failedCount > 0 ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-amber-500' : 'bg-gradient-to-r from-indigo-600 to-emerald-500'
            }`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>

      {/* Per Recipient Delivery List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Individual Recipient Statuses ({recipients.length})
          </h2>
        </div>

        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
          {recipients.map((rec) => (
            <div key={rec.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 text-sm">
                    {rec.employee?.employee_name || 'Vendor'}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">&lt;{rec.recipient_email}&gt;</span>
                </div>
                {rec.employee?.company_name && (
                  <div className="text-xs text-slate-500">
                    {rec.employee.company_name} {rec.employee.job_title ? `• ${rec.employee.job_title}` : ''}
                  </div>
                )}
                {rec.last_error && (
                  <div className="text-xs text-rose-600 font-mono bg-rose-50 p-2 rounded border border-rose-200 mt-1 max-w-lg">
                    Error: {rec.last_error}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                {renderStatusBadge(rec.status)}

                {rec.status === 'Failed' && (
                  <button
                    onClick={() => handleRetrySingle(rec.id)}
                    disabled={retryingId === rec.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow transition-all disabled:opacity-50"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${retryingId === rec.id ? 'animate-spin' : ''}`} />
                    <span>{retryingId === rec.id ? 'Retrying...' : 'Retry Email'}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
