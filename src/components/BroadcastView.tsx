import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import type { BroadcastItem } from '../types';
import { Megaphone, Send, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

export default function BroadcastView() {
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchBroadcasts = async () => {
    try {
      const data = await apiRequest<BroadcastItem[]>('/admin/broadcasts');
      setBroadcasts(data);
    } catch {}
  };

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setMessage(null);

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
      setMessage({ type: 'success', text: 'Broadcast initiated successfully!' });
      setText('');
      setImageUrl('');
      fetchBroadcasts();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to send broadcast' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Mass Broadcast Dispatcher</h1>
        <p className="text-xs text-slate-400 mt-1">Broadcast announcements or new release alerts to all registered users.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl text-xs flex items-center gap-2.5 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSend} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Message Text (Markdown supported)</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            placeholder="🎉 New 5 Videos Package is now available in the store! Check it out..."
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Photo / Poster URL (Optional)</label>
            <input
              type="url"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Button Text & Link (Optional)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={buttonText}
                onChange={e => setButtonText(e.target.value)}
                placeholder="View Package"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
              <input
                type="url"
                value={buttonUrl}
                onChange={e => setButtonUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={sending}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/25 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sending ? 'Broadcasting...' : 'Send Broadcast to All Users'}</span>
          </button>
        </div>
      </form>

      {/* Broadcast History */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-white mb-3">Past Broadcasts</h2>
        <div className="space-y-3">
          {broadcasts.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No broadcasts sent yet</p>
          ) : (
            broadcasts.map(b => (
              <div key={b.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span className="text-[11px] text-slate-500">{new Date(b.created_at).toLocaleString()}</span>
                  <span className="text-emerald-400 font-semibold">{b.sent_count} users reached</span>
                </div>
                <p className="text-slate-200">{b.text}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
