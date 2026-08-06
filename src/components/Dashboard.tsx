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
  // Prioritize "Masuk" or non-"Pulang" records for primary status
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

  const totalScanHariIni = dateRecords.length;
  const totalScanMasuk = dateRecords.filter((r) => r.jenis === 'Masuk').length;
  const totalScanPulang = dateRecords.filter((r) => r.jenis === 'Pulang').length;
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

  return (
    <div className="space-y-6">
      {/* Welcome & Overview Header */}
      <div className="bg-white dark:bg-slate-900/90 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full blur-xs opacity-30"></div>
            <SchoolLogo className="w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 relative drop-shadow-md" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider mb-1">
              <Calendar className="w-4 h-4 text-cyan-500" />
              <span>Hari Ini: {todayStr}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Dashboard Kehadiran NEXA15
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              SMA Negeri 15 Ambon — Ringkasan statistik & tren kedisiplinan harian realtime.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Selector Filter */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ml-1" />
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer pr-2"
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

          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs font-medium shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-extrabold text-[11px]">Auto Sync (30s)</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 border-l border-emerald-300 dark:border-emerald-800/80 pl-2 font-mono">
              {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jayapura' })} WIT
            </span>
            <button
              onClick={handleManualRefresh}
              className="p-1 hover:bg-emerald-200/50 dark:hover:bg-emerald-800/50 rounded-lg text-emerald-600 dark:text-emerald-300 transition-colors ml-0.5 cursor-pointer"
              title="Perbarui data sekarang dari server"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-700 dark:text-emerald-200' : ''}`} />
            </button>
          </div>

          <div className="bg-blue-600/10 border border-blue-500/20 px-4 py-2 rounded-xl text-center min-w-[140px]">
            <span className="text-[10px] text-blue-700 dark:text-blue-300 font-extrabold block uppercase tracking-wider">Tingkat Kehadiran</span>
            <span className="text-xl font-black text-blue-900 dark:text-blue-100">
              {totalStudents > 0 ? Math.round(((totalHadir + totalTerlambat) / totalStudents) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Info Notice Banner if Today has 0 records but past dates exist */}
      {isTodaySelected && uniqueDailyRecords.length === 0 && latestDataDate && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-center justify-between gap-4 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              Belum ada aktivitas presensi yang tercatat untuk <strong>Hari Ini ({todayStr})</strong>.
              Terdapat data rekaman terakhir pada tanggal <strong>{latestDataDate.split('-').reverse().join('-')}</strong>.
            </span>
          </div>
          <button
            onClick={() => setSelectedDate(latestDataDate)}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors cursor-pointer flex-shrink-0"
          >
            Lihat Data {latestDataDate.split('-').reverse().join('-')}
          </button>
        </div>
      )}

      {/* Holiday Banner */}
      {store.isHoliday(selectedDate) && (
        <div className="bg-purple-500/10 border border-purple-500/30 p-4 rounded-xl flex items-center gap-3 text-xs text-purple-900 dark:text-purple-200">
          <div className="p-2 bg-purple-600 text-white rounded-lg shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-purple-950 dark:text-purple-100 uppercase tracking-wider block">
              HARI LIBUR SEKOLAH ({selectedDate.split('-').reverse().join('-')})
            </span>
            <span className="text-[11px] text-purple-700 dark:text-purple-300">
              {store.getHolidays().find(h => store.normalizeToYyyyMmDd(h.tanggal) === selectedDate)?.keterangan || 'Akhir Pekan (Sabtu / Minggu)'} — Penalti Presensi & Otopresensi Alpa nonaktif pada hari libur.
            </span>
          </div>
        </div>
      )}

      {/* Activity & Scan Transactions Summary Bar */}
      <div className="bg-white dark:bg-slate-900/90 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span>
            <strong>Presensi Hari ({formatIndoDate(selectedDate)}):</strong> {totalSiswaMasuk} Siswa Hadir ({totalHadir} Hadir Tepat Waktu + {totalTerlambat} Terlambat) • {totalScanPulang} Siswa Pulang
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] border border-slate-200 dark:border-slate-700">
            {totalScanHariIni} Total Scan Tercatat ({totalScanMasuk} Masuk • {totalScanPulang} Pulang)
          </span>
        </div>
      </div>

      {/* Top Metric Cards (Siswa) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Presensi Siswa Hari Ini</span>
          </h3>
          <span className="text-[11px] font-bold text-slate-500">
            {totalSiswaMasuk} dari {totalStudents} Siswa Masuk
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-slate-900/90 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Siswa</span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">{totalStudents}</div>
            <span className="text-[10px] text-slate-400 font-medium">Terdaftar aktif</span>
          </div>

          <div className="bg-white dark:bg-slate-900/90 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/50 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-2xs hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Hadir</span>
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-950 dark:text-emerald-100 mt-2">{totalHadir}</div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Tepat waktu</span>
          </div>

          <div className="bg-white dark:bg-slate-900/90 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-800/50 bg-amber-50/20 dark:bg-amber-950/10 shadow-2xs hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">Terlambat</span>
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-950 dark:text-amber-100 mt-2">{totalTerlambat}</div>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">&gt; Jam 07:15</span>
          </div>

          <div className="bg-white dark:bg-slate-900/90 p-4 rounded-2xl border border-blue-200/80 dark:border-blue-800/50 bg-blue-50/20 dark:bg-blue-950/10 shadow-2xs hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-800 dark:text-blue-300">Izin</span>
              <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                <FileCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-blue-950 dark:text-blue-100 mt-2">{totalIzin}</div>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Dengan surat</span>
          </div>

          <div className="bg-white dark:bg-slate-900/90 p-4 rounded-2xl border border-purple-200/80 dark:border-purple-800/50 bg-purple-50/20 dark:bg-purple-950/10 shadow-2xs hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-800 dark:text-purple-300">Sakit</span>
              <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                <Stethoscope className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-purple-950 dark:text-purple-100 mt-2">{totalSakit}</div>
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">Surat dokter</span>
          </div>

          <div className="bg-white dark:bg-slate-900/90 p-4 rounded-2xl border border-rose-200/80 dark:border-rose-800/50 bg-rose-50/20 dark:bg-rose-950/10 shadow-2xs hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800 dark:text-rose-300">Alpa</span>
              <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-rose-950 dark:text-rose-100 mt-2">{totalAlpa}</div>
            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">Tanpa keterangan</span>
          </div>
        </div>
      </div>

      {/* Top Metric Cards (Guru & Staf) */}
      <div className="bg-gradient-to-r from-sky-50/60 via-slate-50 to-indigo-50/40 dark:from-slate-900/90 dark:via-slate-900/70 dark:to-sky-950/30 p-4 rounded-2xl border border-sky-200/70 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Presensi Guru & Tenaga Kependidikan (NIP)</span>
          </h3>
          <span className="text-[11px] font-bold text-sky-700 dark:text-sky-400">
            {teacherTotalMasuk} dari {totalActiveTeachers} Guru Hadir Hari Ini ({totalActiveTeachers > 0 ? Math.round((teacherTotalMasuk / totalActiveTeachers) * 100) : 0}%)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
              <span>Total Guru</span>
              <Briefcase className="w-3.5 h-3.5 text-sky-600" />
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{totalActiveTeachers}</div>
            <span className="text-[9px] text-slate-400">Terdaftar</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-bold">
              <span>Hadir Tepat</span>
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-emerald-950 dark:text-emerald-100 mt-1">{teacherTotalHadir}</div>
            <span className="text-[9px] text-emerald-600 font-medium">Tepat Waktu</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 font-bold">
              <span>Terlambat</span>
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-xl font-black text-amber-950 dark:text-amber-100 mt-1">{teacherTotalTerlambat}</div>
            <span className="text-[9px] text-amber-600 font-medium">&gt; 07:15 WIT</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-400 font-bold">
              <span>Izin / Cuti</span>
              <FileCheck className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-xl font-black text-blue-950 dark:text-blue-100 mt-1">{teacherTotalIzin + teacherTotalCuti}</div>
            <span className="text-[9px] text-blue-600 font-medium">Izin Resmi</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-400 font-bold">
              <span>Dinas Luar</span>
              <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="text-xl font-black text-indigo-950 dark:text-indigo-100 mt-1">{teacherTotalDinas}</div>
            <span className="text-[9px] text-indigo-600 font-medium">Tugas Dinas</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-rose-700 dark:text-rose-400 font-bold">
              <span>Sakit / Alpa</span>
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <div className="text-xl font-black text-rose-950 dark:text-rose-100 mt-1">{teacherTotalSakit + teacherTotalAlpa}</div>
            <span className="text-[9px] text-rose-600 font-medium">Tidak Hadir</span>
          </div>
        </div>
      </div>

      {/* Automatic Low Attendance Notifications Banner & AI Analysis */}
      <LowAttendanceNotifications students={students} attendance={attendance} />

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* BarChart: Kehadiran Per Kelas */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900/90 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Grafik Kehadiran per Kelas Hari Ini</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Perbandingan jumlah siswa Hadir vs Terlambat vs Alpa</p>
            </div>
          </div>

          <div className="h-72 w-full">
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
                <Bar dataKey="Hadir" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Terlambat" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Alpa" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PieChart: Status Distribution */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900/90 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-1">
              <PieChartIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Distribusi Status Kehadiran</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Proporsi presensi siswa hari ini</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
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
        <div className="lg:col-span-12 bg-white dark:bg-slate-900/90 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Grafik Tren Kehadiran Bulanan</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Perkembangan jumlah siswa hadir dan terlambat dari hari ke hari</p>
            </div>
          </div>

          <div className="h-64 w-full">
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
