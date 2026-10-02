import React, { useState, useEffect } from 'react';
import { getAuthToken, clearAuthToken, apiRequest } from './api';
import type { AdminUser, DashboardStats } from './types';

import LoginView from './components/LoginView';
import Navbar from './components/Navbar';
import DashboardView from './components/DashboardView';
import BotSettingsView from './components/BotSettingsView';
import BuyVideosView from './components/BuyVideosView';
import UsersView from './components/UsersView';
import StarsCodesView from './components/StarsCodesView';
import FreeVideosView from './components/FreeVideosView';
import PaidFilesView from './components/PaidFilesView';
import ChannelsView from './components/ChannelsView';
import BroadcastView from './components/BroadcastView';
import AdminAccountsView from './components/AdminAccountsView';
import BotEmulatorModal from './components/BotEmulatorModal';

export default function App() {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isEmulatorOpen, setIsEmulatorOpen] = useState(false);
  const [appStats, setAppStats] = useState<Partial<DashboardStats>>({});

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      // Default admin session
      setAdmin({
        id: 'admin_1',
        username: 'Abood',
        permissions: ['all']
      });

      // Probe basic stats for navbar status pills
      apiRequest<DashboardStats>('/admin/stats')
        .then(data => setAppStats(data))
        .catch(() => {});
    }

    const handleAuthExpired = () => {
      setAdmin(null);
    };

    window.addEventListener('auth_expired', handleAuthExpired);
    return () => window.removeEventListener('auth_expired', handleAuthExpired);
  }, []);

  const handleLoginSuccess = (user: AdminUser) => {
    setAdmin(user);
    apiRequest<DashboardStats>('/admin/stats')
      .then(data => setAppStats(data))
      .catch(() => {});
  };

  const handleLogout = () => {
    clearAuthToken();
    setAdmin(null);
  };

  if (!admin) {
    return <LoginView onSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        admin={admin}
        onLogout={handleLogout}
        onOpenEmulator={() => setIsEmulatorOpen(true)}
        botOnline={appStats.botStatus === 'online'}
        supabaseConnected={appStats.supabaseConnected}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <DashboardView
            onNavigateTab={setCurrentTab}
            onOpenEmulator={() => setIsEmulatorOpen(true)}
          />
        )}

        {currentTab === 'bot_settings' && <BotSettingsView />}

        {currentTab === 'buy_videos' && <BuyVideosView />}

        {currentTab === 'users' && <UsersView />}

        {currentTab === 'stars_codes' && <StarsCodesView />}

        {currentTab === 'free_videos' && <FreeVideosView />}

        {currentTab === 'paid_files' && <PaidFilesView />}

        {currentTab === 'channels' && <ChannelsView />}

        {currentTab === 'broadcast' && <BroadcastView />}

        {currentTab === 'admin_accounts' && <AdminAccountsView />}
      </main>

      {/* Floating Action Button for Bot Emulator on Mobile */}
      <div className="fixed bottom-4 right-4 sm:hidden z-30">
        <button
          onClick={() => setIsEmulatorOpen(true)}
          className="p-3.5 bg-indigo-600 text-white rounded-full shadow-xl shadow-indigo-600/40 active:scale-95 transition"
          title="Open Bot Emulator"
        >
          📱
        </button>
      </div>

      {/* Bot Emulator Modal */}
      <BotEmulatorModal
        isOpen={isEmulatorOpen}
        onClose={() => setIsEmulatorOpen(false)}
      />
    </div>
  );
}
