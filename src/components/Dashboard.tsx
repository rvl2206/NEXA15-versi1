import React, { useEffect, useState } from 'react';
import { store } from '../lib/store';
import { Student, AttendanceRecord, Teacher, TeacherAttendanceRecord } from '../types';
import { SchoolLogo } from './SchoolLogo';
import { LowAttendanceNotifications } from './LowAttendanceNotifications';
import {
  Users,
  UserCheck,
  Clock,
  FileCheck,
  Stethoscope,
  XCircle,
  TrendingUp,
  BarChart2,
  PieChart as PieChartIcon,
  Calendar,
  RefreshCw,
  Briefcase,
  GraduationCap,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const Dashboard: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherAttendance, setTeacherAttendance] = useState<TeacherAttendanceRecord[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(store.getTodayYyyyMmDd());
  const [activeMetricTab, setActiveMetricTab] = useState<'siswa' | 'guru'>('siswa');

  const syncData = async () => {
    setIsRefreshing(true);
    try {
      await store.fetchFromServer();
    } catch (err) {
      console.error('Auto sync error:', err);
    } finally {
      setStudents(store.getStudents());
      setAttendance(store.getAttendance());
      setTeachers(store.getTeachers());
      setTeacherAttendance(store.getTeacherAttendance());
      setLastUpdated(new Date());
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  const handleManualRefresh = () => {
    syncData();
  };

  useEffect(() => {
    setStudents(store.getStudents());
    setAttendance(store.getAttendance());
    setTeachers(store.getTeachers());
    setTeacherAttendance(store.getTeacherAttendance());
    setLastUpdated(new Date());

    const unsubscribe = store.subscribe(() => {
      setStudents(store.getStudents());
      setAttendance(store.getAttendance());
      setTeachers(store.getTeachers());
      setTeacherAttendance(store.getTeacherAttendance());
      setLastUpdated(new Date());
    });

    // Polling otomatis setiap 30 detik untuk sinkronisasi Google Sheets & server
    const intervalId = setInterval(() => {
      syncData();
    }, 30 * 1000);

    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, []);

  const todayYyyyMmDd = store.getTodayYyyyMmDd();
  const todayStr = store.getTodayFormatted();

  const formatIndoDate = (dateStr: string) => {
    if (!dateStr) return '';
    const norm = store.normalizeToYyyyMmDd(dateStr) || dateStr;
    const [y, m, d] = norm.split('-');
    if (!y || !m || !d) return dateStr;
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1] || m} ${y}`;
  };

  // Extract unique available dates with attendance data (sorted descending)
  const availableDates: string[] = Array.from(
    new Set<string>(
      attendance
        .map((a) => store.normalizeToYyyyMmDd(a.tanggal) || store.normalizeToYyyyMmDd(a.timestamp))
        .filter((d): d is string => Boolean(d))
    )
  ).sort().reverse();

  // Today or selected date raw attendance records
  const dateRecords = attendance.filter((a) => store.isRecordForDate(a, selectedDate));

  // Deduplicate records per student for the selected date to count daily status accurately
  const studentDailyMap = new Map<string, AttendanceRecord>();
  dateRecords.forEach((r) => {
    const existing = studentDailyMap.get(r.nisn);
    if (!existing) {
      studentDailyMap.set(r.nisn, r);
    } else {
      if (existing.jenis === 'Pulang' && r.jenis !== 'Pulang') {
        studentDailyMap.set(r.nisn, r);
      }
    }
  });

  const uniqueDailyRecords = Array.from(studentDailyMap.values());

  const totalStudents = students.filter((s) => s.status === 'aktif').length;
  const totalHadir = uniqueDailyRecords.filter((a) => a.status === 'Hadir').length;
  const totalTerlambat = uniqueDailyRecords.filter((a) => a.status === 'Terlambat').length;
  const totalIzin = uniqueDailyRecords.filter((a) => a.status === 'Izin').length;
  const totalSakit = uniqueDailyRecords.filter((a) => a.status === 'Sakit').length;
  const totalAlpa = uniqueDailyRecords.filter((a) => a.status === 'Alpa').length;
  const totalSiswaMasuk = totalHadir + totalTerlambat;

  // Teacher attendance statistics calculation
  const totalActiveTeachers = teachers.filter((t) => t.status === 'aktif').length;
  const teacherDateRecords = teacherAttendance.filter((r) =>
    store.isTeacherRecordForDate(r, selectedDate)
  );

  const teacherDailyMap = new Map<string, TeacherAttendanceRecord>();
  teacherDateRecords.forEach((r) => {
    const existing = teacherDailyMap.get(r.nip);
    if (!existing) {
      teacherDailyMap.set(r.nip, r);
    } else {
      if (existing.jenis === 'Pulang' && r.jenis !== 'Pulang') {
        teacherDailyMap.set(r.nip, r);
      }
    }
  });

  const uniqueTeacherDailyRecords = Array.from(teacherDailyMap.values());
  const teacherTotalHadir = uniqueTeacherDailyRecords.filter((a) => a.status === 'Hadir').length;
  const teacherTotalTerlambat = uniqueTeacherDailyRecords.filter((a) => a.status === 'Terlambat').length;
  const teacherTotalIzin = uniqueTeacherDailyRecords.filter((a) => a.status === 'Izin').length;
  const teacherTotalSakit = uniqueTeacherDailyRecords.filter((a) => a.status === 'Sakit').length;
  const teacherTotalCuti = uniqueTeacherDailyRecords.filter((a) => a.status === 'Cuti').length;
  const teacherTotalDinas = uniqueTeacherDailyRecords.filter((a) => a.status === 'Dinas Luar').length;
  const teacherTotalAlpa = uniqueTeacherDailyRecords.filter((a) => a.status === 'Alpa').length;
  const teacherTotalMasuk = teacherTotalHadir + teacherTotalTerlambat;

  // Class breakdown data for BarChart
  const classList = Array.from(
    new Set([
      ...students.map((s) => s.kelas.trim()),
      ...attendance.map((a) => a.kelas.trim()),
    ])
  ).filter(Boolean).sort();

  const classData = classList.map((cls) => {
    const clsStudents = students.filter(
      (s) => s.kelas.trim().toLowerCase() === cls.toLowerCase() && s.status === 'aktif'
    );
    const clsRecords = uniqueDailyRecords.filter(
      (a) => a.kelas.trim().toLowerCase() === cls.toLowerCase()
    );

    const hadir = clsRecords.filter((a) => a.status === 'Hadir').length;
    const terlambat = clsRecords.filter((a) => a.status === 'Terlambat').length;
    const alpa = clsRecords.filter((a) => a.status === 'Alpa').length;

    return {
      kelas: cls,
      TotalSiswa: clsStudents.length,
      Hadir: hadir,
      Terlambat: terlambat,
      Alpa: alpa,
    };
  });

  // Trend data grouped by normalized date for AreaChart (10 date entries, sorted ascending)
  const uniqueNormalizedDates: string[] = Array.from(
    new Set<string>(
      attendance
        .map((a) => store.normalizeToYyyyMmDd(a.tanggal) || store.normalizeToYyyyMmDd(a.timestamp))
        .filter((d): d is string => Boolean(d))
    )
  )
    .sort()
    .slice(-10);

  const trendData = uniqueNormalizedDates.map((d) => {
    const dayRecords = attendance.filter((a) => store.isRecordForDate(a, d));
    // Deduplicate per student
    const dayStudentMap = new Map<string, AttendanceRecord>();
    dayRecords.forEach((r) => {
      if (!dayStudentMap.has(r.nisn) || (dayStudentMap.get(r.nisn)?.jenis === 'Pulang' && r.jenis !== 'Pulang')) {
        dayStudentMap.set(r.nisn, r);
      }
    });
    const uniqueDayRecords = Array.from(dayStudentMap.values());

    const parts = d.split('-');
    const labelDate = parts.length === 3 ? `${parts[2]}-${parts[1]}` : d;

    return {
      tanggal: labelDate,
      Hadir: uniqueDayRecords.filter((a) => a.status === 'Hadir').length,
      Terlambat: uniqueDayRecords.filter((a) => a.status === 'Terlambat').length,
      Alpa: uniqueDayRecords.filter((a) => a.status === 'Alpa').length,
    };
  });

  // Pie chart status distribution data
  const pieData = [
    { name: 'Hadir', value: totalHadir || (uniqueDailyRecords.length === 0 ? 0 : 1), color: '#10b981' },
    { name: 'Terlambat', value: totalTerlambat, color: '#f59e0b' },
    { name: 'Izin', value: totalIzin, color: '#3b82f6' },
    { name: 'Sakit', value: totalSakit, color: '#8b5cf6' },
    { name: 'Alpa', value: totalAlpa, color: '#ef4444' },
  ].filter((item) => item.value > 0);

  const isTodaySelected = selectedDate === todayYyyyMmDd;
  const latestDataDate: string | null = availableDates.length > 0 ? availableDates[0] : null;

  const studentPercentage = totalStudents > 0 ? Math.round((totalSiswaMasuk / totalStudents) * 100) : 0;
  const teacherPercentage = totalActiveTeachers > 0 ? Math.round((teacherTotalMasuk / totalActiveTeachers) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Overview Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <SchoolLogo className="w-12 h-12 sm:w-14 sm:h-14 drop-shadow-xs" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider mb-0.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatIndoDate(selectedDate)}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Dashboard Kehadiran NEXA15
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              SMA Negeri 15 Ambon — Ringkasan presensi harian & statistik kedisiplinan.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Date Selector Filter */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer pr-1"
            >
              <option value={todayYyyyMmDd}>Hari Ini ({todayStr})</option>
              {availableDates.map((d) => {
                if (d === todayYyyyMmDd) return null;
                const [y, m, day] = d.split('-');
                return (
                  <option key={d} value={d}>
                    {day}-{m}-{y}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Realtime Auto Sync Badge */}
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-extrabold text-[11px]">Sync 30s</span>
            <button
              onClick={handleManualRefresh}
              className="p-0.5 hover:bg-emerald-200/50 dark:hover:bg-emerald-800/50 rounded text-emerald-600 dark:text-emerald-300 transition-colors cursor-pointer"
              title="Perbarui data sekarang dari server"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Quick Rate Pill */}
          <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 px-3.5 py-2 rounded-xl text-center">
            <span className="text-[10px] text-blue-700 dark:text-blue-300 font-extrabold block uppercase tracking-wider">
              {activeMetricTab === 'siswa' ? 'Kehadiran Siswa' : 'Kehadiran Guru'}
            </span>
            <span className="text-base font-black text-blue-900 dark:text-blue-100">
              {activeMetricTab === 'siswa' ? `${studentPercentage}%` : `${teacherPercentage}%`}
            </span>
          </div>
        </div>
      </div>

      {/* Info Notice Banner if Today has 0 records but past dates exist */}
      {isTodaySelected && uniqueDailyRecords.length === 0 && latestDataDate && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl flex items-center justify-between gap-4 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Belum ada data scan untuk <strong>Hari Ini ({todayStr})</strong>. Data terakhir tercatat pada <strong>{latestDataDate.split('-').reverse().join('-')}</strong>.
            </span>
          </div>
          <button
            onClick={() => setSelectedDate(latestDataDate)}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors cursor-pointer shrink-0 text-xs"
          >
            Buka Data {latestDataDate.split('-').reverse().join('-')}
          </button>
        </div>
      )}

      {/* Holiday Banner */}
      {store.isHoliday(selectedDate) && (
        <div className="bg-purple-500/10 border border-purple-500/30 p-3.5 rounded-xl flex items-center gap-3 text-xs text-purple-900 dark:text-purple-200">
          <div className="p-2 bg-purple-600 text-white rounded-lg shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-purple-950 dark:text-purple-100 uppercase tracking-wider block">
              HARI LIBUR SEKOLAH ({selectedDate.split('-').reverse().join('-')})
            </span>
            <span className="text-[11px] text-purple-700 dark:text-purple-300">
              {store.getHolidays().find(h => store.normalizeToYyyyMmDd(h.tanggal) === selectedDate)?.keterangan || 'Akhir Pekan (Hari Minggu)'} — Penalti presensi nonaktif pada hari libur.
            </span>
          </div>
        </div>
      )}

      {/* Metrics Section with Segmented Tab Switcher (Siswa vs Guru) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-1 border-b border-slate-200 dark:border-slate-800">
          {/* Segmented Switcher */}
          <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setActiveMetricTab('siswa')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeMetricTab === 'siswa'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Presensi Siswa</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300">
                {totalSiswaMasuk}/{totalStudents}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMetricTab('guru')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeMetricTab === 'guru'
                  ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 shadow-xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Presensi Guru & Pegawai</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300">
                {teacherTotalMasuk}/{totalActiveTeachers}
              </span>
            </button>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            {activeMetricTab === 'siswa'
              ? `${totalSiswaMasuk} dari ${totalStudents} siswa hadir hari ini (${studentPercentage}%)`
              : `${teacherTotalMasuk} dari ${totalActiveTeachers} guru & staf hadir hari ini (${teacherPercentage}%)`}
          </span>
        </div>

        {/* Tab 1: Cards Siswa */}
        {activeMetricTab === 'siswa' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Siswa</span>
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">{totalStudents}</div>
              <span className="text-[10px] text-slate-400 font-medium">Siswa Aktif</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/50 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Hadir</span>
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-950 dark:text-emerald-100 mt-2">{totalHadir}</div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Tepat Waktu</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-800/50 bg-amber-50/20 dark:bg-amber-950/10 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300">Terlambat</span>
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-950 dark:text-amber-100 mt-2">{totalTerlambat}</div>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">&gt; 07:15 WIT</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-blue-200/80 dark:border-blue-800/50 bg-blue-50/20 dark:bg-blue-950/10 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-800 dark:text-blue-300">Izin</span>
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  <FileCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-blue-950 dark:text-blue-100 mt-2">{totalIzin}</div>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Surat Izin</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-purple-200/80 dark:border-purple-800/50 bg-purple-50/20 dark:bg-purple-950/10 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-800 dark:text-purple-300">Sakit</span>
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                  <Stethoscope className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-purple-950 dark:text-purple-100 mt-2">{totalSakit}</div>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">Keterangan Dokter</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-rose-200/80 dark:border-rose-800/50 bg-rose-50/20 dark:bg-rose-950/10 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-800 dark:text-rose-300">Alpa</span>
                <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                  <XCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-950 dark:text-rose-100 mt-2">{totalAlpa}</div>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">Tanpa Keterangan</span>
            </div>
          </div>
        )}

        {/* Tab 2: Cards Guru & Pegawai */}
        {activeMetricTab === 'guru' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Guru</span>
                <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400">
                  <Briefcase className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">{totalActiveTeachers}</div>
              <span className="text-[10px] text-slate-400 font-medium">Guru & Pegawai</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/50 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Hadir Tepat</span>
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-950 dark:text-emerald-100 mt-2">{teacherTotalHadir}</div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Tepat Waktu</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-800/50 bg-amber-50/20 dark:bg-amber-950/10 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300">Terlambat</span>
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-950 dark:text-amber-100 mt-2">{teacherTotalTerlambat}</div>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">&gt; 07:15 WIT</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-blue-200/80 dark:border-blue-800/50 bg-blue-50/20 dark:bg-blue-950/10 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-800 dark:text-blue-300">Izin / Cuti</span>
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  <FileCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-blue-950 dark:text-blue-100 mt-2">{teacherTotalIzin + teacherTotalCuti}</div>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Izin Resmi</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/50 bg-indigo-50/20 dark:bg-indigo-950/10 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300">Dinas Luar</span>
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                  <Briefcase className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-indigo-950 dark:text-indigo-100 mt-2">{teacherTotalDinas}</div>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">Tugas Dinas</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-rose-200/80 dark:border-rose-800/50 bg-rose-50/20 dark:bg-rose-950/10 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-800 dark:text-rose-300">Sakit / Alpa</span>
                <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                  <XCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-950 dark:text-rose-100 mt-2">{teacherTotalSakit + teacherTotalAlpa}</div>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">Tidak Hadir</span>
            </div>
          </div>
        )}
      </div>

      {/* Low Attendance Notification Alert (Clean & Collapsible) */}
      <LowAttendanceNotifications students={students} attendance={attendance} />

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* BarChart: Kehadiran Per Kelas */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Grafik Kehadiran per Kelas Hari Ini</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Jumlah siswa Hadir, Terlambat, dan Alpa tiap kelas</p>
            </div>
          </div>

          <div className="h-68 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="kelas" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Hadir" fill="#10b981" radius={[5, 5, 0, 0]} />
                <Bar dataKey="Terlambat" fill="#f59e0b" radius={[5, 5, 0, 0]} />
                <Bar dataKey="Alpa" fill="#ef4444" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PieChart: Status Distribution */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-1">
              <PieChartIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Distribusi Status Kehadiran</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Proporsi presensi siswa</p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '0.5rem',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
            {pieData.map((p) => (
              <div key={p.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }}></span>
                <span className="text-slate-600 dark:text-slate-400 font-medium">{p.name}:</span>
                <span className="font-bold text-slate-900 dark:text-white">{p.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AreaChart: Tren Kehadiran Harian/Bulanan */}
        <div className="lg:col-span-12 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Grafik Tren Kehadiran</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Perkembangan jumlah siswa Hadir dan Terlambat</p>
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHadir" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="tanggal" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="Hadir" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorHadir)" />
                <Area type="monotone" dataKey="Terlambat" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorLate)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
