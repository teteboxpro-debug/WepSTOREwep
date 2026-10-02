import React from 'react';
import {
  LayoutDashboard,
  Bot,
  Video,
  Users,
  Coins,
  Film,
  FolderArchive,
  Tv,
  Megaphone,
  ShieldAlert,
  Smartphone,
  LogOut,
  Database
} from 'lucide-react';
import type { AdminUser } from '../types';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  admin: AdminUser | null;
  onLogout: () => void;
  onOpenEmulator: () => void;
  botOnline?: boolean;
  supabaseConnected?: boolean;
}

export default function Navbar({
  currentTab,
  setCurrentTab,
  admin,
  onLogout,
  onOpenEmulator,
  botOnline,
  supabaseConnected
}: NavbarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'bot_settings', label: 'Bot Settings', icon: Bot },
    { id: 'buy_videos', label: '🎬 BUY VIDEOS', icon: Video, highlight: true },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'stars_codes', label: 'Stars & Codes', icon: Coins },
    { id: 'free_videos', label: 'Free Videos', icon: Film },
    { id: 'paid_files', label: 'Paid Files', icon: FolderArchive },
    { id: 'channels', label: 'Channels', icon: Tv },
    { id: 'broadcast', label: 'Broadcast', icon: Megaphone },
    { id: 'admin_accounts', label: 'Audit & Admins', icon: ShieldAlert }
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      {/* Top Banner with status pills */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white font-bold text-lg">
              E
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-tight text-base sm:text-lg">ETEBOX</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
                  PostgreSQL
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Telegram Bot Management & Store</p>
            </div>
          </div>

          {/* Status indicators and Quick Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Supabase status badge */}
            <div
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                supabaseConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
              }`}
              title="Supabase PostgreSQL Persistence Status"
            >
              <Database className="w-3.5 h-3.5" />
              <span>{supabaseConnected ? 'Supabase Connected' : 'Supabase (Check Env)'}</span>
            </div>

            {/* Bot Status badge */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                botOnline
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${botOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}
              />
              <span className="hidden sm:inline">{botOnline ? 'Bot Online' : 'Bot Standby'}</span>
            </div>

            {/* Test Bot in Emulator button */}
            <button
              onClick={onOpenEmulator}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Bot Emulator</span>
            </button>

            {/* Admin Profile & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <span className="text-xs text-slate-300 font-medium hidden md:inline">
                {admin?.username || 'Admin'}
              </span>
              <button
                onClick={onLogout}
                title="Log out"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 overflow-x-auto py-2.5 scrollbar-none">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-semibold'
                    : item.highlight
                    ? 'bg-violet-950/40 text-violet-300 hover:bg-violet-900/50 border border-violet-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : item.highlight ? 'text-violet-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
