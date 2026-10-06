import React, { useState } from 'react';
import { 
  KeyRound, ShieldCheck, CheckCircle2, Lock, EyeOff, Eye, 
  RotateCcw, ShieldAlert, Trash2, RefreshCw 
} from 'lucide-react';
import { store } from '../lib/store';
import { SchoolSettings } from '../types';
import { toast } from '../lib/toast';
import { SettingsHealthCheck } from './SettingsHealthCheck';

interface SettingsSecurityAndMaintenanceProps {
  settings: SchoolSettings;
  setSettings: (s: SchoolSettings) => void;
}

export const SettingsSecurityAndMaintenance: React.FC<SettingsSecurityAndMaintenanceProps> = ({ 
  settings, 
  setSettings 
}) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [isSyncing] = useState(false);
  
  // Note: we can keep health state local to this component if we wrap the HealthCheck inside it,
  // or we can just import SettingsHealthCheck and use it. Wait, SettingsHealthCheck seems to have its own internal state if it was extracted!
  // Oh, wait, the previous code had `<SettingsHealthCheck />` outside the maintenance block in SettingsPage.tsx.
  // I will just put health check outside, or move it inside here since it fits well.

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
    
    if (result.success) {
      setPassSuccess(result.message);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassSuccess(''), 5000);
    } else {
      setPassError(result.message);
    }
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
    toast.success(`Berhasil menghapus seluruh ${studentCount} data siswa dari database!`);
  };

  const handleClearAllDatabase = async () => {
    setIsClearingCache(true);
    await store.clearAllDatabase();
    setSettings(store.getSettings());
    // setHealth(store.runDataHealthCheck()); -> SettingsHealthCheck will handle this.
    setIsClearingCache(false);
    toast.success('Database Bersih', 'Seluruh Database (Server & Lokal) berhasil dikosongkan!');
  };

  return (
    <>
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
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-lpignore="true"
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
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-lpignore="true"
                  className="w-full pl-10 pr-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-600 font-medium"
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
              className="w-full sm:w-auto px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Simpan & Sinkronkan Kata Sandi</span>
            </button>
          </div>
        </form>
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
    </>
  );
};


