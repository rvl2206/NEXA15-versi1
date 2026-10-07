import { SettingsDatabaseConfig } from './SettingsDatabaseConfig';
import { SettingsSecurityAndMaintenance } from './SettingsSecurityAndMaintenance';
import { SettingsHolidays } from './SettingsHolidays';
import { SettingsHealthCheck } from './SettingsHealthCheck';
import React, { useState, useEffect, useRef } from 'react';
import { store, HealthCheckResult } from '../lib/store';
import { SchoolSettings, UserRole } from '../types';
import {
  testSupabaseConnection,
  getSupabaseSchemaSQL,
  getSupabaseTeacherOnlySchemaSQL,
  getPostgresSelfHostedSchemaSQL,
  getDockerComposePostgresYAML,
  generateFullSqlBackupDump,
} from '../lib/supabase';
import { toast } from '../lib/toast';
import { SchoolLogo } from './SchoolLogo';
import {
  Settings,
  School,
  Clock,
  Save,
  RefreshCw,
  CheckCircle2,
  Trash2,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  Wifi,
  RefreshCcw,
  RotateCcw,
  Activity,
  AlertTriangle,
  ShieldAlert,
  Users,
  FileText,
  Database,
  Wrench,
  BookmarkCheck,
  MessageCircle,
  Smartphone,
  Sparkles,
  Send,
  Zap,
  Radio,
  HelpCircle,
  Check,
  FileSpreadsheet,
  Copy,
  ExternalLink,
  UploadCloud,
  DownloadCloud,
  Code2,
  ChevronDown,
  ChevronUp,
  Calendar,
  Plus,
  Image as ImageIcon,
  Upload,
  X,
  Layers,
  Server,
  HardDrive,
  Terminal,
  ArrowRight,
  BookOpen,
  Download,
  CreditCard,
  Volume2,
  Cpu,
} from 'lucide-react';

