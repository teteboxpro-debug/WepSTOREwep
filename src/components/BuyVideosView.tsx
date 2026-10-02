import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import type { VideoPackage, VideoPackagePurchase } from '../types';
import {
  Video,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Film,
  ShoppingBag,
  Coins,
  RefreshCw,
  Eye,
  X
} from 'lucide-react';

export default function BuyVideosView() {
  const [packages, setPackages] = useState<VideoPackage[]>([]);
  const [purchases, setPurchases] = useState<VideoPackagePurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'packages' | 'purchases'>('packages');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [packageName, setPackageName] = useState('');
  const [numberOfVideos, setNumberOfVideos] = useState(5);
  const [starsPrice, setStarsPrice] = useState(40);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [packageActive, setPackageActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // View purchase modal
  const [selectedPurchase, setSelectedPurchase] = useState<VideoPackagePurchase | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pkgs, purs] = await Promise.all([
        apiRequest<VideoPackage[]>('/admin/video-packages'),
        apiRequest<VideoPackagePurchase[]>('/admin/video-package-purchases')
      ]);
      setPackages(pkgs);
      setPurchases(purs);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to fetch video packages' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update dynamic video URLs array when numberOfVideos changes
  const handleVideoCountChange = (count: number) => {
    const clamped = Math.max(1, Math.min(20, count));
    setNumberOfVideos(clamped);

    setVideoUrls(prev => {
      const next = [...prev];
      if (clamped > next.length) {
        while (next.length < clamped) {
          next.push('');
        }
      } else {
        next.splice(clamped);
      }
      return next;
    });
  };

  const handleUrlChange = (index: number, val: string) => {
    setVideoUrls(prev => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const openCreateModal = () => {
    setEditingId(null);
    setPackageName('');
    setNumberOfVideos(5);
    setStarsPrice(40);
    setVideoUrls(['', '', '', '', '']);
    setPackageActive(true);
    setIsModalOpen(true);
    setMessage(null);
  };

  const openEditModal = (pkg: VideoPackage) => {
    setEditingId(pkg.id);
    setPackageName(pkg.package_name);
    setNumberOfVideos(pkg.number_of_videos);
    setStarsPrice(pkg.stars_price);
    // Ensure array length matches number_of_videos
    const urls = [...(pkg.video_urls || [])];
    while (urls.length < pkg.number_of_videos) {
      urls.push('');
    }
    setVideoUrls(urls);
    setPackageActive(pkg.active);
    setIsModalOpen(true);
    setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const payload = {
        package_name: packageName.trim(),
        number_of_videos: numberOfVideos,
        stars_price: starsPrice,
        video_urls: videoUrls.map(u => u.trim()).filter(Boolean),
        active: packageActive
      };

      if (editingId) {
        await apiRequest(`/admin/video-packages/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        setMessage({ type: 'success', text: 'Video package updated successfully!' });
      } else {
        await apiRequest('/admin/video-packages', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setMessage({ type: 'success', text: 'New video package created successfully!' });
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Operation failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete package "${name}"?`)) return;

    try {
      await apiRequest(`/admin/video-packages/${id}`, { method: 'DELETE' });
      setMessage({ type: 'success', text: `Package "${name}" deleted` });
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete package' });
    }
  };

  const toggleActive = async (pkg: VideoPackage) => {
    try {
      await apiRequest(`/admin/video-packages/${pkg.id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: !pkg.active })
      });
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to toggle status' });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-400">Loading video packages from Supabase...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">🎬 BUY VIDEOS Management</h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
              PostgreSQL
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Create unlimited video packages with dynamic video streaming URLs, prices, and monitor user purchases.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Video Package</span>
          </button>
        </div>
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

      {/* Sub-tabs: Packages vs Purchases */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('packages')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === 'packages'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Active Packages ({packages.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('purchases')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === 'purchases'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Customer Purchases ({purchases.length})</span>
        </button>
      </div>

      {/* TAB 1: PACKAGES LIST */}
      {activeTab === 'packages' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
              <Film className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-300">No Video Packages Created Yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Click "New Video Package" above to create your first package.
              </p>
            </div>
          ) : (
            packages.map(pkg => (
              <div
                key={pkg.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight">{pkg.package_name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {pkg.number_of_videos} Videos Included
                      </p>
                    </div>

                    <button
                      onClick={() => toggleActive(pkg)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border cursor-pointer ${
                        pkg.active
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}
                    >
                      {pkg.active ? 'Active' : 'Inactive'}
                    </button>
                  </div>

                  {/* Price */}
                  <div className="flex items-center gap-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800/80 mb-3">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-slate-400 font-medium">Price:</span>
                    <span className="text-sm font-bold text-amber-400 ml-auto">{pkg.stars_price} Stars ⭐</span>
                  </div>

                  {/* URLs preview */}
                  <div className="space-y-1 mb-4">
                    <span className="text-[11px] font-medium text-slate-400">
                      Configured Video Links ({pkg.video_urls?.length || 0}):
                    </span>
                    <div className="space-y-1 max-h-24 overflow-y-auto scrollbar-none">
                      {pkg.video_urls?.map((url, idx) => (
                        <div
                          key={idx}
                          className="text-[11px] text-slate-400 bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/50 truncate flex items-center justify-between"
                        >
                          <span className="truncate max-w-[200px]">{idx + 1}. {url}</span>
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 ml-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-500">
                    Updated: {new Date(pkg.updated_at || pkg.created_at).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(pkg)}
                      className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                      title="Edit Package"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(pkg.id, pkg.package_name)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                      title="Delete Package"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: CUSTOMER PURCHASES */}
      {activeTab === 'purchases' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">Video Package Purchases Ledger</h2>
              <p className="text-xs text-slate-400">Audit trail of all video package sales in Supabase PostgreSQL</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3 font-medium">Customer (TG ID)</th>
                  <th className="pb-3 font-medium">Package</th>
                  <th className="pb-3 font-medium text-center">Video Count</th>
                  <th className="pb-3 font-medium text-right">Stars Paid</th>
                  <th className="pb-3 font-medium text-right">Purchase Date</th>
                  <th className="pb-3 font-medium text-center">Links</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No video packages purchased yet
                    </td>
                  </tr>
                ) : (
                  purchases.map(pur => (
                    <tr key={pur.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 font-mono font-semibold text-slate-300">
                        {pur.user_id}
                      </td>
                      <td className="py-3 font-semibold text-white">
                        {pur.package_name}
                      </td>
                      <td className="py-3 text-center text-slate-400">
                        {pur.video_count} Videos
                      </td>
                      <td className="py-3 text-right font-bold text-amber-400">
                        {pur.price_paid} ⭐
                      </td>
                      <td className="py-3 text-right text-slate-400">
                        {new Date(pur.purchased_at).toLocaleString()}
                      </td>
                      <td className="py-3 text-center">
                        <button
                          onClick={() => setSelectedPurchase(pur)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 mx-auto"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Links</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
                  <Video className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-white">
                  {editingId ? 'Edit Video Package' : 'Create Video Package'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Package Name (e.g., "5 Videos Package", "VIP 2 Videos Pack")
                </label>
                <input
                  type="text"
                  value={packageName}
                  onChange={e => setPackageName(e.target.value)}
                  placeholder="5 Videos Package"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Number of Videos (1-20)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={numberOfVideos}
                    onChange={e => handleVideoCountChange(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                    required
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Generates exact URL inputs below</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Price in Stars ⭐
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={starsPrice}
                    onChange={e => setStarsPrice(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-400 font-bold focus:outline-none focus:border-indigo-500 transition"
                    required
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Deducted on Buy Now</p>
                </div>
              </div>

              {/* DYNAMIC VIDEO URL FIELDS */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white">
                    Video Streaming / Download URLs ({numberOfVideos} required)
                  </label>
                  <span className="text-[10px] text-indigo-400">Dynamic fields</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {Array.from({ length: numberOfVideos }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-5 text-right text-[11px] font-mono text-slate-500">{i + 1}.</span>
                      <input
                        type="url"
                        value={videoUrls[i] || ''}
                        onChange={e => handleUrlChange(i, e.target.value)}
                        placeholder={`https://commondatastorage.googleapis.com/.../video${i + 1}.mp4`}
                        className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono transition"
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={packageActive}
                    onChange={e => setPackageActive(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded bg-slate-950 border-slate-800"
                  />
                  <span>Active & available in Telegram Bot menu</span>
                </label>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/25 transition cursor-pointer"
                >
                  {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW PURCHASE DETAILS MODAL */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Purchase #{selectedPurchase.id.slice(0, 12)}</h3>
              <button
                onClick={() => setSelectedPurchase(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Package:</span>
                <span className="font-semibold text-white">{selectedPurchase.package_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Buyer Telegram ID:</span>
                <span className="font-mono text-indigo-300">{selectedPurchase.user_id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Stars Paid:</span>
                <span className="font-bold text-amber-400">{selectedPurchase.price_paid} Stars ⭐</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Date:</span>
                <span className="text-slate-300">{new Date(selectedPurchase.purchased_at).toLocaleString()}</span>
              </div>

              <div className="pt-2">
                <span className="text-slate-400 block mb-1 font-semibold">Delivered Video URLs:</span>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {selectedPurchase.video_urls?.map((url, i) => (
                    <div key={i} className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="truncate max-w-[280px] text-slate-300 font-mono">{i + 1}. {url}</span>
                      <a href={url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedPurchase(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
