import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  Eye,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { fetchCampaignPreview, fetchTemplates } from '../api';
import { EmailTemplate, CampaignDraft } from '../types';

export const ComposePage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedEmployees, googleStatus, campaignDraft, setCampaignDraft, user } = useApp();

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [activeTemplateBody, setActiveTemplateBody] = useState<string>('');

  React.useEffect(() => {
    fetchTemplates()
      .then(fetchedTemplates => {
        setTemplates(fetchedTemplates);
        if (fetchedTemplates.length > 0) {
          const first = fetchedTemplates[0];
          setSelectedTemplateId(first.id);
          setActiveTemplateBody(first.body);
          setCampaignDraft((prev: CampaignDraft) => ({
            ...prev,
            subject: first.subject
          }));
        }
      })
      .catch(console.error);
  }, []);

  React.useEffect(() => {
    const userCc = user?.official_email || user?.email || 'namrata.pandey@tekinspirations.com';
    if (userCc) {
      setCampaignDraft((prev: CampaignDraft) => ({
        ...prev,
        cc_recipients: userCc
      }));
    }
  }, [user]);

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) {
      setActiveTemplateBody('');
      return;
    }
    const found = templates.find(t => t.id === templateId);
    if (found) {
      setActiveTemplateBody(found.body);
      setCampaignDraft((prev: CampaignDraft) => ({
        ...prev,
        subject: found.subject
      }));
    }
  };

  const sanitizeJobDescription = (text: string): string => {
    if (!text) return '';
    let cleaned = text.trim();

    // 1. Remove default intro if present at start
    cleaned = cleaned.replace(/^Hi\s+\{\{employee_name\}\}[^\n]*\n\nThis is\s+\{\{loggedin_username\}\}[^\n]*\n\n/gi, '');

    // 2. Cut off at signature / footer markers if appended
    const footerMarkers = [
      /\n\nFor quicker communication regarding this opportunity/i,
      /\n\nThanks\s*(?:&|and)?\s*Regards/i,
      /\n\nThanks regards/i,
      /\n\n\{\{company_logo\}\}/i,
      /\n\ncid:company_logo/i
    ];

    for (const marker of footerMarkers) {
      const idx = cleaned.search(marker);
      if (idx !== -1) {
        cleaned = cleaned.substring(0, idx).trim();
      }
    }

    return cleaned;
  };

  const getFullEmailPayloadBody = (jobDesc: string, templateBody?: string): string => {
    const cleanJd = sanitizeJobDescription(jobDesc);

    if (templateBody && templateBody.includes('{{job_description}}')) {
      return templateBody.replace('{{job_description}}', cleanJd);
    }

    const defaultIntro = `Hi {{employee_name}},\n\nThis is {{loggedin_username}} from {{loggedin_user_company}}. I’m reaching out regarding a Below job opportunity with our client.`;
    const defaultClosing = `For quicker communication regarding this opportunity, could you please share your WhatsApp number, if you’re comfortable doing so?\n\nThanks & Regards,\n{{loggedin_username}}\nEmail: {{official_email}}\n{{company_logo}}`;
    
    return `${defaultIntro}\n\n${cleanJd}\n\n${defaultClosing}`;
  };

  React.useEffect(() => {
    if (selectedEmployees.length === 0) {
      navigate('/employees');
    }
  }, [selectedEmployees.length, navigate]);

  const [showCcBcc, setShowCcBcc] = useState(Boolean(campaignDraft.cc_recipients || campaignDraft.bcc_recipients));
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);



  const handleOpenPreview = async () => {
    if (selectedEmployees.length === 0) {
      alert('Please select vendors first.');
      return;
    }

    setPreviewLoading(true);
    setIsPreviewOpen(true);
    try {
      const sampleEmp = selectedEmployees[0];
      const fullBody = getFullEmailPayloadBody(campaignDraft.body, activeTemplateBody);
      const res = await fetchCampaignPreview({
        employee_id: sampleEmp.id,
        subject: campaignDraft.subject,
        body: fullBody,
        cc_recipients: campaignDraft.cc_recipients,
        bcc_recipients: campaignDraft.bcc_recipients
      });
      setPreviewData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEmployees.length === 0) {
      alert('Please select vendors first!');
      navigate('/vendors');
      return;
    }
    if (!campaignDraft.subject.trim()) {
      alert('Please enter a subject line.');
      return;
    }
    if (!campaignDraft.body.trim()) {
      alert('Please enter Job Description content.');
      return;
    }
    const fullBody = getFullEmailPayloadBody(campaignDraft.body, activeTemplateBody);
    setCampaignDraft((prev: CampaignDraft) => ({
      ...prev,
      body: fullBody
    }));
    navigate('/email-campaigns/review');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Workflow Stepper Bar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between text-xs text-slate-500 font-medium">
        <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
          <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px]">✓</span>
          <span>1. Select Vendors ({selectedEmployees.length})</span>
        </div>
        <div className="h-[1px] w-6 bg-slate-200"></div>
        <div className="flex items-center gap-1.5 text-indigo-600 font-bold">
          <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
          <span>2. Compose Email</span>
        </div>
        <div className="h-[1px] w-6 bg-slate-200"></div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px]">3</span>
          <span>3. Review & Send</span>
        </div>
        <div className="h-[1px] w-6 bg-slate-200"></div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px]">4</span>
          <span>4. Status</span>
        </div>
      </div>

      {/* Email Composer Form */}
      <form onSubmit={handleProceedToReview} className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
        {/* Recipient Header Info */}
        <div className="space-y-2 pb-3 border-b border-slate-100 text-xs">
          <div className="flex items-center gap-3">
            <span className="w-12 font-semibold text-slate-500 text-right">From:</span>
            <span className="font-medium text-slate-700">
              {googleStatus.google_email || user?.email || 'recruiter.demo@gmail.com'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-12 font-semibold text-slate-500 text-right">To:</span>
            <div className="flex-1 flex items-center justify-between">
              <span className="font-medium text-slate-800">
                {selectedEmployees.length} individual vendors
              </span>

              <button
                type="button"
                onClick={() => setShowCcBcc(!showCcBcc)}
                className="text-[11px] font-semibold text-indigo-600 hover:underline flex items-center gap-1"
              >
                {showCcBcc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                <span>{showCcBcc ? 'Hide CC / BCC' : 'Add CC / BCC'}</span>
              </button>
            </div>
          </div>

          {/* Expandable CC/BCC */}
          {showCcBcc && (
            <div className="space-y-2 pt-2 pl-15">
              <div className="flex items-center gap-3">
                <span className="w-12 font-semibold text-slate-500 text-right">CC:</span>
                <input
                  type="text"
                  placeholder="e.g. hiring-manager@company.com"
                  value={campaignDraft.cc_recipients}
                  onChange={e => setCampaignDraft({ ...campaignDraft, cc_recipients: e.target.value })}
                  className="flex-1 px-3 py-1 border border-slate-300 rounded text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="w-12 font-semibold text-slate-500 text-right">BCC:</span>
                <input
                  type="text"
                  placeholder="e.g. audit@company.com"
                  value={campaignDraft.bcc_recipients}
                  onChange={e => setCampaignDraft({ ...campaignDraft, bcc_recipients: e.target.value })}
                  className="flex-1 px-3 py-1 border border-slate-300 rounded text-xs outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Template Picker Header */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <span>Load Email Template:</span>
          </div>

          <select
            value={selectedTemplateId}
            onChange={e => handleSelectTemplate(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded text-xs bg-white font-medium text-slate-800 outline-none focus:border-indigo-500"
          >
            <option value="">-- Choose from Templates ({templates.length}) --</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
            ))}
          </select>
        </div>

        {/* Subject Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Subject *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Following up: {{job_title}} opportunity"
            value={campaignDraft.subject}
            onChange={e => setCampaignDraft({ ...campaignDraft, subject: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>

        {/* Job Description Textarea Input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">
              Job Description *
            </label>
            <span className="text-[11px] text-slate-500 font-medium">
              Plain text • Exact formatting preserved
            </span>
          </div>

          <textarea
            required
            rows={11}
            placeholder="Paste or enter the job description here..."
            value={campaignDraft.body}
            onChange={e => setCampaignDraft({ ...campaignDraft, body: e.target.value })}
            className="w-full p-3 border border-slate-300 rounded-lg text-sm font-mono leading-relaxed text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none custom-scrollbar whitespace-pre-wrap"
          />
        </div>

        {/* Bottom Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/vendors')}
            className="flex items-center gap-1 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded text-xs font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Vendors</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenPreview}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>Preview Email</span>
            </button>

            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shadow-xs"
            >
              <span>Next: Review & Send</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </form>

      {/* Simple Email Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between text-xs font-semibold shrink-0">
              <span className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-400" />
                <span>Email Output Preview</span>
              </span>
              <button onClick={() => setIsPreviewOpen(false)} className="text-slate-400 hover:text-white transition-colors">✕</button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="p-5 space-y-3 text-xs text-slate-700 overflow-y-auto flex-1 custom-scrollbar">
              {previewLoading ? (
                <div className="text-center py-12 text-slate-400 font-medium">Loading preview...</div>
              ) : previewData ? (
                <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200 font-sans">
                  <div className="space-y-1.5 border-b border-slate-200 pb-3 text-[11px]">
                    <div><strong className="text-slate-500">From:</strong> <span className="font-semibold text-slate-800">{previewData.from_email}</span></div>
                    <div><strong className="text-slate-500">To:</strong> <span className="font-semibold text-slate-800">{previewData.to_name} &lt;{previewData.to_email}&gt;</span></div>
                    {previewData.cc && <div><strong className="text-slate-500">CC:</strong> <span className="font-semibold text-slate-800">{previewData.cc}</span></div>}
                    {previewData.bcc && <div><strong className="text-slate-500">BCC:</strong> <span className="font-semibold text-slate-800">{previewData.bcc}</span></div>}
                    <div><strong className="text-slate-500">Subject:</strong> <span className="font-bold text-slate-900">{previewData.subject}</span></div>
                  </div>

                  <div className="text-slate-800 pt-2 leading-relaxed text-xs font-sans">
                    {previewData.body.includes('<') && previewData.body.includes('>') ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: previewData.body.replace(/\n/g, '<br/>').replace(/(<img[^>]+>)<br\s*\/?>/gi, '$1')
                        }}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap">{previewData.body}</div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
