import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MailCheck,
  Plus,
  ArrowRight,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  RefreshCw,
  Building2,
  User,
  Mail
} from 'lucide-react';
import { Campaign, CampaignRecipient } from '../types';
import { fetchCampaigns, fetchCampaign, retryRecipient } from '../api';

export const CampaignsPage: React.FC = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal State
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [modalCampaign, setModalCampaign] = useState<Campaign | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [retryingRecipientId, setRetryingRecipientId] = useState<string | null>(null);
  const [modalPage, setModalPage] = useState(1);
  const modalItemsPerPage = 5;

  const loadCampaigns = () => {
    setLoading(true);
    fetchCampaigns()
      .then(res => {
        setCampaigns(res);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  // Poll main campaigns list if any campaign is currently sending
  useEffect(() => {
    const isAnySending = campaigns.some(
      c => c.status === 'Sending' || c.status === 'Queued'
    );
    if (!isAnySending) return;

    const interval = setInterval(() => {
      fetchCampaigns().then(setCampaigns).catch(console.error);
    }, 2500);

    return () => clearInterval(interval);
  }, [campaigns]);

  // Load detailed campaign for modal
  const loadModalCampaignDetails = (id: string) => {
    setModalLoading(true);
    fetchCampaign(id)
      .then(res => setModalCampaign(res))
      .catch(console.error)
      .finally(() => setModalLoading(false));
  };

  const handleOpenVendorModal = (campaignId: string) => {
    setModalPage(1);
    setSelectedCampaignId(campaignId);
    loadModalCampaignDetails(campaignId);
  };

  const handleCloseVendorModal = () => {
    setSelectedCampaignId(null);
    setModalCampaign(null);
  };

  // Poll modal details if status is sending/queued
  useEffect(() => {
    if (!selectedCampaignId || !modalCampaign) return;
    if (
      modalCampaign.status !== 'Sending' &&
      modalCampaign.status !== 'Queued' &&
      modalCampaign.status !== 'Draft'
    )
      return;

    const interval = setInterval(() => {
      fetchCampaign(selectedCampaignId)
        .then(setModalCampaign)
        .catch(console.error);
    }, 1500);

    return () => clearInterval(interval);
  }, [selectedCampaignId, modalCampaign?.status]);

  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isRateLimitError = (errMsg?: string | null) => {
    if (!errMsg) return false;
    const lower = errMsg.toLowerCase();
    return lower.includes('rate limit') || lower.includes('quota') || lower.includes('429') || lower.includes('limitexceeded');
  };

  const handleRetryRecipient = async (recipientId: string) => {
    setRetryingRecipientId(recipientId);
    try {
      await retryRecipient(recipientId);
      setToastMsg({ type: 'success', text: 'Email retry queued successfully!' });
      setTimeout(() => setToastMsg(null), 4000);
      if (selectedCampaignId) {
        loadModalCampaignDetails(selectedCampaignId);
      }
    } catch (err: any) {
      const errorText = err.message || 'Failed to retry email delivery';
      if (isRateLimitError(errorText)) {
        setToastMsg({
          type: 'error',
          text: '⚠️ Rate Limit Exceeded: Gmail daily email sending quota reached for your Google account. Please try again later.'
        });
      } else {
        setToastMsg({ type: 'error', text: errorText });
      }
      setTimeout(() => setToastMsg(null), 6000);
    } finally {
      setRetryingRecipientId(null);
    }
  };

  // Helper date/time formatters
  const formatDate = (isoString: string) => {
    if (!isoString) return 'NA';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return 'NA';
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderValueOrNA = (val?: string | null) => {
    if (!val || val.trim() === '' || val === 'null' || val === 'undefined' || val === 'None' || val === 'NA') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-400 border border-slate-200 select-none">
          NA
        </span>
      );
    }
    return <span className="text-slate-700 font-medium">{val}</span>;
  };

  const getVendorDisplayName = (rec: CampaignRecipient) => {
    if (rec.employee?.employee_name && rec.employee.employee_name.trim() !== '') {
      return rec.employee.employee_name;
    }
    const emailPrefix = (rec.recipient_email || '').split('@')[0];
    if (!emailPrefix) return 'Vendor Record';
    return emailPrefix
      .split(/[._-]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Pagination calculations
  const totalRecords = campaigns.length;
  const totalPages = Math.ceil(totalRecords / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCampaigns = campaigns.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Completed</span>
          </span>
        );
      case 'Completed With Errors':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Completed With Errors</span>
          </span>
        );
      case 'Sending':
      case 'Queued':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
            <RotateCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            <span>Sending...</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{status || 'Draft'}</span>
          </span>
        );
    }
  };

  const renderRecipientBadge = (status: CampaignRecipient['status']) => {
    switch (status) {
      case 'Sent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Sent</span>
          </span>
        );
      case 'Sending':
      case 'Retrying':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
            <RotateCw className="w-3 h-3 text-blue-600 animate-spin" />
            <span>{status === 'Retrying' ? 'Retrying...' : 'Sending...'}</span>
          </span>
        );
      case 'Failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Pending</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMsg && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-lg animate-fade-in z-[60] relative ${
            toastMsg.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-current opacity-20 flex items-center justify-center font-bold text-[10px]">
              {toastMsg.type === 'error' ? '!' : '✓'}
            </span>
            <span>{toastMsg.text}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="font-bold hover:opacity-75">✕</button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Email Campaigns</h1>
          <p className="text-sm text-slate-500">
            History and real-time status of all bulk email campaigns launched by your account.
          </p>
        </div>

        <button
          onClick={() => navigate('/employees')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Bulk Campaign</span>
        </button>
      </div>

      {/* Main Campaigns Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none whitespace-nowrap">
                <th className="px-3.5 py-3 w-14 text-center">Sr. No</th>
                <th className="px-3.5 py-3 min-w-[220px]">Campaign Subject</th>
                <th className="px-3.5 py-3 w-28">Sent Date</th>
                <th className="px-3.5 py-3 w-28">Sent Time</th>
                <th className="px-3.5 py-3 w-28 text-center">Recipients</th>
                <th className="px-3.5 py-3 w-40">Delivery Status</th>
                <th className="px-3.5 py-3 w-32 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 font-medium">
                    Loading email campaign records...
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="max-w-xs mx-auto space-y-3">
                      <MailCheck className="w-10 h-10 text-slate-300 mx-auto" />
                      <div className="text-sm font-semibold text-slate-700">No campaigns launched yet</div>
                      <button
                        onClick={() => navigate('/employees')}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold shadow hover:bg-indigo-700 transition-colors"
                      >
                        Select Vendors & Compose
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                currentCampaigns.map((camp, index) => {
                  const srNo = indexOfFirstItem + index + 1;
                  return (
                    <tr key={camp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-3 text-center font-medium text-slate-500">{srNo}</td>
                      <td className="px-3.5 py-3 font-semibold text-slate-900" title={camp.subject}>
                        <div className="truncate max-w-xs sm:max-w-md hover:text-indigo-600 transition-colors cursor-pointer" title={camp.subject}>
                          {camp.subject}
                        </div>
                      </td>
                      <td className="px-3.5 py-3 text-slate-600 font-medium whitespace-nowrap">
                        {formatDate(camp.created_at)}
                      </td>
                      <td className="px-3.5 py-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {formatTime(camp.created_at)}
                      </td>
                      <td className="px-3.5 py-3 text-center whitespace-nowrap">
                        <span className="inline-block px-2.5 py-0.5 rounded font-bold text-xs bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                          {camp.total_recipients}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        {renderStatusBadge(camp.status)}
                      </td>
                      <td className="px-3.5 py-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleOpenVendorModal(camp.id)}
                          className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition-colors shadow-xs"
                          title="View Campaign Vendors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && campaigns.length > 0 && (
          <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 select-none">
            <div>
              Showing <span className="font-semibold text-slate-900">{indexOfFirstItem + 1}</span> to{' '}
              <span className="font-semibold text-slate-900">
                {Math.min(indexOfLastItem, totalRecords)}
              </span>{' '}
              of <span className="font-semibold text-slate-900">{totalRecords}</span> campaigns
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-medium hover:bg-slate-100 text-slate-700 disabled:opacity-40 disabled:hover:bg-white transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`w-8 h-8 rounded-lg font-semibold transition-all ${
                    currentPage === page
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-medium hover:bg-slate-100 text-slate-700 disabled:opacity-40 disabled:hover:bg-white transition-all"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Campaign Vendors Modal */}
      {selectedCampaignId && (
        <div className="fixed inset-y-0 right-0 left-0 md:left-64 z-40 flex items-center justify-center bg-slate-900/15 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200/80 w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden transform transition-all">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <span>Campaign Vendors</span>
                  {modalCampaign && (
                    <span className="text-[11px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-normal">
                      {modalCampaign.recipients?.length || 0} Total Recipients
                    </span>
                  )}
                </h2>
              </div>
              <button
                onClick={handleCloseVendorModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3">
              {modalLoading && !modalCampaign ? (
                <div className="py-12 text-center text-slate-400 font-medium">
                  Loading campaign vendors details...
                </div>
              ) : modalCampaign ? (
                <>
                  {/* Compact Summary Bar */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between shadow-xs">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total</span>
                      <span className="text-sm font-bold text-slate-900">{modalCampaign.total_recipients}</span>
                    </div>
                    <div className="px-3 py-2 bg-emerald-50/80 border border-emerald-200/80 rounded-lg flex items-center justify-between shadow-xs">
                      <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Sent</span>
                      <span className="text-sm font-bold text-emerald-800">
                        {modalCampaign.recipients?.filter(r => r.status === 'Sent').length || 0}
                      </span>
                    </div>
                    <div className="px-3 py-2 bg-rose-50/80 border border-rose-200/80 rounded-lg flex items-center justify-between shadow-xs">
                      <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">Failed</span>
                      <span className="text-sm font-bold text-rose-800">
                        {modalCampaign.recipients?.filter(r => r.status === 'Failed').length || 0}
                      </span>
                    </div>
                  </div>

                  {/* Rate Limit Alert Banner */}
                  {modalCampaign.recipients?.some(r => isRateLimitError(r.last_error)) && (
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>⚠️ Rate Limit Exceeded: Gmail daily email sending quota reached for your Google account. Please wait before retrying remaining emails.</span>
                    </div>
                  )}

                  {/* Vendor Table */}
                  {(() => {
                    const modalRecipients = modalCampaign.recipients || [];
                    const modalTotalRecords = modalRecipients.length;
                    const modalTotalPages = Math.ceil(modalTotalRecords / modalItemsPerPage) || 1;
                    const modalIndexOfLastItem = modalPage * modalItemsPerPage;
                    const modalIndexOfFirstItem = modalIndexOfLastItem - modalItemsPerPage;
                    const currentModalRecipients = modalRecipients.slice(modalIndexOfFirstItem, modalIndexOfLastItem);

                    return (
                      <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none whitespace-nowrap">
                              <th className="px-3 py-2.5 w-12 text-center">Sr. No</th>
                              <th className="px-3 py-2.5">Vendor Name</th>
                              <th className="px-3 py-2.5">Email ID</th>
                              <th className="px-3 py-2.5">Company Name</th>
                              <th className="px-3 py-2.5 w-36">Delivery Status</th>
                              <th className="px-3 py-2.5 w-28 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {modalTotalRecords === 0 ? (
                              <tr>
                                <td colSpan={6} className="p-6 text-center text-slate-400 font-medium">
                                  No vendors recorded for this campaign.
                                </td>
                              </tr>
                            ) : (
                              currentModalRecipients.map((rec, idx) => (
                                <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="px-3 py-2.5 text-center text-slate-500 font-medium">
                                    {modalIndexOfFirstItem + idx + 1}
                                  </td>
                                  <td className="px-3 py-2.5 font-semibold text-slate-900">
                                    {getVendorDisplayName(rec)}
                                  </td>
                                  <td className="px-3 py-2.5 text-slate-600 font-mono text-[11px]">
                                    {rec.employee?.email_id || rec.recipient_email}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    {renderValueOrNA(rec.employee?.company_name)}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    {renderRecipientBadge(rec.status)}
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    {rec.status === 'Failed' ? (
                                      <button
                                        onClick={() => handleRetryRecipient(rec.id)}
                                        disabled={retryingRecipientId === rec.id}
                                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded transition-colors shadow-xs mx-auto disabled:opacity-50"
                                      >
                                        <RefreshCw className={`w-3 h-3 ${retryingRecipientId === rec.id ? 'animate-spin' : ''}`} />
                                        <span>Retry</span>
                                      </button>
                                    ) : (
                                      <span className="text-slate-400 text-[11px]">—</span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>

                        {/* Modal Pagination Footer */}
                        {modalTotalRecords > 0 && (
                          <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-600 select-none">
                            <div>
                              Showing <span className="font-semibold text-slate-900">{modalIndexOfFirstItem + 1}</span> to{' '}
                              <span className="font-semibold text-slate-900">
                                {Math.min(modalIndexOfLastItem, modalTotalRecords)}
                              </span>{' '}
                              of <span className="font-semibold text-slate-900">{modalTotalRecords}</span> vendors
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setModalPage(p => Math.max(1, p - 1))}
                                disabled={modalPage === 1}
                                className="px-2 py-0.5 border border-slate-200 rounded-md bg-white font-medium hover:bg-slate-100 text-slate-700 disabled:opacity-40 text-[11px] transition-all"
                              >
                                Previous
                              </button>

                              {Array.from({ length: modalTotalPages }, (_, i) => i + 1).map(page => (
                                <button
                                  key={page}
                                  onClick={() => setModalPage(page)}
                                  className={`w-6 h-6 rounded-md font-semibold text-[11px] transition-all ${
                                    modalPage === page
                                      ? 'bg-indigo-600 text-white shadow-xs'
                                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  {page}
                                </button>
                              ))}

                              <button
                                onClick={() => setModalPage(p => Math.min(modalTotalPages, p + 1))}
                                disabled={modalPage === modalTotalPages}
                                className="px-2 py-0.5 border border-slate-200 rounded-md bg-white font-medium hover:bg-slate-100 text-slate-700 disabled:opacity-40 text-[11px] transition-all"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
              <button
                onClick={handleCloseVendorModal}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
