import React from 'react';
import { CheckCircle2, Clock, FileCheck, Stethoscope, XCircle } from 'lucide-react';

interface Stats {
  totalSiswaMasuk: number;
  totalScanMasuk: number;
  totalScanPulang: number;
  total: number;
  hadir: number;
  terlambat: number;
  izin: number;
  sakit: number;
  alpa: number;
  scanPulang: number;
}

interface AttendanceSummaryCardsProps {
  stats: Stats;
}

export const AttendanceSummaryCards: React.FC<AttendanceSummaryCardsProps> = ({ stats }) => {
  return (
    <>
      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500">Total Siswa Presensi</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{stats.totalSiswaMasuk}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5" title={`${stats.totalScanMasuk} Masuk, ${stats.totalScanPulang} Pulang`}>
            {stats.total} Total Scan ({stats.totalScanPulang} Pulang)
          </div>
        </div>

        <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
          <div className="text-[10px] font-extrabold uppercase text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
            <span>Hadir</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-900 dark:text-emerald-200 mt-1">{stats.hadir}</div>
          <div className="text-[10px] text-emerald-800/80 dark:text-emerald-300 mt-0.5">Tepat Waktu</div>
        </div>

        <div className="bg-amber-50/70 dark:bg-amber-950/40 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800/60 shadow-sm">
          <div className="text-[10px] font-extrabold uppercase text-amber-700 dark:text-amber-400 flex items-center justify-between">
            <span>Terlambat</span>
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-900 dark:text-amber-200 mt-1">{stats.terlambat}</div>
          <div className="text-[10px] text-amber-800/80 dark:text-amber-300 mt-0.5">Lewat Jam Masuk</div>
        </div>

        <div className="bg-blue-50/70 dark:bg-blue-950/40 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-800/60 shadow-sm">
          <div className="text-[10px] font-extrabold uppercase text-blue-700 dark:text-blue-400 flex items-center justify-between">
            <span>Izin</span>
            <FileCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-xl font-black text-blue-900 dark:text-blue-200 mt-1">{stats.izin}</div>
          <div className="text-[10px] text-blue-800/80 dark:text-blue-300 mt-0.5">Surat Izin</div>
        </div>

        <div className="bg-purple-50/70 dark:bg-purple-950/40 p-3.5 rounded-2xl border border-purple-200 dark:border-purple-800/60 shadow-sm">
          <div className="text-[10px] font-extrabold uppercase text-purple-700 dark:text-purple-400 flex items-center justify-between">
            <span>Sakit</span>
            <Stethoscope className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-xl font-black text-purple-900 dark:text-purple-200 mt-1">{stats.sakit}</div>
          <div className="text-[10px] text-purple-800/80 dark:text-purple-300 mt-0.5">Keterangan Dokter</div>
        </div>

        <div className="bg-red-50/70 dark:bg-red-950/40 p-3.5 rounded-2xl border border-red-200 dark:border-red-800/60 shadow-sm">
          <div className="text-[10px] font-extrabold uppercase text-red-700 dark:text-red-400 flex items-center justify-between">
            <span>Alpa</span>
            <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
          </div>
          <div className="text-xl font-black text-red-900 dark:text-red-200 mt-1">{stats.alpa}</div>
          <div className="text-[10px] text-red-800/80 dark:text-red-300 mt-0.5">Tanpa Keterangan</div>
        </div>
      </div>

      {/* Synchronization & Breakdown Info Banner */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            <strong>Data Sinkron dengan Dashboard:</strong> {stats.totalSiswaMasuk} Siswa Masuk ({stats.hadir} Hadir Tepat Waktu + {stats.terlambat} Terlambat) • {stats.scanPulang} Siswa Scan Pulang • {stats.total} Total Transaksi Scan.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-[11px] border border-blue-200 dark:border-blue-800">
            {stats.totalScanMasuk} Scan Masuk
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-[11px] border border-purple-200 dark:border-purple-800">
            {stats.totalScanPulang} Scan Pulang
          </span>
        </div>
      </div>
    </>
  );
};
