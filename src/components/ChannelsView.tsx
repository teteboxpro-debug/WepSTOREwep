import { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import {
  Tv,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  X,
  ArrowUpDown,
  Star,
  Lock
} from 'lucide-react';
import type { ChannelItem } from '../types';

export default function ChannelsView() {
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingChan, setEditingChan] = useState<ChannelItem | null>(null);

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [order, setOrder] = useState('1');
  const [requiredStars, setRequiredStars] = useState('0');
  const [isActive, setIsActive] = useState(true);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<{ channels: ChannelItem[] }>('/admin/channels');
      setChannels(res.channels);
    } catch (err) {
      console.error('Error fetching channels:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const openCreateModal = () => {
    setEditingChan(null);
    setName('');
    setUrl('');
    setOrder((channels.length + 1).toString());
    setRequiredStars('0');
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (c: ChannelItem) => {
    setEditingChan(c);
    setName(c.name);
    setUrl(c.url);
    setOrder(c.display_order.toString());
    setRequiredStars((c.required_stars ?? 0).toString());
    setIsActive(c.is_active);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        url,
        display_order: parseInt(order, 10) || 1,
        required_stars: Math.max(0, parseInt(requiredStars, 10) || 0),
        is_active: isActive
      };

      if (editingChan) {
        await apiRequest(`/admin/channels/${editingChan.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiRequest('/admin/channels', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      setModalOpen(false);
      await fetchChannels();
    } catch (err: any) {
      alert(err.message || 'Error saving channel');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this channel?')) return;
    try {
      await apiRequest(`/admin/channels/${id}`, { method: 'DELETE' });
      await fetchChannels();
    } catch (err: any) {
      alert(err.message || 'Error deleting channel');
    }
  };

  const handleToggle = async (c: ChannelItem) => {
    try {
      await apiRequest(`/admin/channels/${c.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !c.is_active })
      });
      await fetchChannels();
    } catch (err: any) {
      alert(err.message || 'Error toggling channel');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Official Channels</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Manage official and backup Telegram channels displayed under &quot;📺 Channels&quot; in the bot menu.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-medium shadow-md shadow-indigo-600/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Channel</span>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading channels...</div>
        ) : channels.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">
            No official channels configured yet. Click &quot;Add Channel&quot; to add one.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {channels.map((c) => (
              <div
                key={c.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 font-mono text-xs font-bold">
                    #{c.display_order}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-sm sm:text-base">{c.name}</h3>
                      {(c.required_stars ?? 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                          <Lock className="w-3 h-3" />
                          <span>{c.required_stars} Stars to Enter</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span>Free Entry</span>
                        </span>
                      )}
                    </div>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-indigo-400 hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <span>{c.url}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleToggle(c)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer ${
                      c.is_active
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {c.is_active ? 'Active' : 'Disabled'}
                  </button>
                  <button
                    onClick={() => openEditModal(c)}
                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl">
            <h3 className="font-bold text-white text-base mb-4">
              {editingChan ? 'Edit Channel' : 'Add Channel'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Channel Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. 📢 Official Announcements"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Channel URL / Invite Link</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://t.me/your_channel"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Required Stars for Channel Entry (0 = Free)
                </label>
                <div className="relative">
                  <Star className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
                  <input
                    type="number"
                    min="0"
                    value={requiredStars}
                    onChange={(e) => setRequiredStars(e.target.value)}
                    placeholder="0 for free entry, or e.g. 50"
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-mono"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  If set to more than 0, users must unlock the channel with their internal Stars to access the join link.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Display Order</label>
                <input
                  type="number"
                  min="1"
                  value={order}
                  onChange={(e) => setOrder(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium"
                >
                  Save Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
