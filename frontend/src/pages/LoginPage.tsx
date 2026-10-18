import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { connectGoogle } from '../api';

const formatErrorMessage = (detail: any): string => {
  if (!detail) return 'An unexpected error occurred.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item: any) => (typeof item === 'string' ? item : item.msg || item.message || JSON.stringify(item)))
      .join('; ');
  }
  if (typeof detail === 'object') {
    return detail.msg || detail.message || JSON.stringify(detail);
  }
  return String(detail);
};

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, refreshCurrentUser, refreshGoogleStatus } = useApp();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check URL query parameters for errors
  useEffect(() => {
    const googleErr = searchParams.get('google_error');
    if (googleErr) {
      setError(decodeURIComponent(googleErr));
    }
  }, [searchParams]);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const url = await connectGoogle('login');
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('Google authorization URL could not be generated.');
      }
    } catch (err: any) {
      setError(formatErrorMessage(err.message || err));
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'recruiter.demo@gmail.com', password: 'reacher123' })
      });

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(formatErrorMessage(errData.detail || 'Demo login failed'));
      }

      const data = await resp.json();
      localStorage.setItem('reacher_token', data.access_token);
      await refreshCurrentUser();
      await refreshGoogleStatus();
      navigate('/');
    } catch (err: any) {
      setError(formatErrorMessage(err.message || 'Demo login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
      {/* Background Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.2),transparent_50%)] pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-7 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/30 text-white font-bold text-xl tracking-tight">
            RC
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Rapid Conect</h1>
            <p className="text-xs text-slate-400 mt-1">Recruiter Bulk Email & Candidate Outreach System</p>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Single sign-on with your Google / Gmail account</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Automatic account setup on first login</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Integrated Gmail API for high-deliverability dispatch</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium text-center leading-relaxed">
            {error}
          </div>
        )}

        {/* Primary Action: Continue with Google */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3.5 px-5 bg-white hover:bg-slate-100 text-slate-900 rounded-2xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-3 shadow-lg shadow-white/5 hover:shadow-white/10 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"
                />
              </svg>
            )}
            <span>{loading ? 'Connecting to Google...' : 'Continue with Google'}</span>
          </button>

          <p className="text-[11px] text-slate-500 text-center">
            By signing in, your account will be created or signed into automatically.
          </p>
        </div>

        {/* Security & Offline Demo Badge */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>OAuth 2.0 Encrypted</span>
          </div>
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            disabled={loading}
            className="hover:text-indigo-400 transition-colors flex items-center gap-1 text-[11px]"
            title="Log in using demo recruiter test account"
          >
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>Demo Access</span>
          </button>
        </div>
      </div>
    </div>
  );
};
