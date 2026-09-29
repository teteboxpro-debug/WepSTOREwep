import { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import {
  Megaphone,
  Send,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import type { BroadcastItem } from '../types';

export default function BroadcastView() {
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Composer
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchBroadcasts = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<{ broadcasts: BroadcastItem[] }>('/admin/broadcasts');
      setBroadcasts(res.broadcasts);
    } catch (err) {
      console.error('Error fetching broadcasts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBroadcasts();
    const interval = setInterval(fetchBroadcasts, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text) return;

    if (!confirm('Are you sure you want to queue this broadcast to all registered users?')) return;

    setSending(true);
    setStatusMsg(null);

    try {
      await apiRequest('/admin/broadcasts', {
        method: 'POST',
        body: JSON.stringify({
          text,
          image_url: imageUrl || undefined,
          button_text: buttonText || undefined,
          button_url: buttonUrl || undefined
        })
      });

      setStatusMsg({ type: 'success', text: 'Broadcast queued and background processing started!' });
      setText('');
      setImageUrl('');
      setButtonText('');
      setButtonUrl('');
      await fetchBroadcasts();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to queue broadcast' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Broadcast Announcements</h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Send announcements to all registered Telegram users in safe rate-limited background batches.
        </p>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 text-sm border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Broadcast Composer */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-indigo-400" />
            <span>Compose Message</span>
          </h3>

          <form onSubmit={handleSendBroadcast} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Announcement Text (Markdown supported)
              </label>
              <textarea
                rows={5}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="🔥 Important update! A brand new collection has been added to our catalog..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Optional Banner Image URL
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/banner.jpg"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Optional Button Label
                </label>
                <input
                  type="text"
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  placeholder="e.g. 🎁 Claim Now"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Optional Button URL
                </label>
                <input
                  type="url"
                  value={buttonUrl}
                  onChange={(e) => setButtonUrl(e.target.value)}
                  placeholder="https://example.com/promo"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={sending || !text}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {sending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Queueing Broadcast...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Announcement to All Users</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-white text-base mb-3">Telegram Message Preview</h3>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-sans">
              <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium">
                <Megaphone className="w-3.5 h-3.5" />
                <span>ETEBOX Broadcast</span>
              </div>

              {imageUrl && (
                <div className="w-full h-36 bg-slate-900 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center text-xs text-slate-500">
                  <img src={imageUrl} alt="Banner Preview" className="w-full h-full object-cover" />
                </div>
              )}

              <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                {text || 'Your announcement text will appear here as formatted by Telegram.'}
              </p>

              {buttonText && (
                <div className="pt-2">
                  <div className="w-full py-2 bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold rounded-lg text-center flex items-center justify-center gap-1.5">
                    <span>{buttonText}</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="text-xs text-slate-500 mt-4">
            Safe batch delivery engine sends messages asynchronously to comply with Telegram flood limits.
          </div>
        </div>
      </div>

      {/* Broadcast History & Progress */}
      <div className="space-y-3">
        <h3 className="font-bold text-white text-base">Broadcast History & Delivery Queue</h3>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {loading && broadcasts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading broadcasts...</div>
          ) : broadcasts.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No broadcasts sent yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {broadcasts.map((b) => (
                <div key={b.id} className="p-4 sm:p-5 hover:bg-slate-800/30 transition space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          b.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : b.status === 'running'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {b.status}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(b.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className="text-slate-400">Total: {b.total_users}</span>
                      <span className="text-emerald-400">Sent: {b.sent_count}</span>
                      <span className="text-rose-400">Failed: {b.failed_count}</span>
                      <span className="text-amber-400">Blocked: {b.blocked_count}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2">{b.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
