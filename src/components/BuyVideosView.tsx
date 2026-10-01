import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import {
  Film,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Video,
  Star,
  ExternalLink,
  Power,
  RefreshCw,
  ShoppingBag,
  Clock,
  Sparkles
} from 'lucide-react';
import type { VideoPackage, VideoPackagePurchase } from '../types';

export default function BuyVideosView() {
  const [packages, setPackages] = useState<VideoPackage[]>([]);
  const [purchases, setPurchases] = useState<VideoPackagePurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'packages' | 'purchases'>('packages');

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [videoCount, setVideoCount] = useState<number>(5);
  const [starsPrice, setStarsPrice] = useState<number>(40);
  const [videoUrls, setVideoUrls] = useState<string[]>(['', '', '', '', '']);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync videoUrls array length when videoCount changes
  const handleVideoCountChange = (newCount: number) => {
    const validCount = Math.max(1, Math.min(50, newCount || 1));
    setVideoCount(validCount);
    setVideoUrls((prev) => {
      const copy = [...prev];
      if (copy.length < validCount) {
        while (copy.length < validCount) copy.push('');
      } else if (copy.length > validCount) {
        copy.length = validCount;
      }
      return copy;
    });
  };

  const handleUrlChange = (index: number, val: string) => {
    setVideoUrls((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const fetchData = async () => {
    try {
      const [pkgRes, purRes] = await Promise.all([
        apiRequest<{ packages: VideoPackage[] }>('/admin/video-packages'),
        apiRequest<{ purchases: VideoPackagePurchase[] }>('/admin/video-package-purchases')
      ]);
      setPackages(pkgRes.packages || []);
      setPurchases(purRes.purchases || []);
    } catch (err: any) {
      console.error('Error fetching video packages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setName('');
    setVideoCount(5);
    setStarsPrice(40);
    setVideoUrls(['', '', '', '', '']);
    setIsActive(true);
  };

  const handleEditClick = (pkg: VideoPackage) => {
    setIsEditing(true);
    setEditingId(pkg.id);
    setName(pkg.name);
    setVideoCount(pkg.video_count);
    setStarsPrice(pkg.stars_price);
    const urls = [...(pkg.video_urls || [])];
    while (urls.length < pkg.video_count) urls.push('');
    urls.length = pkg.video_count;
    setVideoUrls(urls);
    setIsActive(pkg.is_active);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Package Name is required' });
      return;
    }

    const filteredUrls = videoUrls.map((u) => u.trim());
    if (filteredUrls.some((u) => !u)) {
      setMessage({ type: 'error', text: `Please fill in all ${videoCount} video URL fields` });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      if (isEditing && editingId) {
        await apiRequest(`/admin/video-packages/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: name.trim(),
            video_count: videoCount,
            stars_price: starsPrice,
            video_urls: filteredUrls,
            is_active: isActive
          })
        });
        setMessage({ type: 'success', text: 'Video package updated successfully!' });
      } else {
        await apiRequest('/admin/video-packages', {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            video_count: videoCount,
            stars_price: starsPrice,
            video_urls: filteredUrls,
            is_active: isActive
          })
        });
        setMessage({ type: 'success', text: 'New video package created successfully!' });
      }
      resetForm();
      await fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save video package' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (pkg: VideoPackage) => {
    try {
      await apiRequest(`/admin/video-packages/${pkg.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !pkg.is_active })
      });
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle package status');
    }
  };

  const handleDelete = async (pkg: VideoPackage) => {
    if (!confirm(`Are you sure you want to delete "${pkg.name}"? Existing purchases will remain safe.`)) return;
    try {
      await apiRequest(`/admin/video-packages/${pkg.id}`, { method: 'DELETE' });
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete package');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm">Loading Buy Videos catalog...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              🎬
            </span>
            <span>BUY VIDEOS Management</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Create unlimited video packages with Stars pricing and dynamic video URLs delivered upon purchase.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('packages')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'packages'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            Video Packages ({packages.length})
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'purchases'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            Purchases ({purchases.length})
          </button>
        </div>
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

      {activeTab === 'packages' && (
        <>
          {/* Add / Edit Package Form */}
          <form
            onSubmit={handleSubmit}
            className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-semibold text-white text-base flex items-center gap-2">
                <Video className="w-4 h-4 text-indigo-400" />
                <span>{isEditing ? 'Edit Video Package' : 'Create New Video Package'}</span>
              </h3>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-slate-200 transition"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Package Name */}
              <div className="sm:col-span-1 space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Package Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. 5 Videos Package"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Number of Videos */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Number of Videos <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={videoCount}
                    onChange={(e) => handleVideoCountChange(parseInt(e.target.value, 10))}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <div className="flex gap-1">
                    {[2, 5, 10].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => handleVideoCountChange(count)}
                        className={`px-2 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
                          videoCount === count
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stars Price */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Stars Price (⭐ Points) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={starsPrice}
                  onChange={(e) => setStarsPrice(parseInt(e.target.value, 10) || 1)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Dynamic Video URL Fields (Exact matching number of videos) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5" />
                  <span>Video URLs ({videoCount} required)</span>
                </label>
                <span className="text-[11px] text-slate-500">
                  Exact links delivered to user immediately upon purchase
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                {videoUrls.map((url, idx) => (
                  <div key={idx} className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                      <span>Video URL {idx + 1}</span>
                      <span className="text-slate-600 font-mono">#{idx + 1}</span>
                    </label>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => handleUrlChange(idx, e.target.value)}
                      placeholder={`https://.../video-${idx + 1}`}
                      required
                      className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Active Toggle & Submit */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-800/80">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-950 border-slate-700"
                />
                <span className="text-xs font-medium text-slate-300">
                  Enable package immediately in Telegram Bot
                </span>
              </label>

              <div className="flex items-center gap-2">
                {isEditing && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/25 transition cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isEditing ? 'Save Changes' : 'Create Video Package'}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Packages List */}
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-semibold text-white text-base flex items-center gap-2">
                <span>Active Packages Catalog ({packages.length})</span>
              </h3>
              <span className="text-xs text-slate-400">
                Shown to users under 🎬 Bᴜʏ Vɪᴅᴇᴏs
              </span>
            </div>

            {packages.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <Video className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-sm">No video packages created yet.</p>
                <p className="text-xs text-slate-500">
                  Use the form above to add your first package (e.g. 5 Videos Package for 40 Stars).
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`p-4 rounded-xl border transition ${
                      pkg.is_active
                        ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-950/30 border-slate-800/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm">{pkg.name}</h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              pkg.is_active
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {pkg.is_active ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                          <span className="flex items-center gap-1 font-semibold text-amber-400">
                            ⭐ {pkg.stars_price} Stars
                          </span>
                          <span>•</span>
                          <span className="text-indigo-300 font-medium">
                            {pkg.video_count} Videos
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleActive(pkg)}
                          className={`p-1.5 rounded-lg border transition ${
                            pkg.is_active
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                          }`}
                          title={pkg.is_active ? 'Disable Package' : 'Enable Package'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleEditClick(pkg)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
                          title="Edit Package"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(pkg)}
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/20 transition"
                          title="Delete Package"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* URLs preview */}
                    <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                        Configured URLs ({pkg.video_urls?.length || 0}):
                      </span>
                      <div className="space-y-0.5">
                        {(pkg.video_urls || []).slice(0, 3).map((url, i) => (
                          <div key={i} className="text-[11px] font-mono text-slate-400 truncate flex items-center gap-1.5">
                            <span className="text-slate-600">#{i + 1}</span>
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-400 hover:underline truncate"
                            >
                              {url}
                            </a>
                          </div>
                        ))}
                        {(pkg.video_urls?.length || 0) > 3 && (
                          <span className="text-[10px] text-slate-500 italic block">
                            + {pkg.video_urls.length - 3} more URLs
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'purchases' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-semibold text-white text-base flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              <span>Video Packages Purchase History ({purchases.length})</span>
            </h3>
            <button
              onClick={fetchData}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {purchases.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <ShoppingBag className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-sm">No video packages purchased yet.</p>
              <p className="text-xs text-slate-500">
                Purchases made through the Telegram bot will appear here in real-time.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-medium">
                    <th className="py-2.5 px-3">User ID</th>
                    <th className="py-2.5 px-3">Package Name</th>
                    <th className="py-2.5 px-3">Stars Paid</th>
                    <th className="py-2.5 px-3">Videos Delivered</th>
                    <th className="py-2.5 px-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {purchases.map((pur) => (
                    <tr key={pur.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-semibold text-indigo-300">{pur.user_id}</td>
                      <td className="py-2.5 px-3 font-sans font-medium text-white">{pur.package_name}</td>
                      <td className="py-2.5 px-3 text-amber-400 font-semibold">⭐ {pur.stars_paid}</td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {pur.video_urls?.length || 0} links
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-sans text-[11px]">
                        {new Date(pur.purchased_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
