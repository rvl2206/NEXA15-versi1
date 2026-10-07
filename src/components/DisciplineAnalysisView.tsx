import React, { useMemo } from 'react';
import { ShieldAlert, FileSpreadsheet, FileText, AlertTriangle, AlertCircle, Send } from 'lucide-react';
import { store } from '../lib/store';
import { generateWhatsAppLateGuidanceMessage, getWhatsAppLink, LateGuidanceExportItem } from '../lib/exportUtils';

export type DisciplineFilterType = 'semua_indisiplin' | 'hanya_terlambat' | 'hanya_alpa';

export interface DisciplineAnalysisViewProps {
  filteredDisciplineData: LateGuidanceExportItem[];
  latenessAnalysisData: LateGuidanceExportItem[];
  filterBulan: string;
  filterKelas: string;
  disciplineFilterType: DisciplineFilterType;
  setDisciplineFilterType: (val: DisciplineFilterType) => void;
  setIsProblematicExportModalOpen: (val: boolean) => void;
  exportLateGuidanceToPDF: (data: LateGuidanceExportItem[], month: string, grade: string) => void;
  currentPage: number;
  pageSize: number;
  paginateList: <T>(list: T[], page: number, size: number) => T[];
  renderPaginationFooter: (total: number) => React.ReactNode;
  formatIndoMonth: (isoMonth: string) => string;
  formatLateDuration: (minutes: number) => string;
}