interface SettingsPageProps {
  userRole?: UserRole;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ userRole = 'Admin' }) => {
  const [settings, setSettings] = useState<SchoolSettings>(store.getSettings());
  const [savedSuccess, setSavedSuccess] = useState(false);
  // Change Password States
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);

  // Hari Libur & Auto Alpa States
  const [isProcessingAutoAlpa, setIsProcessingAutoAlpa] = useState(false);

  // RFID Hardware Test State
  const [rfidTestInput, setRfidTestInput] = useState('');
  const [rfidTestResult, setRfidTestResult] = useState<{
    found: boolean;
    type?: 'siswa' | 'guru';
    person?: any;
    rawInput: string;
    normalizedHex?: string;
    normalizedDec?: string;
  } | null>(null);

  const handleTestRfidCard = (inputCode: string) => {
    const trimmed = inputCode.trim();
    if (!trimmed) {
      setRfidTestResult(null);
      return;
    }

    const rfidMatch = store.findByRfidUid(trimmed);

    // Check conversions
    const clean = trimmed.replace(/[\s:-]/g, '').toUpperCase();
    let hexStr = '';
    let decStr = '';
    if (/^[0-9A-F]{8}$/i.test(clean)) {
      hexStr = clean;
      decStr = String(parseInt(clean, 16)).padStart(10, '0');
    } else if (/^\d{8,10}$/.test(clean)) {
      decStr = clean;
      try {
        hexStr = parseInt(clean, 10).toString(16).toUpperCase().padStart(8, '0');
      } catch {}
    }

    if (rfidMatch) {
      const personObj = rfidMatch.type === 'siswa' ? rfidMatch.student : rfidMatch.teacher;
      setRfidTestResult({
        found: true,
        type: rfidMatch.type,
        person: personObj,
        rawInput: trimmed,
        normalizedHex: hexStr || undefined,
        normalizedDec: decStr || undefined,
      });
      toast.success(
        'Kartu Terdeteksi',
        `Kartu RFID cocok dengan ${rfidMatch.type === 'siswa' ? 'Siswa' : 'Guru'}: ${personObj?.nama}`
      );
    } else {
      setRfidTestResult({
        found: false,
        rawInput: trimmed,
        normalizedHex: hexStr || undefined,
        normalizedDec: decStr || undefined,
      });
      toast.info(
        'Kartu Terbaca (Belum Terdaftar)',
        `UID Kartu [${trimmed}] berhasil dibaca reader USB, namun belum ditautkan ke profil manapun.`
      );
    }
  };

  

  

  const handleRunAutoAlpaManual = () => {
    setIsProcessingAutoAlpa(true);
    const result = store.processAutoAlpa();
    setIsProcessingAutoAlpa(false);
    if (result.addedCount > 0) {
      toast.success('Otopresensi Alpa Berhasil', `Berhasil menandai ${result.addedCount} siswa sebagai Alpa untuk tanggal ${result.date}.`);
    } else {
      toast.info('Tidak Ada Siswa Alpa Baru', `Seluruh siswa aktif sudah memiliki presensi atau hari ini merupakan hari libur/belum melewati jam ${settings.autoAlpaCutoffTime || '14:30'}.`);
    }
  };

  // State for Purging Saturday Alpa Records
  const [isPurgingSatAlpa, setIsPurgingSatAlpa] = useState(false);

  const handlePurgeSaturdayAlpa = async () => {
    if (
      !window.confirm(
        'Revisi Presensi: Apakah Anda yakin ingin menghapus SELURUH data presensi hari Sabtu yang berstatus ALPA? Tindakan ini akan membersihkan data dari aplikasi lokal dan database cloud Supabase.'
      )
    ) {
      return;
    }
    setIsPurgingSatAlpa(true);
    try {
      const res = await store.purgeSaturdayAlpaAttendance();
      if (res.total > 0) {
        toast.success(
          'Revisi Alpa Sabtu Selesai',
          `Berhasil menghapus ${res.total} data presensi Alpa pada hari Sabtu (Siswa: ${res.deletedStudents}, Guru: ${res.deletedTeachers}).`
        );
      } else {
        toast.info(
          'Tidak Ada Alpa Hari Sabtu',
          'Data presensi hari Sabtu sudah bersih, tidak ditemukan data berstatus Alpa.'
        );
      }
    } catch (err: any) {
      toast.error('Gagal Menghapus', err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsPurgingSatAlpa(false);
    }
  };

  // School Logo Upload State
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);

  const processLogoFile = (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Format File Salah', 'Harap pilih file gambar (PNG, JPG, SVG, atau WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran File Terlalu Besar', 'Maksimum ukuran gambar logo adalah 5MB.');
      return;
    }

    setIsProcessingLogo(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) {
        setIsProcessingLogo(false);
        return;
      }

      // If SVG, save directly to keep clean vector paths
      if (file.type.includes('svg') || result.startsWith('data:image/svg+xml')) {
        setSettings((prev) => ({ ...prev, schoolLogo: result }));
        store.updateSettings({ schoolLogo: result });
        setIsProcessingLogo(false);
        toast.success('Logo Sekolah Berhasil Diperbarui', 'Logo vektor SVG telah diterapkan ke seluruh komponen dan kartu.');
        return;
      }

      // If raster image (PNG, JPG, WebP), scale onto a crisp canvas (max 512px) to optimize local storage & retain alpha transparency
      const img = new window.Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 512;
          let w = img.width;
          let h = img.height;

          if (w > h) {
            if (w > maxDim) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            }
          } else {
            if (h > maxDim) {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, w, h);
            const optimizedBase64 = canvas.toDataURL('image/png', 0.95);
            setSettings((prev) => ({ ...prev, schoolLogo: optimizedBase64 }));
            store.updateSettings({ schoolLogo: optimizedBase64 });
            setIsProcessingLogo(false);
            toast.success('Logo Sekolah Berhasil Diperbarui', 'Logo sekolah baru telah diunggah dan otomatis disesuaikan ukurannya di seluruh layout.');
          } else {
            setSettings((prev) => ({ ...prev, schoolLogo: result }));
            store.updateSettings({ schoolLogo: result });
            setIsProcessingLogo(false);
            toast.success('Logo Sekolah Berhasil Diperbarui', 'Logo sekolah baru telah disimpan.');
          }
        } catch {
          setSettings((prev) => ({ ...prev, schoolLogo: result }));
          store.updateSettings({ schoolLogo: result });
          setIsProcessingLogo(false);
          toast.success('Logo Sekolah Berhasil Diperbarui', 'Logo sekolah baru telah disimpan.');
        }
      };

      img.onerror = () => {
        setIsProcessingLogo(false);
        toast.error('Gagal Membaca Gambar', 'Pastikan file gambar valid dan tidak rusak.');
      };

      img.src = result;
    };

    reader.onerror = () => {
      setIsProcessingLogo(false);
      toast.error('Gagal Mengunggah', 'Terjadi kesalahan saat membaca file.');
    };

    reader.readAsDataURL(file);
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processLogoFile(files[0]);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleLogoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingLogo(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processLogoFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveLogo = () => {
    setSettings((prev) => ({ ...prev, schoolLogo: '' }));
    store.updateSettings({ schoolLogo: '' });
    toast.info('Logo Kustom Dihapus', 'Sistem kembali menggunakan lambang sekolah default.');
  };















  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    store.updateSettings(settings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPassError('Harap isi semua kolom kata sandi.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('Konfirmasi kata sandi baru tidak cocok dengan kata sandi baru.');
      return;
    }

    if (newPassword.length < 5) {
      setPassError('Kata sandi baru minimal harus 5 karakter.');
      return;
    }

    const result = await store.updateAdminPassword(oldPassword, newPassword);
    if (!result.success) {
      setPassError(result.message);
      return;
    }

    setPassSuccess(result.message);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPassSuccess(''), 4000);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await store.syncAllToServer();
    setIsSyncing(false);
  };

  const handleClearCache = async () => {
    setIsClearingCache(true);
    await store.clearCacheAndRefresh();
    setSettings(store.getSettings());
    setIsClearingCache(false);
  };

  const handleResetData = () => {
    store.resetToSeedData();
    setSettings(store.getSettings());
    toast.success('Database Direset', 'Database berhasil direset ke data awal contoh sekolah!');
  };

  const handleClearStudents = () => {
    const studentCount = store.getStudents().length;
    if (studentCount === 0) {
      toast.info('Database Kosong', 'Database siswa sudah kosong.');
      return;
    }
    store.deleteAllStudents();
    toast.success('Siswa Dihapus', `Berhasil menghapus seluruh ${studentCount} data siswa dari database!`);
  };

  

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      {/* Header Banner */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl shadow-black/40 relative overflow-hidden flex items-center justify-between transition-colors">
        <div>
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-xs uppercase tracking-wider mb-1">
            <Settings className="w-4 h-4" />
            <span>Konfigurasi & Keamanan Role Admin</span>
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">Pengaturan Sekolah & Akun Admin</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Atur konfigurasi jam sekolah, ubah kata sandi Role Admin, serta sinkronisasikan seluruh perubahan secara otomatis.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <button
            onClick={handleManualSync}
            disabled={isSyncing || isClearingCache}
            className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-2xl text-xs font-bold transition-all disabled:opacity-50"
            title="Sinkronkan seluruh data lokal ke server"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-500' : ''}`} />
            <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Data'}</span>
          </button>

          <button
            onClick={handleClearCache}
            disabled={isClearingCache || isSyncing}
            className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs font-bold transition-all disabled:opacity-50"
            title="Bersihkan cache penyimpan lokal (localStorage) dan muat ulang dari server"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isClearingCache ? 'animate-spin text-amber-500' : ''}`} />
            <span>{isClearingCache ? 'Clearing...' : 'Bersihkan Cache'}</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Pengaturan sekolah berhasil diperbarui dan disinkronkan!</span>
        </div>
      )}

      {/* Settings Form */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl shadow-black/40 relative overflow-hidden space-y-6 transition-colors">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
            <School className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Identitas Sekolah & Jam Masuk</span>
          </h3>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Logo Sekolah Upload & Auto-Fit Layout Section */}
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 relative overflow-hidden space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Logo Sekolah & Identitas Visual</span>
                  {settings.schoolLogo ? (
                    <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-full text-[10px] font-bold">
                      Logo Kustom Aktif
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-[10px] font-bold">
                      Lambang Standar
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Unggah logo resmi sekolah (PNG, JPG, SVG, WebP). Sistem akan otomatis menyesuaikan ukuran (auto-fit) di seluruh kartu, navbar, kartu guru, dan laporan.
                </p>
              </div>

              {settings.schoolLogo && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs font-bold transition-all self-start sm:self-auto cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Logo</span>
                </button>
              )}
            </div>

            {/* Hidden Input File */}
            <input
              type="file"
              ref={logoFileInputRef}
              onChange={handleLogoFileChange}
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
            />

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingLogo(true);
              }}
              onDragLeave={() => setIsDraggingLogo(false)}
              onDrop={handleLogoDrop}
              onClick={() => logoFileInputRef.current?.click()}
              className={`p-5 rounded-3xl border-2 border-dashed transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-3 ${
                isDraggingLogo
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 scale-[1.01]'
                  : 'border-white/10 hover:border-blue-400 hover:bg-white/80 dark:hover:bg-slate-800/80 bg-white/50 dark:bg-slate-900/50'
              }`}
            >
              <div className="w-16 h-16 rounded-3xl bg-white/5 backdrop-blur-xl shadow-md border border-white/10 flex items-center justify-center p-2 relative overflow-hidden group">
                <SchoolLogo className="w-full h-full object-contain drop-shadow-xs" />
                <div className="absolute inset-0 bg-blue-600/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity rounded-3xl">
                  <Upload className="w-5 h-5 animate-bounce" />
                </div>
              </div>

              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 border border-white/10 shadow-lg shadow-blue-500/20 text-white rounded-2xl text-xs font-bold shadow-xs transition-colors mb-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isProcessingLogo ? 'Memproses Logo...' : 'Pilih File Logo Sekolah'}</span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  atau tarik dan lepas (drag & drop) file logo ke sini
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Format: PNG (transparan disarankan), JPG, SVG, WebP • Maks. 5MB
                </p>
              </div>
            </div>

            {/* Layout Preview Auto-Sizing Showcase */}
            <div className="bg-white/80 dark:bg-slate-900/80 p-4 rounded-2xl border border-white/10">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700 dark:text-slate-300 mb-3">
                <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Simulasi Penyesuaian Ukuran di Seluruh Tata Letak (Live Auto-Fit)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Header / Navbar Preview */}
                <div className="p-3 bg-white/5/60 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    1. Navbar & Header
                  </span>
                  <div className="flex items-center gap-2 p-2 bg-black/20 backdrop-blur-md rounded-lg border border-white/10 shadow-2xs w-full justify-center">
                    <div className="w-7 h-7 flex items-center justify-center shrink-0">
                      <SchoolLogo size={28} className="w-full h-full" />
                    </div>
                    <div className="text-left overflow-hidden">
                      <p className="text-[10px] font-black text-white truncate">NEXA15</p>
                      <p className="text-[8px] text-slate-400 truncate">{settings.schoolName || 'SMA NEGERI 15 AMBON'}</p>
                    </div>
                  </div>
                </div>

                {/* 2. Kartu Absensi Pelajar CR80 Preview */}
                <div className="p-3 bg-white/5/60 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    2. Kartu Siswa & Guru
                  </span>
                  <div className="p-2 bg-[#071a3d] text-white rounded-lg border border-amber-500/40 shadow-2xs w-full flex flex-col items-center justify-center">
                    <div className="w-7 h-7 flex items-center justify-center mb-0.5">
                      <SchoolLogo size={28} className="w-full h-full drop-shadow-xs" />
                    </div>
                    <p className="text-[7.5px] font-black text-amber-400 uppercase truncate max-w-full">
                      {settings.schoolName || 'SMA NEGERI 15 AMBON'}
                    </p>
                  </div>
                </div>

                {/* 3. Login Modal & Laporan Preview */}
                <div className="p-3 bg-white/5/60 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    3. Login & Dokumen
                  </span>
                  <div className="p-2 bg-gradient-to-br from-[#071a3d] to-slate-900 text-white rounded-lg border border-white/20 shadow-2xs w-full flex items-center justify-center gap-2">
                    <div className="w-8 h-8 p-1 bg-white/10 rounded-lg flex items-center justify-center">
                      <SchoolLogo size={32} className="w-full h-full" />
                    </div>
                    <div className="text-left overflow-hidden">
                      <p className="text-[9px] font-black text-amber-300">PRESENSI</p>
                      <p className="text-[7.5px] text-slate-300 truncate">Sistem Digital</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Sekolah</label>
              <input
                type="text"
                value={settings.schoolName}
                onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                className="w-full px-3.5 py-2 text-xs border border-white/10 dark:bg-slate-800 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">NPSN Sekolah</label>
              <input
                type="text"
                value={settings.schoolNPSN}
                onChange={(e) => setSettings({ ...settings, schoolNPSN: e.target.value })}
                className="w-full px-3.5 py-2 text-xs border border-white/10 dark:bg-slate-800 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-600 font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Batas Jam Masuk (Tepat Waktu / Terlambat)
              </label>
              <input
                type="time"
                value={settings.cutoffTime}
                onChange={(e) => setSettings({ ...settings, cutoffTime: e.target.value })}
                className="w-full px-3.5 py-2 text-xs border border-white/10 dark:bg-slate-800 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-600 font-mono"
                required
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Scan sebelum {settings.cutoffTime} dianggap <b>Hadir</b>, setelah jam tersebut dianggap <b>Terlambat</b>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tahun Ajaran</label>
              <input
                type="text"
                value={settings.academicYear}
                onChange={(e) => setSettings({ ...settings, academicYear: e.target.value })}
                className="w-full px-3.5 py-2 text-xs border border-white/10 dark:bg-slate-800 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>
          </div>

          {/* Pengaturan Jam Mulai Pulang: Senin - Kamis vs Jumat */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Jam Mulai Absen Pulang (Senin - Kamis)
              </label>
              <input
                type="time"
                value={settings.pulangStartTimeNormal || '13:30'}
                onChange={(e) => setSettings({ ...settings, pulangStartTimeNormal: e.target.value })}
                className="w-full px-3.5 py-2 text-xs border border-white/10 dark:bg-slate-800 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-600 font-mono"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Waktu normal KBM. Siswa mulai dapat scan Pulang pada jam <b>{settings.pulangStartTimeNormal || '13:30'} WIT</b> ke atas.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Jam Mulai Absen Pulang (Jumat — 1 Shift Pendek)
              </label>
              <input
                type="time"
                value={settings.pulangStartTimeFriday || '10:00'}
                onChange={(e) => setSettings({ ...settings, pulangStartTimeFriday: e.target.value })}
                className="w-full px-3.5 py-2 text-xs border border-white/10 dark:bg-slate-800 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-600 font-mono"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Hari Jumat durasi pendek. Siswa mulai dapat scan Pulang di atas jam <b>{settings.pulangStartTimeFriday || '10:00'} WIT</b>.
              </p>
            </div>
          </div>


          {/* Pilihan Sistem Hari Sekolah: 5 Hari vs 6 Hari */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Sistem Hari Kerja / Hari Belajar Sekolah
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Pilihan 5 Hari */}
              <div
                onClick={() => setSettings({ ...settings, schoolDays: 5 })}
                className={`p-4 rounded-3xl border-2 transition-all cursor-pointer relative ${
                  (settings.schoolDays || 6) === 5
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 shadow-sm'
                    : 'border-white/10 hover:border-slate-300 dark:hover:border-slate-700 bg-white/5 backdrop-blur-xl/40'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-2xl ${
                      (settings.schoolDays || 6) === 5
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-300'
                    }`}>
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">
                          Sekolah 5 Hari
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                          Senin - Jumat
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        Hari aktif: <b>Senin s/d Jumat</b>.<br />
                        Hari libur akhir pekan: <b>Sabtu & Minggu</b>.
                      </p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                    (settings.schoolDays || 6) === 5
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-white/20'
                  }`}>
                    {(settings.schoolDays || 6) === 5 && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Sabtu Libur:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">✅ Ya (Bebas Alpa)</span>
                </div>
              </div>

              {/* Pilihan 6 Hari */}
              <div
                onClick={() => setSettings({ ...settings, schoolDays: 6 })}
                className={`p-4 rounded-3xl border-2 transition-all cursor-pointer relative ${
                  (settings.schoolDays || 6) === 6
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 shadow-sm'
                    : 'border-white/10 hover:border-slate-300 dark:hover:border-slate-700 bg-white/5 backdrop-blur-xl/40'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-2xl ${
                      (settings.schoolDays || 6) === 6
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-300'
                    }`}>
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">
                          Sekolah 6 Hari
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          Senin - Sabtu
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        Hari aktif: <b>Senin s/d Sabtu</b>.<br />
                        Hari libur akhir pekan: <b>Hanya Minggu</b>.
                      </p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                    (settings.schoolDays || 6) === 6
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-white/20'
                  }`}>
                    {(settings.schoolDays || 6) === 6 && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Sabtu Libur:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">❌ Tidak (Hari Sekolah)</span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
              <span className="text-blue-600 font-bold">ℹ️ Info:</span>
              <span>
                Pada sistem <b>Sekolah 5 Hari</b>, hari Sabtu otomatis ditetapkan sebagai hari libur akhir pekan, sehingga otopresensi Alpa jam 14:30 dan pemotongan kedisiplinan tidak akan memproses presensi siswa pada hari Sabtu.
              </span>
            </p>

            {/* Revisi & Pembersihan Seluruh Alpa Hari Sabtu */}
            <div className="mt-3.5 p-4 rounded-3xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-2xl bg-amber-600 text-white shadow-xs shrink-0 mt-0.5">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-amber-950 dark:text-amber-200 uppercase tracking-wider flex items-center gap-2">
                      <span>Revisi Presensi: Hapus Alpa Hari Sabtu</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200 normal-case">
                        Pembersihan Massal
                      </span>
                    </h4>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                      Hapus seluruh presensi yang tercatat sebagai <b>ALPA</b> pada hari Sabtu dari aplikasi, memori lokal, serta sinkronisasi cloud (Firestore & Supabase).
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handlePurgeSaturdayAlpa}
                  disabled={isPurgingSatAlpa}
                  className="px-4 py-2.5 rounded-2xl text-xs font-extrabold text-white bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isPurgingSatAlpa ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sedang Membersihkan...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Seluruh Alpa Hari Sabtu</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Auto-Alpa 14:30 Section */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between bg-rose-50/80 dark:bg-rose-950/40 p-4 rounded-3xl border border-rose-200 dark:border-rose-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-600 text-white rounded-2xl shadow-xs">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-rose-950 dark:text-rose-100 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Otopresensi Alpa Otomatis (Default Jam 14:30)</span>
                    <span className="px-2 py-0.5 bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 rounded-full text-[10px] font-bold">
                      Batas Jam 14:30
                    </span>
                  </h4>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                    Sistem akan membaca siswa aktif tanpa data presensi di atas jam 14:30 dan otomatis menandainya sebagai <strong>Alpa</strong> (tidak berlaku pada Hari Libur & Akhir Pekan).
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableAutoAlpa !== false}
                  onChange={(e) => setSettings({ ...settings, enableAutoAlpa: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-slate-600 peer-checked:bg-rose-600"></div>
              </label>
            </div>

            {settings.enableAutoAlpa !== false && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-3xl border border-white/10">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Batas Jam Otopresensi Alpa
                  </label>
                  <input
                    type="time"
                    value={settings.autoAlpaCutoffTime || '14:30'}
                    onChange={(e) => setSettings({ ...settings, autoAlpaCutoffTime: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-white/10 dark:bg-slate-800 dark:text-white rounded-2xl focus:ring-2 focus:ring-rose-600 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Siswa tanpa presensi setelah jam <b>{settings.autoAlpaCutoffTime || '14:30'}</b> dianggap <b>Alpa</b>.
                  </p>
                </div>

                <div className="flex flex-col justify-end">
                  <button
                    type="button"
                    onClick={handleRunAutoAlpaManual}
                    disabled={isProcessingAutoAlpa}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Zap className={`w-4 h-4 ${isProcessingAutoAlpa ? 'animate-bounce' : ''}`} />
                    <span>{isProcessingAutoAlpa ? 'Memproses...' : 'Jalankan Cek Alpa Otomatis Sekarang'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* WhatsApp Direct Section */}
          <div className="pt-5 border-t border-slate-100 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between bg-emerald-50/80 dark:bg-emerald-950/40 p-4 rounded-3xl border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-sm">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-emerald-950 dark:text-emerald-100 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Notifikasi WhatsApp Direct</span>
                    <span className="px-2 py-0.5 bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded-full text-[10px] font-bold">
                      WA Direct Link (Tanpa API Gateway)
                    </span>
                  </h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                    Notifikasi presensi dikirim langsung dengan membuka aplikasi/web WhatsApp ke nomor HP orang tua tanpa API Gateway berbayar.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableWaNotif ?? true}
                  onChange={(e) => setSettings({ ...settings, enableWaNotif: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-slate-600 peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {settings.enableWaNotif !== false && (
              <div className="space-y-5 bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-3xl border border-white/10">
                <div className="p-3 bg-emerald-100/60 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Sistem aktif menggunakan <strong>WhatsApp Direct (wa.me)</strong>. Saat petugas menekan tombol WhatsApp pada pemindai QR atau rekap presensi, obrolan WhatsApp orang tua akan otomatis terbuka dengan pesan terformat.</span>
                </div>

                {/* Templates Editor */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Template Pesan WhatsApp Direct (Format Teks Sesuai Status)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSettings({
                          ...settings,
                          waTemplateHadir: 'Yth. Orang Tua / Wali murid dari *{nama}* (Kelas {kelas}),\n\nMemberitahukan data presensi sekolah di *{sekolah}*:\n📅 Tanggal: {tanggal}\nâ° Waktu Scan: {waktu}\n📌 Status Presensi: ✅ *HADIR (Tepat Waktu)*\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_Pesan otomatis dari Sistem Presensi Digital {sekolah}_',
                          waTemplateTerlambat: 'Yth. Orang Tua / Wali murid dari *{nama}* (Kelas {kelas}),\n\nMemberitahukan data presensi sekolah di *{sekolah}*:\n📅 Tanggal: {tanggal}\nâ° Waktu Scan: {waktu}\n📌 Status Presensi: â° *TERLAMBAT* ({terlambat})\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_Pesan otomatis dari Sistem Presensi Digital {sekolah}_',
                          waTemplateIzinSakit: 'Yth. Orang Tua / Wali murid dari *{nama}* (Kelas {kelas}),\n\nMemberitahukan data presensi sekolah di *{sekolah}*:\n📅 Tanggal: {tanggal}\n📌 Status Presensi: 📄 *{status}*\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_Pesan otomatis dari Sistem Presensi Digital {sekolah}_',
                          waTemplateAlpa: 'Yth. Orang Tua / Wali murid dari *{nama}* (Kelas {kelas}),\n\nMemberitahukan data presensi sekolah di *{sekolah}*:\n📅 Tanggal: {tanggal}\n📌 Status Presensi: âŒ *ALPA (Tanpa Keterangan)*\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_Pesan otomatis dari Sistem Presensi Digital {sekolah}_',
                        });
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Template Ke Default</span>
                    </button>
                  </div>

                  <div className="text-[10px] text-slate-400 bg-black/20 backdrop-blur-md p-2.5 rounded-lg border border-white/10 leading-relaxed font-mono">
                    Tag yang dapat digunakan: <code>{"{nama}"}</code>, <code>{"{kelas}"}</code>, <code>{"{waktu}"}</code>, <code>{"{status}"}</code>, <code>{"{sekolah}"}</code>, <code>{"{tanggal}"}</code>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Template Presensi Hadir
                      </label>
                      <textarea
                        rows={4}
                        value={settings.waTemplateHadir || 'Yth. Orang Tua / Wali murid dari *{nama}* (Kelas {kelas}),\n\nMemberitahukan data presensi sekolah di *{sekolah}*:\n📅 Tanggal: {tanggal}\nâ° Waktu Scan: {waktu}\n📌 Status Presensi: ✅ *HADIR (Tepat Waktu)*\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_Pesan otomatis dari Sistem Presensi Digital {sekolah}_'}
                        onChange={(e) => setSettings({ ...settings, waTemplateHadir: e.target.value })}
                        className="w-full p-2.5 text-xs border border-white/10 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-600 font-sans"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-amber-700 dark:text-amber-400 mb-1">
                        Template Presensi Terlambat
                      </label>
                      <textarea
                        rows={4}
                        value={settings.waTemplateTerlambat || 'Yth. Orang Tua / Wali murid dari *{nama}* (Kelas {kelas}),\n\nMemberitahukan data presensi sekolah di *{sekolah}*:\n📅 Tanggal: {tanggal}\nâ° Waktu Scan: {waktu}\n📌 Status Presensi: â° *TERLAMBAT* ({terlambat})\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_Pesan otomatis dari Sistem Presensi Digital {sekolah}_'}
                        onChange={(e) => setSettings({ ...settings, waTemplateTerlambat: e.target.value })}
                        className="w-full p-2.5 text-xs border border-white/10 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-amber-600 font-sans"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-blue-700 dark:text-blue-400 mb-1">
                        Template Izin / Sakit
                      </label>
                      <textarea
                        rows={4}
                        value={settings.waTemplateIzinSakit || 'Yth. Orang Tua / Wali murid dari *{nama}* (Kelas {kelas}),\n\nMemberitahukan data presensi sekolah di *{sekolah}*:\n📅 Tanggal: {tanggal}\n📌 Status Presensi: 📄 *{status}*\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_Pesan otomatis dari Sistem Presensi Digital {sekolah}_'}
                        onChange={(e) => setSettings({ ...settings, waTemplateIzinSakit: e.target.value })}
                        className="w-full p-2.5 text-xs border border-white/10 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-600 font-sans"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-rose-700 dark:text-rose-400 mb-1">
                        Template Alpa / Tanpa Keterangan
                      </label>
                      <textarea
                        rows={4}
                        value={settings.waTemplateAlpa || 'Yth. Orang Tua / Wali murid dari *{nama}* (Kelas {kelas}),\n\nMemberitahukan data presensi sekolah di *{sekolah}*:\n📅 Tanggal: {tanggal}\n📌 Status Presensi: âŒ *ALPA (Tanpa Keterangan)*\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_Pesan otomatis dari Sistem Presensi Digital {sekolah}_'}
                        onChange={(e) => setSettings({ ...settings, waTemplateAlpa: e.target.value })}
                        className="w-full p-2.5 text-xs border border-white/10 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-rose-600 font-sans"
                      />
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* RFID Card Reader & Contactless NFC Integration Hub */}
          <div className="pt-5 border-t border-slate-100 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between bg-sky-50/80 dark:bg-sky-950/40 p-4 rounded-3xl border border-sky-200 dark:border-sky-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-600 text-white rounded-2xl shadow-sm">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-sky-950 dark:text-sky-100 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Integrasi Kartu RFID & Contactless NFC</span>
                    <span className="px-2 py-0.5 bg-sky-200 dark:bg-sky-900 text-sky-800 dark:text-sky-200 rounded-full text-[10px] font-bold">
                      USB Reader Plug & Play
                    </span>
                  </h4>
                  <p className="text-[11px] text-sky-700 dark:text-sky-300 mt-0.5">
                    Mendukung pemindai kartu RFID/NFC fisik via USB (Keyboard Emulation / USB HID) untuk presensi super cepat siswa dan guru.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableRfidReader !== false}
                  onChange={(e) => setSettings({ ...settings, enableRfidReader: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-slate-600 peer-checked:bg-sky-600"></div>
              </label>
            </div>

            {settings.enableRfidReader !== false && (
              <div className="space-y-5 bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-3xl border border-white/10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      <span>Mode Komunikasi Reader RFID</span>
                    </label>
                    <select
                      value={settings.rfidReaderMode || 'keyboard'}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          rfidReaderMode: e.target.value as 'keyboard' | 'webhid' | 'serial',
                        })
                      }
                      className="w-full p-2.5 text-xs border border-white/10 dark:bg-slate-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-sky-600 cursor-pointer"
                    >
                      <option value="keyboard">USB Keyboard Wedge (Rekomendasi - Standar Plug & Play)</option>
                      <option value="webhid">WebHID Browser API (Direct USB Access)</option>
                      <option value="serial">Web Serial / COM Port (Advanced Microcontroller)</option>
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Mode <strong>Keyboard Wedge</strong> kompatibel dengan 99% pembaca RFID USB murah di pasaran tanpa perlu driver tambahan.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      <span>Tipe Frekuensi Kartu</span>
                    </label>
                    <select
                      value={settings.rfidCardType || 'Dual'}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          rfidCardType: e.target.value as '13.56MHz_Mifare' | '125kHz_EM' | 'Dual',
                        })
                      }
                      className="w-full p-2.5 text-xs border border-white/10 dark:bg-slate-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-sky-600 cursor-pointer"
                    >
                      <option value="Dual">Dual Frekuensi (13.56MHz Mifare / NFC + 125kHz EM-ID)</option>
                      <option value="13.56MHz_Mifare">13.56 MHz HF (Mifare Classic / Ultralight / e-KTP / NFC)</option>
                      <option value="125kHz_EM">125 kHz LF (EM4100 / TK4100 Proximity Card)</option>
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Sistem otomatis menormalisasi format Hexadecimal (8 digit) dan Decimal (10 digit).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <label className="flex items-center gap-2 p-3 bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 cursor-pointer hover:border-sky-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={settings.rfidBeepFeedback !== false}
                      onChange={(e) => setSettings({ ...settings, rfidBeepFeedback: e.target.checked })}
                      className="rounded text-sky-600 focus:ring-sky-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <Volume2 className="w-3.5 h-3.5 text-sky-600" /> Audio Beep Respon
                      </span>
                      <p className="text-[10px] text-slate-500">Bunyikan nada saat kartu sukses terbaca</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-3 bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 cursor-pointer hover:border-sky-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={settings.rfidAutoRecord !== false}
                      onChange={(e) => setSettings({ ...settings, rfidAutoRecord: e.target.checked })}
                      className="rounded text-sky-600 focus:ring-sky-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-emerald-600" /> Auto-Presensi Instan
                      </span>
                      <p className="text-[10px] text-slate-500">Simpan absensi langsung saat kartu ditap</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-3 bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 cursor-pointer hover:border-sky-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={settings.rfidAllowUnregisteredCardPrompt !== false}
                      onChange={(e) => setSettings({ ...settings, rfidAllowUnregisteredCardPrompt: e.target.checked })}
                      className="rounded text-sky-600 focus:ring-sky-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Deteksi Kartu Baru
                      </span>
                      <p className="text-[10px] text-slate-500">Notifikasi jika kartu belum ditautkan</p>
                    </div>
                  </label>
                </div>

                {/* Interactive RFID Tester Tool */}
                <div className="bg-black/20 backdrop-blur-md p-4 rounded-2xl border border-sky-200 dark:border-sky-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <Radio className="w-4 h-4 text-sky-600" />
                      <span>Uji Coba & Diagnostic Reader RFID USB</span>
                    </div>
                    {rfidTestResult && (
                      <button
                        type="button"
                        onClick={() => {
                          setRfidTestInput('');
                          setRfidTestResult(null);
                        }}
                        className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline cursor-pointer"
                      >
                        Reset Uji Coba
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Tempelkan kartu RFID / NFC pada scanner USB Anda saat kursor berada pada kolom input berikut untuk menguji pembacaan nomor seri:
                  </p>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={rfidTestInput}
                        onChange={(e) => {
                          setRfidTestInput(e.target.value);
                          handleTestRfidCard(e.target.value);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleTestRfidCard(rfidTestInput);
                          }
                        }}
                        placeholder="Klik di sini lalu tap kartu RFID atau ketik nomor UID..."
                        className="w-full pl-9 pr-3 py-2 text-xs border border-sky-300 dark:border-sky-700 dark:bg-slate-800 dark:text-white rounded-2xl focus:ring-2 focus:ring-sky-500 font-mono"
                      />
                      <CreditCard className="w-4 h-4 text-sky-500 absolute left-3 top-2.5" />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTestRfidCard(rfidTestInput)}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer"
                    >
                      Cek Kartu
                    </button>
                  </div>

                  {rfidTestResult && (
                    <div
                      className={`p-3.5 rounded-2xl border text-xs ${
                        rfidTestResult.found
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100'
                          : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold flex items-center gap-1.5">
                            {rfidTestResult.found ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>Kartu Terdaftar Sebagai: {rfidTestResult.type === 'siswa' ? 'Siswa' : 'Guru'}</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                                <span>Kartu Terbaca Tetapi Belum Terdaftar</span>
                              </>
                            )}
                          </div>

                          {rfidTestResult.found && rfidTestResult.person && (
                            <div className="mt-2 space-y-1 font-sans">
                              <p className="font-bold text-sm text-white">
                                {rfidTestResult.person.nama}
                              </p>
                              <p className="text-[11px] text-slate-300">
                                {rfidTestResult.type === 'siswa'
                                  ? `Kelas: ${(rfidTestResult.person as any).kelas || '-'} | NISN: ${(rfidTestResult.person as any).nisn || '-'}`
                                  : `Jabatan: ${(rfidTestResult.person as any).jabatan || '-'} | NIP: ${(rfidTestResult.person as any).nip || '-'}`}
                              </p>
                            </div>
                          )}

                          <div className="mt-2.5 flex flex-wrap gap-2 text-[10.5px] font-mono">
                            <span className="px-2 py-0.5 bg-black/20 backdrop-blur-md rounded border border-current opacity-90">
                              Input: {rfidTestResult.rawInput}
                            </span>
                            {rfidTestResult.normalizedHex && (
                              <span className="px-2 py-0.5 bg-black/20 backdrop-blur-md rounded border border-current opacity-90">
                                HEX: {rfidTestResult.normalizedHex}
                              </span>
                            )}
                            {rfidTestResult.normalizedDec && (
                              <span className="px-2 py-0.5 bg-black/20 backdrop-blur-md rounded border border-current opacity-90">
                                DEC: {rfidTestResult.normalizedDec}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <SettingsDatabaseConfig settings={settings} setSettings={setSettings} />

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 border border-white/10 shadow-lg shadow-blue-500/20 text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Simpan & Sinkronkan Konfigurasi</span>
            </button>
          </div>
        </form>
      </div>

      <SettingsHolidays settings={settings} setSettings={setSettings} />

      {/* RFID & NFC Hardware Diagnostics Card */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl shadow-black/40 relative overflow-hidden space-y-5 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <span>Diagnostik & Uji Coba Reader RFID / NFC</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  USB Plug & Play
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Uji langsung pembacaan kartu RFID (13.56 MHz / 125 kHz) dan verifikasi konversi otomatis format Hexadecimal (Hex) dan Decimal (Dec).
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Tempelkan Kartu RFID ke Reader USB atau Ketik UID Kartu:
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={rfidTestInput}
                onChange={(e) => {
                  setRfidTestInput(e.target.value);
                  handleTestRfidCard(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleTestRfidCard(rfidTestInput);
                  }
                }}
                placeholder="Tempel kartu RFID pada scanner USB atau ketik UID (contoh: 21B842F9 / 0565723897)..."
                className="w-full pl-9 pr-3.5 py-2.5 text-xs border border-white/10 dark:bg-slate-800 dark:text-white rounded-2xl focus:ring-2 focus:ring-indigo-600 font-mono"
              />
              <Radio className="w-4 h-4 text-indigo-500 absolute left-3 top-3 animate-pulse" />
            </div>
            <button
              type="button"
              onClick={() => handleTestRfidCard(rfidTestInput)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl transition-all shadow-sm cursor-pointer whitespace-nowrap"
            >
              Cek Kartu
            </button>
            {rfidTestInput && (
              <button
                type="button"
                onClick={() => {
                  setRfidTestInput('');
                  setRfidTestResult(null);
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-2xl transition-all cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          {rfidTestResult && (
            <div
              className={`p-4 rounded-2xl border space-y-2.5 transition-all ${
                rfidTestResult.found
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {rfidTestResult.found ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  )}
                  <span className="font-extrabold text-xs uppercase tracking-wide">
                    {rfidTestResult.found ? 'Kartu Terdaftar di Database' : 'Kartu Belum Terdaftar'}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/70 dark:bg-slate-800/80 border border-current">
                  {rfidTestResult.type === 'siswa' ? 'Profil Siswa' : rfidTestResult.type === 'guru' ? 'Profil Guru' : 'Kartu Baru'}
                </span>
              </div>

              {rfidTestResult.person && (
                <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-lg border border-white/10 text-xs space-y-1">
                  <div className="font-extrabold text-white">
                    {rfidTestResult.person.nama}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    {rfidTestResult.type === 'siswa' ? (
                      <span>Kelas: {rfidTestResult.person.kelas} • NISN: <span className="font-mono">{rfidTestResult.person.nisn}</span></span>
                    ) : (
                      <span>Jabatan: {rfidTestResult.person.jabatan} • NIP: <span className="font-mono">{rfidTestResult.person.nip}</span></span>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="p-2 bg-white/60 dark:bg-slate-900/60 rounded-lg border border-white/10">
                  <span className="text-[10px] text-slate-400 block">UID Input Asli:</span>
                  <span className="font-mono font-bold text-white">{rfidTestResult.rawInput}</span>
                </div>
                {rfidTestResult.normalizedHex && (
                  <div className="p-2 bg-white/60 dark:bg-slate-900/60 rounded-lg border border-white/10">
                    <span className="text-[10px] text-slate-400 block">Konversi Hex (8-Digit):</span>
                    <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">{rfidTestResult.normalizedHex}</span>
                  </div>
                )}
                {rfidTestResult.normalizedDec && (
                  <div className="p-2 bg-white/60 dark:bg-slate-900/60 rounded-lg border border-white/10">
                    <span className="text-[10px] text-slate-400 block">Konversi Dec (10-Digit):</span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">{rfidTestResult.normalizedDec}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <SettingsHealthCheck />

      {/* Change Password Card for Admin */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl shadow-black/40 relative overflow-hidden space-y-5 transition-colors">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-500/20">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">
                Ubah Kata Sandi (Role Admin)
              </h3>
              <p className="text-[11px] text-slate-400">
                Perbarui password akun Administrator Utama untuk menjaga keamanan sistem.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-bold">
            <ShieldCheck className="w-3 h-3" />
            <span>Keamanan Terenkripsi</span>
          </span>
        </div>

        {passSuccess && (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-2xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{passSuccess}</span>
          </div>
        )}

        {passError && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-2xl text-xs font-bold flex items-center gap-2">
            <span className="text-rose-600 dark:text-rose-400 shrink-0 font-bold">âŒ</span>
            <span>{passError}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} autoComplete="off" className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Kata Sandi Admin Saat Ini
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Masukkan kata sandi lama Admin..."
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                data-lpignore="true"
                className="w-full pl-10 pr-10 py-2 text-xs border border-white/10 dark:bg-slate-800 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-600 font-medium"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kata Sandi Baru
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Password baru (min. 5 karakter)..."
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-lpignore="true"
                  className="w-full pl-10 pr-3.5 py-2 text-xs border border-white/10 dark:bg-slate-800 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-600 font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Konfirmasi Kata Sandi Baru
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru..."
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-lpignore="true"
                  className="w-full pl-10 pr-3.5 py-2 text-xs border border-white/10 dark:bg-slate-800 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-600 font-medium"
                  required
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              * Password baru akan langsung dienkripsi (bcrypt) dan disinkronkan ke server secara aman.
            </p>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Simpan & Sinkronkan Kata Sandi</span>
            </button>
          </div>
        </form>
      </div>

      {/* Reset & Maintenance Zone */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl shadow-black/40 relative overflow-hidden space-y-4 transition-colors">
        <h4 className="font-bold text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">Pemeliharaan Cache & Reset Database</h4>
        
        {/* Clear Cache Card */}
        <div className="p-4 bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="font-bold text-xs text-amber-900 dark:text-amber-300">Bersihkan Cache & Force Refresh Server</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
              Hapus cache penyimpan lokal (localStorage) dan muat ulang data paling baru langsung dari server jika terjadi desinkronisasi tampilan antar role/perangkat.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearCache}
            disabled={isClearingCache || isSyncing}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-2xl transition-all flex items-center gap-1.5 whitespace-nowrap shadow-sm cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isClearingCache ? 'animate-spin' : ''}`} />
            <span>{isClearingCache ? 'Clearing Cache...' : 'Bersihkan Cache Lokal'}</span>
          </button>
        </div>

        <div className="p-4 bg-red-50/50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="font-bold text-xs text-red-900 dark:text-red-300">Kosongkan Khusus Database Siswa</p>
            <p className="text-[11px] text-red-700 dark:text-red-400 mt-0.5">
              Menghapus seluruh data siswa di database agar Anda dapat meng-import ulang berkas Excel secara bersih tanpa tercatat ganda.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearStudents}
            className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-2xl transition-all flex items-center gap-1.5 whitespace-nowrap shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Kosongkan DB Siswa</span>
          </button>
        </div>

        <div className="p-4 bg-white/5/50 border border-white/10 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="font-bold text-xs text-slate-800 dark:text-slate-200">Reset Ke Data Awal Contoh</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Mengembalikan data siswa dan rekaman absensi ke contoh awal (termasuk Dadang Buamona & 10 siswa sampel).
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetData}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-2xl transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Database Contoh</span>
          </button>
        </div>
      </div>
    </div>
  );
};




