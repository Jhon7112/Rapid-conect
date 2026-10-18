import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Trash2,
  Edit,
  Tag,
  Users,
  Search,
  Sparkles,
  Check,
  X
} from 'lucide-react';
import { EmailTemplate, CampaignDraft } from '../types';
import { fetchTemplates, createTemplate, updateTemplate, deleteTemplate } from '../api';
import { useApp } from '../context/AppContext';

export const TemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const { setCampaignDraft } = useApp();

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'General Outreach',
    subject: '',
    body: ''
  });

  const loadTemplates = () => {
    setLoading(true);
    fetchTemplates(selectedCategory)
      .then(setTemplates)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTemplates();
  }, [selectedCategory]);

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      category: 'General Outreach',
      subject: '',
      body: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: EmailTemplate) => {
    setEditingTemplate(t);
    setFormData({
      name: t.name,
      category: t.category || 'General Outreach',
      subject: t.subject,
      body: t.body
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this email template?')) {
      await deleteTemplate(id);
      loadTemplates();
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, formData);
      } else {
        await createTemplate(formData);
      }
      setIsModalOpen(false);
      loadTemplates();
    } catch (err: any) {
      alert(err.message || 'Failed to save template');
    }
  };

  const handleUseTemplate = (t: EmailTemplate) => {
    setCampaignDraft((prev: CampaignDraft) => ({
      ...prev,
      subject: t.subject,
      body: t.body
    }));
    navigate('/employees');
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = ['All', 'Engineering', 'Data & AI', 'Follow Up', 'General Outreach'];

  const templateVariables = [
    { label: 'Employee Name', tag: '{{employee_name}}' },
    { label: 'Job Description', tag: '{{job_description}}' },
    { label: 'Job Title', tag: '{{job_title}}' },
    { label: 'Company', tag: '{{company_name}}' },
    { label: 'Logged-in Recruiter', tag: '{{loggedin_username}}' },
    { label: 'Logged-in Company', tag: '{{loggedin_user_company}}' },
    { label: 'Official Email', tag: '{{official_email}}' },
    { label: 'Company Logo', tag: '{{company_logo}}' },
    { label: 'Contact', tag: '{{contact_number}}' },
    { label: 'WhatsApp', tag: '{{whatsapp_number}}' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Vendor Email Templates</h1>
          <p className="text-sm text-slate-500">Create, manage, and reuse standardized vendor outreach templates.</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Create Email Template</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search templates by title or subject..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Category:</span>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-700 font-medium outline-none"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400 font-medium">
            Loading email templates...
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500 font-medium bg-white rounded-xl border border-slate-200">
            No templates found in this category.
          </div>
        ) : (
          filteredTemplates.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between hover:border-slate-300 transition-all space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
                    {t.category || 'General'}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(t)}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100"
                      title="Edit Template"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                      title="Delete Template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 text-sm">{t.name}</h3>

                <div className="text-xs text-slate-500 font-medium truncate">
                  <strong>Subject:</strong> {t.subject}
                </div>

                <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 font-sans line-clamp-4 leading-relaxed whitespace-pre-wrap border border-slate-100">
                  {t.body}
                </div>
              </div>

              <button
                onClick={() => handleUseTemplate(t)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Use Template in Campaign</span>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h2 className="text-sm font-bold">
                {editingTemplate ? 'Edit Email Template' : 'Create New Email Template'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Frontend Outreach"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs outline-none bg-white"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Data & AI">Data & AI</option>
                    <option value="Follow Up">Follow Up</option>
                    <option value="General Outreach">General Outreach</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Subject Line *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Opportunity — {{job_title}} at {{company_name}}"
                  value={formData.subject}
                  onChange={e => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              {/* Variable Chips Inserter */}
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-slate-500 uppercase">Insert Placeholder Variable:</div>
                <div className="flex flex-wrap gap-1">
                  {templateVariables.map(v => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, body: prev.body + v.tag }))}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 border border-slate-200 rounded text-[11px] font-medium"
                    >
                      + {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Template Body *
                </label>
                <textarea
                  required
                  rows={9}
                  placeholder="Dear {{employee_name}},&#10;&#10;Write plain text template content..."
                  value={formData.body}
                  onChange={e => setFormData({ ...formData, body: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-lg text-xs font-sans leading-relaxed text-slate-800 outline-none focus:border-indigo-500 custom-scrollbar"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  {editingTemplate ? 'Save Changes' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