export const DisciplineAnalysisView: React.FC<DisciplineAnalysisViewProps> = ({
  filteredDisciplineData,
  latenessAnalysisData,
  filterBulan,
  filterKelas,
  disciplineFilterType,
  setDisciplineFilterType,
  setIsProblematicExportModalOpen,
  exportLateGuidanceToPDF,
  currentPage,
  pageSize,
  paginateList,
  renderPaginationFooter,
  formatIndoMonth,
  formatLateDuration,
}) => {
  const handleSendWhatsApp = (item: LateGuidanceExportItem) => {
    let phone = item.student.no_hp_ortu;
    if (!phone) {
      phone = prompt(`Masukkan No. WA Orang Tua / Wali murid ${item.student.nama}:`, '08123456789') || undefined;
      if (phone && phone.trim()) {
        store.updateStudent(item.student.id, { no_hp_ortu: phone.trim() });
        item.student.no_hp_ortu = phone.trim();
      }
    }
    if (phone) {
      const schoolName = store.getSettings().schoolName || 'SMA Negeri 15 Ambon';
      const msg = generateWhatsAppLateGuidanceMessage(
        item.student,
        item.lateCount,
        item.totalLateMinutes,
        item.lateDates,
        schoolName,
        item.lateDetails,
        item.alpaCount,
        item.alpaDates
      );
      const link = getWhatsAppLink(phone, msg);
      window.open(link, '_blank');
    }
  };

  const { totalTerlambat, totalAlpa, totalKritis } = useMemo(() => {
    let terlambat = 0;
    let alpa = 0;
    let kritis = 0;
    latenessAnalysisData.forEach((i) => {
      if (i.lateCount > 0) terlambat++;
      if (i.alpaCount > 0) alpa++;
      if (i.riskLevel === 'Kritis') kritis++;
    });
    return { totalTerlambat: terlambat, totalAlpa: alpa, totalKritis: kritis };
  }, [latenessAnalysisData]);

  return (
    <div className="space-y-4">
      {/* Top Banner & Summary Badges */}
      <div className="bg-gradient-to-r from-red-900 via-slate-900 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-red-800/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-600/30 rounded-xl border border-red-500/40 text-red-300">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">
                Analisis Kedisiplinan & Ketidakhadiran Siswa (BK & Wali Kelas)
              </h3>
              <p className="text-xs text-red-200/80">
                Sistem menganalisis akumulasi keterlambatan dan ketidakhadiran (alpa) siswa serta menyusun rekomendasi pembinaan kedisiplinan yang transparan untuk dilaporkan kepada orang tua.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsProblematicExportModalOpen(true)}
              className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-800 text-white font-bold text-xs rounded-xl border border-white/20 shadow transition-all flex items-center gap-1.5"
              title="Buka panel ekspor lengkap rekap siswa bermasalah (Excel & PDF)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Ekspor Rekap Siswa Bermasalah</span>
            </button>
            <button
              type="button"
              onClick={() => exportLateGuidanceToPDF(filteredDisciplineData, formatIndoMonth(filterBulan), filterKelas)}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" />
              <span>Cetak PDF Laporan Pembinaan BK</span>
            </button>
          </div>
        </div>

        {/* Discipline Stat Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-red-800/50 text-xs">
          <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
            <div className="text-red-200 text-[10px] uppercase font-bold">Total Siswa Indisiplin</div>
            <div className="text-lg font-black text-white mt-0.5">{latenessAnalysisData.length} Siswa</div>
          </div>

          <div className="bg-amber-500/20 p-3 rounded-xl backdrop-blur-sm border border-amber-500/30">
            <div className="text-amber-200 text-[10px] uppercase font-bold">Siswa Terlambat</div>
            <div className="text-lg font-black text-amber-300 mt-0.5">
              {totalTerlambat} Siswa
            </div>
          </div>

          <div className="bg-rose-500/20 p-3 rounded-xl backdrop-blur-sm border border-rose-500/30">
            <div className="text-rose-200 text-[10px] uppercase font-bold">Siswa Alpa / Tidak Hadir</div>
            <div className="text-lg font-black text-rose-300 mt-0.5">
              {totalAlpa} Siswa
            </div>
          </div>

          <div className="bg-red-500/20 p-3 rounded-xl backdrop-blur-sm border border-red-500/30">
            <div className="text-red-200 text-[10px] uppercase font-bold flex items-center justify-between">
              <span>Risiko Kritis (BK)</span>
              <span className="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
            </div>
            <div className="text-lg font-black text-red-300 mt-0.5">
              {totalKritis} Siswa
            </div>
          </div>
        </div>
      </div>

      {/* Discipline Analysis Table & Sub-filters */}
      <div className="bg-[#0b1121]/95 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl border border-white/10 shadow-sm overflow-hidden transition-colors">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
              <span>Rekapitulasi Kedisiplinan Siswa</span>
              <span className="text-[10px] bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 px-2 py-0.5 rounded-full font-mono">
                Urutan Tingkat Kritis
              </span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Daftar diurutkan berdasarkan jumlah hari Alpa dan frekuensi keterlambatan siswa. Filter Aktif: <strong className="text-slate-800 dark:text-slate-200">{filterKelas}</strong>.
            </p>
          </div>

          {/* Sub-filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setDisciplineFilterType('semua_indisiplin')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                disciplineFilterType === 'semua_indisiplin'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-white/5 backdrop-blur-xl text-slate-300 hover:bg-slate-200'
              }`}
            >
              Semua Terlambat & Alpa ({latenessAnalysisData.length})
            </button>
            <button
              type="button"
              onClick={() => setDisciplineFilterType('hanya_terlambat')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                disciplineFilterType === 'hanya_terlambat'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white/5 backdrop-blur-xl text-slate-300 hover:bg-slate-200'
              }`}
            >
              Terlambat ({totalTerlambat})
            </button>
            <button
              type="button"
              onClick={() => setDisciplineFilterType('hanya_alpa')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                disciplineFilterType === 'hanya_alpa'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white/5 backdrop-blur-xl text-slate-300 hover:bg-slate-200'
              }`}
            >
              Alpa / Tidak Hadir ({totalAlpa})
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
                <th className="p-3.5 text-center">Keterlambatan</th>
                <th className="p-3.5 text-center">Ketidakhadiran (Alpa)</th>
                <th className="p-3.5">Tingkat Risiko & BK</th>
                <th className="p-3.5">Rekomendasi Pembinaan BK</th>
                <th className="p-3.5 text-center">Kirim WA Ortu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-200">
              {filteredDisciplineData.length > 0 ? (
                paginateList<LateGuidanceExportItem>(filteredDisciplineData, currentPage, pageSize).map((item, idx) => (
                  <tr key={item.student.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3.5 font-bold text-slate-400 dark:text-slate-500">
                      {pageSize === 0 ? idx + 1 : (currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="p-3.5">
                      <div className="font-extrabold text-white">{item.student.nama}</div>
                      <div className="space-y-0.5 mt-0.5 text-[10px]">
                        {item.lateDates.length > 0 && (
                          <div className="text-amber-700 dark:text-amber-400 font-mono">
                            Terlambat: {item.lateDates.slice(0, 3).join(', ')}{item.lateDates.length > 3 ? ` (+${item.lateDates.length - 3})` : ''}
                          </div>
                        )}
                        {item.alpaDates.length > 0 && (
                          <div className="text-red-600 dark:text-red-400 font-mono font-bold">
                            Alpa: {item.alpaDates.slice(0, 3).join(', ')}{item.alpaDates.length > 3 ? ` (+${item.alpaDates.length - 3})` : ''}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono text-slate-400">{item.student.nisn}</span>
                      <span className="text-slate-400 dark:text-slate-500 font-semibold ml-1.5">({item.student.kelas})</span>
                    </td>
                    <td className="p-3.5 text-center">
                      {item.lateCount > 0 ? (
                        <span className="font-extrabold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800 inline-block">
                          {item.lateCount}x ({formatLateDuration(item.totalLateMinutes)})
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      {item.alpaCount > 0 ? (
                        <span className="font-extrabold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/80 px-2.5 py-1 rounded-full border border-red-200 dark:border-red-800 inline-block">
                          {item.alpaCount} Hari Alpa
                        </span>
                      ) : (
                        <span className="text-slate-400">0 Hari</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      {item.riskLevel === 'Kritis' ? (
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full border border-red-300 dark:border-red-800">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          RISIKO KRITIS (BK)
                        </span>
                      ) : item.riskLevel === 'Sedang' ? (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          RISIKO SEDANG
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full border border-blue-300 dark:border-blue-800">
                          <AlertCircle className="w-3.5 h-3.5" />
                          RISIKO RINGAN
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 max-w-xs leading-relaxed text-[11px] text-slate-700 dark:text-slate-300">
                      {item.rekomendasiPembinaan}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleSendWhatsApp(item)}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[11px] flex items-center justify-center gap-1.5 shadow-sm transition-all mx-auto"
                        title="Kirim Pesan WA Pembinaan Kedisiplinan & Kehadiran ke Orang Tua"
                      >
                        <Send className="w-3 h-3" />
                        <span>WA Pembinaan</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400 text-xs">
                    🎉 Tidak ada data siswa yang memenuhi kriteria filter kedisiplinan ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {renderPaginationFooter(filteredDisciplineData.length)}
      </div>
    </div>
  );
};
