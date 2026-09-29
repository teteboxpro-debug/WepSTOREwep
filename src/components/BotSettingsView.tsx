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
  PowerOff,
  Globe,
  Radio,
  Zap
} from 'lucide-react';
import type { BotSettingsData } from '../types';

export default function BotSettingsView() {
  const [settings, setSettings] = useState<BotSettingsData | null>(null);
  const [webhookInfo, setWebhookInfo] = useState<any>(null);
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

      if (data.hasToken) {
        try {
          const hookRes = await apiRequest('/admin/bot/webhook-info');
          setWebhookInfo(hookRes.info);
        } catch {}
      }
    } catch (err: any) {
      console.error('Error loading bot settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSetWebhook = async (urlToSet?: string) => {
    setSubmitting(true);
    setMessage(null);
    try {
      const targetUrl = urlToSet || `${window.location.origin}/api/telegram-webhook`;
      const res = await apiRequest('/admin/bot/set-webhook', {
        method: 'POST',
        body: JSON.stringify({ webhookUrl: targetUrl })
      });
      setMessage({ type: 'success', text: res.message || 'Webhook successfully set!' });
      await fetchSettings();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to set webhook' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWebhook = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await apiRequest('/admin/bot/delete-webhook', { method: 'POST' });
      setMessage({ type: 'success', text: res.message || 'Switched to Long Polling!' });
      await fetchSettings();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to switch to polling' });
    } finally {
      setSubmitting(false);
    }
  };

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

      {/* Webhook & Cloud Deployment Card (Essential for Vercel & Serverless) */}
      {settings?.hasToken && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Telegram Connection Mode (Webhook vs Polling)</h3>
                <p className="text-[11px] text-slate-400">
                  Vercel & serverless platforms require a Webhook so Telegram pushes updates directly to the app.
                </p>
              </div>
            </div>

            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              webhookInfo?.url
                ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30'
            }`}>
              {webhookInfo?.url ? '⚡ Webhook Active' : '🔄 Long Polling Active'}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 font-mono space-y-1">
              <div className="text-slate-400 font-sans">
                <strong>Active Telegram Webhook URL:</strong>
              </div>
              <div className="text-indigo-300 truncate">
                {webhookInfo?.url || 'None (Bot is receiving updates via internal Long Polling)'}
              </div>
              {webhookInfo?.last_error_message && (
                <div className="text-rose-400 pt-1">
                  <strong>Telegram Webhook Error:</strong> {webhookInfo.last_error_message}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleSetWebhook()}
                disabled={submitting}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-medium transition cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Activate Webhook on Current App Domain</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteWebhook}
                disabled={submitting}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Switch to Long Polling</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Token Input Form */}
      <form onSubmit={handleSaveAndActivate} className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h3 className="font-semibold text-white text-base flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-400" />
            <span>Connect & Activate Telegram Bot (توكن البوت)</span>
          </h3>
          <span className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
            ⚡ All-in-One: Activates Bot + Links Webhook + Enables Buttons
          </span>
        </div>

        <div className="p-3.5 bg-indigo-600/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-200">
          💡 <strong>كل ما عليك فعله:</strong> الصق توكن البوت الذي حصلت عليه من <strong>@BotFather</strong> في الحقل أدناه واضغط <strong>Save & Activate Bot</strong>. سيقوم النظام تلقائياً بربط البوت وتفعيل الويب هوك وستعمل كافة الأزرار فوراً في التيليجرام!
        </div>

        {/* User Points & Balance Preservation Guarantee */}
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-200 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-emerald-300 block">🛡️ ضمان حفظ النقاط والأرصدة عند تغيير التوكن:</strong>
            <p className="text-emerald-200/90 text-[11px] leading-relaxed">
              جميع أرصدة النجوم (Stars) ونقاط المستخدمين وسجلات الشراء والإحالات مرتبطة بشكل دائم بمعرّف التليجرام الخاص بالمستخدم (Telegram ID). عند تغيير التوكن أو استبدال البوت بآخر جديد، <strong>لن يخسر أي مستخدم نقاطه أو رصيده نهائياً</strong> وستبقى كافة الأرصدة محفوظة بالكامل في قاعدة البيانات.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
            Telegram Bot Token
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
