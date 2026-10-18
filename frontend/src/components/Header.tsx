import React from 'react';
import { Bell } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const { user } = useApp();
  const navigate = useNavigate();

  const userInitials = user?.name ? user.name.split(' ').map(n => n[0]).join('') : 'NP';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-end sticky top-0 z-20 shadow-sm">
      {/* Right Header Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications Icon */}
        <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full ring-2 ring-white"></span>
        </button>

        <div className="h-4 w-[1px] bg-slate-200"></div>

        {/* User Account & Logout */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            {userInitials}
          </div>
          <div className="text-left hidden md:block">
            <div className="text-xs font-semibold text-slate-800 leading-tight">{user?.name || 'Namrata Pandey'}</div>
            <div className="text-[10px] text-slate-500 font-medium truncate max-w-[140px]">{user?.role || 'Vendor Procurement Lead'}</div>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('reacher_token');
              navigate('/login');
            }}
            className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 px-2 py-1 hover:bg-rose-50 rounded transition-colors ml-1"
            title="Sign out of Reacher"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};
