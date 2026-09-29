import { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import {
  Star,
  Key,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  X,
  CreditCard,
  Copy,
  Check
} from 'lucide-react';
import type { StarPackageItem, StarCodeItem } from '../types';

export default function PackagesView() {
  const [packages, setPackages] = useState<StarPackageItem[]>([]);
  const [codes, setCodes] = useState<StarCodeItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Package Modal
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<StarPackageItem | null>(null);
  const [pkgName, setPkgName] = useState('');
  const [pkgStars, setPkgStars] = useState('100');
  const [pkgPriceUsd, setPkgPriceUsd] = useState('1.99');
  const [pkgPaymentUrl, setPkgPaymentUrl] = useState('');
  const [pkgPaymentInfo, setPkgPaymentInfo] = useState('');

  // Code Modal
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [newCodeStr, setNewCodeStr] = useState('');
  const [newCodeStars, setNewCodeStars] = useState('100');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resPkg, resCode] = await Promise.all([
        apiRequest<{ packages: StarPackageItem[] }>('/admin/packages'),
        apiRequest<{ codes: StarCodeItem[] }>('/admin/codes')
      ]);
      setPackages(resPkg.packages);
      setCodes(resCode.codes);
    } catch (err) {
      console.error('Error fetching packages and codes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreatePackage = () => {
    setEditingPkg(null);
    setPkgName('⭐ 100 Stars');
    setPkgStars('100');
    setPkgPriceUsd('1.99');
    setPkgPaymentUrl('https://etebox.com/pay/100');
    setPkgPaymentInfo('Instant activation after payment');
    setPackageModalOpen(true);
  };

  const openEditPackage = (p: StarPackageItem) => {
    setEditingPkg(p);
    setPkgName(p.name);
    setPkgStars(p.stars_amount.toString());
    setPkgPriceUsd(p.price_usd.toString());
    setPkgPaymentUrl(p.payment_url);
    setPkgPaymentInfo(p.payment_info);
    setPackageModalOpen(true);
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPkg) {
        await apiRequest(`/admin/packages/${editingPkg.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: pkgName,
            stars_amount: parseInt(pkgStars, 10),
            price_usd: parseFloat(pkgPriceUsd),
            payment_url: pkgPaymentUrl,
            payment_info: pkgPaymentInfo
          })
        });
      } else {
        await apiRequest('/admin/packages', {
          method: 'POST',
          body: JSON.stringify({
            name: pkgName,
            stars_amount: parseInt(pkgStars, 10),
            price_usd: parseFloat(pkgPriceUsd),
            payment_url: pkgPaymentUrl,
            payment_info: pkgPaymentInfo
          })
        });
      }
      setPackageModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error saving package');
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return;
    try {
      await apiRequest(`/admin/packages/${id}`, { method: 'DELETE' });
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error deleting package');
    }
  };

  const openCreateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let rand = '';
    for (let i = 0; i < 7; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCodeStr(rand);
    setNewCodeStars('100');
    setCodeModalOpen(true);
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/admin/codes', {
        method: 'POST',
        body: JSON.stringify({
          code: newCodeStr,
          stars_amount: parseInt(newCodeStars, 10)
        })
      });
      setCodeModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error creating code');
    }
  };

  const handleDeleteCode = async (code: string) => {
    if (!confirm(`Are you sure you want to delete code ${code}?`)) return;
    try {
      await apiRequest(`/admin/codes/${code}`, { method: 'DELETE' });
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error deleting code');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* SECTION 1: PACKAGES */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Buy Stars Packages</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Configure packages shown under &quot;⭐ Buy Stars&quot; in the Telegram bot menu.
            </p>
          </div>

          <button
            onClick={openCreatePackage}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-medium shadow-md shadow-indigo-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Stars Package</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl font-bold text-white">{pkg.name}</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">${pkg.price_usd}</span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold mb-3">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span>+{pkg.stars_amount} Internal Stars</span>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                  {pkg.payment_info || 'Payment link configured'}
                </p>

                <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400 truncate">
                  <strong>Link:</strong> {pkg.payment_url}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-end gap-1.5">
                <button
                  onClick={() => openEditPackage(pkg)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeletePackage(pkg.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: ONE-TIME STARS CODES */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-400" />
              <span>One-Time Stars Codes</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              One-time redeemable codes users can enter via <code>/redeem CODE</code> in Telegram to receive Stars.
            </p>
          </div>

          <button
            onClick={openCreateCode}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Generate New Code</span>
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {codes.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs sm:text-sm">
              No one-time codes generated yet. Click &quot;Generate New Code&quot; to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Stars Value</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Redeemed By</th>
                    <th className="py-3 px-4">Redeemed Date</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {codes.map((c) => (
                    <tr key={c.code} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white bg-slate-950 px-2 py-1 rounded border border-slate-800">
                            {c.code}
                          </span>
                          <button
                            onClick={() => copyToClipboard(c.code)}
                            className="p-1 text-slate-500 hover:text-white"
                            title="Copy code"
                          >
                            {copiedCode === c.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-amber-400">
                        ⭐ +{c.stars_amount}
                      </td>
                      <td className="py-3 px-4">
                        {c.is_used ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                            Used
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Available
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {c.used_by_user_id ? (
                          <span>
                            {c.used_by_username || 'User'} ({c.used_by_user_id})
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs">
                        {c.used_at ? new Date(c.used_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteCode(c.code)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition"
                          title="Delete code"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Package Modal */}
      {packageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl">
            <h3 className="font-bold text-white text-base mb-4">
              {editingPkg ? 'Edit Package' : 'Create Stars Package'}
            </h3>
            <form onSubmit={handleSavePackage} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Package Name</label>
                <input
                  type="text"
                  value={pkgName}
                  onChange={(e) => setPkgName(e.target.value)}
                  placeholder="e.g. ⭐ 100 Stars"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Stars Amount</label>
                  <input
                    type="number"
                    min="1"
                    value={pkgStars}
                    onChange={(e) => setPkgStars(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Price (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={pkgPriceUsd}
                    onChange={(e) => setPkgPriceUsd(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Payment Link / URL</label>
                <input
                  type="url"
                  value={pkgPaymentUrl}
                  onChange={(e) => setPkgPaymentUrl(e.target.value)}
                  placeholder="https://etebox.com/pay/100"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Payment Information</label>
                <input
                  type="text"
                  value={pkgPaymentInfo}
                  onChange={(e) => setPkgPaymentInfo(e.target.value)}
                  placeholder="e.g. Instant automatic activation"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPackageModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium"
                >
                  Save Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Code Modal */}
      {codeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl">
            <h3 className="font-bold text-white text-base mb-4">Generate One-Time Stars Code</h3>
            <form onSubmit={handleCreateCode} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">One-Time Code</label>
                <input
                  type="text"
                  value={newCodeStr}
                  onChange={(e) => setNewCodeStr(e.target.value)}
                  placeholder="e.g. igkgktk or Hkdorigi"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Stars Amount</label>
                <input
                  type="number"
                  min="1"
                  value={newCodeStars}
                  onChange={(e) => setNewCodeStars(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCodeModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium"
                >
                  Create Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
