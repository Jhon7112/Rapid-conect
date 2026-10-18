import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertCircle, CheckCircle2, User, Building2, Briefcase, Mail, Save, Loader2, Upload, Image, Trash2, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { connectGoogle, disconnectGoogle, updateUserProfile } from '../api';

export const SettingsPage: React.FC = () => {
  const { googleStatus, refreshGoogleStatus, refreshCurrentUser, user } = useApp();
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [googleErrorMsg, setGoogleErrorMsg] = useState('');
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');
  const [logoValidationError, setLogoValidationError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [officialEmail, setOfficialEmail] = useState('');
  const [companyLogo, setCompanyLogo] = useState<string>('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setRole(user.role || '');
      setCompanyName(user.company_name || 'Reacher');
      setEmail(user.email || '');
      setOfficialEmail(user.official_email || user.email || '');
      setCompanyLogo(user.company_logo || '');
    }
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true') {
      setShowSuccessBanner(true);
      refreshGoogleStatus();
      refreshCurrentUser();
    }
    const err = params.get('google_error');
    if (err) {
      setGoogleErrorMsg(decodeURIComponent(err));
    }
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoValidationError('');
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. File Type Validation (Email clients like Gmail/Outlook do not support SVG images)
    if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
      setLogoValidationError('SVG files are not supported by email providers (Gmail, Outlook). Please upload a PNG, JPG, JPEG, or WebP logo.');
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    const isImage = file.type.startsWith('image/') || allowedTypes.includes(file.type.toLowerCase());
    if (!isImage) {
      setLogoValidationError('Invalid file format. Please upload a PNG, JPG, JPEG, or WebP image.');
      return;
    }

    // 2. File Size Validation (2 MB limit)
    const MAX_SIZE_BYTES = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      setLogoValidationError(`File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds 2 MB limit. Please select a smaller logo.`);
      return;
    }

    // Convert file to Base64 Data URL for preview and backend storage
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCompanyLogo(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setCompanyLogo('');
    setLogoValidationError('');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setProfileSuccessMsg('');
    setProfileErrorMsg('');

    try {
      await updateUserProfile({
        name: name.trim(),
        role: role.trim(),
        company_name: companyName.trim(),
        official_email: officialEmail.trim(),
        company_logo: companyLogo
      });
      await refreshCurrentUser();
      setProfileSuccessMsg('Profile & Company settings updated successfully!');
      setTimeout(() => setProfileSuccessMsg(''), 4000);
    } catch (err: any) {
      setProfileErrorMsg(err.message || 'Failed to update profile settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnect = async () => {
    try {
      const authUrl = await connectGoogle();
      window.location.href = authUrl;
    } catch (e) {
      alert('Failed to initiate Google OAuth consent flow');
    }
  };

  const handleDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect your Google account?')) {
      await disconnectGoogle();
      refreshGoogleStatus();
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Account & Branding Settings</h1>
        <p className="text-sm text-slate-500">Manage your recruiter profile details, company logo, and connected email account.</p>
      </div>

      {showSuccessBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between">
          <span>✓ Authorization successfully completed! Your email account is connected.</span>
          <button onClick={() => setShowSuccessBanner(false)} className="text-emerald-700 font-bold">✕</button>
        </div>
      )}

      {googleErrorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Google Connection Alert: {googleErrorMsg}</span>
          </div>
          <button onClick={() => setGoogleErrorMsg('')} className="text-rose-700 font-bold">✕</button>
        </div>
      )}

      {/* Recruiter Profile Card (Editable) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600" />
            <span>Recruiter Profile & Branding</span>
          </h2>
          <span className="text-xs text-slate-400 font-medium">Editable Profile</span>
        </div>

        {profileSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{profileSuccessMsg}</span>
          </div>
        )}

        {profileErrorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-lg text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{profileErrorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Company Logo Upload Block */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Image className="w-4 h-4 text-indigo-600" />
                <span>Company Logo *</span>
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                Included in your email signatures
              </span>
            </div>

            {logoValidationError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{logoValidationError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Logo Preview Container */}
              <div className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-xs relative group">
                {companyLogo ? (
                  <img src={companyLogo} alt="Company Logo" className="max-h-20 max-w-20 object-contain" />
                ) : (
                  <div className="text-center p-2">
                    <Building2 className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                    <span className="text-[10px] text-slate-400 font-medium block leading-tight">No Logo Uploaded</span>
                  </div>
                )}
              </div>

              {/* Upload Controls & Validation Hints */}
              <div className="space-y-2 text-xs flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{companyLogo ? 'Change Logo' : 'Upload Logo'}</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>

                  {companyLogo && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Logo</span>
                    </button>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 leading-normal space-y-0.5">
                  <div>• Supported Formats: <strong className="text-slate-700">PNG, JPG, JPEG, WebP</strong></div>
                  <div>• Max File Size: <strong className="text-slate-700">2 MB</strong></div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Full Name *</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => { setName(e.target.value); setProfileSuccessMsg(''); }}
                placeholder="e.g. Namrata Pandey"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Included in email greeting & signature</span>
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <span>Recruiter Role / Title *</span>
              </label>
              <input
                type="text"
                required
                value={role}
                onChange={(e) => { setRole(e.target.value); setProfileSuccessMsg(''); }}
                placeholder="e.g. Senior Technical Recruiter"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Displayed in user navigation</span>
            </div>

            {/* Company Name */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Company Name *</span>
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => { setCompanyName(e.target.value); setProfileSuccessMsg(''); }}
                placeholder="e.g. Reacher"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Used in recruiter intro text</span>
            </div>

            {/* Official Work Email */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-500" />
                <span>Official Work Email *</span>
              </label>
              <input
                type="email"
                required
                value={officialEmail}
                onChange={(e) => { setOfficialEmail(e.target.value); setProfileSuccessMsg(''); }}
                placeholder="e.g. namratapandey2327@gmail.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Displayed in email signature block</span>
            </div>

            {/* Account Login Email (View Only) */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Account Login Email (View-Only)</span>
              </label>
              <input
                type="email"
                readOnly
                disabled
                value={email}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500 font-medium cursor-not-allowed select-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Primary account authentication email — locked for security</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow flex items-center gap-1.5 transition-colors"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Profile & Logo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Google Account Connection Status */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Email Account Connection</span>
          </h2>

          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              googleStatus.connected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {googleStatus.connected ? 'Authorized' : 'Disconnected'}
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Connect your email account to enable sending email campaigns directly from your email address. Your account connection is stored securely.
        </p>

        {googleStatus.connected ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-emerald-900">Connected Account</div>
                <div className="text-sm font-bold text-emerald-700">{googleStatus.google_email}</div>
              </div>

              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>

            <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between">
              <span className="text-[11px] text-emerald-800">
                Permissions: <code className="bg-emerald-100 px-1.5 py-0.5 rounded">Email Delivery & Account Info</code>
              </span>

              <button
                onClick={handleDisconnect}
                className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold transition-colors"
              >
                Disconnect Account
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-amber-900">No Account Connected</div>
                <div className="text-xs text-amber-700">Connect your email account to enable bulk sending.</div>
              </div>

              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>

            <button
              onClick={handleConnect}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow"
            >
              Connect Email Account
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
