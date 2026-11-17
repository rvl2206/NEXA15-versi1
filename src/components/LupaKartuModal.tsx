import React, { useState, useMemo, useEffect } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  UserCheck,
  GraduationCap,
  X,
  ClipboardList,
  Copy,
  Check,
  ShieldCheck,
  UserX,
  Share2,
} from 'lucide-react';
import {
  Student,
  AttendanceType,
  AttendanceStatus,
  AttendanceRecord,
} from '../types';
import { store } from '../lib/store';
import { toast } from '../lib/toast';
import { formatLateDuration, formatPetugasRole } from '../lib/exportUtils';

export interface LupaKartuModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOfficer: string;
  initialTarget?: 'siswa';
  onAttendanceRecorded?: (result: {
    success: boolean;
    student?: Student;
    record?: AttendanceRecord;
    type?: AttendanceType;
    status?: AttendanceStatus;
    message: string;
    isDuplicate?: boolean;
    isLate?: boolean;
    lateMinutes?: number;
  }) => void;
}

const COMMON_REASONS = [
  'Kartu Tertinggal di Rumah',
  'Kartu Hilang (Perlu Cetak Baru)',
  'Kartu Rusak / Patah / Terkelupas',
  'Belum Memiliki Kartu / Siswa Baru',
  'Kartu Tertinggal di Kendaraan / Angkot',
];

