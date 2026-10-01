import { useState } from 'react';
import {
  LayoutDashboard,
  Bot,
  Users,
  Film,
  FileBox,
  Star,
  Tv,
  Megaphone,
  Gamepad2,
  FileText,
  UserCheck,
  Smartphone,
  Menu,
  X,
  LogOut,
  Video
} from 'lucide-react';
import type { AdminUser } from '../types';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  admin: AdminUser;
  botStatus: 'online' | 'offline' | 'token_invalid' | 'telegram_error';
  botUsername?: string;
  onLogout?: () => void;
  onOpenEmulator: () => void;
}

export default function Navbar({
  currentTab,
  onSelectTab,
  admin,
  botStatus,
  botUsername,
  onLogout,
  onOpenEmulator
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'bot_settings', label: 'Bot Settings', icon: Bot },
    { id: 'buy_videos', label: '🎬 BUY VIDEOS', icon: Video },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'free_videos', label: 'Free 1 Videos', icon: Film },
    { id: 'files', label: 'Paid Files', icon: FileBox },
    { id: 'packages', label: 'Buy Stars & Codes', icon: Star },
    { id: 'channels', label: 'Channels', icon: Tv },
    { id: 'broadcast', label: 'Broadcast', icon: Megaphone },
    { id: 'games', label: 'Games & Activity', icon: Gamepad2 },
    { id: 'logs', label: 'Audit Logs', icon: FileText },
    { id: 'admins', label: 'Admin Accounts', icon: UserCheck }
  ];

  const getStatusBadge = () => {
    switch (botStatus) {
      case 'online':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Online {botUsername ? `@${botUsername}` : ''}</span>
          </span>
        );
      case 'token_invalid':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>⚠️ Token Invalid</span>
          </span>
        );
      case 'telegram_error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>⚠️ Telegram API Error</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            <span>Offline</span>
          </span>
        );
    }
  };

  const handleSelect = (id: string) => {
    onSelectTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Top Mobile & Desktop Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => handleSelect('dashboard')}>
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-base sm:text-lg text-white tracking-tight">ETEBOX</span>
                <span className="hidden sm:inline-block ml-2 text-xs uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                  Admin
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block">{getStatusBadge()}</div>

            {/* Live Bot Simulator button */}
            <button
              onClick={onOpenEmulator}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium transition cursor-pointer"
              title="Test Telegram Bot interaction live in browser"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bot Live Emulator</span>
              <span className="sm:hidden">Simulator</span>
            </button>

            {/* Admin User & Logout */}
            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-800">
              <span className="text-xs text-slate-300 font-medium px-2 py-1 bg-slate-800/80 rounded-lg border border-slate-700/50">
                👤 {admin?.username || 'Abood'}
              </span>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                  title="تسجيل الخروج (Logout)"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Status Bar */}
        <div className="sm:hidden px-4 py-1.5 bg-slate-950 border-t border-slate-800/60 flex items-center justify-between text-xs">
          <span className="text-slate-500">Status:</span>
          <div>{getStatusBadge()}</div>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-72 max-w-[80vw] bg-slate-900 border-r border-slate-800 flex flex-col h-full p-4 overflow-y-auto z-50">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
              <span className="font-bold text-white text-base">Navigation</span>
              <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-1 flex-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                      active
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-slate-800 mt-4 space-y-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenEmulator();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-sm font-medium"
              >
                <Smartphone className="w-4 h-4" />
                <span>Open Bot Simulator</span>
              </button>

              {onLogout && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl text-sm font-medium hover:bg-rose-500/20 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>تسجيل الخروج ({admin?.username || 'Abood'})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
