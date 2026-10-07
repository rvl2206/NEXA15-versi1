import React, { useState, useEffect } from 'react';
import {
  CloudCheck,
  RefreshCw,
  Wifi,
  WifiOff,
  GraduationCap,
  User,
  Database,
  X,
  LogOut,
  ShieldAlert,
} from 'lucide-react';
import { store, SyncQueueItem } from '../lib/store';
import { toast } from '../lib/toast';

interface ExitUnsyncedDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmExit: () => void;
}

export const ExitUnsyncedDataModal: React.FC<ExitUnsyncedDataModalProps> = ({
  isOpen,
  onClose,
  onConfirmExit,
}) => {
  const [queueDetails, setQueueDetails] = useState(store.getSyncQueueDetails());
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = store.subscribe(() => {
      const current = store.getSyncQueueDetails();
      setQueueDetails(current);
      if (current.total === 0 && isSyncing) {
        setSyncSuccess(true);
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, [isSyncing]);

  if (!isOpen) return null;

  const total = queueDetails.total;

  const handleSyncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await store.syncAllPendingToDatabase(true);
      if (res.success) {
        setSyncSuccess(true);
        toast.success('Pengiriman Berhasil', res.message);
      } else {
        toast.warning('Gagal Mengirim Sebagian Data', res.message);
      }
    } catch (err: any) {
      toast.error('Gagal Mengirim Data', err?.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsSyncing(false);
    }
  };

  const getItemLabel = (item: SyncQueueItem): { title: string; subtitle: string; icon: any } => {
    if (item.type === 'attendance') {
      const data = item.data || {};
      return {
        title: `${data.nama || 'Siswa'} (${data.kelas || '-'})`,
        subtitle: `Presensi ${data.jenis || 'Scan'} - ${data.status || 'Hadir'}`,
        icon: GraduationCap,
      };
    }
    if (item.type === 'teacher_attendance') {
      const data = item.data || {};
      return {
        title: `${data.nama || 'Guru'}`,
        subtitle: `Presensi Guru ${data.jenis || ''} (${data.status || ''})`,
        icon: User,
      };
    }
    if (item.type === 'student') {
      const data = item.data || {};
      return {
        title: `Data Siswa: ${data.nama || item.id}`,
        subtitle: `Kelas ${data.kelas || '-'} (${item.action})`,
        icon: GraduationCap,
      };
    }
    if (item.type === 'teacher') {
      const data = item.data || {};
      return {
        title: `Data Guru: ${data.nama || item.id}`,
        subtitle: `${data.mapel || data.nip || '-'} (${item.action})`,
        icon: User,
      };
    }
    return {
      title: `Catatan Sistem (${item.type})`,
      subtitle: `Aksi: ${item.action}`,
      icon: Database,
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0b1121]/95 backdrop-blur-2xl border border-white/10 shadow-2xl border-2 border-rose-500/80 rounded-3xl max-w-lg w-full p-6 shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/10 transition-all cursor-pointer"
          title="Batal dan Kembali"
        >
          <X className="w-5 h-5" />
        </button>

        {syncSuccess || total === 0 ? (
          /* Safe to exit state */
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50 dark:ring-emerald-900/20">
              <CloudCheck className="w-9 h-9" />
            </div>
            <h3 className="text-lg font-black text-white">
              Semua Data Telah Terkirim ke Database!
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-md mx-auto leading-relaxed">
              Seluruh data presensi dan perubahan telah tersimpan aman di Database Server. Perangkat Anda dapat keluar sekarang tanpa risiko kehilangan data.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={onConfirmExit}
                className="w-full sm:w-auto px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Lanjut Keluar Sekarang</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 bg-white/5 backdrop-blur-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Kembali ke Aplikasi
              </button>
            </div>
          </div>
        ) : (
          /* Unsynced Warning State */
          <div>
            {/* Header */}
            <div className="flex items-start gap-3.5 mb-4">
              <div className="p-3 bg-gradient-to-br from-rose-600 to-amber-600 text-white rounded-2xl shadow-md shrink-0 animate-pulse">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div className="min-w-0 pr-6">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-rose-100 dark:bg-rose-900/80 text-rose-700 dark:text-rose-200 uppercase">
                    Peringatan Keluar Aplikasi
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white mt-1 leading-snug">
                  Ada {total} Data Belum Terkirim ke Database!
                </h3>
              </div>
            </div>

            {/* Warning Message */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 text-xs sm:text-sm leading-relaxed mb-4">
              <p>
                Perangkat sedang bersiap keluar dari aplikasi, namun masih ada{' '}
                <b>{total} data presensi/perubahan</b> yang tersimpan di memori perangkat ini dan{' '}
                <span className="font-bold underline decoration-rose-500">
                  belum tersimpan di database server Cloud
                </span>
                .
              </p>
              <p className="mt-1.5 text-[11px] text-amber-800 dark:text-amber-300">
                Disarankan menekan tombol <b>Kirim ke Database Sekarang</b> agar data siswa dan guru tidak hilang.
              </p>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
              {queueDetails.attendanceCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                  <GraduationCap className="w-4 h-4 text-amber-600" />
                  <span>Presensi Siswa: {queueDetails.attendanceCount}</span>
                </span>
              )}
              {queueDetails.teacherCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700">
                  <User className="w-4 h-4 text-purple-600" />
                  <span>Presensi Guru: {queueDetails.teacherCount}</span>
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-extrabold border ${
                  isOnline
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-300'
                    : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border-rose-300 animate-pulse'
                }`}
              >
                {isOnline ? (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Koneksi Online (Siap Kirim)</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-rose-600" />
                    <span>Offline (Hubungkan Internet)</span>
                  </>
                )}
              </span>
            </div>

            {/* Preview items */}
            <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-2xl bg-white/5 backdrop-blur-xl/60 border border-white/10 mb-5 scrollbar-thin">
              {queueDetails.items.slice(0, 10).map((item, idx) => {
                const info = getItemLabel(item);
                const IconComponent = info.icon;
                return (
                  <div
                    key={`${item.id}-${idx}`}
                    className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-[#0b1121]/95 backdrop-blur-2xl border border-white/10 shadow-2xl border border-white/10/80 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 shrink-0">
                        <IconComponent className="w-3 h-3" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-slate-100 truncate text-[11px]">
                          {info.title}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {info.subtitle}
                        </p>
                      </div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 shrink-0">
                      Tertunda
                    </span>
                  </div>
                );
              })}
              {queueDetails.items.length > 10 && (
                <p className="text-center text-[10px] text-slate-400 py-1">
                  ...dan {queueDetails.items.length - 10} data lainnya
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="w-full py-3 px-4 rounded-2xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>
                  {isSyncing ? 'Sedang Mengirim ke Database Server...' : 'KIRIM KE DATABASE SEKARANG'}
                </span>
              </button>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={onConfirmExit}
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/60 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Tetap Keluar (Abaikan)</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white/5 backdrop-blur-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer text-center"
                >
                  Batal & Kembali
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
