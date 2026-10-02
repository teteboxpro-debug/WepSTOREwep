import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import type { StarPackageItem, StarCodeItem, StarTx } from '../types';
import {
  Coins,
  Ticket,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  History,
  Copy,
  Check,
  RefreshCw,
  X
} from 'lucide-react';

export default function StarsCodesView() {
  const [activeTab, setActiveTab] = useState<'codes' | 'packages' | 'transactions'>('codes');
  const [codes, setCodes] = useState<StarCodeItem[]>([]);
  const [packages, setPackages] = useState<StarPackageItem[]>([]);
  const [transactions, setTransactions] = useState<StarTx[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate Codes Modal
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [codeName, setCodeName] = useState('');
  const [starsAmount, setStarsAmount] = useState(50);
  const [batchCount, setBatchCount] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Star Package Modal
  const [isPkgModalOpen, setIsPkgModalOpen] = useState(false);
  const [pkgName, setPkgName] = useState('');
  const [pkgStars, setPkgStars] = useState(100);
  const [pkgPrice, setPkgPrice] = useState(2.99);
  const [pkgUrl, setPkgUrl] = useState('');

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sc, sp, tx] = await Promise.all([
        apiRequest<StarCodeItem[]>('/admin/star-codes'),
        apiRequest<StarPackageItem[]>('/admin/star-packages'),
        apiRequest<StarTx[]>('/admin/transactions')
      ]);
      setCodes(sc);
      setPackages(sp);
      setTransactions(tx);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to fetch data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGenerateCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/admin/star-codes', {
        method: 'POST',
        body: JSON.stringify({
          code: codeName.trim() || undefined,
          stars_amount: starsAmount,
          count: batchCount
        })
      });
      setMessage({ type: 'success', text: `Generated ${batchCount} star codes successfully!` });
      setIsCodeModalOpen(false);
      setCodeName('');
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to generate codes' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/admin/star-packages', {
        method: 'POST',
        body: JSON.stringify({
          name: pkgName.trim(),
          stars_amount: pkgStars,
          price_usd: pkgPrice,
          payment_url: pkgUrl
        })
      });
      setMessage({ type: 'success', text: 'Star package created!' });
      setIsPkgModalOpen(false);
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to create package' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCode = async (id: string) => {
    try {
      await apiRequest(`/admin/star-codes/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete code' });
    }
  };

  const handleDeletePackage = async (id: string) => {
    try {
      await apiRequest(`/admin/star-packages/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete package' });
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Stars & Redeem Codes</h1>
          <p className="text-xs text-slate-400 mt-1">
            Generate redeemable promo codes, manage top-up star packages, and audit the PostgreSQL transactions ledger.
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

          {activeTab === 'codes' && (
            <button
              onClick={() => setIsCodeModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Generate Codes</span>
            </button>
          )}

          {activeTab === 'packages' && (
            <button
              onClick={() => setIsPkgModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-amber-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Package</span>
            </button>
          )}
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

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('codes')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === 'codes' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Ticket className="w-3.5 h-3.5" />
          <span>Redeem Codes ({codes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('packages')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === 'packages' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Coins className="w-3.5 h-3.5" />
          <span>Star Packages ({packages.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === 'transactions' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Ledger History ({transactions.length})</span>
        </button>
      </div>

      {/* TAB 1: CODES */}
      {activeTab === 'codes' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3 font-medium">Redeem Code</th>
                  <th className="pb-3 font-medium text-right">Stars Reward</th>
                  <th className="pb-3 font-medium text-center">Status</th>
                  <th className="pb-3 font-medium">Redeemed By</th>
                  <th className="pb-3 font-medium text-right">Created</th>
                  <th className="pb-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {codes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No codes generated yet
                    </td>
                  </tr>
                ) : (
                  codes.map(c => (
                    <tr key={c.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 font-mono font-bold text-white flex items-center gap-2">
                        <span>{c.code}</span>
                        <button
                          onClick={() => copyToClipboard(c.code, c.id)}
                          className="text-slate-500 hover:text-slate-300"
                          title="Copy Code"
                        >
                          {copiedId === c.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                      <td className="py-3 text-right font-bold text-amber-400 font-mono">
                        +{c.stars_amount} ⭐
                      </td>
                      <td className="py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            c.is_used
                              ? 'bg-slate-800 text-slate-500 border-slate-700'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}
                        >
                          {c.is_used ? 'Claimed' : 'Available'}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400 font-mono">
                        {c.used_by_user_id ? (
                          <span>
                            {c.used_by_user_id} {c.used_by_username && `(@${c.used_by_username})`}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-3 text-right text-slate-500">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDeleteCode(c.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* TAB 2: PACKAGES */}
      {activeTab === 'packages' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {packages.map(p => (
            <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-bold text-white">{p.name}</h3>
                  <button onClick={() => handleDeletePackage(p.id)} className="text-slate-500 hover:text-rose-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-2xl font-bold text-amber-400 mb-1">{p.stars_amount} Stars ⭐</div>
                <div className="text-xs text-slate-400">${p.price_usd} USD</div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 truncate">
                {p.payment_url || 'Manual payment link'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: TRANSACTIONS LEDGER */}
      {activeTab === 'transactions' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3 font-medium">User ID</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Description</th>
                  <th className="pb-3 font-medium text-right">Amount</th>
                  <th className="pb-3 font-medium text-right">Balance</th>
                  <th className="pb-3 font-medium text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {transactions.map(t => {
                  const isCredit = t.amount > 0;
                  return (
                    <tr key={t.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 font-mono text-slate-300 font-semibold">{t.user_id}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300">
                          {t.type}
                        </span>
                      </td>
                      <td className="py-3 text-slate-300">{t.description}</td>
                      <td className={`py-3 text-right font-bold ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isCredit ? `+${t.amount}` : t.amount} ⭐
                      </td>
                      <td className="py-3 text-right text-slate-400 font-mono">{t.balance_after} ⭐</td>
                      <td className="py-3 text-right text-slate-500">{new Date(t.timestamp).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GENERATE CODES MODAL */}
      {isCodeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Generate Star Codes</h3>
              <button onClick={() => setIsCodeModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateCodes} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Custom Code Name (Leave blank for random)
                </label>
                <input
                  type="text"
                  value={codeName}
                  onChange={e => setCodeName(e.target.value.toUpperCase())}
                  placeholder="e.g. VIPBONUS50"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Stars Amount per Code
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={starsAmount}
                  onChange={e => setStarsAmount(parseInt(e.target.value, 10) || 10)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Batch Count (Number of codes to generate)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={batchCount}
                  onChange={e => setBatchCount(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCodeModalOpen(false)}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
                >
                  {submitting ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PACKAGE MODAL */}
      {isPkgModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Create Star Package</h3>
              <button onClick={() => setIsPkgModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePackage} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Package Name</label>
                <input
                  type="text"
                  value={pkgName}
                  onChange={e => setPkgName(e.target.value)}
                  placeholder="Starter Pack"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Stars</label>
                  <input
                    type="number"
                    value={pkgStars}
                    onChange={e => setPkgStars(parseInt(e.target.value, 10) || 50)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Price (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={pkgPrice}
                    onChange={e => setPkgPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Payment URL</label>
                <input
                  type="url"
                  value={pkgUrl}
                  onChange={e => setPkgUrl(e.target.value)}
                  placeholder="https://pay.example.com/item"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsPkgModalOpen(false)}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold"
                >
                  {submitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
