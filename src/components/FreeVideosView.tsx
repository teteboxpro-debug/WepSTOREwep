import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import type { FreeVideo } from '../types';
import { Film, Plus, Trash2, CheckCircle2, AlertTriangle, ExternalLink, X, RefreshCw } from 'lucide-react';

export default function FreeVideosView() {
  const [videos, setVideos] = useState<FreeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [deliveryType, setDeliveryType] = useState<'DIRECT_VIDEO' | 'EXTERNAL_CLOUD' | 'TELEGRAM_CHANNEL'>('DIRECT_VIDEO');
  const [directVideoUrl, setDirectVideoUrl] = useState('');
  const [fileSizeMb, setFileSizeMb] = useState(25);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<FreeVideo[]>('/admin/free-videos');
      setVideos(data);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to fetch free videos' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/admin/free-videos', {
        method: 'POST',
        body: JSON.stringify({
          title,
          delivery_type: deliveryType,
          direct_video_url: directVideoUrl,
          file_size_mb: fileSizeMb,
          description
        })
      });
      setMessage({ type: 'success', text: 'Free showcase video added!' });
      setIsModalOpen(false);
      setTitle('');
      setDirectVideoUrl('');
      fetchVideos();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to add video' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/admin/free-videos/${id}`, { method: 'DELETE' });
      fetchVideos();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Free Showcase Videos</h1>
          <p className="text-xs text-slate-400 mt-1">
            Free teaser videos shown under the "🆓 Fʀᴇᴇ Vɪᴅᴇᴏs" button in Telegram bot.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={fetchVideos} className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Free Video</span>
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl text-xs flex items-center gap-2.5 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map(v => (
          <div key={v.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm font-bold text-white">{v.title}</h3>
                <button onClick={() => handleDelete(v.id)} className="text-slate-500 hover:text-rose-400 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-400 mb-3">{v.description || 'Showcase preview'}</p>
              <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-950 p-2 rounded-lg border border-slate-800">
                <span>Size: {v.file_size_mb || 25} MB</span>
                <span className="font-mono text-indigo-400">{v.delivery_type}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-[10px] text-slate-500">{new Date(v.created_at).toLocaleDateString()}</span>
              {v.direct_video_url && (
                <a href={v.direct_video_url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold">
                  <span>Stream Link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Add Free Video</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Official Showcase Trailer 4K"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Direct Video URL</label>
                <input
                  type="url"
                  value={directVideoUrl}
                  onChange={e => setDirectVideoUrl(e.target.value)}
                  placeholder="https://commondatastorage.googleapis.com/.../video.mp4"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Size (MB)</label>
                  <input
                    type="number"
                    value={fileSizeMb}
                    onChange={e => setFileSizeMb(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Delivery</label>
                  <select
                    value={deliveryType}
                    onChange={e => setDeliveryType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="DIRECT_VIDEO">DIRECT VIDEO</option>
                    <option value="EXTERNAL_CLOUD">EXTERNAL CLOUD</option>
                    <option value="TELEGRAM_CHANNEL">TELEGRAM CHANNEL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold">
                  {submitting ? 'Adding...' : 'Add Video'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
