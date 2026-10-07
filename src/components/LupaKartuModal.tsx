import React, { useState, useMemo, useEffect } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  GraduationCap,
  Briefcase,
  X,
  Filter,
  AlertTriangle,
  ClipboardList,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  FileQuestion,
  User,
  UserX,
  Share2,
} from 'lucide-react';
import {
  Student,
  Teacher,
  AttendanceType,
  AttendanceStatus,
  TeacherAttendanceStatus,
  AttendanceRecord,
  TeacherAttendanceRecord,
} from '../types';
import { store } from '../lib/store';
import { toast } from '../lib/toast';
import { formatLateDuration, formatPetugasRole } from '../lib/exportUtils';

export interface LupaKartuModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOfficer: string;
  initialTarget?: 'siswa' | 'guru';
  onAttendanceRecorded?: (result: {
    success: boolean;
    student?: Student;
    teacher?: Teacher;
    record?: AttendanceRecord;
    teacherRecord?: TeacherAttendanceRecord;
    type?: AttendanceType;
    status?: AttendanceStatus | TeacherAttendanceStatus;
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
  initialTarget = 'siswa',
  onAttendanceRecorded,
}) => {
  const [activeTab, setActiveTab] = useState<'pencatatan' | 'riwayat'>('pencatatan');
  const [targetType, setTargetType] = useState<'siswa' | 'guru'>(initialTarget);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('Semua');

  // Selected Person
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  // Form Fields
  const [jenisPresensi, setJenisPresensi] = useState<AttendanceType>('Masuk');
  const [statusPresensi, setStatusPresensi] = useState<AttendanceStatus | TeacherAttendanceStatus>('Hadir');
  const [isStatusManual, setIsStatusManual] = useState<boolean>(false);
  const [alasan, setAlasan] = useState<string>('Kartu Tertinggal di Rumah');
  const [customAlasan, setCustomAlasan] = useState<string>('');
  const [catatanTambahan, setCatatanTambahan] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // Sync initial target
  useEffect(() => {
    if (isOpen) {
      setTargetType(initialTarget);
      setSelectedStudent(null);
      setSelectedTeacher(null);
      setSearchQuery('');
      setCatatanTambahan('');
      setCustomAlasan('');
      setAlasan('Kartu Tertinggal di Rumah');
      setIsStatusManual(false);
    }
  }, [isOpen, initialTarget]);

  // Load students & teachers
  const allStudents = useMemo(() => store.getStudents().filter((s) => s.status === 'aktif'), []);
  const allTeachers = useMemo(() => store.getTeachers().filter((t) => t.status === 'aktif'), []);

  // Unique Classes
  const availableClasses = useMemo(() => {
    const classes = Array.from(new Set(allStudents.map((s) => s.kelas).filter(Boolean)));
    return classes.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [allStudents]);

  // Determine current WIT time for automatic status recommendation
  const currentWit = useMemo(() => {
    const now = new Date();
    let hour = now.getHours();
    let minute = now.getMinutes();
    try {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jayapura',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(now);
      const h = parts.find((p) => p.type === 'hour');
      const m = parts.find((p) => p.type === 'minute');
      if (h) hour = parseInt(h.value, 10);
      if (m) minute = parseInt(m.value, 10);
    } catch {
      // Fallback
    }
    const cutoff = store.getSettings().cutoffTime || '07:15';
    const [cHour, cMin] = cutoff.split(':').map(Number);
    const nowMins = hour * 60 + minute;
    const cutoffMins = (cHour || 7) * 60 + (cMin || 15);
    const isLate = nowMins > cutoffMins;
    const lateMinutes = isLate ? nowMins - cutoffMins : 0;
    const timeFormatted = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} WIT`;

    return { hour, minute, isLate, lateMinutes, cutoff, timeFormatted };
  }, [isOpen]);

  // When a student is chosen, calculate default jenis (Masuk / Pulang) and status
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

  // When a teacher is chosen, calculate default jenis and status
  useEffect(() => {
    if (!selectedTeacher) return;

    const todayRecords = store.getTeacherAttendance().filter((a) => {
      return store.isTeacherRecordForToday(a) && (a.nip === selectedTeacher.nip || a.nama.toLowerCase() === selectedTeacher.nama.toLowerCase());
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
  }, [selectedTeacher, currentWit, isStatusManual]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    if (targetType !== 'siswa') return [];
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
  }, [allStudents, targetType, selectedClass, searchQuery]);

  // Filtered Teachers
  const filteredTeachers = useMemo(() => {
    if (targetType !== 'guru') return [];
    let list = allTeachers;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.nama.toLowerCase().includes(q) ||
          t.nip.includes(q) ||
          t.jabatan.toLowerCase().includes(q)
      );
    }

    return list.slice(0, 40);
  }, [allTeachers, targetType, searchQuery]);

  // Today's Lupa Kartu List
  const todayLupaKartu = useMemo(() => {
    return store.getTodayLupaKartuList();
  }, [isOpen, isSubmitting, activeTab]);

  if (!isOpen) return null;

  const handleSelectStudent = (s: Student) => {
    setSelectedStudent(s);
    setSelectedTeacher(null);
  };

  const handleSelectTeacher = (t: Teacher) => {
    setSelectedTeacher(t);
    setSelectedStudent(null);
  };

  const handleSubmit = () => {
    const effectiveAlasan = alasan === 'Lainnya' ? customAlasan.trim() || 'Alasan Khusus' : alasan;

    if (!selectedStudent && !selectedTeacher) {
      toast.warning('Pilih Siswa/Guru', 'Silakan pilih siswa atau guru terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (targetType === 'siswa' && selectedStudent) {
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
      } else if (targetType === 'guru' && selectedTeacher) {
        const res = store.recordLupaKartu({
          targetType: 'guru',
          targetId: selectedTeacher.id,
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
          'Presensi Lupa Kartu Guru Berhasil!',
          `${selectedTeacher.nama} tercatat [${res.type?.toUpperCase()} - ${res.status?.toUpperCase()}] oleh ${formatPetugasRole(currentOfficer)}.`
        );

        if (onAttendanceRecorded) {
          onAttendanceRecorded(res);
        }

        setSelectedTeacher(null);
        setCatatanTambahan('');
        setCustomAlasan('');
        setAlasan('Kartu Tertinggal di Rumah');
        setIsStatusManual(false);
      }
    } catch (e: any) {
      toast.error('Terjadi Kesalahan', e?.message || 'Gagal menyimpan presensi lupa kartu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopySummary = () => {
    const todayStr = store.getTodayFormatted();
    let text = `📋 *LAPORAN SISWA & GURU LUPA KARTU HARI INI*\n`;
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

    if (todayLupaKartu.teachers.length > 0) {
      text += `*--- DAFTAR GURU & STAF (${todayLupaKartu.teachers.length}) ---*\n`;
      todayLupaKartu.teachers.forEach((item, idx) => {
        const r = item.record;
        const time = store.formatRecordTimeWIT(r.timestamp);
        text += `${idx + 1}. ${r.nama} (${r.jabatan}) - ${r.jenis} [${r.status}] jam ${time}\n   Ket: ${r.catatan || 'Lupa Kartu'} (Piket: ${r.petugas})\n`;
      });
    }

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    toast.success('Disalin ke Clipboard', 'Format laporan WhatsApp telah disalin.');
    setTimeout(() => setCopiedSummary(false), 2500);
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
      color: 'bg-white/5 backdrop-blur-xl border border-white/10/10 border border-white/10 text-slate-200 dark:bg-slate-800 dark:text-slate-300 border-white/10',
      disabled: false,
    };
  };

  const getTeacherTodayStatus = (teacher: Teacher) => {
    const recs = store.getTeacherAttendance().filter((a) => {
      return store.isTeacherRecordForToday(a) && (a.nip === teacher.nip || a.nama.toLowerCase() === teacher.nama.toLowerCase());
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
      color: 'bg-white/5 backdrop-blur-xl border border-white/10/10 border border-white/10 text-slate-200 dark:bg-slate-800 dark:text-slate-300 border-white/10',
      disabled: false,
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0b1121]/95 backdrop-blur-2xl border border-white/10 shadow-2xl border border-white/10 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white p-4 sm:p-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/20 rounded-2xl backdrop-blur-md shadow-inner flex-shrink-0">
              <CreditCard className="w-6 h-6 text-amber-100" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  Presensi Lupa Kartu (Piket & Admin)
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/25 text-white px-2 py-0.5 rounded-full border border-white/30">
                  Manual Terverifikasi
                </span>
              </div>
              <p className="text-xs text-amber-100 mt-0.5 leading-snug">
                Pencarian instan & pencatatan kehadiran resmi bagi siswa atau guru tanpa kartu fisik.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/10 rounded-xl transition-colors cursor-pointer"
            title="Tutup Dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs (Pencatatan vs Riwayat Hari Ini) */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl/80 px-4 py-2 border-b border-white/10 flex items-center justify-between gap-2 flex-shrink-0 flex-wrap">
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
              <span>Daftar Lupa Kartu Hari Ini</span>
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
                  <span>1. Pilih Kategori & Cari Nama</span>
                </span>

                {/* Target Type Toggle */}
                <div className="flex items-center gap-1 bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl p-0.5 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetType('siswa');
                      setSelectedStudent(null);
                      setSelectedTeacher(null);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all ${
                      targetType === 'siswa'
                        ? 'bg-[#0b1121]/95 backdrop-blur-2xl border border-white/10 shadow-2xl text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Siswa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetType('guru');
                      setSelectedStudent(null);
                      setSelectedTeacher(null);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all ${
                      targetType === 'guru'
                        ? 'bg-[#0b1121]/95 backdrop-blur-2xl border border-white/10 shadow-2xl text-sky-600 dark:text-sky-400 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Guru / Staf</span>
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                {targetType === 'siswa' && (
                  <div className="w-1/3">
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs font-semibold rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl text-white focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="Semua">Semua Kelas</option>
                      {availableClasses.map((cls) => (
                        <option key={cls} value={cls}>
                          {cls}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      targetType === 'siswa'
                        ? 'Ketik nama siswa atau NISN...'
                        : 'Ketik nama guru atau NIP...'
                    }
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl text-white focus:ring-2 focus:ring-amber-500"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-300 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Search Results List */}
              <div className="border border-white/10 rounded-2xl p-2 bg-white/5 backdrop-blur-xl border border-white/10/5 border border-white/10/50 dark:bg-slate-800/30 overflow-y-auto max-h-[340px] space-y-1.5">
                {targetType === 'siswa' ? (
                  filteredStudents.length > 0 ? (
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
                              : 'bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl/80 border-white/10/80 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700'
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
                              <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center flex-shrink-0 border border-indigo-200 dark:border-indigo-800">
                                {s.nama.slice(0, 2).toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0">
                              <h4 className="font-bold text-xs text-white truncate">
                                {s.nama}
                              </h4>
                              <p className="text-[11px] text-slate-400 truncate">
                                {s.kelas} • NISN: <span className="font-mono">{s.nisn}</span>
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
                  )
                ) : filteredTeachers.length > 0 ? (
                  filteredTeachers.map((t) => {
                    const isSelected = selectedTeacher?.id === t.id;
                    const statusToday = getTeacherTodayStatus(t);

                    return (
                      <div
                        key={t.id}
                        onClick={() => handleSelectTeacher(t)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-950 dark:text-amber-100 shadow-sm ring-1 ring-amber-500'
                            : 'bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl/80 border-white/10/80 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {t.foto ? (
                            <img
                              src={t.foto}
                              alt={t.nama}
                              className="w-9 h-9 rounded-full object-cover border border-white/10 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 font-bold text-xs flex items-center justify-center flex-shrink-0 border border-sky-200 dark:border-sky-800">
                              {t.nama.slice(0, 2).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-white truncate">
                              {t.nama}
                            </h4>
                            <p className="text-[11px] text-slate-400 truncate">
                              {t.jabatan} • NIP: <span className="font-mono">{t.nip}</span>
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
                    <span>Tidak ada data guru yang cocok dengan pencarian.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Confirmation & Form */}
            <div className="lg:col-span-6 flex flex-col space-y-4">
              <span className="text-xs font-extrabold text-slate-200 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <span>2. Verifikasi Presensi & Alasan Lupa Kartu</span>
              </span>

              {selectedStudent || selectedTeacher ? (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl/60 p-4 rounded-2xl border border-white/10 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3.5">
                    {/* Selected Person Card */}
                    <div className="p-3 bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl rounded-xl border border-white/10 flex items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black text-sm flex items-center justify-center flex-shrink-0 shadow-sm">
                          {(selectedStudent?.nama || selectedTeacher?.nama || '??').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-extrabold text-sm text-white">
                              {selectedStudent?.nama || selectedTeacher?.nama}
                            </h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              {selectedStudent ? selectedStudent.kelas : selectedTeacher?.jabatan}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {selectedStudent ? `NISN: ${selectedStudent.nisn}` : `NIP: ${selectedTeacher?.nip}`}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudent(null);
                          setSelectedTeacher(null);
                        }}
                        className="text-xs text-slate-400 hover:text-rose-500 font-semibold cursor-pointer"
                      >
                        Ganti
                      </button>
                    </div>

                    {/* Jenis Presensi: Masuk vs Pulang */}
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-200 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Jenis Presensi
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setJenisPresensi('Masuk')}
                          className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                            jenisPresensi === 'Masuk'
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl text-slate-200 dark:text-slate-300 border-white/10'
                          }`}
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          <span>Presensi Masuk</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setJenisPresensi('Pulang')}
                          className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                            jenisPresensi === 'Pulang'
                              ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                              : 'bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl text-slate-200 dark:text-slate-300 border-white/10'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Presensi Pulang</span>
                        </button>
                      </div>
                    </div>

                    {/* Status Kehadiran */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-extrabold text-slate-200 dark:text-slate-300 uppercase tracking-wider">
                          Status Kehadiran
                        </label>
                        {jenisPresensi === 'Masuk' && (
                          <span className="text-[10px] text-slate-400">
                            {currentWit.isLate ? (
                              <span className="text-amber-600 dark:text-amber-400 font-bold">
                                Melewati batas {currentWit.cutoff} WIT (+{currentWit.lateMinutes} mnt)
                              </span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                Sebelum batas {currentWit.cutoff} WIT (Tepat Waktu)
                              </span>
                            )}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setStatusPresensi('Hadir');
                            setIsStatusManual(true);
                          }}
                          className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                            statusPresensi === 'Hadir'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl text-slate-200 dark:text-slate-300 border-white/10'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Hadir (Tepat Waktu)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setStatusPresensi('Terlambat');
                            setIsStatusManual(true);
                          }}
                          className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                            statusPresensi === 'Terlambat'
                              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                              : 'bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl text-slate-200 dark:text-slate-300 border-white/10'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Terlambat</span>
                        </button>
                      </div>
                    </div>

                    {/* Alasan Lupa Kartu */}
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-200 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Alasan Lupa Kartu
                      </label>
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap gap-1.5">
                          {COMMON_REASONS.map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => {
                                setAlasan(r);
                                setCustomAlasan('');
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                alasan === r
                                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                  : 'bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl text-slate-300 border-white/10 hover:bg-white/5 backdrop-blur-xl border border-white/10/10 border border-white/10'
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setAlasan('Lainnya')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                              alasan === 'Lainnya'
                                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                : 'bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl text-slate-300 border-white/10 hover:bg-white/5 backdrop-blur-xl border border-white/10/10 border border-white/10'
                            }`}
                          >
                            Alasan Lainnya...
                          </button>
                        </div>

                        {alasan === 'Lainnya' && (
                          <input
                            type="text"
                            value={customAlasan}
                            onChange={(e) => setCustomAlasan(e.target.value)}
                            placeholder="Tuliskan alasan spesifik (misal: kartu terselip di buku)..."
                            className="w-full px-3 py-2 text-xs rounded-xl border border-amber-400 bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl text-white focus:ring-2 focus:ring-amber-500"
                            autoFocus
                          />
                        )}
                      </div>
                    </div>

                    {/* Catatan Tambahan (Opsional) */}
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-200 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Catatan Tambahan Petugas (Opsional)
                      </label>
                      <input
                        type="text"
                        value={catatanTambahan}
                        onChange={(e) => setCatatanTambahan(e.target.value)}
                        placeholder="Contoh: Sudah ditegur piket, orang tua sudah dikonfirmasi, dll..."
                        className="w-full px-3 py-2 text-xs rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl text-white focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Petugas Verification Indicator */}
                    <div className="p-2 bg-amber-50/80 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Petugas Pencatat:</span>
                      </span>
                      <strong className="text-amber-900 dark:text-amber-200 font-bold">
                        {formatPetugasRole(currentOfficer)}
                      </strong>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudent(null);
                        setSelectedTeacher(null);
                      }}
                      className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-slate-300 hover:bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/10 transition-colors cursor-pointer"
                    >
                      Batal
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleSubmit}
                      className="flex-1 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {isSubmitting
                          ? 'Mencatat Presensi...'
                          : `Simpan Presensi Lupa Kartu (${jenisPresensi.toUpperCase()})`}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl/40 border-2 border-dashed border-white/10 rounded-2xl p-8 flex-1 flex flex-col items-center justify-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                    <UserCheck className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-sm text-white dark:text-slate-200">
                    Belum Ada Siswa atau Guru Dipilih
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs mt-1">
                    Silakan klik salah satu nama pada daftar di sebelah kiri untuk mengisi alasan lupa kartu dan mengonfirmasi presensi.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Content: Riwayat Hari Ini */}
        {activeTab === 'riwayat' && (
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50 dark:bg-amber-950/30 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900/60">
              <div className="flex items-center gap-2.5">
                <ClipboardList className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-white">
                    Rekap Presensi Lupa Kartu Hari Ini ({todayLupaKartu.total} Data)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Daftar siswa & guru yang tercatat masuk/pulang tanpa kartu fisik hari ini.
                  </p>
                </div>
              </div>

              {todayLupaKartu.total > 0 && (
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto"
                >
                  {copiedSummary ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSummary ? 'Tersalin!' : 'Salin Laporan WA Piket'}</span>
                </button>
              )}
            </div>

            {todayLupaKartu.total > 0 ? (
              <div className="border border-white/10 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl/80 text-slate-400 font-extrabold text-[11px] uppercase tracking-wider border-b border-white/10">
                    <tr>
                      <th className="py-2.5 px-3">Waktu (WIT)</th>
                      <th className="py-2.5 px-3">Nama</th>
                      <th className="py-2.5 px-3">Kelas / Peran</th>
                      <th className="py-2.5 px-3">Jenis & Status</th>
                      <th className="py-2.5 px-3">Alasan Lupa Kartu</th>
                      <th className="py-2.5 px-3">Petugas Piket</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 dark:divide-slate-800 text-slate-200 dark:text-slate-300">
                    {todayLupaKartu.students.map(({ record, student }) => (
                      <tr key={record.id} className="hover:bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5/40">
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
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl text-slate-200 dark:text-slate-300 border border-white/10 font-bold">
                            {record.kelas}
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

                    {todayLupaKartu.teachers.map(({ record, teacher }) => (
                      <tr key={record.id} className="hover:bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5/40">
                        <td className="py-2.5 px-3 font-mono font-bold text-white">
                          {store.formatRecordTimeWIT(record.timestamp)}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-white">
                          {record.nama}
                          <span className="block text-[10px] font-normal text-slate-400 font-mono">
                            NIP: {record.nip}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-bold">
                            {record.jabatan}
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
                  Belum Ada Data Lupa Kartu Hari Ini
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Seluruh siswa & guru yang telah presensi hari ini menggunakan kartu fisik (RFID/QR).
                </p>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl/80 px-4 py-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span>Data otomatis tersinkronisasi dengan Database Supabase & Rekap Presensi</span>
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