export const LupaKartuModal: React.FC<LupaKartuModalProps> = ({
  isOpen,
  onClose,
  currentOfficer,
  onAttendanceRecorded,
}) => {
  const [activeTab, setActiveTab] = useState<'pencatatan' | 'riwayat'>('pencatatan');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('Semua');

  // Selected Student
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Form Fields
  const [jenisPresensi, setJenisPresensi] = useState<AttendanceType>('Masuk');
  const [statusPresensi, setStatusPresensi] = useState<AttendanceStatus>('Hadir');
  const [isStatusManual, setIsStatusManual] = useState<boolean>(false);
  const [alasan, setAlasan] = useState<string>('Kartu Tertinggal di Rumah');
  const [customAlasan, setCustomAlasan] = useState<string>('');
  const [catatanTambahan, setCatatanTambahan] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      setSelectedStudent(null);
      setSearchQuery('');
      setCatatanTambahan('');
      setCustomAlasan('');
      setAlasan('Kartu Tertinggal di Rumah');
      setIsStatusManual(false);
    }
  }, [isOpen]);

  // Load students dynamically with store subscription
  const [allStudents, setAllStudents] = useState<Student[]>(() =>
    store.getStudents().filter((s) => s.status === 'aktif')
  );

  useEffect(() => {
    if (!isOpen) return;
    const refreshData = () => {
      setAllStudents(store.getStudents().filter((s) => s.status === 'aktif'));
    };
    refreshData();
    const unsub = store.subscribe(refreshData);
    return () => unsub();
  }, [isOpen]);

  // Unique Classes
  const availableClasses = useMemo(() => {
    const classes = Array.from(new Set(allStudents.map((s) => s.kelas).filter(Boolean)));
    return classes.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [allStudents]);

  // Determine current WIT time for automatic status recommendation
  const currentWit = useMemo(() => {
    const now = new Date();
    const witParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jayapura',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);

    const hour = parseInt(witParts.find((p) => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(witParts.find((p) => p.type === 'minute')?.value || '0', 10);
    const totalMinutes = hour * 60 + minute;

    const s = store.getSettings();
    const cutoffStr = s.cutoffTime || '07:15';
    const [cHour, cMin] = cutoffStr.split(':').map((v) => parseInt(v, 10));
    const cutoffMinutes = (cHour || 7) * 60 + (cMin || 15);

    const isLate = totalMinutes > cutoffMinutes;
    const lateMinutes = isLate ? totalMinutes - cutoffMinutes : 0;

    return {
      timeFormatted: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} WIT`,
      isLate,
      lateMinutes,
      cutoff: cutoffStr,
    };
  }, [isOpen]);

  // When a student is chosen, calculate default jenis and status
  useEffect(() => {
    if (!selectedStudent) return;

    const todayRecords = store.getAttendance().filter((a) => {
      return store.isRecordForToday(a) && (a.nisn === selectedStudent.nisn || a.nama.toLowerCase() === selectedStudent.nama.toLowerCase());
    });

    const hasMasuk = todayRecords.some((a) => a.jenis === 'Masuk' && a.status !== 'Alpa');
    const hasPulang = todayRecords.some((a) => a.jenis === 'Pulang');

    if (hasMasuk && !hasPulang) {
      setJenisPresensi('Pulang');
      setStatusPresensi('Hadir');
    } else {
      setJenisPresensi('Masuk');
      if (!isStatusManual) {
        setStatusPresensi(currentWit.isLate ? 'Terlambat' : 'Hadir');
      }
    }
  }, [selectedStudent, currentWit, isStatusManual]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    let list = allStudents;

    if (selectedClass !== 'Semua') {
      list = list.filter((s) => s.kelas === selectedClass);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.nama.toLowerCase().includes(q) ||
          s.nisn.includes(q) ||
          s.kelas.toLowerCase().includes(q)
      );
    }

    return list.slice(0, 40); // cap for optimal rendering performance
  }, [allStudents, selectedClass, searchQuery]);

  // Today's Lupa Kartu List
  const todayLupaKartu = useMemo(() => {
    return store.getTodayLupaKartuList();
  }, [isOpen, isSubmitting, activeTab]);

  if (!isOpen) return null;

  const handleSelectStudent = (s: Student) => {
    setSelectedStudent(s);
  };

  const handleSubmit = () => {
    const effectiveAlasan = alasan === 'Lainnya' ? customAlasan.trim() || 'Alasan Khusus' : alasan;

    if (!selectedStudent) {
      toast.warning('Pilih Siswa', 'Silakan pilih siswa terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = store.recordLupaKartu({
        targetType: 'siswa',
        targetId: selectedStudent.id,
        jenis: jenisPresensi,
        statusOverride: statusPresensi,
        alasan: effectiveAlasan,
        catatanTambahan,
        officer: currentOfficer,
      });

      if (!res.success) {
        toast.error('Gagal Mencatat', res.message);
        setIsSubmitting(false);
        return;
      }

      toast.success(
        'Presensi Lupa Kartu Berhasil!',
        `${selectedStudent.nama} (${selectedStudent.kelas}) tercatat [${res.type?.toUpperCase()} - ${res.status?.toUpperCase()}] oleh ${formatPetugasRole(currentOfficer)}.`
      );

      if (onAttendanceRecorded) {
        onAttendanceRecorded(res);
      }

      // Reset selection to allow recording next student rapidly
      setSelectedStudent(null);
      setCatatanTambahan('');
      setCustomAlasan('');
      setAlasan('Kartu Tertinggal di Rumah');
      setIsStatusManual(false);
    } catch (e: any) {
      toast.error('Terjadi Kesalahan', e?.message || 'Gagal menyimpan presensi lupa kartu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopySummary = () => {
    const todayStr = store.getTodayFormatted();
    let text = `📋 *LAPORAN SISWA LUPA KARTU HARI INI*\n`;
    text += `🏫 ${store.getSettings().schoolName || 'SMA Negeri 15 Maluku Tengah'}\n`;
    text += `📅 Tanggal: ${todayStr}\n`;
    text += `⏱️ Total Tercatat: ${todayLupaKartu.total} Orang\n\n`;

    if (todayLupaKartu.students.length > 0) {
      text += `*--- DAFTAR SISWA (${todayLupaKartu.students.length}) ---*\n`;
      todayLupaKartu.students.forEach((item, idx) => {
        const r = item.record;
        const time = store.formatRecordTimeWIT(r.timestamp);
        text += `${idx + 1}. ${r.nama} (${r.kelas}) - ${r.jenis} [${r.status}] jam ${time}\n   Ket: ${r.catatan || 'Lupa Kartu'} (Piket: ${r.petugas})\n`;
      });
      text += `\n`;
    }

    text += `_Dicatat resmi oleh Petugas Piket & Operator NEXA15_`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    toast.success('Laporan Disalin!', 'Rangkuman presensi lupa kartu hari ini siap dikirim ke WhatsApp piket.');
    setTimeout(() => setCopiedSummary(false), 3000);
  };

  const getStudentTodayStatus = (student: Student) => {
    const recs = store.getAttendance().filter((a) => {
      return store.isRecordForToday(a) && (a.nisn === student.nisn || a.nama.toLowerCase() === student.nama.toLowerCase());
    });
    const masuk = recs.find((a) => a.jenis === 'Masuk' && a.status !== 'Alpa');
    const pulang = recs.find((a) => a.jenis === 'Pulang');

    if (masuk && pulang) {
      return {
        label: 'Lengkap (Masuk & Pulang)',
        color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300',
        disabled: true,
      };
    }
    if (masuk) {
      const t = store.formatRecordTimeWIT(masuk.timestamp);
      return {
        label: `Masuk ${t} (Siap Pulang)`,
        color: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-300',
        disabled: false,
      };
    }
    return {
      label: 'Belum Presensi Hari Ini',
      color: 'bg-white/5 backdrop-blur-xl border border-white/10 text-slate-200 dark:bg-slate-800 dark:text-slate-300 border-white/10',
      disabled: false,
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0b1121]/95 backdrop-blur-2xl border border-white/10 shadow-2xl w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white p-4 sm:p-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl backdrop-blur-md shadow-inner flex-shrink-0">
              <CreditCard className="w-6 h-6 text-amber-100" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  Presensi Siswa Lupa Kartu (Piket & Admin)
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/5 backdrop-blur-xl border border-white/10 text-white px-2 py-0.5 rounded-full border border-white/30">
                  Manual Terverifikasi
                </span>
              </div>
              <p className="text-xs text-amber-100 mt-0.5 leading-snug">
                Pencarian instan & pencatatan kehadiran resmi bagi siswa tanpa kartu fisik (RFID/QR).
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            title="Tutup Dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs (Pencatatan vs Riwayat Hari Ini) */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 px-4 py-2 border-b border-white/10 flex items-center justify-between gap-2 flex-shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('pencatatan')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'pencatatan'
                  ? 'bg-[#0b1121]/95 backdrop-blur-2xl border border-white/10 shadow-2xl text-amber-700 dark:text-amber-400 shadow-sm border border-amber-200 dark:border-amber-900/60'
                  : 'text-slate-400 hover:text-white dark:hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Input Presensi Lupa Kartu</span>
            </button>

            <button
              onClick={() => setActiveTab('riwayat')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'riwayat'
                  ? 'bg-[#0b1121]/95 backdrop-blur-2xl border border-white/10 shadow-2xl text-amber-700 dark:text-amber-400 shadow-sm border border-amber-200 dark:border-amber-900/60'
                  : 'text-slate-400 hover:text-white dark:hover:text-white'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Daftar Siswa Lupa Kartu Hari Ini</span>
              {todayLupaKartu.total > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-white text-[10px] font-black rounded-full">
                  {todayLupaKartu.total}
                </span>
              )}
            </button>
          </div>

          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Waktu Server: <strong className="text-white dark:text-slate-200">{currentWit.timeFormatted}</strong></span>
            <span>• Cutoff: <strong>{currentWit.cutoff} WIT</strong></span>
          </div>
        </div>

        {/* Tab Content: Pencatatan */}
        {activeTab === 'pencatatan' && (
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Selection & Search */}
            <div className="lg:col-span-6 flex flex-col space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-slate-200 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <span>1. Pilih Kelas & Cari Siswa</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  Total: {allStudents.length} Siswa Aktif
                </span>
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <div className="w-1/3">
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-white/10 dark:bg-slate-900 dark:text-white rounded-xl font-medium focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Semua">Semua Kelas</option>
                    {availableClasses.map((c) => (
                      <option key={c} value={c}>
                        Kelas {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ketik nama siswa atau NISN..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-white/10 dark:bg-slate-900 dark:text-white rounded-xl font-medium focus:ring-2 focus:ring-amber-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Student Search Results List */}
              <div className="flex-1 overflow-y-auto space-y-1.5 max-h-72 pr-1 border border-white/10 dark:border-slate-800 rounded-2xl p-2 bg-slate-900/40">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((s) => {
                    const isSelected = selectedStudent?.id === s.id;
                    const statusToday = getStudentTodayStatus(s);

                    return (
                      <div
                        key={s.id}
                        onClick={() => handleSelectStudent(s)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-950 dark:text-amber-100 shadow-sm ring-1 ring-amber-500'
                            : 'bg-white/5 backdrop-blur-xl border border-white/10 border-white/10/80 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {s.foto ? (
                            <img
                              src={s.foto}
                              alt={s.nama}
                              className="w-9 h-9 rounded-full object-cover border border-white/10 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center justify-center flex-shrink-0 border border-amber-200 dark:border-amber-800">
                              {s.nama.slice(0, 2).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-white truncate">
                              {s.nama}
                            </h4>
                            <p className="text-[11px] text-slate-400 truncate">
                              Kelas <span className="font-semibold text-white dark:text-slate-300">{s.kelas}</span> • NISN: <span className="font-mono">{s.nisn}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${statusToday.color}`}
                          >
                            {statusToday.label}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    <UserX className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-300" />
                    <span>Tidak ada data siswa yang cocok dengan pencarian.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Confirmation & Form */}
            <div className="lg:col-span-6 flex flex-col space-y-4">
              <span className="text-xs font-extrabold text-slate-200 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <span>2. Verifikasi Presensi & Alasan Lupa Kartu</span>
              </span>

              {selectedStudent ? (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl border border-white/10 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3.5">
                    {/* Selected Student Card */}
                    <div className="p-3 bg-white/5 backdrop-blur-xl border border-white/10 backdrop-blur-xl rounded-xl border border-white/10 flex items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black text-sm flex items-center justify-center flex-shrink-0 shadow-sm">
                          {selectedStudent.nama.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-extrabold text-sm text-white">
                              {selectedStudent.nama}
                            </h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              Kelas {selectedStudent.kelas}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            NISN: <span className="font-mono">{selectedStudent.nisn}</span>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedStudent(null)}
                        className="text-xs text-slate-400 hover:text-rose-500 font-semibold cursor-pointer"
                      >
                        Ganti
                      </button>
                    </div>

                    {/* Presensi Type and Status */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-200 dark:text-slate-300 mb-1">
                          Jenis Presensi:
                        </label>
                        <div className="grid grid-cols-2 gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-white/10">
                          <button
                            type="button"
                            onClick={() => setJenisPresensi('Masuk')}
                            className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                              jenisPresensi === 'Masuk'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Masuk
                          </button>
                          <button
                            type="button"
                            onClick={() => setJenisPresensi('Pulang')}
                            className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                              jenisPresensi === 'Pulang'
                                ? 'bg-purple-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Pulang
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-200 dark:text-slate-300">
                            Status Kehadiran:
                          </label>
                          {currentWit.isLate && jenisPresensi === 'Masuk' && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                              Terlambat +{currentWit.lateMinutes}m
                            </span>
                          )}
                        </div>
                        <select
                          value={statusPresensi}
                          onChange={(e) => {
                            setStatusPresensi(e.target.value as AttendanceStatus);
                            setIsStatusManual(true);
                          }}
                          className="w-full px-3 py-2 text-xs border border-white/10 dark:bg-slate-900 dark:text-white rounded-xl font-medium focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="Hadir">Hadir Tepat Waktu</option>
                          <option value="Terlambat">Terlambat</option>
                          <option value="Izin">Izin (Dispensasi)</option>
                          <option value="Sakit">Sakit</option>
                        </select>
                      </div>
                    </div>

                    {/* Alasan Lupa Kartu */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-200 dark:text-slate-300 mb-1">
                        Alasan Tidak Membawa Kartu:
                      </label>
                      <select
                        value={alasan}
                        onChange={(e) => setAlasan(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-white/10 dark:bg-slate-900 dark:text-white rounded-xl font-medium focus:ring-2 focus:ring-amber-500 mb-2"
                      >
                        {COMMON_REASONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                        <option value="Lainnya">Lainnya (Ketik Manual)...</option>
                      </select>

                      {alasan === 'Lainnya' && (
                        <input
                          type="text"
                          value={customAlasan}
                          onChange={(e) => setCustomAlasan(e.target.value)}
                          placeholder="Ketik alasan khusus tidak bawa kartu..."
                          className="w-full px-3 py-2 text-xs border border-white/10 dark:bg-slate-900 dark:text-white rounded-xl font-medium focus:ring-2 focus:ring-amber-500"
                        />
                      )}
                    </div>

                    {/* Catatan Tambahan Petugas */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-200 dark:text-slate-300 mb-1">
                        Catatan Piket (Opsional):
                      </label>
                      <input
                        type="text"
                        value={catatanTambahan}
                        onChange={(e) => setCatatanTambahan(e.target.value)}
                        placeholder="Contoh: Diberi teguran lisan / didampingi orang tua..."
                        className="w-full px-3 py-2 text-xs border border-white/10 dark:bg-slate-900 dark:text-white rounded-xl font-medium focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(null)}
                      className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                    >
                      Batal
                    </button>

                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isSubmitting ? 'Mencatat...' : 'Simpan Presensi Lupa Kartu'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-white/10 dark:border-slate-800 rounded-2xl p-8 flex-1 flex flex-col items-center justify-center text-center text-slate-400 bg-slate-900/20">
                  <GraduationCap className="w-12 h-12 text-slate-600 mb-3" />
                  <h4 className="font-bold text-sm text-slate-300">
                    Belum Ada Siswa Dipilih
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Cari dan pilih nama siswa di kolom sebelah kiri untuk memproses verifikasi presensi manual tanpa kartu.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Content: Riwayat Lupa Kartu Hari Ini */}
        {activeTab === 'riwayat' && (
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  Rekap Siswa Lupa Kartu Hari Ini ({todayLupaKartu.total} Data)
                </h3>
                <p className="text-xs text-slate-400">
                  Daftar siswa yang tercatat masuk/pulang tanpa kartu fisik hari ini.
                </p>
              </div>

              {todayLupaKartu.total > 0 && (
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedSummary ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copiedSummary ? 'Laporan Disalin!' : 'Salin Laporan WhatsApp'}</span>
                </button>
              )}
            </div>

            {todayLupaKartu.students.length > 0 ? (
              <div className="border border-white/10 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-300 font-bold border-b border-white/10">
                    <tr>
                      <th className="py-2.5 px-3">Waktu</th>
                      <th className="py-2.5 px-3">Nama Siswa</th>
                      <th className="py-2.5 px-3">Kelas / Identitas</th>
                      <th className="py-2.5 px-3">Jenis & Status</th>
                      <th className="py-2.5 px-3">Alasan / Catatan</th>
                      <th className="py-2.5 px-3">Petugas Piket</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {todayLupaKartu.students.map(({ record, student }) => (
                      <tr key={record.id} className="hover:bg-white/10/40">
                        <td className="py-2.5 px-3 font-mono font-bold text-white">
                          {store.formatRecordTimeWIT(record.timestamp)}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-white">
                          {record.nama}
                          <span className="block text-[10px] font-normal text-slate-400 font-mono">
                            NISN: {record.nisn}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold">
                            Kelas {record.kelas}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1">
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                record.jenis === 'Masuk'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                  : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              }`}
                            >
                              {record.jenis}
                            </span>
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                record.status === 'Hadir'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {record.status}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-amber-800 dark:text-amber-300 font-medium">
                          {record.catatan || 'Lupa Kartu'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {record.petugas || 'Piket'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 border border-dashed border-white/10 rounded-2xl">
                <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
                <h4 className="font-bold text-sm text-slate-200 dark:text-slate-300">
                  Belum Ada Data Siswa Lupa Kartu Hari Ini
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Seluruh siswa yang telah presensi hari ini menggunakan kartu fisik (RFID/QR).
                </p>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 px-4 py-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span>Data otomatis tersinkronisasi dengan Database Cloud & Rekap Presensi Siswa</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-white dark:text-slate-200 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
