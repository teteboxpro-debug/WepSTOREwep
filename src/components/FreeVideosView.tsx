import { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import {
  Film,
  Plus,
  ExternalLink,
  Trash2,
  Edit2,
  CheckCircle2,
  Cloud,
  Send,
  X,
  Bell
} from 'lucide-react';
import type { FreeVideoItem } from '../types';

export default function FreeVideosView() {
  const [videos, setVideos] = useState<FreeVideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<FreeVideoItem | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [deliveryType, setDeliveryType] = useState<'TELEGRAM_CHANNEL' | 'EXTERNAL_CLOUD'>('EXTERNAL_CLOUD');
  const [telegramUrl, setTelegramUrl] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadCode, setDownloadCode] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [notifyUsers, setNotifyUsers] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<{ videos: FreeVideoItem[] }>('/admin/free-videos');
      setVideos(res.videos);
    } catch (err) {
      console.error('Error fetching free videos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const openCreateModal = () => {
    setEditingVideo(null);
    setTitle('');
    setDeliveryType('EXTERNAL_CLOUD');
    setTelegramUrl('');
    setDownloadUrl('');
    setDownloadCode('FREE' + Math.floor(1000 + Math.random() * 9000));
    setDescription('');
    setIsActive(true);
    setNotifyUsers(true);
    setModalOpen(true);
  };

  const openEditModal = (v: FreeVideoItem) => {
    setEditingVideo(v);
    setTitle(v.title);
    setDeliveryType(v.delivery_type);
    setTelegramUrl(v.telegram_message_url || '');
    setDownloadUrl(v.download_url || '');
    setDownloadCode(v.download_code || '');
    setDescription(v.description || '');
    setIsActive(v.is_active);
    setNotifyUsers(false);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setSubmitting(true);

    try {
      if (editingVideo) {
        await apiRequest(`/admin/free-videos/${editingVideo.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title,
            delivery_type: deliveryType,
            telegram_message_url: telegramUrl,
            download_url: downloadUrl,
            download_code: downloadCode,
            description,
            is_active: isActive
          })
        });
      } else {
        await apiRequest('/admin/free-videos', {
          method: 'POST',
          body: JSON.stringify({
            title,
            delivery_type: deliveryType,
            telegram_message_url: telegramUrl,
            download_url: downloadUrl,
            download_code: downloadCode,
            description,
            is_active: isActive,
            notify_users: notifyUsers
          })
        });
      }

      setModalOpen(false);
      await fetchVideos();
    } catch (err: any) {
      alert(err.message || 'Error saving video item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this free video?')) return;
    try {
      await apiRequest(`/admin/free-videos/${id}`, { method: 'DELETE' });
      await fetchVideos();
    } catch (err: any) {
      alert(err.message || 'Error deleting video');
    }
  };

  const handleToggleStatus = async (v: FreeVideoItem) => {
    try {
      await apiRequest(`/admin/free-videos/${v.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !v.is_active })
      });
      await fetchVideos();
    } catch (err: any) {
      alert(err.message || 'Error toggling video status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">FREE 1 VIDEOS Management</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Configure free delivery via Telegram channel message reference or external cloud download + code.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-medium shadow-md shadow-indigo-600/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Free Video</span>
        </button>
      </div>

      {/* Videos Grid */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 text-sm">Loading free video catalog...</div>
      ) : videos.length === 0 ? (
        <div className="p-10 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-500 text-sm">
          No free videos added yet. Click &quot;Add New Free Video&quot; to publish your first free content.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {videos.map((v) => (
            <div
              key={v.id}
              className={`p-5 rounded-2xl bg-slate-900 border transition flex flex-col justify-between ${
                v.is_active ? 'border-slate-800 hover:border-slate-700' : 'border-slate-800/40 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    {v.delivery_type === 'EXTERNAL_CLOUD' ? (
                      <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <Cloud className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Send className="w-4 h-4" />
                      </span>
                    )}
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {v.delivery_type === 'EXTERNAL_CLOUD' ? 'External Cloud + Code' : 'Telegram Channel'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleToggleStatus(v)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition cursor-pointer ${
                      v.is_active
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {v.is_active ? 'Active' : 'Disabled'}
                  </button>
                </div>

                <h3 className="font-bold text-white text-base mb-1">{v.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                  {v.description || 'No description provided.'}
                </p>

                {v.delivery_type === 'EXTERNAL_CLOUD' ? (
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs space-y-1">
                    <div className="text-slate-400 truncate">
                      <strong>URL:</strong> {v.download_url}
                    </div>
                    <div className="text-indigo-300 font-mono">
                      <strong>Code:</strong> {v.download_code || 'None'}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400 truncate">
                    <strong>TG URL:</strong> {v.telegram_message_url}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">
                  Added: {new Date(v.created_at).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(v)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(v.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add / Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-white text-base">
                {editingVideo ? 'Edit Free Video' : 'Add New Free Video'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Video Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 🎬 Free Video 1"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Delivery Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryType('EXTERNAL_CLOUD')}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition ${
                      deliveryType === 'EXTERNAL_CLOUD'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    <span>External Cloud + Code</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryType('TELEGRAM_CHANNEL')}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition ${
                      deliveryType === 'TELEGRAM_CHANNEL'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Telegram Channel</span>
                  </button>
                </div>
              </div>

              {deliveryType === 'EXTERNAL_CLOUD' ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Download URL</label>
                    <input
                      type="url"
                      value={downloadUrl}
                      onChange={(e) => setDownloadUrl(e.target.value)}
                      placeholder="https://example.com/file/123"
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Download Code</label>
                    <input
                      type="text"
                      value={downloadCode}
                      onChange={(e) => setDownloadCode(e.target.value)}
                      placeholder="e.g. A7K92X"
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-mono"
                      required
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Telegram Channel Message URL
                  </label>
                  <input
                    type="url"
                    value={telegramUrl}
                    onChange={(e) => setTelegramUrl(e.target.value)}
                    placeholder="https://t.me/channel/123"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional brief description of the video..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700"
                  />
                  <span>Active & available in bot menu</span>
                </label>

                {!editingVideo && (
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={notifyUsers}
                      onChange={(e) => setNotifyUsers(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700"
                    />
                    <span className="flex items-center gap-1 text-indigo-300 font-medium">
                      <Bell className="w-3.5 h-3.5" />
                      <span>Notify users when added (background broadcast queue)</span>
                    </span>
                  </label>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium shadow-md shadow-indigo-600/20"
                >
                  {submitting ? 'Saving...' : editingVideo ? 'Save Changes' : 'Publish Free Video'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
