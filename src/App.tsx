import { useState, useEffect } from 'react';
import { apiRequest } from './api';
import type { AdminUser, BotSettingsData } from './types';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import BotSettingsView from './components/BotSettingsView';
import UsersView from './components/UsersView';
import FreeVideosView from './components/FreeVideosView';
import FilesView from './components/FilesView';
import PackagesView from './components/PackagesView';
import ChannelsView from './components/ChannelsView';
import BroadcastView from './components/BroadcastView';
import GamesView from './components/GamesView';
import AdminLogsView from './components/AdminLogsView';
import AdminAccountsView from './components/AdminAccountsView';
import BotEmulatorModal from './components/BotEmulatorModal';

const defaultAdmin: AdminUser = {
  id: 'admin_initial',
  username: 'Abood',
  permissions: ['all']
};

export default function App() {
  const [admin] = useState<AdminUser>(defaultAdmin);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [botStatus, setBotStatus] = useState<'online' | 'offline' | 'token_invalid' | 'telegram_error'>('offline');
  const [botUsername, setBotUsername] = useState<string | undefined>();
  const [botFirstName, setBotFirstName] = useState<string | undefined>();
  const [emulatorOpen, setEmulatorOpen] = useState(false);

  // Poll bot status
  useEffect(() => {
    const fetchBotStatus = async () => {
      try {
        const res = await apiRequest<BotSettingsData>('/admin/bot/settings');
        setBotStatus(res.status);
        setBotUsername(res.botUsername);
        setBotFirstName(res.botFirstName);
      } catch {
        // Silently ignore network hiccup during status check
      }
    };

    fetchBotStatus();
    const interval = setInterval(fetchBotStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        admin={admin}
        botStatus={botStatus}
        botUsername={botUsername}
        onLogout={() => {}}
        onOpenEmulator={() => setEmulatorOpen(true)}
      />

      {/* Main Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          onOpenEmulator={() => setEmulatorOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              onNavigate={setCurrentTab}
              onOpenEmulator={() => setEmulatorOpen(true)}
            />
          )}

          {currentTab === 'bot_settings' && <BotSettingsView />}

          {currentTab === 'users' && <UsersView />}

          {currentTab === 'free_videos' && <FreeVideosView />}

          {currentTab === 'files' && <FilesView />}

          {currentTab === 'packages' && <PackagesView />}

          {currentTab === 'channels' && <ChannelsView />}

          {currentTab === 'broadcast' && <BroadcastView />}

          {currentTab === 'games' && <GamesView />}

          {currentTab === 'logs' && <AdminLogsView />}

          {currentTab === 'admins' && <AdminAccountsView />}
        </main>
      </div>

      {/* Live Telegram Bot Emulator Modal */}
      <BotEmulatorModal
        isOpen={emulatorOpen}
        onClose={() => setEmulatorOpen(false)}
        botUsername={botUsername || 'EteboxBot'}
        botFirstName={botFirstName || 'ETEBOX Bot'}
      />
    </div>
  );
}
