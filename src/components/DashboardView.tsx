import { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import {
  Users,
  Activity,
  Star,
  Gift,
  Share2,
  ShoppingBag,
  Film,
  FileBox,
  Tv,
  Bot,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Smartphone,
  RefreshCw,
  Clock
} from 'lucide-react';
import type { DashboardStats } from '../types';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
  onOpenEmulator: () => void;
}

export default function DashboardView({ onNavigate, onOpenEmulator }: DashboardViewProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await apiRequest<DashboardStats>('/admin/stats');
      setStats(data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm">Loading system dashboard...</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
      action: () => onNavigate('users')
    },
    {
      title: 'Active Users (7d)',
      value: stats?.activeUsers || 0,
      icon: Activity,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      action: () => onNavigate('users')
    },
    {
      title: 'Stars in Circulation',
      value: `⭐ ${stats?.totalStarsCirculation || 0}`,
      icon: Star,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      action: () => onNavigate('packages')
    },
    {
      title: 'Auto Rewards Given',
      value: stats?.autoRewardsGiven || 0,
      icon: Gift,
      color: 'text-pink-400',
      bg: 'bg-pink-500/10 border-pink-500/20',
      action: () => onNavigate('logs')
    },
    {
      title: 'Qualified Referrals',
      value: stats?.totalReferrals || 0,
      icon: Share2,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
      action: () => onNavigate('users')
    },
    {
      title: 'Total File Purchases',
      value: stats?.totalPurchases || 0,
      icon: ShoppingBag,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20',
      action: () => onNavigate('files')
    },
    {
      title: 'Active Free Videos',
      value: stats?.totalFreeVideos || 0,
      icon: Film,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/20',
      action: () => onNavigate('free_videos')
    },
    {
      title: 'Active Paid Files',
      value: stats?.totalFiles || 0,
      icon: FileBox,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10 border-orange-500/20',
      action: () => onNavigate('files')
    },
    {
      title: 'Channels Configured',
      value: stats?.totalChannels || 0,
      icon: Tv,
      color: 'text-teal-400',
      bg: 'bg-teal-500/10 border-teal-500/20',
      action: () => onNavigate('channels')
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Overview Dashboard</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Central monitoring for Etebox Telegram Bot, persistent database & user activity
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onOpenEmulator}
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-medium shadow-md shadow-indigo-600/20 transition cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span>Launch Bot Simulator</span>
          </button>
        </div>
      </div>

      {/* Bot Status Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-900/90 border border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 text-indigo-400">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-base">Main Telegram Bot Status:</span>
              {stats?.botStatus === 'online' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  🟢 Bot Online {stats.botUsername ? `(@${stats.botUsername})` : ''}
                </span>
              )}
              {stats?.botStatus === 'offline' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/20 text-slate-400 border border-slate-500/30">
                  🔴 Bot Offline
                </span>
              )}
              {stats?.botStatus === 'token_invalid' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  ⚠️ Token Invalid
                </span>
              )}
              {stats?.botStatus === 'telegram_error' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  ⚠️ Telegram API Error
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {stats?.botStatus === 'online'
                ? `Actively polling updates and processing user interactions in real-time.`
                : stats?.botError || 'Enter your BotFather Token in Bot Settings to start the bot.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('bot_settings')}
          className="self-start md:self-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium border border-slate-700 transition"
        >
          Configure Bot Token →
        </button>
      </div>

      {/* 9 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-3 sm:gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={card.action}
              className={`p-4 rounded-2xl bg-slate-900/80 border ${card.bg} hover:border-indigo-500/50 cursor-pointer transition flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-400">{card.title}</span>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">{card.value}</div>
            </div>
          );
        })}
      </div>

      {/* Recent Transactions & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white text-base flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              <span>Recent Star Transactions</span>
            </h3>
            <button
              onClick={() => onNavigate('users')}
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              View Users →
            </button>
          </div>

          {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
            <div className="space-y-2 overflow-x-auto">
              {stats.recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    {tx.amount > 0 ? (
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center flex-shrink-0">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-slate-200">
                        User <span className="font-mono text-indigo-300">{tx.user_id}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[200px] sm:max-w-xs">
                        {tx.description}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span
                      className={`font-mono font-semibold ${
                        tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount} ⭐
                    </span>
                    <div className="text-[10px] text-slate-500 flex items-center justify-end gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-500">
              No recent Star transactions recorded yet.
            </div>
          )}
        </div>

        {/* Quick Management Shortcuts */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-white text-base mb-3">Quick Navigation</h3>
            <div className="space-y-2">
              <button
                onClick={() => onNavigate('free_videos')}
                className="w-full text-left p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 text-xs font-medium text-slate-200 transition flex items-center justify-between"
              >
                <span>Add Free 1 Video</span>
                <span className="text-slate-500">→</span>
              </button>
              <button
                onClick={() => onNavigate('files')}
                className="w-full text-left p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 text-xs font-medium text-slate-200 transition flex items-center justify-between"
              >
                <span>Add Premium Paid File</span>
                <span className="text-slate-500">→</span>
              </button>
              <button
                onClick={() => onNavigate('packages')}
                className="w-full text-left p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 text-xs font-medium text-slate-200 transition flex items-center justify-between"
              >
                <span>Generate One-Time Code</span>
                <span className="text-slate-500">→</span>
              </button>
              <button
                onClick={() => onNavigate('broadcast')}
                className="w-full text-left p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 text-xs font-medium text-slate-200 transition flex items-center justify-between"
              >
                <span>Send Broadcast Announcement</span>
                <span className="text-slate-500">→</span>
              </button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
            Persistent database independent from Bot Token. Changing Bot Token keeps all users, balances, and records intact.
          </div>
        </div>
      </div>
    </div>
  );
}
