import React, { useState, useEffect } from 'react';
import { X, Save, Building2, User, Mail, Phone, MessageSquare, Briefcase } from 'lucide-react';
import { Employee } from '../types';
import { updateEmployee } from '../api';

interface EditVendorModalProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updated: Employee) => void;
}

export const EditVendorModal: React.FC<EditVendorModalProps> = ({
  employee,
  isOpen,
  onClose,
  onSaved,
}) => {
  const [formData, setFormData] = useState({
    employee_name: '',
    email_id: '',
    company_name: '',
    contact_number: '',
    whatsapp_number: '',
    job_title: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (employee) {
      setFormData({
        employee_name: employee.employee_name || '',
        email_id: employee.email_id || '',
        company_name: employee.company_name || '',
        contact_number: employee.contact_number || '',
        whatsapp_number: employee.whatsapp_number || '',
        job_title: employee.job_title || '',
      });
    }
  }, [employee]);

  if (!isOpen || !employee) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await updateEmployee(employee.id, formData);
      onSaved(updated);
      onClose();
    } catch (err) {
      alert('Failed to update vendor details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAndClose = () => {
    if (employee) {
      setFormData({
        employee_name: employee.employee_name || '',
        email_id: employee.email_id || '',
        company_name: employee.company_name || '',
        contact_number: employee.contact_number || '',
        whatsapp_number: employee.whatsapp_number || '',
        job_title: employee.job_title || '',
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-y-0 right-0 left-0 md:left-64 z-40 flex items-center justify-center bg-slate-900/15 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200/80 w-full max-w-lg overflow-hidden transform transition-all">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Edit Vendor Details</h2>
            <p className="text-xs text-slate-300">Update vendor records or contact details</p>
          </div>
          <button
            onClick={handleCancelAndClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Vendor Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={formData.employee_name}
                onChange={e => setFormData({ ...formData, employee_name: e.target.value })}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Email ID *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={formData.email_id}
                onChange={e => setFormData({ ...formData, email_id: e.target.value })}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Company Name *
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Enter Company Name"
                  value={formData.company_name}
                  onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Job Title
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="NA (Enter Title)"
                  value={formData.job_title}
                  onChange={e => setFormData({ ...formData, job_title: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Contact Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="NA (Enter Contact)"
                  value={formData.contact_number}
                  onChange={e => setFormData({ ...formData, contact_number: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                WhatsApp Number
              </label>
              <div className="relative">
                <MessageSquare className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="NA (Enter WhatsApp)"
                  value={formData.whatsapp_number}
                  onChange={e => setFormData({ ...formData, whatsapp_number: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCancelAndClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
