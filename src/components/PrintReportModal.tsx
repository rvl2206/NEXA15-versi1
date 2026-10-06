import React from 'react';
import { Printer, X, Sparkles } from 'lucide-react';
import { Student, StudentMonthlySummary } from '../types';
import { formatLateDuration, formatPetugasRole } from '../lib/exportUtils';

export interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  monthlyStudentSummaries: StudentMonthlySummary[];
  printStudentSlip: Student | null;
  setPrintStudentSlip: (student: Student | null) => void;
  printWaliKelasName: string;
  setPrintWaliKelasName: (name: string) => void;
  filterBulan: string;
  filterKelas: string;
  todayISO: string;
  formatIndoMonth: (isoMonth: string) => string;
  formatIndoDate: (isoDate: string) => string;
  currentOfficer: string;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  students,
  monthlyStudentSummaries,
  printStudentSlip,
  setPrintStudentSlip,
  printWaliKelasName,
  setPrintWaliKelasName,
  filterBulan,
  filterKelas,
  todayISO,
  formatIndoMonth,
  formatIndoDate,
  currentOfficer,
}) => {
  if (!isOpen) return null;

  return (<div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          {/* Print CSS stylesheet rule */}
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-monthly-report, #printable-monthly-report * {
                visibility: visible !important;
              }
              #printable-monthly-report {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 12mm !important;
                background: white !important;
                color: black !important;
                box-shadow: none !important;
                border: none !important;
                font-family: Arial, sans-serif !important;
              }
              .no-print {
                display: none !important;
              }
              @page {
                size: A4 landscape;
                margin: 8mm;
              }
            }
          `}</style>

          <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-auto flex flex-col max-h-[92vh] overflow-hidden transition-colors">
            {/* Modal Header & Controls (Non-Printable) */}
            <div className="no-print p-4 bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600/30 rounded-xl border border-indigo-500/40 text-indigo-300">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <span>Pratinjau & Cetak Laporan Absensi</span>
                    <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-md font-mono border border-indigo-400/30">
                      Dioptimalkan A4 Print
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Cetak langsung atau simpan sebagai PDF resmi untuk dibagikan kepada Wali Kelas / Orang Tua.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Sekarang (Print)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onClose()}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                  title="Tutup Modal Pratinjau"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter & Customization Toolbar (Non-Printable) */}
            <div className="no-print p-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Jenis Laporan Dokumen:
                </label>
                <select
                  value={printStudentSlip ? 'slip' : 'kelas'}
                  onChange={(e) => {
                    if (e.target.value === 'kelas') {
                      setPrintStudentSlip(null);
                    } else if (students.length > 0) {
                      setPrintStudentSlip(students[0]);
                    }
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-white"
                >
                  <option value="kelas">Laporan Rekapitulasi Seluruh Siswa Kelas ({monthlyStudentSummaries.length} Siswa)</option>
                  <option value="slip">Slip Rekapitulasi Kehadiran Individu (Untuk Orang Tua)</option>
                </select>
              </div>

              {printStudentSlip ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pilih Siswa (Penerima Slip):
                  </label>
                  <select
                    value={printStudentSlip.id}
                    onChange={(e) => {
                      const found = students.find((s) => s.id === e.target.value);
                      if (found) setPrintStudentSlip(found);
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-white"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama} ({s.kelas})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Wali Kelas (Untuk Lembar Pengesahan):
                  </label>
                  <input
                    type="text"
                    value={printWaliKelasName}
                    onChange={(e) => setPrintWaliKelasName(e.target.value)}
                    placeholder="Contoh: Drs. Ahmad Dahlan, M.Pd"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex items-end">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-700/60 px-3 py-1.5 rounded-lg w-full flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Petunjuk: Gunakan pengaturan browser "Save as PDF" jika ingin menyimpan file PDF resmi.</span>
                </div>
              </div>
            </div>

            {/* Scrollable Document Area */}
            <div className="p-6 overflow-y-auto bg-slate-200 dark:bg-slate-950 flex-1">
              {/* Actual Printable Page Sheet */}
              <div
                id="printable-monthly-report"
                className="bg-white text-slate-900 p-8 rounded-xl shadow-lg border border-slate-300 max-w-4xl mx-auto space-y-5 text-xs font-sans"
              >
                {/* Kop Surat Resmi Sekolah */}
                <div className="border-b-4 border-double border-slate-900 pb-3 text-center space-y-0.5">
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-700">
                    PEMERINTAH PROVINSI MALUKU
                  </h4>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    DINAS PENDIDIKAN DAN KEBUDAYAAN
                  </h3>
                  <h2 className="text-lg font-black uppercase text-blue-900 tracking-tight">
                    SMA NEGERI 15 AMBON
                  </h2>
                  <p className="text-[10px] text-slate-600 font-medium">
                    Jl. Wolter Monginsidi, Lateri, Kec. Baguala, Kota Ambon, Maluku - Kodepos 97231
                  </p>
                  <p className="text-[9px] text-slate-500 font-mono">
                    NPSN: 60101980 | Email: info@sman15ambon.sch.id | Website: sman15ambon.sch.id
                  </p>
                </div>

                {!printStudentSlip ? (
                  /* FULL CLASS MONTHLY ATTENDANCE RECAP REPORT */
                  <>
                    <div className="text-center space-y-1">
                      <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 border-b border-slate-400 pb-1 inline-block px-4">
                        LAPORAN REKAPITULASI KEHADIRAN SISWA BULANAN
                      </h3>
                      <div className="flex items-center justify-center gap-4 text-[11px] text-slate-700 font-semibold pt-1">
                        <span>Periode: <strong className="text-slate-900">{formatIndoMonth(filterBulan)}</strong></span>
                        <span>â€¢</span>
                        <span>Kelas: <strong className="text-slate-900">{filterKelas}</strong></span>
                        <span>â€¢</span>
                        <span>Tanggal Cetak: <strong className="text-slate-900">{formatIndoDate(todayISO)} WIT</strong></span>
                      </div>
                    </div>

                    {/* Ringkasan Statistik Kelas */}
                    <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-300 text-[10px]">
                      <div>
                        <span className="text-slate-500 block">Total Siswa Terdaftar:</span>
                        <span className="font-extrabold text-slate-900 text-xs">{monthlyStudentSummaries.length} Siswa</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Rata-rata Kehadiran:</span>
                        <span className="font-extrabold text-emerald-700 text-xs">
                          {monthlyStudentSummaries.length > 0
                            ? Math.round(
                                monthlyStudentSummaries.reduce((a, b) => a + b.persentaseHadir, 0) /
                                  monthlyStudentSummaries.length
                              )
                            : 0}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Siswa Hadir Tepat Waktu:</span>
                        <span className="font-extrabold text-emerald-600 text-xs">
                          {monthlyStudentSummaries.reduce((a, b) => a + b.hadir, 0)} kali
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Frekuensi Terlambat:</span>
                        <span className="font-extrabold text-amber-600 text-xs">
                          {monthlyStudentSummaries.reduce((a, b) => a + b.terlambat, 0)} kali
                        </span>
                      </div>
                    </div>

                    {/* Tabel Rekapitulasi Seluruh Siswa */}
                    <table className="w-full text-left border-collapse border border-slate-400 text-[10px]">
                      <thead>
                        <tr className="bg-slate-200 text-slate-900 font-extrabold uppercase border-b border-slate-400">
                          <th className="p-1.5 border-r border-slate-300 text-center">No</th>
                          <th className="p-1.5 border-r border-slate-300">NISN</th>
                          <th className="p-1.5 border-r border-slate-300">Nama Siswa</th>
                          <th className="p-1.5 border-r border-slate-300 text-center">Kelas</th>
                          <th className="p-1.5 border-r border-slate-300 text-center text-emerald-800">Hadir</th>
                          <th className="p-1.5 border-r border-slate-300 text-center text-amber-800">Terlambat</th>
                          <th className="p-1.5 border-r border-slate-300 text-center text-amber-800">Durasi Terlambat</th>
                          <th className="p-1.5 border-r border-slate-300 text-center text-blue-800">Izin</th>
                          <th className="p-1.5 border-r border-slate-300 text-center text-purple-800">Sakit</th>
                          <th className="p-1.5 border-r border-slate-300 text-center text-red-800">Alpa</th>
                          <th className="p-1.5 border-r border-slate-300 text-center text-slate-800">Total Masuk</th>
                          <th className="p-1.5 text-center font-black">% Hadir</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300">
                        {monthlyStudentSummaries.map((item, idx) => (
                          <tr key={item.student.id} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                            <td className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-500">{idx + 1}</td>
                            <td className="p-1.5 border-r border-slate-300 font-mono">{item.student.nisn}</td>
                            <td className="p-1.5 border-r border-slate-300 font-extrabold">{item.student.nama}</td>
                            <td className="p-1.5 border-r border-slate-300 text-center font-semibold">{item.student.kelas}</td>
                            <td className="p-1.5 border-r border-slate-300 text-center font-bold text-emerald-700">{item.hadir}</td>
                            <td className="p-1.5 border-r border-slate-300 text-center font-bold text-amber-700">{item.terlambat}</td>
                            <td className="p-1.5 border-r border-slate-300 text-center font-mono">
                              {item.totalTerlambatMenit > 0 ? formatLateDuration(item.totalTerlambatMenit) : '-'}
                            </td>
                            <td className="p-1.5 border-r border-slate-300 text-center font-bold text-blue-700">{item.izin}</td>
                            <td className="p-1.5 border-r border-slate-300 text-center font-bold text-purple-700">{item.sakit}</td>
                            <td className="p-1.5 border-r border-slate-300 text-center font-bold text-red-700">{item.alpa}</td>
                            <td className="p-1.5 border-r border-slate-300 text-center font-bold">{item.totalMasuk}</td>
                            <td className="p-1.5 text-center font-black">{item.persentaseHadir}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Lembar Tanda Tangan Resmi */}
                    <div className="pt-6 grid grid-cols-3 gap-4 text-center text-[10px]">
                      <div>
                        <p className="text-slate-600">Mengetahui,</p>
                        <p className="font-bold text-slate-900">Wali Kelas {filterKelas !== 'Semua' ? filterKelas : ''}</p>
                        <div className="h-16"></div>
                        <p className="font-extrabold text-slate-900 underline">{printWaliKelasName}</p>
                        <p className="text-slate-500">NIP. .........................................</p>
                      </div>

                      <div>
                        <p className="text-slate-600">Ambon, {formatIndoDate(todayISO)}</p>
                        <p className="font-bold text-slate-900">Guru Piket / Tim Kesiswaan</p>
                        <div className="h-16"></div>
                        <p className="font-extrabold text-slate-900 underline">{formatPetugasRole(currentOfficer)}</p>
                        <p className="text-slate-500">Petugas Absensi Digital NEXA15</p>
                      </div>

                      <div>
                        <p className="text-slate-600">Mengetahui,</p>
                        <p className="font-bold text-slate-900">Kepala SMA Negeri 15 Ambon</p>
                        <div className="h-16"></div>
                        <p className="font-extrabold text-slate-900 underline">G. Soplanit, S.Pd., M.Pd.</p>
                        <p className="text-slate-500">NIP. 19700512 199802 1 004</p>
                      </div>
                    </div>
                  </>
                ) : (
                  /* INDIVIDUAL STUDENT MONTHLY ATTENDANCE SLIP */
                  <>
                    <div className="text-center space-y-1">
                      <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 border-b border-slate-400 pb-1 inline-block px-4">
                        SLIP REKAPITULASI KEHADIRAN SISWA BULANAN
                      </h3>
                      <p className="text-[10px] text-slate-500 italic">
                        Laporan Kedisiplinan Kehadiran untuk Disampaikan Kepada Orang Tua / Wali Murid
                      </p>
                    </div>

                    {/* Identity Grid */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Nama Lengkap Siswa:</span>
                        <span className="font-extrabold text-slate-900 text-sm">{printStudentSlip.nama}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">NISN / ID QR:</span>
                        <span className="font-mono font-bold text-slate-800">{printStudentSlip.nisn}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Kelas / Tingkat:</span>
                        <span className="font-bold text-slate-800">{printStudentSlip.kelas}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Periode Laporan Bulanan:</span>
                        <span className="font-bold text-slate-900">{formatIndoMonth(filterBulan)}</span>
                      </div>
                    </div>

                    {/* Student Attendance Stats Grid */}
                    {(() => {
                      const summary = monthlyStudentSummaries.find((s) => s.student.id === printStudentSlip.id);
                      if (!summary) return null;

                      return (
                        <div className="space-y-4">
                          <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-1">
                            Rincian Kehadiran Bulan {formatIndoMonth(filterBulan)}
                          </h4>

                          <div className="grid grid-cols-4 gap-3 text-center">
                            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-300">
                              <span className="text-[10px] text-emerald-800 font-bold block">HADIR TEPAT WAKTU</span>
                              <span className="text-base font-black text-emerald-700">{summary.hadir} Hari</span>
                            </div>
                            <div className="p-3 bg-amber-50 rounded-lg border border-amber-300">
                              <span className="text-[10px] text-amber-800 font-bold block">TERLAMBAT</span>
                              <span className="text-base font-black text-amber-700">{summary.terlambat} Hari</span>
                              <span className="text-[9px] text-slate-500 block">
                                Total: {formatLateDuration(summary.totalTerlambatMenit)}
                              </span>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-300">
                              <span className="text-[10px] text-blue-800 font-bold block">IZIN / SAKIT</span>
                              <span className="text-base font-black text-blue-700">
                                {summary.izin + summary.sakit} Hari
                              </span>
                              <span className="text-[9px] text-slate-500 block">
                                (Izin: {summary.izin}, Sakit: {summary.sakit})
                              </span>
                            </div>
                            <div className="p-3 bg-red-50 rounded-lg border border-red-300">
                              <span className="text-[10px] text-red-800 font-bold block">TANPA KETERANGAN (ALPA)</span>
                              <span className="text-base font-black text-red-700">{summary.alpa} Hari</span>
                            </div>
                          </div>

                          <div className="p-3 bg-slate-100 rounded-lg border border-slate-300 flex items-center justify-between">
                            <div>
                              <span className="font-bold text-slate-800">Tingkat Persentase Kehadiran:</span>
                              <p className="text-[10px] text-slate-500">
                                Berdasarkan akumulasi scan absensi digital QR Code NEXA15.
                              </p>
                            </div>
                            <div className="text-right">
                              <span
                                className={`text-xl font-black ${
                                  summary.persentaseHadir >= 85
                                    ? 'text-emerald-700'
                                    : summary.persentaseHadir >= 70
                                    ? 'text-amber-700'
                                    : 'text-red-700'
                                }`}
                              >
                                {summary.persentaseHadir}%
                              </span>
                            </div>
                          </div>

                          {/* Evaluation & Teacher Note */}
                          <div className="p-3 bg-white border border-slate-300 rounded-lg space-y-1">
                            <span className="font-bold text-slate-800 text-[11px] block">
                              Catatan Wali Kelas / Pembinaan Kedisiplinan:
                            </span>
                            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded min-h-[50px] text-[11px] text-slate-700 italic">
                              {summary.terlambat >= 3 || summary.alpa >= 2
                                ? `Siswa tercatat terlambat ${summary.terlambat} kali / Alpa ${summary.alpa} kali. Mohon perhatian dan pendampingan lebih lanjut dari orang tua/wali murid di rumah.`
                                : `Ananda ${printStudentSlip.nama} menunjukkan kedisiplinan yang sangat baik. Pertahankan ketepatan waktu hadir di sekolah.`}
                            </div>
                          </div>

                          {/* Signatures for Slip */}
                          <div className="pt-6 grid grid-cols-2 gap-8 text-center text-[10px]">
                            <div>
                              <p className="text-slate-600">Mengetahui / Memeriksa,</p>
                              <p className="font-bold text-slate-900">Orang Tua / Wali Murid</p>
                              <div className="h-16"></div>
                              <p className="font-extrabold text-slate-900 border-b border-slate-400 pb-0.5 inline-block min-w-[150px]">
                                ( .................................................... )
                              </p>
                            </div>

                            <div>
                              <p className="text-slate-600">Ambon, {formatIndoDate(todayISO)}</p>
                              <p className="font-bold text-slate-900">Wali Kelas {printStudentSlip.kelas}</p>
                              <div className="h-16"></div>
                              <p className="font-extrabold text-slate-900 underline">{printWaliKelasName}</p>
                              <p className="text-slate-500">NIP. .........................................</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      );
};


