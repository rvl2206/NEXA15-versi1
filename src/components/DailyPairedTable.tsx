import React from 'react';
import {
  ShieldAlert,
  Trash2,
  LogOut,
  AlertTriangle,
  LogIn,
  Edit3,
  AlertCircle,
  Clock,
  MessageCircle,
} from 'lucide-react';
import { AttendanceRecord, Student, AttendanceStatus } from '../types';
import { store } from '../lib/store';
import { generateWhatsAppMessage, getWhatsAppLink } from '../lib/exportUtils';

export interface PairedSummaryCounts {
  total: number;
  sudahPulang: number;
  belumPulang: number;
}

export interface DailyPairedTableProps {
  pairedDailyRecords: any[];
  pairedSummaryCounts: PairedSummaryCounts;
  filterTanggal: string;
  filterStatusPulang: 'Semua' | 'SudahPulang' | 'BelumPulang';
  setFilterStatusPulang: (val: 'Semua' | 'SudahPulang' | 'BelumPulang') => void;
  currentPage: number;
  pageSize: number;

  formatIndoDate: (date: string) => string;
  handleBulkSetAlpa: () => void;
  handlePurgeSaturdayAlpa: () => void;
  getStatusBadge: (status: AttendanceStatus) => React.ReactNode;
  formatLateDuration: (minutes: number) => string;
  formatPetugasRole: (petugas: string | undefined) => string;
  handleOpenCorrection: (
    record: AttendanceRecord | null,
    student: Student,
    dateStr?: string,
    defaultType?: 'Masuk' | 'Pulang'
  ) => void;
  renderPaginationFooter: (totalItems: number) => React.ReactNode;
}

function paginateList<T>(list: T[], page: number, size: number): T[] {
  if (size === 0) return list;
  const start = (page - 1) * size;
  return list.slice(start, start + size);
}

