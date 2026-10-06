import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, BookmarkCheck, CheckCircle2, AlertTriangle, ShieldAlert, Users, FileText, Database, RotateCcw, Wrench } from 'lucide-react';
import { store, HealthCheckResult } from '../lib/store';
import { toast } from '../lib/toast';

export const SettingsHealthCheck: React.FC = () => {
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
    store.restoreFromBrowserBackup();
    setHealth(store.runDataHealthCheck());
    toast.success('Restorasi Selesai', 'Data siswa dan absensi berhasil dipulihkan dari cadangan browser.');
  };

  const handleAutoRepair = () => {
    store.autoRepairFromAttendance();
    setHealth(store.runDataHealthCheck());
    toast.success('Perbaikan Selesai', 'Profil siswa yang hilang berhasil direkonstruksi dari log absensi & backup.');
  };

  const handleCreateManualBackup = () => {
    store.createManualBackup();
    setHealth(store.runDataHealthCheck());
    toast.success('Backup Selesai', 'Data berhasil dicadangkan ke localStorage browser.');
  };

  return (
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


  );
};
