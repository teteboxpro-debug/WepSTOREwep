import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import type { DashboardStats, StarTx } from '../types';
import {
  Users,
  Coins,
  Gift,
  ShoppingBag,
  Share2,
  Video,
  Bot,
  Database,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

interface DashboardViewProps {
  onNavigateTab: (tab: string) => void;
  onOpenEmulator: () => void;
}

export default function DashboardView({ onNavigateTab, onOpenEmulator }: DashboardViewProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setError(null);
      const data = await apiRequest<DashboardStats>('/admin/stats');
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-400">Loading system metrics from Supabase PostgreSQL...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">System Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time status of Telegram Bot, Stars currency, and Supabase PostgreSQL persistence.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-medium border border-slate-800 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => onNavigateTab('buy_videos')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition cursor-pointer"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Manage Video Packages</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={handleRefresh} className="underline font-semibold ml-2">
            Retry
          </button>
        </div>
      )}

      {/* Supabase Architecture Status Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-white">Supabase PostgreSQL Permanent Architecture</h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Single Source of Truth
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Persistent storage configured. All users, stars balances, video package purchases, and referral data map permanently to Telegram User IDs in PostgreSQL (Project: <code className="text-indigo-300">vwgsxbraktgmlibmgils</code>).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('bot_settings')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition cursor-pointer"
            >
              Supabase Config
            </button>
            <button
              onClick={onOpenEmulator}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition cursor-pointer flex items-center gap-1.5"
            >
              <span>Test Bot Flow</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Users */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Users</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">{stats?.totalUsers ?? 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            <span className="text-emerald-400 font-semibold">{stats?.activeUsers ?? 0}</span> active (7d)
          </p>
        </div>

        {/* Stars Circulation */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Stars in Wallets</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 tracking-tight">{stats?.totalStarsCirculation ?? 0} ⭐</p>
          <p className="text-[11px] text-slate-400 mt-1">Internal currency</p>
        </div>

        {/* Auto Rewards */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Auto Rewards</span>
            <Gift className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">{stats?.autoRewardsGiven ?? 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">+3 Stars / 8 hours</p>
        </div>

        {/* Total Purchases */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Purchases</span>
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">{stats?.totalPurchases ?? 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">Videos & files</p>
        </div>

        {/* Total Referrals */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Referrals</span>
            <Share2 className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">{stats?.totalReferrals ?? 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">+5 Stars per user</p>
        </div>

        {/* Bot Status Card */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Telegram Bot</span>
            <Bot className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                stats?.botStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="text-sm font-bold text-white capitalize">{stats?.botStatus || 'Offline'}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {stats?.botUsername ? `@${stats.botUsername}` : 'Token not set'}
          </p>
        </div>
      </div>

      {/* Two Column Layout: Quick Actions & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Quick Features & Store Links */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-white mb-3">Core Application Modules</h2>
            <div className="space-y-2">
              <button
                onClick={() => onNavigateTab('buy_videos')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-violet-950/20 hover:bg-violet-900/30 border border-violet-500/20 text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">🎬 BUY VIDEOS</p>
                    <p className="text-[11px] text-slate-400">Manage multi-link video packages & pricing</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigateTab('users')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/40 hover:bg-slate-800/60 border border-slate-800 text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Users & Balances</p>
                    <p className="text-[11px] text-slate-400">View users, adjust stars, manage restrictions</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigateTab('stars_codes')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/40 hover:bg-slate-800/60 border border-slate-800 text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Redeemable Star Codes</p>
                    <p className="text-[11px] text-slate-400">Generate promotional codes & packages</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Bot Inline Menu Preview Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white">Bot Inline Keyboard Layout</h2>
              <button
                onClick={onOpenEmulator}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                Test in Emulator →
              </button>
            </div>
            <div className="space-y-1.5 p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px]">
              <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center text-violet-300 font-semibold">
                🎬 Bᴜʏ Vɪᴅᴇᴏs
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center text-slate-300">
                  🆓 Fʀᴇᴇ Vɪᴅᴇᴏs
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center text-slate-300">
                  💰 Mʏ Bᴀʟᴀɴᴄᴇ
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center text-slate-300">
                  ⭐ Bᴜʏ Sᴛᴀʀs
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center text-slate-300">
                  📺 Cʜᴀɴɴᴇʟs
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center text-slate-300">
                  📁 Fɪʟᴇs
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center text-slate-300">
                  🏪 Eɴᴛᴇʀ Sᴛᴏʀᴇ
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center text-slate-300">
                  🤖 Bᴀᴄᴋᴜᴘ Bᴏᴛ
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center text-slate-300">
                  👥 Rᴇғᴇʀʀᴀʟ
                </div>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800 text-center text-slate-300">
                🎮 Gᴀᴍᴇs
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Transactions Table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">Recent Star Transactions</h2>
              <p className="text-xs text-slate-400">Atomic ledger records from Supabase PostgreSQL</p>
            </div>
            <button
              onClick={() => onNavigateTab('stars_codes')}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
            >
              View All →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3 font-medium">User</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Description</th>
                  <th className="pb-3 font-medium text-right">Amount</th>
                  <th className="pb-3 font-medium text-right">Balance</th>
                  <th className="pb-3 font-medium text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {!stats?.recentTransactions || stats.recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No transactions recorded yet
                    </td>
                  </tr>
                ) : (
                  stats.recentTransactions.map((tx: StarTx) => {
                    const isCredit = tx.amount > 0;
                    return (
                      <tr key={tx.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 font-mono text-slate-300 font-semibold">
                          {tx.user_id.length > 12 ? `${tx.user_id.slice(0, 10)}...` : tx.user_id}
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              tx.type === 'reward'
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : tx.type === 'video_purchase'
                                ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                                : tx.type === 'referral'
                                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                : tx.type === 'file_purchase'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3 text-slate-300 max-w-[200px] truncate" title={tx.description}>
                          {tx.description}
                        </td>
                        <td className="py-3 text-right font-semibold">
                          <span className={isCredit ? 'text-emerald-400' : 'text-rose-400'}>
                            {isCredit ? `+${tx.amount}` : tx.amount} ⭐
                          </span>
                        </td>
                        <td className="py-3 text-right text-slate-400 font-mono">
                          {tx.balance_after} ⭐
                        </td>
                        <td className="py-3 text-right text-slate-500">
                          {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
