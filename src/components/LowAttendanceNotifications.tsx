import React, { useState, useEffect } from 'react';
import { Student, AttendanceRecord } from '../types';
import { store } from '../lib/store';
import { formatWhatsAppNumber, getWhatsAppLink } from '../lib/exportUtils';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  User,
  Clock,
  XCircle,
  Stethoscope,
  FileCheck,
  PhoneCall,
  ShieldAlert,
  Info,
  ExternalLink,
  Search,
  Check,
  Copy,
} from 'lucide-react';

interface LowAttendanceNotificationsProps {
  students: Student[];
  attendance: AttendanceRecord[];
}

export interface FlaggedStudent {
  student: Student;
  totalDays: number;
  hadirCount: number;
  terlambatCount: number;
  sakitCount: number;
  izinCount: number;
  alpaCount: number;
  attendanceRate: number; // percentage 0 - 100
  riskLevel: 'Tinggi' | 'Sedang' | 'Perhatian';
  reasons: string[];
  recommendation?: string;
  handled?: boolean;
}

export const LowAttendanceNotifications: React.FC<LowAttendanceNotificationsProps> = ({
  students,
  attendance,
}) => {
  const [flaggedStudents, setFlaggedStudents] = useState<FlaggedStudent[]>([]);
  const [filterRisk, setFilterRisk] = useState<'semua' | 'Tinggi' | 'Sedang' | 'Perhatian'>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [handledIds, setHandledIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<FlaggedStudent | null>(null);

  // Compute low attendance students
  useEffect(() => {
    if (!students || students.length === 0) {
      setFlaggedStudents([]);
      return;
    }

    const activeStudents = students.filter((s) => s.status === 'aktif');
    const allUniqueDates = Array.from(new Set(attendance.map((a) => a.tanggal)));
    if (allUniqueDates.length === 0) {
      setFlaggedStudents([]);
      return;
    }
    const totalRecordedDays = allUniqueDates.length;

    const list: FlaggedStudent[] = [];

    activeStudents.forEach((student) => {
      const studentRecords = attendance.filter((a) => a.nisn === student.nisn && a.jenis === 'Masuk');
      if (studentRecords.length === 0) return;

      // Unique dates this student had recorded attendance
      const studentUniqueDates = new Set(studentRecords.map((r) => r.tanggal));
      // Base days for this student
      const studentTotalDays = Math.max(studentUniqueDates.size, totalRecordedDays);

      let hadirCount = 0;
      let terlambatCount = 0;
      let sakitCount = 0;
      let izinCount = 0;
      let alpaCount = 0;

      studentRecords.forEach((r) => {
        if (r.status === 'Hadir') hadirCount++;
        else if (r.status === 'Terlambat') terlambatCount++;
        else if (r.status === 'Sakit') sakitCount++;
        else if (r.status === 'Izin') izinCount++;
        else if (r.status === 'Alpa') alpaCount++;
      });

      const totalPresent = hadirCount + terlambatCount;
      const attendanceRate = studentTotalDays > 0 ? Math.round((totalPresent / studentTotalDays) * 100) : 100;

      const reasons: string[] = [];

      const hasAlpaProblem = alpaCount >= 2;
      if (hasAlpaProblem) {
        reasons.push(`Memiliki ${alpaCount} kali Alpa (tanpa keterangan).`);
      }

      const hasTerlambatProblem = terlambatCount >= 3;
      if (terlambatCount >= 5) {
        reasons.push(`Sangat sering terlambat (${terlambatCount} kali).`);
      } else if (hasTerlambatProblem) {
        reasons.push(`Sering terlambat masuk sekolah (${terlambatCount} kali).`);
      }

      const hasRateProblem = totalRecordedDays >= 3 && attendanceRate < 80;
      if (hasRateProblem) {
        if (attendanceRate < 70) {
          reasons.push(`Tingkat kehadiran sangat rendah (${attendanceRate}%).`);
        } else {
          reasons.push(`Tingkat kehadiran di bawah target minimum (${attendanceRate}%).`);
        }
      }

      const hasExcessivePermit = (sakitCount + izinCount) >= 4;
      if (hasExcessivePermit) {
        reasons.push(`Akumulasi Izin/Sakit tinggi (${sakitCount} Sakit, ${izinCount} Izin).`);
      }

      // Check if flagged
      if (hasAlpaProblem || hasTerlambatProblem || hasRateProblem || hasExcessivePermit) {
        let riskLevel: 'Tinggi' | 'Sedang' | 'Perhatian' = 'Sedang';

        if ((hasRateProblem && attendanceRate < 70) || alpaCount >= 3 || terlambatCount >= 5) {
          riskLevel = 'Tinggi';
        } else if (hasAlpaProblem || hasTerlambatProblem || hasRateProblem) {
          riskLevel = 'Sedang';
        } else {
          riskLevel = 'Perhatian';
        }

        // Generate preliminary recommendation
        let rec = '';
        if (riskLevel === 'Tinggi') {
          rec = 'Sangat Disarankan: Kirim Surat Panggilan Orang Tua ke Sekolah & Bimbingan Khusus BK.';
        } else if (riskLevel === 'Sedang') {
          rec = 'Diimbau: Kirim Pesan Peringatan WA kepada Orang Tua / Wali murid dan konseling Wali Kelas.';
        } else {
          rec = 'Disarankan: Verifikasi ulang alasan ketidakhadiran dengan Wali murid.';
        }

        list.push({
          student,
          totalDays: studentTotalDays,
          hadirCount,
          terlambatCount,
          sakitCount,
          izinCount,
          alpaCount,
          attendanceRate,
          riskLevel,
          reasons,
          recommendation: rec,
          handled: handledIds.has(student.nisn),
        });
      }
    });

    // Sort by risk priority (Tinggi > Sedang > Perhatian) and lowest attendance rate
    list.sort((a, b) => {
      const priority = { Tinggi: 1, Sedang: 2, Perhatian: 3 };
      if (priority[a.riskLevel] !== priority[b.riskLevel]) {
        return priority[a.riskLevel] - priority[b.riskLevel];
      }
      return a.attendanceRate - b.attendanceRate;
    });

    setFlaggedStudents(list);
  }, [students, attendance, handledIds]);


  const toggleHandled = (nisn: string) => {
    setHandledIds((prev) => {
      const next = new Set(prev);
      if (next.has(nisn)) {
        next.delete(nisn);
      } else {
        next.add(nisn);
      }
      return next;
    });
  };

  const generateWaMessage = (item: FlaggedStudent) => {
    const s = item.student;
    const today = store.getTodayFormatted();
    return `Yth. Bapak/Ibu Orang Tua/Wali dari siswa *${s.nama}* (Kelas ${s.kelas}),

Salam hangat dari SMA Negeri 15 Ambon.

Melalui notifikasi sistem presensi sekolah, kami menginformasikan catatan kedisiplinan dan tingkat kehadiran ananda saat ini:
📌 *Tingkat Kehadiran:* ${item.attendanceRate}%
❌ *Jumlah Alpa (Tanpa Keterangan):* ${item.alpaCount} hari
⏰ *Jumlah Terlambat:* ${item.terlambatCount} kali
🩺 *Sakit/Izin:* ${item.sakitCount + item.izinCount} hari

*Rekomendasi Penanganan (Guru BK & Wali Kelas):*
${item.recommendation || 'Mohon perhatian dan koordinasi Bapak/Ibu wali murid dengan Wali Kelas / Guru BK sekolah.'}

Demikian pemberitahuan ini disampaikan demi kelancaran proses belajar mengajar ananda di SMA Negeri 15 Ambon.
Terima kasih atas perhatian dan kerja sama Bapak/Ibu.

_Tim Kedisiplinan & Guru BK SMAN 15 Ambon_
📅 ${today}`;
  };

  const copyWaMessage = (item: FlaggedStudent) => {
    const msg = generateWaMessage(item);
    navigator.clipboard.writeText(msg);
    setCopiedId(item.student.nisn);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtering
  const filteredList = flaggedStudents.filter((item) => {
    const matchesRisk = filterRisk === 'semua' || item.riskLevel === filterRisk;
    const matchesSearch =
      searchQuery === '' ||
      item.student.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.student.nisn.includes(searchQuery) ||
      item.student.kelas.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRisk && matchesSearch;
  });

  const highRiskCount = flaggedStudents.filter((s) => s.riskLevel === 'Tinggi').length;
  const mediumRiskCount = flaggedStudents.filter((s) => s.riskLevel === 'Sedang').length;
  const attentionCount = flaggedStudents.filter((s) => s.riskLevel === 'Perhatian').length;

  if (flaggedStudents.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-xs overflow-hidden transition-all duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-900 via-slate-900 to-amber-950 p-3.5 sm:p-4 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/20 border border-rose-400/30 rounded-xl text-rose-300 relative shrink-0">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
            {highRiskCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 bg-rose-500/30 border border-rose-400/40 text-rose-200 rounded text-[9px] font-black uppercase tracking-wider">
                Perhatian BK & Wali Kelas
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-black tracking-tight text-white mt-0.5 flex items-center gap-2">
              <span>Peringatan Presensi Siswa</span>
              <span className="bg-rose-600 text-white text-[11px] px-2 py-0.5 rounded-full font-bold">
                {flaggedStudents.length} Siswa Perlu Perhatian
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1"
            title={isExpanded ? 'Sembunyikan detail' : 'Tampilkan detail'}
          >
            <span>{isExpanded ? 'Tutup Detail' : 'Buka Detail'}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Risk Badges Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              onClick={() => setFilterRisk('semua')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                filterRisk === 'semua'
                  ? 'bg-slate-900 text-white border-slate-700 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Terdeteksi</div>
              <div className="text-xl font-black mt-0.5">{flaggedStudents.length} <span className="text-xs font-normal">siswa</span></div>
            </div>

            <div
              onClick={() => setFilterRisk('Tinggi')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                filterRisk === 'Tinggi'
                  ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                  : 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-900/50 hover:bg-rose-100'
              }`}
            >
              <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">Risiko Tinggi</div>
              <div className="text-xl font-black mt-0.5">{highRiskCount} <span className="text-xs font-normal">siswa</span></div>
            </div>

            <div
              onClick={() => setFilterRisk('Sedang')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                filterRisk === 'Sedang'
                  ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                  : 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/50 hover:bg-amber-100'
              }`}
            >
              <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">Risiko Sedang</div>
              <div className="text-xl font-black mt-0.5">{mediumRiskCount} <span className="text-xs font-normal">siswa</span></div>
            </div>

            <div
              onClick={() => setFilterRisk('Perhatian')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                filterRisk === 'Perhatian'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                  : 'bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900/50 hover:bg-blue-100'
              }`}
            >
              <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">Perhatian S/I</div>
              <div className="text-xl font-black mt-0.5">{attentionCount} <span className="text-xs font-normal">siswa</span></div>
            </div>
          </div>


          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari siswa berisiko berdasarkan Nama, NISN, atau Kelas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          {/* Students List */}
          {filteredList.length === 0 ? (
            <div className="p-8 text-center bg-emerald-50/50 dark:bg-emerald-950/10 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                {flaggedStudents.length === 0
                  ? 'Luar Biasa! Tidak Ada Siswa Berisiko Rendah Kehadiran'
                  : 'Tidak Ada Siswa Sesuai Filter'}
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 max-w-md mx-auto">
                {flaggedStudents.length === 0
                  ? 'Seluruh siswa aktif memiliki tingkat presensi sangat baik (>= 80%). Tidak ditemukan indikasi ketidakhadiran kritis.'
                  : 'Coba ubah kata kunci pencarian atau kategori filter risiko di atas.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {filteredList.map((item) => {
                const isHandled = handledIds.has(item.student.nisn);
                const waPhone = formatWhatsAppNumber(item.student.no_hp_ortu);
                const waLink = getWhatsAppLink(item.student.no_hp_ortu, generateWaMessage(item));

                return (
                  <div
                    key={item.student.id || item.student.nisn}
                    className={`p-4 rounded-xl border transition-all ${
                      isHandled
                        ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                        : item.riskLevel === 'Tinggi'
                        ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 hover:border-rose-300'
                        : item.riskLevel === 'Sedang'
                        ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 hover:border-amber-300'
                        : 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      {/* Left Student Details */}
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-xs ${
                            item.riskLevel === 'Tinggi'
                              ? 'bg-rose-600'
                              : item.riskLevel === 'Sedang'
                              ? 'bg-amber-600'
                              : 'bg-blue-600'
                          }`}
                        >
                          {item.student.kelas}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                              {item.student.nama}
                            </h4>
                            <span className="text-xs text-slate-400 font-mono">NISN: {item.student.nisn}</span>

                            {/* Risk Badge */}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                                item.riskLevel === 'Tinggi'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-300'
                                  : item.riskLevel === 'Sedang'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border border-blue-300'
                              }`}
                            >
                              Risiko {item.riskLevel}
                            </span>

                            {isHandled && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 rounded-full text-[10px] font-bold">
                                ✓ Sudah Ditangani
                              </span>
                            )}
                          </div>

                          {/* Reasons List */}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                                item.attendanceRate < 70
                                  ? 'bg-rose-600 text-white'
                                  : item.attendanceRate < 80
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-emerald-600 text-white'
                              }`}
                            >
                              Presensi: {item.attendanceRate}%
                            </span>

                            {item.alpaCount > 0 && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 rounded-md text-[11px] font-bold">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                Alpa: {item.alpaCount}x
                              </span>
                            )}

                            {item.terlambatCount > 0 && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 rounded-md text-[11px] font-bold">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Terlambat: {item.terlambatCount}x
                              </span>
                            )}

                            {(item.sakitCount > 0 || item.izinCount > 0) && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 rounded-md text-[11px] font-bold">
                                <Stethoscope className="w-3 h-3 text-blue-600" />
                                Sakit/Izin: {item.sakitCount + item.izinCount}x
                              </span>
                            )}
                          </div>

                          {/* Guidance snippet */}
                          <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800 flex items-start gap-1.5">
                            <Info className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                            <span>
                              <strong className="text-slate-800 dark:text-slate-200">Rekomendasi Penanganan:</strong>{' '}
                              {item.recommendation}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                        {waPhone ? (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            title="Kirim Notifikasi Peringatan WA Langsung ke Orang Tua / Wali"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                            <span>WA Wali ({waPhone.slice(-4)})</span>
                            <ExternalLink className="w-3 h-3 opacity-70" />
                          </a>
                        ) : (
                          <span
                            className="px-2.5 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-400 rounded-xl text-xs font-medium"
                            title="Nomor HP Orang Tua belum diisi di data siswa"
                          >
                            No WA Ortu (-)
                          </span>
                        )}

                        <button
                          onClick={() => copyWaMessage(item)}
                          className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                          title="Salin Pesan Peringatan WA"
                        >
                          {copiedId === item.student.nisn ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600">Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Salin</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => toggleHandled(item.student.nisn)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                            isHandled
                              ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              : 'bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200 hover:bg-rose-200'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isHandled ? 'Batal Ditangani' : 'Tandai Ditangani'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
