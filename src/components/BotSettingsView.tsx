import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import type { BotSettingsData } from '../types';
import {
  Bot,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Database,
  Lock,
  Globe,
  Radio,
  Clock,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export default function BotSettingsView() {
  const [settings, setSettings] = useState<BotSettingsData | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [storeUrl, setStoreUrl] = useState('https://etebox.com/store');
  const [backupBotUrl, setBackupBotUrl] = useState('https://t.me/EteboxBackupBot');
  const [autoNotify, setAutoNotify] = useState(true);
  const [rewardStars, setRewardStars] = useState(3);
  const [rewardHours, setRewardHours] = useState(8);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testingToken, setTestingToken] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [supaTestResult, setSupaTestResult] = useState<{
    ok: boolean;
    status: string;
    displayStatus: string;
    message: string;
    reason?: string;
  } | null>(null);

  const fetchSettings = async () => {
    try {
      const data = await apiRequest<BotSettingsData>('/admin/bot-settings');
      setSettings(data);
      setStoreUrl(data.storeUrl);
      setBackupBotUrl(data.backupBotUrl);
      setAutoNotify(data.autoNotifyFreeContent);
      setRewardStars(data.rewardStars || 3);
      setRewardHours(data.rewardHours || 8);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to fetch bot settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleTestSupabase = async () => {
    setTestingSupabase(true);
    setSupaTestResult(null);
    try {
      const res = await apiRequest<{
        ok: boolean;
        status: string;
        displayStatus: string;
        message: string;
        reason?: string;
      }>('/admin/test-connection');
      setSupaTestResult(res);
      fetchSettings();
    } catch (err: any) {
      setSupaTestResult({
        ok: false,
        status: 'CONNECTION_FAILED',
        displayStatus: 'Database: Not Connected',
        message: 'Supabase PostgreSQL: CONNECTION FAILED',
        reason: err.message
      });
    } finally {
      setTestingSupabase(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await apiRequest('/admin/bot-settings', {
        method: 'PUT',
        body: JSON.stringify({
          botToken: tokenInput.trim() || undefined,
          storeUrl,
          backupBotUrl,
          autoNotifyFreeContent: autoNotify,
          rewardStars,
          rewardHours
        })
      });

      setMessage({ type: 'success', text: 'Bot configuration saved successfully to Supabase!' });
      setTokenInput('');
      fetchSettings();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestBot = async () => {
    setTestingToken(true);
    setTestResult(null);
    try {
      const res = await apiRequest<any>('/admin/stats');
      if (res.botStatus === 'online') {
        setTestResult(`✅ Bot is Online! Username: @${res.botUsername}`);
      } else {
        setTestResult(`⚠️ Bot status: ${res.botStatus} - ${res.botError || 'Check token'}`);
      }
    } catch (err: any) {
      setTestResult(`❌ Connection test error: ${err.message}`);
    } finally {
      setTestingToken(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-400">Loading bot parameters...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Bot & System Settings</h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure Telegram Bot credentials, store redirects, auto-reward schedules, and Supabase database.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center gap-2.5 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Supabase Connection Details Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-indigo-500/20 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Permanent Database: Supabase PostgreSQL</h2>
              <p className="text-xs text-slate-400">Single Source of Truth for all bot data & transactions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestSupabase}
              disabled={testingSupabase}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingSupabase ? 'animate-spin' : ''}`} />
              <span>{testingSupabase ? 'Testing...' : 'Test Connection'}</span>
            </button>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${
                settings?.supabaseConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
              }`}
            >
              {settings?.supabaseConnected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              <span>{settings?.supabaseStatus || (settings?.supabaseConnected ? 'Database: Connected' : 'Database: Not Connected')}</span>
            </span>
          </div>
        </div>

        {supaTestResult && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-mono space-y-1 ${
              supaTestResult.ok
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold">
              {supaTestResult.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
              <span>{supaTestResult.message}</span>
            </div>
            {supaTestResult.reason && (
              <p className="text-[11px] text-slate-300 pl-5">
                Reason: {supaTestResult.reason}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div>
            <span className="text-slate-500 block mb-1">Supabase Project ID:</span>
            <span className="text-indigo-300 font-semibold">vwgsxbraktgmlibmgils</span>
          </div>
          <div>
            <span className="text-slate-500 block mb-1">Supabase URL:</span>
            <span className="text-indigo-300 truncate block">https://vwgsxbraktgmlibmgils.supabase.co</span>
          </div>
          <div className="md:col-span-2">
            <span className="text-slate-500 block mb-1">Connection Status:</span>
            <span className={settings?.supabaseConnected ? 'text-emerald-400' : 'text-amber-400'}>
              {settings?.supabaseStatus || 'Checking connection...'}
            </span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 bg-indigo-950/20 border border-indigo-500/10 p-3.5 rounded-xl space-y-1">
          <p className="font-semibold text-slate-300">💡 Supabase Environment Variables:</p>
          <p>• <code className="text-indigo-300">SUPABASE_URL=https://vwgsxbraktgmlibmgils.supabase.co</code></p>
          <p>• <code className="text-indigo-300">SUPABASE_SECRET_KEY=&lt;service_role_secret_key&gt;</code></p>
          <p className="text-slate-400 mt-1">
            Database schema is prepared in <code className="text-indigo-300">server/schema.sql</code> with all 19 tables, indexes, and atomic RPC functions.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Telegram Bot Credentials Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Telegram Bot Credentials</h2>
                <p className="text-xs text-slate-400">Token obtained from @BotFather on Telegram</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestBot}
              disabled={testingToken}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Radio className={`w-3.5 h-3.5 ${testingToken ? 'animate-pulse text-indigo-400' : ''}`} />
              <span>{testingToken ? 'Testing...' : 'Test Connection'}</span>
            </button>
          </div>

          {testResult && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-mono">
              {testResult}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Bot Token {settings?.hasToken && <span className="text-emerald-400 font-normal">({settings.maskedToken})</span>}
            </label>
            <input
              type="password"
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              placeholder={settings?.hasToken ? 'Enter new token to replace existing...' : '123456789:ABCdefGHIjklMNOpqrsTUVwxyz'}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono transition"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Encrypted and persisted to Supabase. Never exposed to browser or client code.
            </p>
          </div>
        </div>

        {/* Store & Menu Redirect URLs */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Bot Menu URLs & Actions</h2>
              <p className="text-xs text-slate-400">Target destinations for Inline Keyboard buttons</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                🏪 Store URL (Button: 🏪 Eɴᴛᴇʀ Sᴛᴏʀᴇ)
              </label>
              <input
                type="url"
                value={storeUrl}
                onChange={e => setStoreUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                🤖 Backup Bot URL (Button: 🤖 Bᴀᴄᴋᴜᴘ Bᴏᴛ)
              </label>
              <input
                type="url"
                value={backupBotUrl}
                onChange={e => setBackupBotUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                required
              />
            </div>
          </div>
        </div>

        {/* Auto-Reward & Notification Configuration */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Auto-Reward & Notification Engine</h2>
              <p className="text-xs text-slate-400">Hourly stars generation rules for users</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Reward Amount (Stars per claim)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={rewardStars}
                onChange={e => setRewardStars(parseInt(e.target.value, 10) || 3)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
              />
              <p className="text-[11px] text-slate-500 mt-1">Default: +3 Stars</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Reward Cooldown Period (Hours)
              </label>
              <input
                type="number"
                min="1"
                max="72"
                value={rewardHours}
                onChange={e => setRewardHours(parseInt(e.target.value, 10) || 8)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
              />
              <p className="text-[11px] text-slate-500 mt-1">Default: Every 8 Hours</p>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoNotify}
                onChange={e => setAutoNotify(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded bg-slate-950 border-slate-800 focus:ring-0"
              />
              <span>Automatically broadcast notification to users when new Free Content is added</span>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/25 transition cursor-pointer"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Saving to Supabase...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save All Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
