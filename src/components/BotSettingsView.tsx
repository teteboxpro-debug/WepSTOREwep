import { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import {
  Bot,
  Key,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  PowerOff
} from 'lucide-react';
import type { BotSettingsData } from '../types';

export default function BotSettingsView() {
  const [settings, setSettings] = useState<BotSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenInput, setTokenInput] = useState('');
  const [storeUrl, setStoreUrl] = useState('');
  const [backupBotUrl, setBackupBotUrl] = useState('');
  const [autoNotify, setAutoNotify] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSettings = async () => {
    try {
      const data = await apiRequest<BotSettingsData>('/admin/bot/settings');
      setSettings(data);
      setStoreUrl(data.storeUrl);
      setBackupBotUrl(data.backupBotUrl);
      setAutoNotify(data.autoNotifyFreeContent);
    } catch (err: any) {
      console.error('Error loading bot settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveAndActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await apiRequest('/admin/bot/save-and-activate', {
        method: 'POST',
        body: JSON.stringify({
          botToken: tokenInput,
          storeUrl,
          backupBotUrl,
          autoNotifyFreeContent: autoNotify
        })
      });

      setMessage({ type: 'success', text: res.message || 'Bot Token validated and activated!' });
      setTokenInput('');
      await fetchSettings();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to activate Bot Token.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStopBot = async () => {
    if (!confirm('Are you sure you want to stop the Telegram Bot service?')) return;
    setSubmitting(true);
    try {
      await apiRequest('/admin/bot/stop', { method: 'POST' });
      setMessage({ type: 'success', text: 'Bot service stopped.' });
      await fetchSettings();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !settings) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm">Loading bot settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Bot Settings & Activation</h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Connect your official Telegram Bot via BotFather token. The database remains completely persistent across token changes.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 text-sm border ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Live Status Card */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-400">Current Status</div>
              <div className="flex items-center gap-2 mt-0.5">
                {settings?.status === 'online' && (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    🟢 Online
                  </span>
                )}
                {settings?.status === 'offline' && (
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                    🔴 Offline
                  </span>
                )}
                {settings?.status === 'token_invalid' && (
                  <span className="text-amber-400 font-semibold flex items-center gap-1.5 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    ⚠️ Token Invalid
                  </span>
                )}
                {settings?.status === 'telegram_error' && (
                  <span className="text-rose-400 font-semibold flex items-center gap-1.5 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    ⚠️ Telegram API Error
                  </span>
                )}
              </div>
            </div>
          </div>

          {settings?.status === 'online' && (
            <div className="flex items-center gap-2">
              {settings.botUsername && (
                <a
                  href={`https://t.me/${settings.botUsername}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-xs font-medium transition"
                >
                  <span>Open @{settings.botUsername}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button
                onClick={handleStopBot}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium transition cursor-pointer"
              >
                <PowerOff className="w-3 h-3" />
                <span>Stop Bot</span>
              </button>
            </div>
          )}
        </div>

        {/* Masked Token Display */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-1">Stored Bot Token:</span>
            <span className="font-mono text-slate-200 font-medium">
              {settings?.hasToken ? settings.maskedToken : 'No token configured'}
            </span>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-1">Connected Bot Name:</span>
            <span className="text-slate-200 font-medium">
              {settings?.botFirstName ? `${settings.botFirstName} (@${settings.botUsername})` : '—'}
            </span>
          </div>
        </div>

        {settings?.lastError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
            <strong>Last Error:</strong> {settings.lastError}
          </div>
        )}
      </div>

      {/* Token Input Form */}
      <form onSubmit={handleSaveAndActivate} className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
        <h3 className="font-semibold text-white text-base flex items-center gap-2">
          <Key className="w-4 h-4 text-indigo-400" />
          <span>Update Bot Token</span>
        </h3>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
            Main Bot Token
          </label>
          <div className="relative">
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder={settings?.hasToken ? 'Enter new token to replace, or leave blank to keep' : 'e.g. 1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ'}
              className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-mono"
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            Get your token from @BotFather on Telegram. The token is never exposed to frontend clients and is stored securely server-side.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
              Store URL (Enter Store Button)
            </label>
            <input
              type="url"
              value={storeUrl}
              onChange={(e) => setStoreUrl(e.target.value)}
              placeholder="https://etebox.com/store"
              className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
              Backup Bot URL (Backup Bot Button)
            </label>
            <input
              type="url"
              value={backupBotUrl}
              onChange={(e) => setBackupBotUrl(e.target.value)}
              placeholder="https://t.me/EteboxBackupBot"
              className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
            />
          </div>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <input
            type="checkbox"
            id="notify_free"
            checked={autoNotify}
            onChange={(e) => setAutoNotify(e.target.checked)}
            className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700 focus:ring-indigo-500"
          />
          <label htmlFor="notify_free" className="text-xs sm:text-sm text-slate-300 cursor-pointer">
            Automatically notify active users in background when new FREE 1 VIDEOS content is added
          </label>
        </div>

        <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Database data, users, and balances are 100% preserved.</span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="py-3 px-6 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-50 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/25 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Validating & Connecting...</span>
              </>
            ) : (
              <>
                <Bot className="w-4 h-4" />
                <span>SAVE & ACTIVATE</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
