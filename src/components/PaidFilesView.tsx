import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import type { PaidFileItem, FilePurchaseItem } from '../types';
import { FolderArchive, Plus, Trash2, CheckCircle2, AlertTriangle, ExternalLink, X, RefreshCw, Key, Lock } from 'lucide-react';

export default function PaidFilesView() {
  const [files, setFiles] = useState<PaidFileItem[]>([]);
  const [purchases, setPurchases] = useState<FilePurchaseItem[]>([]);
  const [activeTab, setActiveTab] = useState<'files' | 'purchases'>('files');
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const [sampleUrl, setSampleUrl] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [fileCode, setFileCode] = useState('');
  const [zipPassword, setZipPassword] = useState('');
  const [priceStars, setPriceStars] = useState(20);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [f, p] = await Promise.all([
        apiRequest<PaidFileItem[]>('/admin/files'),
        apiRequest<FilePurchaseItem[]>('/admin/file-purchases')
      ]);
      setFiles(f);
      setPurchases(p);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to fetch files' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/admin/files', {
        method: 'POST',
        body: JSON.stringify({
          file_name: fileName,
          sample_url: sampleUrl,
          download_url: downloadUrl,
          file_code: fileCode || `ETB-${Math.floor(1000 + Math.random() * 9000)}`,
          zip_password: zipPassword,
          price_stars: priceStars
        })
      });
      setMessage({ type: 'success', text: 'Paid file package created!' });
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to create file' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/admin/files/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Paid Archive Files</h1>
          <p className="text-xs text-slate-400 mt-1">
            Premium password-protected downloads purchased with Stars under the "📁 Fɪʟᴇs" menu.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add File Package</span>
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl text-xs flex items-center gap-2.5 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('files')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === 'files' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FolderArchive className="w-3.5 h-3.5" />
          <span>Files Catalog ({files.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('purchases')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === 'purchases' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Purchases History ({purchases.length})</span>
        </button>
      </div>

      {activeTab === 'files' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map(f => (
            <div key={f.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-bold text-white">{f.file_name}</h3>
                  <button onClick={() => handleDelete(f.id)} className="text-slate-500 hover:text-rose-400 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-base font-bold text-amber-400 mb-2">{f.price_stars} Stars ⭐</div>

                <div className="space-y-1.5 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-500">File Code:</span>
                    <span className="font-mono text-indigo-300 font-semibold">{f.file_code}</span>
                  </div>
                  {f.zip_password && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">ZIP Password:</span>
                      <span className="font-mono text-emerald-400">{f.zip_password}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                <a href={f.download_url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold">
                  <span>Download URL</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-[10px] text-slate-500">{new Date(f.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'purchases' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 font-medium">User ID</th>
                <th className="pb-3 font-medium">File Name</th>
                <th className="pb-3 font-medium">File Code</th>
                <th className="pb-3 font-medium text-right">Price Paid</th>
                <th className="pb-3 font-medium text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {purchases.map(p => (
                <tr key={p.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 font-mono text-indigo-300">{p.user_id}</td>
                  <td className="py-3 font-semibold text-white">{p.file_name}</td>
                  <td className="py-3 font-mono text-slate-400">{p.file_code}</td>
                  <td className="py-3 text-right font-bold text-amber-400">{p.price_paid} ⭐</td>
                  <td className="py-3 text-right text-slate-500">{new Date(p.purchased_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Add Paid File</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">File Name</label>
                <input
                  type="text"
                  value={fileName}
                  onChange={e => setFileName(e.target.value)}
                  placeholder="Master Archive Vault Vol. 1"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Download URL</label>
                <input
                  type="url"
                  value={downloadUrl}
                  onChange={e => setDownloadUrl(e.target.value)}
                  placeholder="https://mega.nz/file/..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Sample Link (Optional)</label>
                <input
                  type="url"
                  value={sampleUrl}
                  onChange={e => setSampleUrl(e.target.value)}
                  placeholder="https://commondatastorage.googleapis.com/.../preview.mp4"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Price (Stars)</label>
                  <input
                    type="number"
                    value={priceStars}
                    onChange={e => setPriceStars(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-400 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Unlock Code</label>
                  <input
                    type="text"
                    value={fileCode}
                    onChange={e => setFileCode(e.target.value)}
                    placeholder="ETB-1001"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">ZIP Password (Optional)</label>
                <input
                  type="text"
                  value={zipPassword}
                  onChange={e => setZipPassword(e.target.value)}
                  placeholder="SecretPass2026@"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold">
                  {submitting ? 'Creating...' : 'Create File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