export const DailyPairedTable: React.FC<DailyPairedTableProps> = ({
  pairedDailyRecords,
  pairedSummaryCounts,
  filterTanggal,
  filterStatusPulang,
  setFilterStatusPulang,
  currentPage,
  pageSize,
  formatIndoDate,
  handleBulkSetAlpa,
  handlePurgeSaturdayAlpa,
  getStatusBadge,
  formatLateDuration,
  formatPetugasRole,
  handleOpenCorrection,
  renderPaginationFooter,
}) => {
  const handleSendWhatsApp = (item: any) => {
    let phone = item.student.no_hp_ortu;
    if (!phone) {
      phone = prompt(`Masukkan No. WhatsApp Orang Tua untuk ${item.student.nama}:`, '08123456789') || undefined;
      if (phone && phone.trim()) {
        store.updateStudent(item.student.id, { no_hp_ortu: phone.trim() });
        item.student.no_hp_ortu = phone.trim();
      }
    }
    if (phone) {
      const schoolSettings = store.getSettings();
      let template: string | undefined;
      if (item.status === 'Hadir') template = schoolSettings.waTemplateHadir;
      else if (item.status === 'Terlambat') template = schoolSettings.waTemplateTerlambat;
      else if (item.status === 'Izin' || item.status === 'Sakit') template = schoolSettings.waTemplateIzinSakit;
      else if (item.status === 'Alpa') template = schoolSettings.waTemplateAlpa;

      const recordToUse = item.masuk || {
        id: '',
        studentId: item.student.id,
        studentName: item.student.nama,
        nisn: item.student.nisn,
        class: item.student.kelas,
        timestamp: new Date().toISOString(),
        type: 'Masuk' as const,
        status: item.status,
        officer: item.petugas,
        terlambatMenit: item.lateMinutes,
      };

      const schoolName = schoolSettings.schoolName || 'SMA NEGERI 15 AMBON';
      const waMsg = generateWhatsAppMessage(item.student, recordToUse, schoolName, template);
      const waUrl = getWhatsAppLink(phone, waMsg);
      window.open(waUrl, '_blank');
    }
  };

  return (
    <div className="bg-[#0b1121]/95 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl border border-white/10 shadow-sm overflow-hidden transition-colors">
      <div className="p-4 border-b border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-sm text-white">
            Rekap Pasangan Waktu Masuk & Pulang Siswa ({formatIndoDate(filterTanggal)})
          </h3>
          <p className="text-xs text-slate-400">
            Mencatat waktu masuk, waktu pulang, serta perhitungan akurat jumlah waktu keterlambatan siswa.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleBulkSetAlpa}
            className="px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-sm cursor-pointer"
            title="Tutup gerbang dan otomatis set Alpa untuk siswa yang tidak scan masuk"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>🚨 Tutup Gerbang (Auto-Alpa)</span>
          </button>

          <button
            type="button"
            onClick={handlePurgeSaturdayAlpa}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800 shadow-xs cursor-pointer"
            title="Hapus seluruh data presensi hari Sabtu yang berstatus ALPA"
          >
            <Trash2 className="w-3.5 h-3.5 text-amber-600" />
            <span>Revisi Alpa Sabtu</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatusPulang('Semua')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
              filterStatusPulang === 'Semua'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                : 'bg-white/5 backdrop-blur-xl text-slate-300 hover:bg-slate-200'
            }`}
          >
            Semua ({pairedSummaryCounts.total})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatusPulang('SudahPulang')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterStatusPulang === 'SudahPulang'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
            }`}
            title="Tampilkan hanya siswa yang sudah melakukan scan pulang"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sudah Scan Pulang ({pairedSummaryCounts.sudahPulang})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterStatusPulang('BelumPulang')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterStatusPulang === 'BelumPulang'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
            }`}
            title="Tampilkan siswa yang masuk namun belum scan pulang"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Belum Scan Pulang ({pairedSummaryCounts.belumPulang})</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/5 backdrop-blur-xl/80 text-slate-300 border-b border-white/10 font-bold uppercase tracking-wider">
            <tr>
              <th className="p-3.5">No</th>
              <th className="p-3.5">Nama Siswa</th>
              <th className="p-3.5">NISN / Kelas</th>
              <th className="p-3.5">Waktu Masuk</th>
              <th className="p-3.5">Waktu Pulang</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Jumlah Waktu Terlambat</th>
              <th className="p-3.5">Petugas</th>
              <th className="p-3.5 text-center">Aksi / Koreksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-slate-200">
            {pairedDailyRecords.length > 0 ? (
              paginateList<any>(pairedDailyRecords, currentPage, pageSize).map((item, index) => (
                <tr key={item.student.id} className="hover:bg-white/10 transition-colors">
                  <td className="p-3.5 font-medium text-slate-400 dark:text-slate-500">
                    {pageSize === 0 ? index + 1 : (currentPage - 1) * pageSize + index + 1}
                  </td>
                  <td className="p-3.5 font-bold text-white">{item.student.nama}</td>
                  <td className="p-3.5">
                    <span className="font-mono text-slate-400">{item.student.nisn}</span>
                    <span className="text-slate-400 dark:text-slate-500 font-semibold ml-1.5">({item.student.kelas})</span>
                  </td>
                  <td className="p-3.5">
                    {item.masuk ? (
                      <button
                        type="button"
                        onClick={() => handleOpenCorrection(item.masuk, item.student, filterTanggal, 'Masuk')}
                        className="font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1 group transition cursor-pointer"
                        title={`Klik untuk koreksi Scan Masuk ${item.student.nama}`}
                      >
                        <LogIn className="w-3 h-3 text-emerald-600" />
                        {new Date(item.masuk.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jayapura' })} WIT
                        <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 ml-0.5 text-emerald-600" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenCorrection(null, item.student, filterTanggal, 'Masuk')}
                        className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 px-2 py-0.5 rounded border border-dashed border-white/10 font-mono text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                        title={`Input Presensi Masuk untuk ${item.student.nama}`}
                      >
                        <span>-</span>
                      </button>
                    )}
                  </td>
                  <td className="p-3.5">
                    {item.pulang ? (
                      <button
                        type="button"
                        onClick={() => handleOpenCorrection(item.pulang, item.student, filterTanggal, 'Pulang')}
                        className="font-mono font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800 inline-flex items-center gap-1 group transition cursor-pointer"
                        title={`Klik untuk koreksi Scan Pulang ${item.student.nama}`}
                      >
                        <LogOut className="w-3 h-3 text-purple-600" />
                        {new Date(item.pulang.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jayapura' })} WIT
                        <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 ml-0.5 text-purple-600" />
                      </button>
                    ) : item.masuk ? (
                      <button
                        type="button"
                        onClick={() => handleOpenCorrection(null, item.student, filterTanggal, 'Pulang')}
                        className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 inline-flex items-center gap-1 transition cursor-pointer"
                        title={`Input Manual Scan Pulang untuk ${item.student.nama}`}
                      >
                        <span>Belum Pulang</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenCorrection(null, item.student, filterTanggal, 'Pulang')}
                        className="text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 px-2 py-0.5 rounded border border-dashed border-white/10 font-mono text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                        title={`Input Presensi Pulang untuk ${item.student.nama}`}
                      >
                        <span>-</span>
                      </button>
                    )}
                  </td>
                  <td className="p-3.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {getStatusBadge(item.status)}
                      {item.partialInfo === 'Tanpa Absen Pulang' && (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800" title="Siswa hadir masuk namun tidak mencatat scan pulang">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Tanpa Absen Pulang
                        </span>
                      )}
                      {item.partialInfo === 'Tanpa Absen Masuk' && (
                        <span className="inline-flex items-center gap-1 bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-sky-300 dark:border-sky-800" title="Siswa mencatat scan pulang namun tidak mencatat scan masuk">
                          <AlertCircle className="w-3 h-3 text-sky-600" />
                          Tanpa Absen Masuk
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3.5">
                    {item.status === 'Terlambat' && item.lateMinutes > 0 ? (
                      <span className="font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-700 inline-flex items-center gap-1 text-[11px]">
                        <Clock className="w-3 h-3 text-amber-600" />
                        {formatLateDuration(item.lateMinutes)}
                      </span>
                    ) : item.status === 'Hadir' ? (
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        Tepat Waktu
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">-</span>
                    )}
                  </td>
                  <td className="p-3.5 text-slate-500 truncate max-w-[120px]">{formatPetugasRole(item.petugas)}</td>
                  <td className="p-3.5 text-center flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenCorrection(item.masuk || item.pulang, item.student, filterTanggal)}
                      className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors inline-flex items-center gap-1 font-bold text-[11px]"
                      title={`Koreksi status / jam scan ${item.student.nama}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Koreksi</span>
                    </button>

                    <button
                      onClick={() => handleSendWhatsApp(item)}
                      className={`p-1.5 rounded-lg transition-colors inline-flex items-center justify-center ${
                        item.student.no_hp_ortu
                          ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                          : 'text-slate-400 dark:text-slate-500 hover:bg-white/10'
                      }`}
                      title={item.student.no_hp_ortu ? `Kirim Notifikasi WA (${item.student.no_hp_ortu})` : 'Input No HP & Kirim WA'}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-400 text-xs">
                  Tidak ada data siswa atau absensi harian.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {renderPaginationFooter(pairedDailyRecords.length)}
    </div>
  );
};
