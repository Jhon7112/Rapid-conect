import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { createCampaign, startCampaign, fetchCampaignPreview, connectGoogle } from '../api';

export const ReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedEmployees, googleStatus, campaignDraft, setCampaignDraft, resetCampaignDraft, clearSelection, user } = useApp();

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const [previewData, setPreviewData] = useState<{
    from_email: string;
    to_name: string;
    to_email: string;
    cc?: string;
    bcc?: string;
    subject: string;
    body: string;
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const senderEmail = googleStatus.connected ? googleStatus.google_email : (user?.email || 'recruiter.demo@gmail.com');

  useEffect(() => {
    if (selectedEmployees.length > 0 && campaignDraft.body) {
      const sampleEmp = selectedEmployees[0];
      setLoadingPreview(true);
      fetchCampaignPreview({
        employee_id: sampleEmp.id,
        subject: campaignDraft.subject,
        body: campaignDraft.body,
        cc_recipients: campaignDraft.cc_recipients,
        bcc_recipients: campaignDraft.bcc_recipients,
      })
        .then(res => setPreviewData(res))
        .catch(err => {
          console.error("Failed to load email preview:", err);
        })
        .finally(() => setLoadingPreview(false));
    }
  }, [selectedEmployees, campaignDraft]);

  const handleConfirmAndSend = async () => {
    setSending(true);
    try {
      // Create campaign record
      const campaign = await createCampaign({
        employee_ids: selectedEmployees.map(e => e.id),
        subject: campaignDraft.subject,
        body: campaignDraft.body,
        cc_recipients: campaignDraft.cc_recipients,
        bcc_recipients: campaignDraft.bcc_recipients,
      });

      // Start background execution
      await startCampaign(campaign.id);

      // Clear selected vendors queue
      clearSelection();

      // Reset campaign draft
      resetCampaignDraft();

      // Redirect to live campaign progress view
      navigate(`/campaigns/${campaign.id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to start bulk email campaign');
      setSending(false);
      setIsConfirmOpen(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const authUrl = await connectGoogle();
      window.location.href = authUrl;
    } catch (e: any) {
      alert(e.message || 'Failed to initiate Google OAuth consent flow');
    }
  };

  const sampleEmp = selectedEmployees[0];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Workflow Stepper Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between text-xs font-semibold text-slate-500">
        <div className="flex items-center gap-2 text-emerald-600">
          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">✓</span>
          <span>1. Select Vendors ({selectedEmployees.length})</span>
        </div>
        <div className="h-[1px] w-8 bg-slate-200"></div>
        <div className="flex items-center gap-2 text-emerald-600">
          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">✓</span>
          <span>2. Compose & Personalize</span>
        </div>
        <div className="h-[1px] w-8 bg-slate-200"></div>
        <div className="flex items-center gap-2 text-indigo-600 font-bold">
          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">3</span>
          <span>3. Review & Send</span>
        </div>
        <div className="h-[1px] w-8 bg-slate-200"></div>
        <div className="flex items-center gap-2 text-slate-400">
          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px]">4</span>
          <span>4. Live Progress</span>
        </div>
      </div>

      {/* Google Disconnected Warning Banner */}
      {!googleStatus.connected && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Google Account Connection Required</div>
              <div className="text-[11px] text-slate-600">You must authorize your Gmail account before emails can be sent to recipients.</div>
            </div>
          </div>
          <button
            onClick={handleConnectGoogle}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-sm shrink-0 flex items-center gap-1.5 transition-all"
          >
            <span>Connect Google Account</span>
          </button>
        </div>
      )}

      {/* Campaign Summary Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Review Campaign Parameters</h1>
            <p className="text-xs text-slate-500">Verify details before launching your email campaign.</p>
          </div>

          {googleStatus.connected ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-200 self-start sm:self-auto">
              <ShieldCheck className="w-4 h-4" />
              <span>Sender: <strong>{googleStatus.google_email || senderEmail}</strong></span>
            </div>
          ) : (
            <button
              onClick={handleConnectGoogle}
              className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-full text-xs font-medium border border-rose-200 self-start sm:self-auto cursor-pointer transition-all"
            >
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>Gmail: <strong>Disconnected (Click to Connect)</strong></span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Recipients</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{selectedEmployees.length}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Individual vendor emails</div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">CC Field</div>
            <div className="text-sm font-bold text-slate-900 mt-1 truncate">
              {campaignDraft.cc_recipients || 'None'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Copy on each email</div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">BCC Field</div>
            <div className="text-sm font-bold text-slate-900 mt-1 truncate">
              {campaignDraft.bcc_recipients || 'None'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Confidential audit copy</div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Delivery Protocol</div>
            <div className="text-sm font-bold text-indigo-700 mt-1">Verified Email Queue</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Automated delivery</div>
          </div>
        </div>
      </div>

      {/* Selected Candidates Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Selected Vendor Queue ({selectedEmployees.length})
        </h2>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <th className="p-3 w-12 text-center">Sr.</th>
                <th className="p-3">Vendor Name</th>
                <th className="p-3">Email ID</th>
                <th className="p-3">Company Name</th>
                <th className="p-3">Job Title</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {selectedEmployees.map((emp, idx) => (
                <tr key={emp.id} className="hover:bg-slate-50">
                  <td className="p-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                  <td className="p-3 font-semibold text-slate-800">{emp.employee_name}</td>
                  <td className="p-3 text-slate-600 font-medium">{emp.email_id}</td>
                  <td className="p-3 text-slate-600">{emp.company_name || 'NA'}</td>
                  <td className="p-3 text-slate-600">{emp.job_title || 'NA'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Email Preview Output */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Live Vendor Email Preview
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Exact personalized email structure that will be delivered to vendors
            </p>
          </div>
          <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5 self-start sm:self-auto">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Real Image & Sender Signature Loaded</span>
          </span>
        </div>

        {selectedEmployees.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-200 text-xs gap-2">
            <span className="text-slate-600 font-medium">
              Sample email rendering for vendor 1 of {selectedEmployees.length}:
            </span>
            <span className="font-bold text-slate-800 bg-white px-2.5 py-1 rounded border border-slate-200">
              {sampleEmp?.employee_name} ({sampleEmp?.email_id})
            </span>
          </div>
        )}

        {loadingPreview ? (
          <div className="p-8 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center space-y-2 text-slate-500 text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <span>Generating live vendor email preview...</span>
          </div>
        ) : (
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4 text-xs font-sans">
            <div className="space-y-1.5 border-b border-slate-200 pb-3 text-slate-700">
              <div>
                <strong className="text-slate-500 font-semibold">From: </strong>
                <span className="font-semibold text-slate-900">{previewData?.from_email || senderEmail}</span>
              </div>
              <div>
                <strong className="text-slate-500 font-semibold">To: </strong>
                <span className="font-semibold text-slate-900">
                  {previewData?.to_name || sampleEmp?.employee_name} &lt;{previewData?.to_email || sampleEmp?.email_id}&gt;
                </span>
              </div>
              {campaignDraft.cc_recipients && (
                <div>
                  <strong className="text-slate-500 font-semibold">CC: </strong>
                  <span className="font-medium text-slate-800">{campaignDraft.cc_recipients}</span>
                </div>
              )}
              {campaignDraft.bcc_recipients && (
                <div>
                  <strong className="text-slate-500 font-semibold">BCC: </strong>
                  <span className="font-medium text-slate-800">{campaignDraft.bcc_recipients}</span>
                </div>
              )}
              <div className="pt-1">
                <strong className="text-slate-500 font-semibold">Subject: </strong>
                <span className="font-bold text-slate-900 text-sm">
                  {previewData?.subject || campaignDraft.subject}
                </span>
              </div>
            </div>

            <div className="text-slate-800 leading-relaxed text-xs font-sans">
              {previewData?.body ? (
                previewData.body.includes('<') && previewData.body.includes('>') ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: previewData.body.replace(/\n/g, '<br/>').replace(/(<img[^>]+>)<br\s*\/?>/gi, '$1')
                    }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap">{previewData.body}</div>
                )
              ) : (
                <div className="whitespace-pre-wrap">{campaignDraft.body}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="pt-2 flex items-center justify-between">
        <button
          onClick={() => navigate('/email-campaigns/compose')}
          className="flex items-center gap-1.5 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Compose</span>
        </button>

        <button
          onClick={() => {
            if (!googleStatus.connected) {
              handleConnectGoogle();
              return;
            }
            setIsConfirmOpen(true);
          }}
          className={`flex items-center gap-2 px-7 py-3 text-white font-semibold rounded-xl text-sm shadow-lg transition-all ${
            googleStatus.connected
              ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
              : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
          }`}
        >
          {googleStatus.connected ? (
            <>
              <Send className="w-4 h-4" />
              <span>Send Emails</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4" />
              <span>Connect Google to Send</span>
            </>
          )}
        </button>
      </div>

      {/* Confirmation Dialog */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-base font-semibold">Confirm Bulk Email</h3>
              <button onClick={() => setIsConfirmOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-700">
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-900 font-medium">
                You are about to launch a bulk campaign to <strong>{selectedEmployees.length} recipients</strong>.
              </div>

              <div className="space-y-2 border-y border-slate-100 py-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Sender Account:</span>
                  <span className="font-semibold text-slate-900">{senderEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Recipients:</span>
                  <span className="font-semibold text-slate-900">{selectedEmployees.length} individual emails</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">CC Recipient:</span>
                  <span className="font-semibold text-slate-900">{campaignDraft.cc_recipients || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">BCC Recipient:</span>
                  <span className="font-semibold text-slate-900">{campaignDraft.bcc_recipients || '0'}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                Emails will be sent individually from your connected email account. Each status will be logged in real-time.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsConfirmOpen(false)}
                disabled={sending}
                className="px-4 py-2 text-slate-700 font-semibold hover:bg-slate-200 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAndSend}
                disabled={sending}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-md disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sending ? 'Queueing Campaign...' : 'Confirm & Send'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

