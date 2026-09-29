import { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import {
  FileBox,
  Plus,
  Trash2,
  Edit2,
  Lock,
  Key,
  ExternalLink,
  Star,
  X
} from 'lucide-react';
import type { PaidFileItem } from '../types';

export default function FilesView() {
  const [files, setFiles] = useState<PaidFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<PaidFileItem | null>(null);

  // Form
  const [fileName, setFileName] = useState('');
  const [sampleUrl, setSampleUrl] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [fileCode, setFileCode] = useState('');
  const [zipPassword, setZipPassword] = useState('');
  const [priceStars, setPriceStars] = useState('10');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<{ files: PaidFileItem[] }>('/admin/files');
      setFiles(res.files);
    } catch (err) {
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const openCreateModal = () => {
    setEditingFile(null);
    setFileName('');
    setSampleUrl('');
    setDownloadUrl('');
    setFileCode('FILE_' + Math.random().toString(36).substring(2, 8).toUpperCase());
    setZipPassword('12345');
    setPriceStars('10');
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (f: PaidFileItem) => {
    setEditingFile(f);
    setFileName(f.file_name);
    setSampleUrl(f.sample_url || '');
    setDownloadUrl(f.download_url);
    setFileCode(f.file_code);
    setZipPassword(f.zip_password || '');
    setPriceStars(f.price_stars.toString());
    setIsActive(f.is_active);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName || !downloadUrl) return;
    setSubmitting(true);

    try {
      if (editingFile) {
        await apiRequest(`/admin/files/${editingFile.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            file_name: fileName,
            sample_url: sampleUrl,
            download_url: downloadUrl,
            file_code: fileCode,
            zip_password: zipPassword,
            price_stars: parseInt(priceStars, 10) || 10,
            is_active: isActive
          })
        });
      } else {
        await apiRequest('/admin/files', {
          method: 'POST',
          body: JSON.stringify({
            file_name: fileName,
            sample_url: sampleUrl,
            download_url: downloadUrl,
            file_code: fileCode,
            zip_password: zipPassword,
            price_stars: parseInt(priceStars, 10) || 10,
            is_active: isActive
          })
        });
      }

      setModalOpen(false);
      await fetchFiles();
    } catch (err: any) {
      alert(err.message || 'Error saving file item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this paid file?')) return;
    try {
      await apiRequest(`/admin/files/${id}`, { method: 'DELETE' });
      await fetchFiles();
    } catch (err: any) {
      alert(err.message || 'Error deleting file');
    }
  };

  const handleToggleStatus = async (f: PaidFileItem) => {
    try {
      await apiRequest(`/admin/files/${f.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !f.is_active })
      });
      await fetchFiles();
    } catch (err: any) {
      alert(err.message || 'Error toggling file status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Paid Files Catalog</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Configure premium files unlocked with internal Stars. Each file includes sample link, download link, unique code, and ZIP password.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-medium shadow-md shadow-indigo-600/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Paid File</span>
        </button>
      </div>

      {/* Files Grid */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 text-sm">Loading files...</div>
      ) : files.length === 0 ? (
        <div className="p-10 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-500 text-sm">
          No files in the catalog yet. Click &quot;Add New Paid File&quot; to publish.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((f) => (
            <div
              key={f.id}
              className={`p-5 rounded-2xl bg-slate-900 border transition flex flex-col justify-between ${
                f.is_active ? 'border-slate-800 hover:border-slate-700' : 'border-slate-800/40 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold font-mono">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{f.price_stars} Stars</span>
                  </div>

                  <button
                    onClick={() => handleToggleStatus(f)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition cursor-pointer ${
                      f.is_active
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {f.is_active ? 'Active' : 'Disabled'}
                  </button>
                </div>

                <h3 className="font-bold text-white text-base mb-2">{f.file_name}</h3>

                <div className="space-y-1.5 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800 font-mono">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-500 font-sans">File Code:</span>
                    <span className="text-indigo-400 font-bold">{f.file_code}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-500 font-sans">ZIP Pass:</span>
                    <span className="text-emerald-400">{f.zip_password || 'None'}</span>
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-400 space-y-1">
                  {f.sample_url && (
                    <div className="truncate">
                      <span className="text-slate-500">Sample:</span> {f.sample_url}
                    </div>
                  )}
                  <div className="truncate">
                    <span className="text-slate-500">Download:</span> {f.download_url}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">
                  {new Date(f.created_at).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(f)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(f.id)}
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
                {editingFile ? 'Edit Paid File' : 'Add New Paid File'}
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
                <label className="block text-xs font-medium text-slate-300 mb-1">File Name</label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="e.g. 🎬 File 1 Sample Pack"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Stars Price</label>
                  <input
                    type="number"
                    min="1"
                    value={priceStars}
                    onChange={(e) => setPriceStars(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Unique File Code</label>
                  <input
                    type="text"
                    value={fileCode}
                    onChange={(e) => setFileCode(e.target.value)}
                    placeholder="e.g. A7K92X"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Sample URL</label>
                <input
                  type="url"
                  value={sampleUrl}
                  onChange={(e) => setSampleUrl(e.target.value)}
                  placeholder="https://example.com/sample/video.mp4"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Download URL</label>
                <input
                  type="url"
                  value={downloadUrl}
                  onChange={(e) => setDownloadUrl(e.target.value)}
                  placeholder="https://example.com/download/archive.zip"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">ZIP Password (Optional)</label>
                <input
                  type="text"
                  value={zipPassword}
                  onChange={(e) => setZipPassword(e.target.value)}
                  placeholder="e.g. 12345"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-mono"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700"
                  />
                  <span>Active & visible in bot</span>
                </label>
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
                  {submitting ? 'Saving...' : editingFile ? 'Save Changes' : 'Create Paid File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
