import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Send,
  FileText,
  History,
  BarChart3,
  Settings,
  MailCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Sidebar: React.FC = () => {
  const { selectedEmployees, user, resetCampaignDraft } = useApp();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Vendors', path: '/employees', icon: Users, badge: selectedEmployees.length ? `${selectedEmployees.length} selected` : null },
    { label: 'Email Campaigns', path: '/campaigns', icon: MailCheck },
    { label: 'Templates', path: '/templates', icon: FileText },
    { label: 'Email History', path: '/history', icon: History },
    { label: 'Reports', path: '/reports', icon: BarChart3 },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const userInitials = user?.name ? user.name.split(' ').map(n => n[0]).join('') : 'NP';
  const userName = user?.name || 'Namrata Pandey';

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col min-h-screen border-r border-slate-800 shadow-xl select-none shrink-0">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold text-sm tracking-tighter">
            RC
          </div>
          <div>
            <h1 className="font-semibold text-white tracking-wide text-base leading-none">Rapid Conect</h1>
            <span className="text-[11px] text-slate-400 font-medium">Outreach Platform</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        <div className="px-3 mb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Main Menu
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={() => resetCampaignDraft()}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-150 group ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Vendor Manager Badge Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/30">
            {userInitials}
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-semibold text-white truncate">{userName}</div>
            <div className="text-[10px] text-slate-400 truncate">{user?.role || 'Vendor Procurement Lead'}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
