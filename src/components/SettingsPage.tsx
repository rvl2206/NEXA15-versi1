import React, { useState, useEffect } from 'react';
import { store, HealthCheckResult } from '../lib/store';
import { SchoolSettings, UserRole } from '../types';
import { testSupabaseConnection, getSupabaseSchemaSQL } from '../lib/supabase';
import { toast } from '../lib/toast';
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
} from 'lucide-react';

interface SettingsPageProps {
  userRole?: UserRole;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ userRole = 'Admin' }) => {
  const [settings, setSettings] = useState<SchoolSettings>(store.getSettings());
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Data Health Check State
  const [health, setHealth] = useState<HealthCheckResult>(() => store.runDataHealthCheck());

  useEffect(() => {
    const updateHealth = () => {
      setHealth(store.runDataHealthCheck());
    };
    updateHealth();
    const unsubscribe = store.subscribe(updateHealth);
    return () => unsubscribe();
  }, []);

  const handleRecheckHealth = () => {
    setHealth(store.runDataHealthCheck());
  };

  const handleRestoreFromBackup = () => {
    if (confirm('Apakah Anda yakin ingin memulihkan data siswa dan absensi dari cadangan lokal browser?')) {
      store.restoreFromBrowserBackup();
      setHealth(store.runDataHealthCheck());
    }
  };

  const handleAutoRepair = () => {
    if (confirm('Apakah Anda yakin ingin merekonstruksi dan merestorasi profil siswa yang hilang berdasarkan log absensi & backup?')) {
      store.autoRepairFromAttendance();
      setHealth(store.runDataHealthCheck());
    }
  };

  const handleCreateManualBackup = () => {
    store.createManualBackup();
    setHealth(store.runDataHealthCheck());
  };

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
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayDesc, setNewHolidayDesc] = useState('');
  const [isProcessingAutoAlpa, setIsProcessingAutoAlpa] = useState(false);

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayDate || !newHolidayDesc.trim()) {
      toast.error('Data Hari Libur Tidak Lengkap', 'Harap isi tanggal dan keterangan hari libur.');
      return;
    }
    store.addHoliday({ tanggal: newHolidayDate, keterangan: newHolidayDesc.trim() });
    setSettings(store.getSettings());
    setNewHolidayDate('');
    setNewHolidayDesc('');
    toast.success('Hari Libur Ditambahkan', `Berhasil menambahkan hari libur: ${newHolidayDesc}`);
  };

  const handleDeleteHoliday = (id: string, ket: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus hari libur "${ket}"?`)) {
      store.deleteHoliday(id);
      setSettings(store.getSettings());
      toast.success('Hari Libur Dihapus', `Berhasil menghapus hari libur "${ket}".`);
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

  // Supabase Integration States
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [supabaseTestStatus, setSupabaseTestStatus] = useState<{ success?: boolean; message?: string; missingTables?: string[] } | null>(null);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [showSupabaseSchema, setShowSupabaseSchema] = useState(false);
  const [copiedSupabaseSchema, setCopiedSupabaseSchema] = useState(false);

  const handleTestSupabase = async () => {
    setIsTestingSupabase(true);
    setSupabaseTestStatus(null);
    const res = await testSupabaseConnection({
      url: settings.supabaseUrl || '',
      key: settings.supabaseKey || '',
    });
    setSupabaseTestStatus(res);
    setIsTestingSupabase(false);
    if (res.success) {
      toast.success('Koneksi Supabase Berhasil', res.message);
    } else {
      toast.error('Koneksi Supabase Gagal', res.message);
    }
  };

  const handleSyncSupabase = async () => {
    setIsSyncingSupabase(true);
    const res = await store.syncAllToSupabase();
    setSettings(store.getSettings());
    setIsSyncingSupabase(false);
    if (res.success) {
      toast.success('Sinkronisasi Supabase', res.message);
    } else {
      toast.error('Gagal Sinkronisasi', res.message);
    }
  };

  const handleCopySupabaseSchema = () => {
    const sql = getSupabaseSchemaSQL();
    navigator.clipboard.writeText(sql);
    setCopiedSupabaseSchema(true);
    toast.success('SQL Schema Disalin', 'Perintah DDL SQL untuk tabel Supabase berhasil disalin ke clipboard.');
    setTimeout(() => setCopiedSupabaseSchema(false), 3000);
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
    if (confirm('Apakah Anda yakin ingin mereset database ke data awal contoh sekolah?')) {
      store.resetToSeedData();
      setSettings(store.getSettings());
      alert('Database berhasil direset ke data awal!');
    }
  };

  const handleClearStudents = () => {
    const studentCount = store.getStudents().length;
    if (studentCount === 0) {
      alert('Database siswa sudah kosong.');
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus SELURUH ${studentCount} data siswa dari database? Ini memungkinkan Anda untuk meng-import ulang file Excel tanpa duplikasi.`)) {
      store.deleteAllStudents();
      alert(`Berhasil menghapus seluruh ${studentCount} data siswa dari database!`);
    }
  };

  const handleClearAllDatabase = async () => {
    if (
      confirm(
        'PERINGATAN UTAMA & KRITIS:\n\nApakah Anda yakin ingin MENGOSONGKAN SELURUH DATABASE (Siswa, Absensi, & Log Aktivitas) di Server dan Penyimpanan Lokal?\n\nTindakan ini akan menghapus seluruh data secara bersih dan permanen!'
      )
    ) {
      setIsClearingCache(true);
      await store.clearAllDatabase();
      setSettings(store.getSettings());
      setHealth(store.runDataHealthCheck());
      setIsClearingCache(false);
      alert('Seluruh Database (Server & Lokal) berhasil dikosongkan!');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
        <div>
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-xs uppercase tracking-wider mb-1">
            <Settings className="w-4 h-4" />
            <span>Konfigurasi & Keamanan Role Admin</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Pengaturan Sekolah & Akun Admin</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Atur konfigurasi jam sekolah, ubah kata sandi Role Admin, serta sinkronisasikan seluruh perubahan secara otomatis.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <button
            onClick={handleManualSync}
            disabled={isSyncing || isClearingCache}
            className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            title="Sinkronkan seluruh data lokal ke server"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-500' : ''}`} />
            <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Data'}</span>
          </button>

          <button
            onClick={handleClearCache}
            disabled={isClearingCache || isSyncing}
            className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            title="Bersihkan cache penyimpan lokal (localStorage) dan muat ulang dari server"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isClearingCache ? 'animate-spin text-amber-500' : ''}`} />
            <span>{isClearingCache ? 'Clearing...' : 'Bersihkan Cache'}</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Pengaturan sekolah berhasil diperbarui dan disinkronkan!</span>
        </div>
      )}

      {/* Settings Form */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <School className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Identitas Sekolah & Jam Masuk</span>
          </h3>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Sekolah</label>
              <input
                type="text"
                value={settings.schoolName}
                onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">NPSN Sekolah</label>
              <input
                type="text"
                value={settings.schoolNPSN}
                onChange={(e) => setSettings({ ...settings, schoolNPSN: e.target.value })}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-600 font-mono"
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
                className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-600 font-mono"
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
                className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>
          </div>

          {/* Auto-Alpa 14:30 Section */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between bg-rose-50/80 dark:bg-rose-950/40 p-4 rounded-2xl border border-rose-200 dark:border-rose-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-xs">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Batas Jam Otopresensi Alpa
                  </label>
                  <input
                    type="time"
                    value={settings.autoAlpaCutoffTime || '14:30'}
                    onChange={(e) => setSettings({ ...settings, autoAlpaCutoffTime: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-rose-600 font-mono"
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
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
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
            <div className="flex items-center justify-between bg-emerald-50/80 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-sm">
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
              <div className="space-y-5 bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="p-3 bg-emerald-100/60 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
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
                          waTemplateHadir: 'Yth. Orang Tua / Wali murid dari *{nama}* (Kelas {kelas}),\n\nMemberitahukan data presensi sekolah di *{sekolah}*:\n📅 Tanggal: {tanggal}\n⏰ Waktu Scan: {waktu}\n📌 Status Presensi: ✅ *HADIR (Tepat Waktu)*\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_Pesan otomatis dari Sistem Presensi Digital {sekolah}_',
                          waTemplateTerlambat: 'Yth. Orang Tua / Wali murid dari *{nama}* (Kelas {kelas}),\n\nMemberitahukan data presensi sekolah di *{sekolah}*:\n📅 Tanggal: {tanggal}\n⏰ Waktu Scan: {waktu}\n📌 Status Presensi: ⏰ *TERLAMBAT* ({terlambat})\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_Pesan otomatis dari Sistem Presensi Digital {sekolah}_',
                          waTemplateIzinSakit: 'Yth. Orang Tua / Wali murid dari *{nama}* (Kelas {kelas}),\n\nMemberitahukan data presensi sekolah di *{sekolah}*:\n📅 Tanggal: {tanggal}\n📌 Status Presensi: 📄 *{status}*\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_Pesan otomatis dari Sistem Presensi Digital {sekolah}_',
                          waTemplateAlpa: 'Yth. Orang Tua / Wali murid dari *{nama}* (Kelas {kelas}),\n\nMemberitahukan data presensi sekolah di *{sekolah}*:\n📅 Tanggal: {tanggal}\n📌 Status Presensi: ❌ *ALPA (Tanpa Keterangan)*\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_Pesan otomatis dari Sistem Presensi Digital {sekolah}_',
                        });
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Template Ke Default</span>
                    </button>
                  </div>

                  <div className="text-[10px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 leading-relaxed font-mono">
                    Tag yang dapat digunakan: <code>{"{nama}"}</code>, <code>{"{kelas}"}</code>, <code>{"{waktu}"}</code>, <code>{"{status}"}</code>, <code>{"{sekolah}"}</code>, <code>{"{tanggal}"}</code>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Template Presensi Hadir
                      </label>
                      <textarea
                        rows={4}
                        value={settings.waTemplateHadir || 'Yth. Orang Tua / Wali murid dari *{nama}* (Kelas {kelas}),\n\nMemberitahukan data presensi sekolah di *{sekolah}*:\n📅 Tanggal: {tanggal}\n⏰ Waktu Scan: {waktu}\n📌 Status Presensi: ✅ *HADIR (Tepat Waktu)*\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_Pesan otomatis dari Sistem Presensi Digital {sekolah}_'}
                        onChange={(e) => setSettings({ ...settings, waTemplateHadir: e.target.value })}
                        className="w-full p-2.5 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-600 font-sans"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-amber-700 dark:text-amber-400 mb-1">
                        Template Presensi Terlambat
                      </label>
                      <textarea
                        rows={4}
                        value={settings.waTemplateTerlambat || 'Yth. Orang Tua / Wali murid dari *{nama}* (Kelas {kelas}),\n\nMemberitahukan data presensi sekolah di *{sekolah}*:\n📅 Tanggal: {tanggal}\n⏰ Waktu Scan: {waktu}\n📌 Status Presensi: ⏰ *TERLAMBAT* ({terlambat})\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_Pesan otomatis dari Sistem Presensi Digital {sekolah}_'}
                        onChange={(e) => setSettings({ ...settings, waTemplateTerlambat: e.target.value })}
                        className="w-full p-2.5 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-amber-600 font-sans"
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
                        className="w-full p-2.5 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-600 font-sans"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-rose-700 dark:text-rose-400 mb-1">
                        Template Alpa / Tanpa Keterangan
                      </label>
                      <textarea
                        rows={4}
                        value={settings.waTemplateAlpa || 'Yth. Orang Tua / Wali murid dari *{nama}* (Kelas {kelas}),\n\nMemberitahukan data presensi sekolah di *{sekolah}*:\n📅 Tanggal: {tanggal}\n📌 Status Presensi: ❌ *ALPA (Tanpa Keterangan)*\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_Pesan otomatis dari Sistem Presensi Digital {sekolah}_'}
                        onChange={(e) => setSettings({ ...settings, waTemplateAlpa: e.target.value })}
                        className="w-full p-2.5 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-rose-600 font-sans"
                      />
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Supabase Database Integration Section */}
          <div className="pt-5 border-t border-slate-100 dark:border-slate-800 space-y-5">
            <div className="bg-gradient-to-r from-emerald-950/10 via-teal-950/10 to-emerald-950/10 dark:from-emerald-950/40 dark:to-teal-950/40 p-5 rounded-2xl border border-emerald-500/30 dark:border-emerald-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-md">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Integrasi Database Supabase (Cloud PostgreSQL & Mobile Sync)</span>
                      <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded-full text-[10px] font-bold">
                        Supabase Active
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Hubungkan ke cloud database PostgreSQL Supabase untuk sinkronisasi otomatis multi-perangkat, aplikasi Flutter mobile, dan backup terpusat.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopySupabaseSchema}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0 cursor-pointer self-start sm:self-auto"
                >
                  {copiedSupabaseSchema ? <Check className="w-4 h-4 text-emerald-200" /> : <Code2 className="w-4 h-4" />}
                  <span>{copiedSupabaseSchema ? 'SQL Disalin!' : 'Salin SQL Schema Supabase'}</span>
                </button>
              </div>

              {/* URL & Key Inputs */}
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      URL Project Supabase
                    </label>
                    <input
                      type="url"
                      value={settings.supabaseUrl || ''}
                      onChange={(e) => setSettings({ ...settings, supabaseUrl: e.target.value })}
                      placeholder="https://xyzcompany.supabase.co"
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-600 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      API Key Supabase (Anon / Service Key)
                    </label>
                    <input
                      type="password"
                      value={settings.supabaseKey || ''}
                      onChange={(e) => setSettings({ ...settings, supabaseKey: e.target.value })}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5..."
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-600 font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleTestSupabase}
                    disabled={isTestingSupabase || !settings.supabaseUrl || !settings.supabaseKey}
                    className="px-4 py-2 bg-emerald-100 dark:bg-emerald-950 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Zap className={`w-3.5 h-3.5 ${isTestingSupabase ? 'animate-spin text-emerald-600' : ''}`} />
                    <span>{isTestingSupabase ? 'Menguji Koneksi...' : 'Uji Koneksi Supabase'}</span>
                  </button>
                </div>

                {supabaseTestStatus && (
                  <div
                    className={`p-3 rounded-xl text-xs font-bold flex items-start gap-2 ${
                      supabaseTestStatus.success
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300'
                        : 'bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 border border-rose-300'
                    }`}
                  >
                    {supabaseTestStatus.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span className="leading-relaxed">{supabaseTestStatus.message}</span>
                  </div>
                )}

                {/* Auto Sync Toggle & Sync Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.enableSupabaseAutoSync ?? true}
                        onChange={(e) => setSettings({ ...settings, enableSupabaseAutoSync: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:after:border-slate-600 peer-checked:bg-emerald-600"></div>
                    </label>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Otomatis Sync ke Supabase saat Presensi & Data Berubah
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Setiap perubahan data siswa atau scan presensi langsung di-upsert ke tabel Supabase.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncSupabase}
                    disabled={isSyncingSupabase || !settings.supabaseUrl || !settings.supabaseKey}
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    title="Kirim seluruh data lokal ke tabel Supabase"
                  >
                    <UploadCloud className={`w-3.5 h-3.5 ${isSyncingSupabase ? 'animate-bounce' : ''}`} />
                    <span>{isSyncingSupabase ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                  </button>
                </div>

                {settings.lastSupabaseSync && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                    Terakhir disinkronkan ke Supabase: {settings.lastSupabaseSync}
                  </p>
                )}

                {/* Collapsible Supabase Guide */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSupabaseSchema(!showSupabaseSchema)}
                    className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Panduan 3 Langkah Pemasangan Supabase Database</span>
                    {showSupabaseSchema ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showSupabaseSchema && (
                    <div className="mt-3 p-4 bg-slate-900 text-slate-100 rounded-xl space-y-3 text-xs font-sans border border-slate-800">
                      <div className="font-bold text-emerald-400 border-b border-slate-800 pb-2">
                        Panduan Menghubungkan Supabase:
                      </div>
                      <ol className="list-decimal pl-5 space-y-2 text-slate-300 text-[11px] leading-relaxed">
                        <li>
                          Buka <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline">supabase.com</a> dan buat project baru secara gratis.
                        </li>
                        <li>
                          Buka menu <b>SQL Editor</b> di Dashboard Supabase, klik <b>New Query</b>, lalu tempelkan <b>SQL Schema</b> (klik tombol <i>Salin SQL Schema Supabase</i> di atas) dan klik <b>Run</b> untuk membuat tabel <code className="text-cyan-300">students</code>, <code className="text-cyan-300">attendance</code>, dan <code className="text-cyan-300">activity_logs</code>.
                        </li>
                        <li>
                          Buka menu <b>Project Settings &gt; API</b> di Supabase, salin <b>Project URL</b> dan <b>anon / public Key</b>, tempelkan di formulir atas, lalu klik <b>Simpan & Sinkronkan Konfigurasi</b>.
                        </li>
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Simpan & Sinkronkan Konfigurasi</span>
            </button>
          </div>
        </form>
      </div>

      {/* Hari Libur Section Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Kelola Hari Libur Sekolah & Tanggal Merah</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Input tanggal libur sekolah agar sistem tidak menjalankan penalti presensi/Alpa otomatis pada hari libur tersebut.
            </p>
          </div>
        </div>

        {/* Form Tambah Hari Libur */}
        <form onSubmit={handleAddHoliday} className="bg-purple-50/50 dark:bg-purple-950/20 p-4 rounded-xl border border-purple-100 dark:border-purple-900/50 space-y-3">
          <div className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-purple-600" />
            <span>Tambah Hari Libur Baru</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Libur
              </label>
              <input
                type="date"
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-600 font-mono"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Keterangan Hari Libur
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Contoh: Hari Kemerdekaan RI, Libur Semester 1, dsb."
                  value={newHolidayDesc}
                  onChange={(e) => setNewHolidayDesc(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-600"
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Simpan</span>
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* List Hari Libur */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>Daftar Hari Libur Terdaftar ({settings.holidays?.length || 0})</span>
            <span className="text-[11px] text-purple-600 dark:text-purple-400 font-normal">
              * Hari Sabtu & Minggu otomatis dianggap Hari Libur
            </span>
          </div>

          {(!settings.holidays || settings.holidays.length === 0) ? (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
              Belum ada hari libur khusus yang ditambahkan. Gunakan formulir di atas untuk menginput tanggal libur.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              {settings.holidays.map((h) => {
                const parts = h.tanggal.split('-');
                const formatted = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : h.tanggal;
                return (
                  <div
                    key={h.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 text-[10px] font-extrabold rounded-md font-mono">
                          {formatted}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate mt-1">
                        {h.keterangan}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteHoliday(h.id, h.keterangan)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                      title="Hapus Hari Libur"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Data Health Check & Browser Backup Card */}
      <div id="data-health-check" className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Pemeriksaan Kesehatan Data & Backup (Data Health Check)</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Memvalidasi konsistensi jumlah siswa aktif terhadap log absensi dan cadangan lokal browser.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRecheckHealth}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Periksa ulang kesehatan data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Analisis Ulang</span>
            </button>
            <button
              onClick={handleCreateManualBackup}
              className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Simpan cadangan lokal browser saat ini"
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>Simpan Snapshot Backup</span>
            </button>
          </div>
        </div>

        {/* Overall Status Banner */}
        {health.status === 'healthy' && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-emerald-800 dark:text-emerald-200 uppercase tracking-wider">
                Status Data: SEHAT & KONSISTEN (Normal)
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                Jumlah {health.totalStudents} data siswa aktif sepenuhnya konsisten dengan {health.totalAttendance} rekaman absensi dan cadangan lokal browser.
              </p>
            </div>
          </div>
        )}

        {health.status === 'warning' && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wider">
                Status Data: PERINGATAN INKONSISTENSI TERDETEKSI
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Ditemukan perbedaan antara Master Siswa aktif dan data histori absensi/backup. Periksa rincian di bawah ini.
              </p>
            </div>
          </div>
        )}

        {health.status === 'critical' && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <div className="text-xs font-bold text-rose-800 dark:text-rose-200 uppercase tracking-wider">
                Status Data: PERINGATAN KRITIS / INDIKASI DATA SISWA TERHAPUS
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                Terdeteksi jumlah siswa aktif berkurang signifikan atau ada rekaman presensi tanpa data induk siswa. Disarankan segera melakukan pemulihan dari cadangan browser!
              </p>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
              <Users className="w-3 h-3 text-blue-500" />
              <span>Siswa Aktif</span>
            </div>
            <div className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mt-1">
              {health.totalStudents} <span className="text-xs font-normal text-slate-500">Orang</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
              <FileText className="w-3 h-3 text-emerald-500" />
              <span>Rekap Presensi</span>
            </div>
            <div className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mt-1">
              {health.totalAttendance} <span className="text-xs font-normal text-slate-500">Scan</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
              <Users className="w-3 h-3 text-purple-500" />
              <span>Siswa di Absensi</span>
            </div>
            <div className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mt-1">
              {health.uniqueAttendanceStudents} <span className="text-xs font-normal text-slate-500">Siswa</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
              <Database className="w-3 h-3 text-amber-500" />
              <span>Backup Browser</span>
            </div>
            <div className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mt-1">
              {health.backupInfo.exists ? (
                <>
                  {health.backupInfo.studentCount} <span className="text-xs font-normal text-slate-500">Siswa</span>
                </>
              ) : (
                <span className="text-xs text-slate-400">Kosong</span>
              )}
            </div>
          </div>
        </div>

        {/* Discrepancies & Issues Box if any */}
        {health.discrepancies.length > 0 && (
          <div className="p-4 bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs text-rose-800 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>Daftar Ketidaksesuaian Terdeteksi:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs text-rose-700 dark:text-rose-300 pl-1">
              {health.discrepancies.map((disc, idx) => (
                <li key={idx} className="font-medium">
                  {disc}
                </li>
              ))}
            </ul>

            {/* List missing student details if orphaned attendance records exist */}
            {health.missingStudentDetails.length > 0 && (
              <div className="mt-3 pt-3 border-t border-rose-200 dark:border-rose-900/80">
                <div className="text-[11px] font-bold text-rose-900 dark:text-rose-200 mb-2">
                  Daftar Siswa dengan Absensi Terbaca Tapi Data Utama Hilang ({health.missingStudentDetails.length} Orang):
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {health.missingStudentDetails.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{s.name}</span>
                        <span className="ml-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          (NISN: {s.nisn} | Kelas: {s.class})
                        </span>
                      </div>
                      <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-bold rounded-md border border-rose-200 dark:border-rose-800">
                        {s.scanCount} Absensi
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons for Recovery */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          {health.backupInfo.exists && (
            <button
              onClick={handleRestoreFromBackup}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Pulihkan Data dari Backup Browser ({health.backupInfo.studentCount} Siswa)</span>
            </button>
          )}

          {health.orphanedAttendanceCount > 0 && (
            <button
              onClick={handleAutoRepair}
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Wrench className="w-4 h-4" />
              <span>Perbaiki Otomatis dari Log Absensi</span>
            </button>
          )}

          {!health.backupInfo.exists && health.orphanedAttendanceCount === 0 && (
            <button
              onClick={handleCreateManualBackup}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <BookmarkCheck className="w-4 h-4" />
              <span>Buat Cadangan Browser Lokal Sekarang</span>
            </button>
          )}
        </div>
      </div>

      {/* Change Password Card for Admin */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-500/20">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Ubah Kata Sandi (Role Admin)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
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
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{passSuccess}</span>
          </div>
        )}

        {passError && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-xl text-xs font-bold flex items-center gap-2">
            <span className="text-rose-600 dark:text-rose-400 shrink-0 font-bold">❌</span>
            <span>{passError}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
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
                className="w-full pl-10 pr-10 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-600 font-medium"
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
                  className="w-full pl-10 pr-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-600 font-medium"
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
                  className="w-full pl-10 pr-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-600 font-medium"
                  required
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              * Password baru akan langsung disinkronkan ke server dan dapat digunakan untuk login berikutnya di semua perangkat.
            </p>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Simpan & Sinkronkan Kata Sandi</span>
            </button>
          </div>
        </form>

        {/* Registered Accounts Info Panel */}
        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Informasi Kata Sandi Terdaftar Saat Ini</span>
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">Status: Aktif & Tersinkron</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/50 rounded-xl">
              <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">1. Admin (Utama)</div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5 truncate">smanlibas@gmail.com</div>
              <div className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-300 mt-1 bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 inline-block">
                {store.getAdminPassword()}
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-900/50 rounded-xl">
              <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">2. Guru Piket</div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5 truncate">piket.smanlibas@gmail.com</div>
              <div className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-300 mt-1 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 inline-block">
                piket123
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 border border-purple-200/80 dark:border-purple-900/50 rounded-xl">
              <div className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase">3. Kepala Sekolah</div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5 truncate">kepsek.smanlibas@gmail.com</div>
              <div className="text-[11px] font-mono font-bold text-purple-600 dark:text-purple-300 mt-1 bg-purple-50 dark:bg-purple-950/80 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800 inline-block">
                KepsekNexa15!
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reset & Maintenance Zone */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
        <h4 className="font-bold text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">Pemeliharaan Cache & Reset Database</h4>
        
        {/* Clear Cache Card */}
        <div className="p-4 bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shadow-sm cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isClearingCache ? 'animate-spin' : ''}`} />
            <span>{isClearingCache ? 'Clearing Cache...' : 'Bersihkan Cache Lokal'}</span>
          </button>
        </div>

        {/* Clear Entire Database (Server + Local) Card */}
        <div className="p-4 bg-rose-100/90 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div>
            <div className="flex items-center gap-1.5 font-extrabold text-xs text-rose-950 dark:text-rose-100 uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Kosongkan Seluruh Database (Server & Lokal)</span>
            </div>
            <p className="text-[11px] text-rose-800 dark:text-rose-300 mt-1">
              Membersihkan dan menghapus seluruh koleksi data siswa, absensi, dan log di server backend dan penyimpanan browser lokal secara total (Koneksi Firestore telah diputuskan).
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearAllDatabase}
            disabled={isClearingCache || isSyncing}
            className="px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shadow-md cursor-pointer disabled:opacity-50 shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            <span>Kosongkan Seluruh DB</span>
          </button>
        </div>

        <div className="p-4 bg-red-50/50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="font-bold text-xs text-red-900 dark:text-red-300">Kosongkan Khusus Database Siswa</p>
            <p className="text-[11px] text-red-700 dark:text-red-400 mt-0.5">
              Menghapus seluruh data siswa di database agar Anda dapat meng-import ulang berkas Excel secara bersih tanpa tercatat ganda.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearStudents}
            className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Kosongkan DB Siswa</span>
          </button>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="font-bold text-xs text-slate-800 dark:text-slate-200">Reset Ke Data Awal Contoh</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Mengembalikan data siswa dan rekaman absensi ke contoh awal (termasuk Dadang Buamona & 10 siswa sampel).
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetData}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Database Contoh</span>
          </button>
        </div>
      </div>
    </div>
  );
};
