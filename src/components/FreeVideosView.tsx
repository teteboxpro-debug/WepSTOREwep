import { useState, useEffect, useRef } from 'react';
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
  Bell,
  Video,
  AlertTriangle,
  FileVideo
} from 'lucide-react';
import type { FreeVideoItem } from '../types';

export default function FreeVideosView() {
  const [videos, setVideos] = useState<FreeVideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<FreeVideoItem | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [deliveryType, setDeliveryType] = useState<'DIRECT_VIDEO' | 'EXTERNAL_CLOUD' | 'TELEGRAM_CHANNEL'>('DIRECT_VIDEO');
  const [directVideoUrl, setDirectVideoUrl] = useState('');
  const [fileSizeMb, setFileSizeMb] = useState<number | undefined>(undefined);
  const [telegramUrl, setTelegramUrl] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadCode, setDownloadCode] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [notifyUsers, setNotifyUsers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sizeError, setSizeError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setDeliveryType('DIRECT_VIDEO');
    setDirectVideoUrl('');
    setFileSizeMb(undefined);
    setTelegramUrl('');
    setDownloadUrl('');
    setDownloadCode('FREE' + Math.floor(1000 + Math.random() * 9000));
    setDescription('');
    setIsActive(true);
    setNotifyUsers(true);
    setSizeError(null);
    setModalOpen(true);
  };

  const openEditModal = (v: FreeVideoItem) => {
    setEditingVideo(v);
    setTitle(v.title);
    setDeliveryType(v.delivery_type);
    setDirectVideoUrl(v.direct_video_url || '');
    setFileSizeMb(v.file_size_mb);
    setTelegramUrl(v.telegram_message_url || '');
    setDownloadUrl(v.download_url || '');
    setDownloadCode(v.download_code || '');
    setDescription(v.description || '');
    setIsActive(v.is_active);
    setNotifyUsers(false);
    setSizeError(null);
    setModalOpen(true);
  };

  // Handle direct file selection & strict 30MB limit check
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSizeError(null);
    const sizeInMb = file.size / (1024 * 1024);

    // Strict 30MB check requested by user
    if (sizeInMb > 30) {
      setSizeError(`⚠️ حجم الفيديو (${sizeInMb.toFixed(1)} MB) يتجاوز الحد الأقصى المسموح (30MB)! بالنسبة للفيديوهات التي تتجاوز 30MB، يرجى اختيار خيار "سحابة التخزين (Cloud Link)" ورفعها على Google Drive أو Mega ووضع الرابط في الزر.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const uploadRes = await apiRequest<{ success: boolean; url: string; sizeMb: number }>('/admin/free-videos/upload-direct', {
            method: 'POST',
            body: JSON.stringify({
              filename: file.name,
              base64Data,
              sizeBytes: file.size
            })
          });

          setDirectVideoUrl(uploadRes.url);
          setFileSizeMb(uploadRes.sizeMb);
          if (!title) {
            setTitle(file.name.replace(/\.[^/.]+$/, ''));
          }
        } catch (err: any) {
          setSizeError(err.message || 'فشل في رفع الفيديو');
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setSizeError(err.message || 'Error processing file');
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    if (deliveryType === 'DIRECT_VIDEO' && !directVideoUrl) {
      alert('يرجى اختيار ملف فيديو مباشر (30MB أو أقل) أو إدخال رابط فيديو مباشر.');
      return;
    }

    setSubmitting(true);

    try {
      if (editingVideo) {
        await apiRequest(`/admin/free-videos/${editingVideo.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title,
            delivery_type: deliveryType,
            direct_video_url: directVideoUrl,
            file_size_mb: fileSizeMb,
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
            direct_video_url: directVideoUrl,
            file_size_mb: fileSizeMb,
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
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">FREE 1 VIDEOS Management (فيديوهات مجانية)</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            فيديو مباشر حتى 30MB أو رابط سحابي خارجي للفيديوهات الأكبر حجماً (+30MB).
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-medium shadow-md shadow-indigo-600/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Free Video (إضافة فيديو مجاني)</span>
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
                    {v.delivery_type === 'DIRECT_VIDEO' ? (
                      <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Video className="w-4 h-4" />
                      </span>
                    ) : v.delivery_type === 'EXTERNAL_CLOUD' ? (
                      <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <Cloud className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Send className="w-4 h-4" />
                      </span>
                    )}
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {v.delivery_type === 'DIRECT_VIDEO'
                        ? '🎥 فيديو مباشر (≤ 30MB)'
                        : v.delivery_type === 'EXTERNAL_CLOUD'
                        ? '☁️ سحابة تخزين (+30MB)'
                        : '📢 قناة تيليجرام'}
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

                <h3 className="font-bold text-base text-white mb-1">{v.title}</h3>
                {v.description && (
                  <p className="text-xs text-slate-400 mb-3 line-clamp-2">{v.description}</p>
                )}

                {/* Details box */}
                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 text-xs space-y-1.5 mt-2">
                  {v.delivery_type === 'DIRECT_VIDEO' ? (
                    <>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>نوع الاستلام:</span>
                        <span className="text-emerald-400 font-medium">مباشر في التليجرام</span>
                      </div>
                      {v.file_size_mb && (
                        <div className="flex items-center justify-between text-slate-300">
                          <span>الحجم:</span>
                          <span className="font-mono text-emerald-300">{v.file_size_mb} MB (≤ 30MB)</span>
                        </div>
                      )}
                      {v.direct_video_url && (
                        <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800">
                          <span className="truncate max-w-[200px] text-slate-500">{v.direct_video_url}</span>
                          <a
                            href={v.direct_video_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
                          >
                            <span>معاينة</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </>
                  ) : v.delivery_type === 'EXTERNAL_CLOUD' ? (
                    <>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>رابط السحابة:</span>
                        <a
                          href={v.download_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 truncate max-w-[180px]"
                        >
                          <span className="truncate">{v.download_url}</span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </div>
                      {v.download_code && (
                        <div className="flex items-center justify-between text-slate-300">
                          <span>كود التحميل:</span>
                          <span className="font-mono px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-cyan-300">
                            {v.download_code}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-between text-slate-300">
                      <span>رابط القناة:</span>
                      <a
                        href={v.telegram_message_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 truncate max-w-[180px]"
                      >
                        <span className="truncate">{v.telegram_message_url}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-500">
                  {new Date(v.created_at).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(v)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition cursor-pointer"
                    title="Edit Video"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(v.id)}
                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs transition cursor-pointer"
                    title="Delete Video"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-white text-base">
                {editingVideo ? 'تعديل الفيديو المجاني' : 'إضافة فيديو مجاني جديد (FREE 1 VIDEOS)'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">عنوان الفيديو (Video Title)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: 🎬 فيديو مجاني حصري 1"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">طريقة توفير الفيديو (Delivery Method)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setDeliveryType('DIRECT_VIDEO'); setSizeError(null); }}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      deliveryType === 'DIRECT_VIDEO'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>🎥 فيديو مباشر (≤ 30MB)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setDeliveryType('EXTERNAL_CLOUD'); setSizeError(null); }}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      deliveryType === 'EXTERNAL_CLOUD'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    <span>☁️ سحابة تخزين (+30MB)</span>
                  </button>
                </div>
              </div>

              {/* Option 1: Direct Video */}
              {deliveryType === 'DIRECT_VIDEO' && (
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                      <FileVideo className="w-4 h-4" />
                      <span>رفع فيديو مباشر (الحد الأقصى: 30MB فقط)</span>
                    </span>
                    <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Direct Telegram Video
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">اختر ملف الفيديو من جهازك (MP4 / WebM / MKV):</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleFileChange}
                      disabled={uploading}
                      className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                    />
                  </div>

                  {uploading && (
                    <div className="flex items-center gap-2 text-indigo-400 py-1">
                      <span className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      <span>جارٍ فحص حجم الملف ورفعه إلى السيرفر...</span>
                    </div>
                  )}

                  {sizeError && (
                    <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
                      <div>{sizeError}</div>
                    </div>
                  )}

                  {directVideoUrl && (
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-emerald-300 flex items-center justify-between">
                      <span className="truncate max-w-[250px]">جاهز: {directVideoUrl}</span>
                      {fileSizeMb && <span className="font-mono text-xs font-bold">{fileSizeMb} MB</span>}
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-400 mb-1">أو أدخل رابط فيديو مباشر مسبق الرفع:</label>
                    <input
                      type="url"
                      value={directVideoUrl}
                      onChange={(e) => setDirectVideoUrl(e.target.value)}
                      placeholder="https://example.com/videos/sample.mp4"
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Option 2: Cloud Storage */}
              {deliveryType === 'EXTERNAL_CLOUD' && (
                <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                      <Cloud className="w-4 h-4" />
                      <span>سحابة تخزين للفيديوهات الكبيرة (+30MB)</span>
                    </span>
                    <span className="text-[11px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                      Drive / Mega / MediaFire
                    </span>
                  </div>

                  <p className="text-slate-400 text-[11px]">
                    إذا كان حجم الفيديو أكثر من 30MB، قم برفعه على Google Drive أو Mega أو MediaFire ثم الصق رابط السحابة هنا ليظهر للمستخدم كزر تحميل.
                  </p>

                  <div>
                    <label className="block text-slate-300 mb-1">رابط سحابة التخزين (Cloud Download URL)</label>
                    <input
                      type="url"
                      value={downloadUrl}
                      onChange={(e) => setDownloadUrl(e.target.value)}
                      placeholder="https://mega.nz/file/... أو https://drive.google.com/..."
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">كود التحميل السحابي (اختياري)</label>
                    <input
                      type="text"
                      value={downloadCode}
                      onChange={(e) => setDownloadCode(e.target.value)}
                      placeholder="e.g. FREE9821"
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">وصف الفيديو (Description)</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="وصف مختصر للفيديو يظهر للمستخدم في التيليجرام..."
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
                  <span>تفعيل وعرض في قائمة البوت (Active)</span>
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
                      <span>إرسال إشعار فوري للمستخدمين عند الإضافة (Broadcast notification)</span>
                    </span>
                  </label>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-medium cursor-pointer shadow-lg shadow-indigo-600/20"
                >
                  {submitting ? 'جارٍ الحفظ...' : editingVideo ? 'تحديث الفيديو' : 'إضافة الفيديو الآن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
