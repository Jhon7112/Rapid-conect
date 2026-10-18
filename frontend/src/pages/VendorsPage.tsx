import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  RotateCcw,
  Send,
  Edit2,
  Trash2,
  CheckSquare,
  Square,
  Plus,
  Building2,
  Phone,
  MessageSquare,
  Mail,
  UserCheck,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Employee } from '../types';
import { fetchEmployees, createEmployee, deleteEmployee, bulkDeleteEmployees, clearAllEmployees } from '../api';
import { useApp } from '../context/AppContext';
import { EditVendorModal } from '../components/EditVendorModal';
import { BulkImportModal } from '../components/BulkImportModal';

export const VendorsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    selectedEmployees,
    toggleSelectEmployee,
    selectAllEmployees,
    clearSelection,
    isEmployeeSelected,
    resetCampaignDraft
  } = useApp();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [companies, setCompanies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [page, setPage] = useState(1);

  // Modals
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [createErrorMsg, setCreateErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [newEmp, setNewEmp] = useState({
    employee_name: '',
    email_id: '',
    company_name: '',
    contact_number: '',
    whatsapp_number: '',
    job_title: '',
  });

  const loadData = () => {
    setLoading(true);
    fetchEmployees({
      search: searchTerm,
      company: selectedCompany,
      status: selectedStatus,
      page,
      limit: 20
    })
      .then(res => {
        setEmployees(res.items);
        setTotal(res.total);
        setCompanies(res.companies);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [searchTerm, selectedCompany, selectedStatus, page]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCompany('All');
    setSelectedStatus('All');
    setPage(1);
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateErrorMsg('');
    try {
      await createEmployee(newEmp);
      setIsCreateOpen(false);
      setNewEmp({
        employee_name: '',
        email_id: '',
        company_name: '',
        contact_number: '',
        whatsapp_number: '',
        job_title: '',
      });
      setToastMsg({ type: 'success', text: 'Vendor record added successfully!' });
      setTimeout(() => setToastMsg(null), 4000);
      loadData();
    } catch (err: any) {
      const errMsg = err.message || 'Vendor already existed';
      setCreateErrorMsg(errMsg);
      setToastMsg({ type: 'error', text: errMsg });
      setTimeout(() => setToastMsg(null), 5000);
    }
  };

  const handleDeleteEmployee = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete vendor "${name}"?`)) {
      try {
        await deleteEmployee(id);
        loadData();
      } catch (err) {
        alert('Failed to delete vendor');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedEmployees.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedEmployees.length} selected vendor(s)?`)) {
      try {
        await bulkDeleteEmployees(selectedEmployees.map(e => e.id));
        clearSelection();
        loadData();
      } catch (err) {
        alert('Failed to delete selected vendors');
      }
    }
  };

  const handleExportExcel = (recordsToExport?: Employee[]) => {
    const list = selectedEmployees.length > 0 ? selectedEmployees : (recordsToExport || employees);
    if (!list || list.length === 0) {
      alert('No vendor records available to export.');
      return;
    }

    const exportData = list.map((emp, index) => ({
      'SR. NO': index + 1,
      'VENDOR NAME': emp.employee_name || '',
      'EMAIL ID': emp.email_id || '',
      'COMPANY NAME': emp.company_name || '',
      'CONTACT NUMBER': emp.contact_number || '',
      'WHATSAPP NUMBER': emp.whatsapp_number || '',
      'JOB TITLE': emp.job_title || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Vendors');

    worksheet['!cols'] = [
      { wch: 8 },  // SR. NO
      { wch: 25 }, // VENDOR NAME
      { wch: 30 }, // EMAIL ID
      { wch: 25 }, // COMPANY NAME
      { wch: 18 }, // CONTACT NUMBER
      { wch: 18 }, // WHATSAPP NUMBER
      { wch: 20 }  // JOB TITLE
    ];

    const timestamp = new Date().toISOString().slice(0, 10);
    const countLabel = selectedEmployees.length > 0 ? `${selectedEmployees.length}_Selected` : 'All';
    const filename = `Rapid_Conect_Vendors_${countLabel}_${timestamp}.xlsx`;

    XLSX.writeFile(workbook, filename);
  };

  const allVisibleSelected = employees.length > 0 && employees.every(emp => isEmployeeSelected(emp.id));

  // Render NA fallback badge for null/empty values
  const renderValueOrNA = (val?: string | null) => {
    if (!val || val.trim() === '' || val === 'null' || val === 'undefined' || val === 'None') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-400 border border-slate-200 select-none">
          NA
        </span>
      );
    }
    return <span className="text-slate-700 font-medium">{val}</span>;
  };

  const handleCloseCreateModal = () => {
    setIsCreateOpen(false);
    setCreateErrorMsg('');
    setNewEmp({
      employee_name: '',
      email_id: '',
      company_name: '',
      contact_number: '',
      whatsapp_number: '',
      job_title: '',
    });
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification Banner */}
      {toastMsg && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-md animate-fade-in ${
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Vendors</h1>
          <p className="text-sm text-slate-500">
            Manage vendor records, edit missing fields, and select recipients for bulk email campaigns.
          </p>
        </div>

        <div className="flex flex-row items-center gap-3 shrink-0">
          <button
            onClick={() => { setIsCreateOpen(true); setCreateErrorMsg(''); }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-all shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vendor</span>
          </button>

          <button
            onClick={() => setIsBulkImportOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium transition-all shadow-xs whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Bulk Import</span>
          </button>

          <button
            onClick={() => handleExportExcel()}
            className="flex items-center gap-2 px-4 py-2 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-sm font-medium transition-all shadow-xs whitespace-nowrap"
            title="Export vendor records to Excel file (.xlsx)"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>{selectedEmployees.length > 0 ? `Export Excel (${selectedEmployees.length})` : 'Export Excel'}</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search vendors by name, email, or company..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Company Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedCompany}
              onChange={e => { setSelectedCompany(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="All">All Companies ({companies.length})</option>
              {companies.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        {/* Selection Bar Header */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-900 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-100 text-indigo-700">
              {selectedEmployees.length} selected
            </span>

            {selectedEmployees.length > 0 && (
              <>
                <button
                  onClick={clearSelection}
                  className="text-slate-500 hover:text-rose-600 underline font-medium"
                >
                  Clear selection
                </button>

                <button
                  onClick={() => handleExportExcel()}
                  className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold border border-emerald-300 bg-emerald-50 px-2 py-1 rounded hover:bg-emerald-100 transition-colors ml-1"
                  title="Export selected vendors to Excel file (.xlsx)"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export Selected ({selectedEmployees.length})</span>
                </button>

                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1 text-rose-600 hover:text-rose-700 font-semibold border border-rose-200 bg-rose-50 px-2 py-1 rounded hover:bg-rose-100 transition-colors ml-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedEmployees.length})</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400">Total Records: {total}</span>
            <button
              onClick={() => {
                resetCampaignDraft();
                navigate('/email-campaigns/compose');
              }}
              disabled={selectedEmployees.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold shadow transition-all ${
                selectedEmployees.length > 0
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Compose Email ({selectedEmployees.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Vendor Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
                <th className="p-3.5 w-12 text-center">
                  <button
                    onClick={() => selectAllEmployees(employees)}
                    className="text-slate-500 hover:text-indigo-600 transition-colors"
                  >
                    {allVisibleSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600 fill-indigo-50" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="p-3.5 w-16">Sr. No</th>
                <th className="p-3.5">Vendor Name</th>
                <th className="p-3.5">Email ID</th>
                <th className="p-3.5">Company Name</th>
                <th className="p-3.5">Contact Number</th>
                <th className="p-3.5">WhatsApp Number</th>
                <th className="p-3.5 w-20 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    Loading vendors...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 font-medium">
                    No vendors found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                employees.map((emp, index) => {
                  const isSelected = isEmployeeSelected(emp.id);
                  return (
                    <tr
                      key={emp.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-indigo-50/30' : ''
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => toggleSelectEmployee(emp)}
                          className="text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600 fill-indigo-50" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </td>
                      <td className="p-3.5 font-medium text-slate-500">
                        {(page - 1) * 20 + index + 1}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-900">
                        {emp.employee_name}
                      </td>
                      <td className="p-3.5 text-slate-600 font-mono text-[11px]">
                        {emp.email_id}
                      </td>
                      <td className="p-3.5">
                        {renderValueOrNA(emp.company_name)}
                      </td>
                      <td className="p-3.5">
                        {renderValueOrNA(emp.contact_number)}
                      </td>
                      <td className="p-3.5">
                        {renderValueOrNA(emp.whatsapp_number)}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setEditingEmployee(emp)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title="Edit Vendor"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(emp.id, emp.employee_name)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Delete Vendor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Vendor Modal */}
      <EditVendorModal
        employee={editingEmployee}
        isOpen={Boolean(editingEmployee)}
        onClose={() => setEditingEmployee(null)}
        onSaved={() => loadData()}
      />

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-y-0 right-0 left-0 md:left-64 z-40 flex items-center justify-center bg-slate-900/15 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200/80 w-full max-w-lg overflow-hidden transform transition-all">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h2 className="text-base font-semibold">Add New Vendor</h2>
              <button onClick={handleCloseCreateModal} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateEmployee} className="p-6 space-y-4">
              {createErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold">!</span>
                  <span>{createErrorMsg}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Vendor Name *</label>
                <input
                  type="text"
                  required
                  value={newEmp.employee_name}
                  onChange={e => setNewEmp({ ...newEmp, employee_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email ID *</label>
                <input
                  type="email"
                  required
                  value={newEmp.email_id}
                  onChange={e => setNewEmp({ ...newEmp, email_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={newEmp.company_name}
                    onChange={e => setNewEmp({ ...newEmp, company_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Job Title</label>
                  <input
                    type="text"
                    value={newEmp.job_title}
                    onChange={e => setNewEmp({ ...newEmp, job_title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Contact Number</label>
                  <input
                    type="text"
                    value={newEmp.contact_number}
                    onChange={e => setNewEmp({ ...newEmp, contact_number: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">WhatsApp Number</label>
                  <input
                    type="text"
                    value={newEmp.whatsapp_number}
                    onChange={e => setNewEmp({ ...newEmp, whatsapp_number: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t">
                <button type="button" onClick={handleCloseCreateModal} className="px-4 py-2 text-sm">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg font-medium">Add Vendor</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
};
