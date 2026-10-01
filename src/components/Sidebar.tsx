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
  Video
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenEmulator: () => void;
}

export default function Sidebar({ currentTab, onSelectTab, onOpenEmulator }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'bot_settings', label: 'Bot Settings', icon: Bot },
    { id: 'buy_videos', label: '🎬 BUY VIDEOS', icon: Video },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'free_videos', label: 'FREE 1 VIDEOS', icon: Film },
    { id: 'files', label: 'Paid Files', icon: FileBox },
    { id: 'packages', label: 'Buy Stars & Codes', icon: Star },
    { id: 'channels', label: 'Official Channels', icon: Tv },
    { id: 'broadcast', label: 'Broadcast Message', icon: Megaphone },
    { id: 'games', label: 'Games & Activity', icon: Gamepad2 },
    { id: 'logs', label: 'Audit Logs', icon: FileText },
    { id: 'admins', label: 'Admin Accounts', icon: UserCheck }
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-slate-800 bg-slate-900/60 p-4 shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="mb-4 px-2">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Management
        </span>
      </div>

      <nav className="space-y-1 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                active
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-semibold'
                  : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-slate-800/80 mt-4">
        <button
          onClick={onOpenEmulator}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-medium transition cursor-pointer"
        >
          <Smartphone className="w-4 h-4" />
          <span>Live Bot Simulator</span>
        </button>
      </div>
    </aside>
  );
}
