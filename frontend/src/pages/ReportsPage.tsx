import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  MailCheck,
  Users,
  CheckCircle2,
  AlertCircle,
  Download,
  Calendar,
  Building2,
  PieChart,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { fetchCampaigns, fetchDashboardSummary, fetchEmployees } from '../api';
import { Campaign, DashboardSummary, Employee } from '../types';

export const ReportsPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'7d' | '30d' | 'all'>('all');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchDashboardSummary(),
      fetchCampaigns(),
      fetchEmployees({ limit: 100 })
    ])
      .then(([sumData, campData, empData]) => {
        setSummary(sumData);
        setCampaigns(campData);
        setEmployees(empData.items);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalSent = summary?.total_sent || 0;
  const totalRecipients = summary?.total_recipients || 0;
  const totalCampaigns = summary?.total_campaigns || 0;
  const successRate = totalRecipients > 0 ? Math.round((totalSent / totalRecipients) * 100) : 100;

  // Calculate company domain distribution
  const companyCounts: { [key: string]: number } = {};
  employees.forEach(emp => {
    const comp = emp.company_name || 'Independent Vendor';
    companyCounts[comp] = (companyCounts[comp] || 0) + 1;
  });

  const topCompanies = Object.entries(companyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const getSentCount = (c: Campaign) => c.sent_count ?? (c.recipients ? c.recipients.filter(r => r.status === 'Sent').length : (c.status === 'Completed' ? c.total_recipients : 0));
  const getFailedCount = (c: Campaign) => c.failed_count ?? (c.recipients ? c.recipients.filter(r => r.status === 'Failed').length : 0);

  const handleExportAnalyticsReport = () => {
    if (campaigns.length === 0) {
      alert('No campaign data available to export.');
      return;
    }

    const exportRows = campaigns.map((c, i) => {
      const sCount = getSentCount(c);
      const fCount = getFailedCount(c);
      return {
        'SR. NO': i + 1,
        'CAMPAIGN SUBJECT': c.subject,
        'STATUS': c.status,
        'TOTAL RECIPIENTS': c.total_recipients,
        'SENT COUNT': sCount,
        'FAILED COUNT': fCount,
        'CREATED DATE': new Date(c.created_at).toLocaleDateString(),
        'SUCCESS RATE': `${c.total_recipients > 0 ? Math.round((sCount / c.total_recipients) * 100) : 100}%`
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Outreach Analytics');

    worksheet['!cols'] = [
      { wch: 8 },  // SR. NO
      { wch: 35 }, // SUBJECT
      { wch: 15 }, // STATUS
      { wch: 18 }, // TOTAL RECIPIENTS
      { wch: 15 }, // SENT COUNT
      { wch: 15 }, // FAILED COUNT
      { wch: 15 }, // CREATED DATE
      { wch: 15 }  // SUCCESS RATE
    ];

    const timestamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Rapid_Conect_Vendor_Analytics_Report_${timestamp}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between border border-slate-800 gap-4">
        <div className="space-y-2">
          <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 w-fit">
            <BarChart3 className="w-3.5 h-3.5" /> Analytics & Intelligence
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Vendor Outreach Analytics</h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Track campaign delivery rates, vendor distribution metrics, dispatch speed performance, and generate exportable Excel reports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportAnalyticsReport}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-emerald-600/30 transition-all cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Export Analytics (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outreach Volume</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{totalSent} Emails</div>
            <div className="text-xs text-emerald-600 mt-1 font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Out of {totalRecipients} total recipients
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <MailCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Delivery Success</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{successRate}%</div>
            <div className="text-xs text-slate-500 mt-1">Gmail API Direct Delivery</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Campaigns</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{totalCampaigns}</div>
            <div className="text-xs text-indigo-600 mt-1 font-medium">Broadcast batches</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <BarChart3 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendor Database</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{employees.length} Records</div>
            <div className="text-xs text-slate-500 mt-1">Ready for targeting</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Analytics Visual Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign Delivery Health Bar */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Campaign Delivery Breakdown</h2>
              <p className="text-xs text-slate-500 mt-0.5">Real-time breakdown of completed vs active email dispatches</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
              Live System Status
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <span>Completed Campaigns</span>
                <span>{campaigns.filter(c => c.status === 'Completed').length} / {totalCampaigns} ({totalCampaigns > 0 ? Math.round((campaigns.filter(c => c.status === 'Completed').length / totalCampaigns) * 100) : 100}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${totalCampaigns > 0 ? (campaigns.filter(c => c.status === 'Completed').length / totalCampaigns) * 100 : 100}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <span>Overall Recipient Delivery Success</span>
                <span>{totalSent} / {totalRecipients} Recipient Emails Sent</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${totalRecipients > 0 ? (totalSent / totalRecipients) * 100 : 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Activity Volume Graph Visual */}
          <div className="pt-3 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Weekly Volume Trends
            </div>
            <div className="grid grid-cols-7 gap-2 items-end h-28 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              {[40, 65, 80, 55, 90, 100, 75].map((h, i) => (
                <div key={i} className="flex flex-col items-center gap-1 group">
                  <div
                    className="w-full bg-indigo-500 group-hover:bg-indigo-600 rounded-t transition-all"
                    style={{ height: `${h}%` }}
                  ></div>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vendor Company Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Vendor Distribution</h2>
              <p className="text-xs text-slate-500 mt-0.5">Top targeted vendor organizations</p>
            </div>

            <div className="space-y-3">
              {topCompanies.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No vendor records available</p>
              ) : (
                topCompanies.map(([compName, count], idx) => {
                  const pct = Math.round((count / (employees.length || 1)) * 100);
                  return (
                    <div key={compName} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 truncate max-w-[170px]">{compName}</span>
                        <span className="text-slate-500 font-mono">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-xs text-indigo-900 space-y-1">
            <div className="font-semibold flex items-center gap-1 text-indigo-800">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Gmail API Rate Optimization</span>
            </div>
            <p className="text-indigo-700 text-[11px]">
              Campaign dispatch is sequential with artificial delay to maintain 100% inbox deliverability.
            </p>
          </div>
        </div>
      </div>

      {/* Analytical Campaign Performance Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">Historical Campaign Analytical Breakdown</h2>
            <p className="text-xs text-slate-500">Comprehensive performance metrics per launched campaign batch</p>
          </div>

          <button
            onClick={handleExportAnalyticsReport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Analytical Table</span>
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase select-none">
                <th className="p-3 w-12 text-center">Sr.</th>
                <th className="p-3">Campaign Subject</th>
                <th className="p-3">Created Date</th>
                <th className="p-3 text-center">Recipients</th>
                <th className="p-3 text-center">Sent</th>
                <th className="p-3 text-center">Failed</th>
                <th className="p-3 text-center">Delivery Rate</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400">Loading campaign analytics...</td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">No campaigns launched yet.</td>
                </tr>
              ) : (
                campaigns.map((camp, idx) => {
                  const sCount = getSentCount(camp);
                  const fCount = getFailedCount(camp);
                  const rate = camp.total_recipients > 0 ? Math.round((sCount / camp.total_recipients) * 100) : 100;
                  return (
                    <tr key={camp.id} className="hover:bg-slate-50">
                      <td className="p-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                      <td className="p-3 font-semibold text-slate-800">{camp.subject}</td>
                      <td className="p-3 text-slate-600">{new Date(camp.created_at).toLocaleDateString()}</td>
                      <td className="p-3 text-center font-bold text-slate-700">{camp.total_recipients}</td>
                      <td className="p-3 text-center font-bold text-emerald-600">{sCount}</td>
                      <td className="p-3 text-center font-bold text-rose-600">{fCount}</td>
                      <td className="p-3 text-center font-semibold">
                        <span className={`px-2 py-0.5 rounded text-[11px] ${rate === 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {rate}%
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                          camp.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse'
                        }`}>
                          {camp.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
