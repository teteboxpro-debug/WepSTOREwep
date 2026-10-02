import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import type { ChannelItem } from '../types';
import { Tv, Plus, Trash2, ExternalLink, X, RefreshCw } from 'lucide-react';

export default function ChannelsView() {
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [requiredStars, setRequiredStars] = useState(0);
  const [displayOrder, setDisplayOrder] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<ChannelItem[]>('/admin/channels');
      setChannels(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/admin/channels', {
        method: 'POST',
        body: JSON.stringify({ name, url, required_stars: requiredStars, display_order: displayOrder })
      });
      setIsModalOpen(false);
      setName('');
      setUrl('');
      fetchChannels();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await apiRequest(`/admin/channels/${id}`, { method: 'DELETE' });
    fetchChannels();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Channels Management</h1>
          <p className="text-xs text-slate-400 mt-1">Official and VIP Telegram channels shown in bot menu.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchChannels} className="p-2 bg-slate-900 text-slate-300 rounded-xl border border-slate-800">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>Add Channel</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {channels.map(c => (
          <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-bold text-white">{c.name}</h3>
                <button onClick={() => handleDelete(c.id)} className="text-slate-500 hover:text-rose-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="text-xs font-semibold text-amber-400 mb-2">
                {c.required_stars > 0 ? `${c.required_stars} Stars to Unlock` : 'Free Public Channel'}
              </div>
            </div>
            <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-[10px] text-slate-500">Order: #{c.display_order}</span>
              <a href={c.url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                <span>Join Channel</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Add Channel</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Channel Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="VIP Vault Channel"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Telegram Invite URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://t.me/+..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Required Stars</label>
                  <input
                    type="number"
                    value={requiredStars}
                    onChange={e => setRequiredStars(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Order</label>
                  <input
                    type="number"
                    value={displayOrder}
                    onChange={e => setDisplayOrder(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
