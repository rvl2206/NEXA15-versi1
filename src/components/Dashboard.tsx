import React, { useEffect, useState, useRef } from 'react';
import { store } from '../lib/store';
import { Student, AttendanceRecord, Teacher, TeacherAttendanceRecord } from '../types';
import { SchoolLogo } from './SchoolLogo';
import { LowAttendanceNotifications } from './LowAttendanceNotifications';
import { DailySummaryWidget } from './DailySummaryWidget';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
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

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface DashboardProps {
  onNavigateTab?: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateTab }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherAttendance, setTeacherAttendance] = useState<TeacherAttendanceRecord[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(store.getTodayYyyyMmDd());
  const [activeMetricTab, setActiveMetricTab] = useState<'siswa' | 'guru' | 'grafik' | 'peringatan'>('siswa');

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

    const intervalId = setInterval(() => {
      store.fetchFromServer().catch(() => {});
    }, 45 * 1000);

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

  const availableDates: string[] = React.useMemo(() => {
    return Array.from(
      new Set<string>(
        attendance
          .map((a) => store.normalizeToYyyyMmDd(a.tanggal) || store.normalizeToYyyyMmDd(a.timestamp))
          .filter((d): d is string => Boolean(d))
      )
    ).sort().reverse();
  }, [attendance]);

  const dateRecords = React.useMemo(() => {
    return attendance.filter((a) => store.isRecordForDate(a, selectedDate));
  }, [attendance, selectedDate]);

  const uniqueDailyRecords = React.useMemo(() => {
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
    return Array.from(studentDailyMap.values());
  }, [dateRecords]);

  const totalStudents = React.useMemo(() => students.filter((s) => s.status === 'aktif').length, [students]);
  const totalHadir = React.useMemo(() => uniqueDailyRecords.filter((a) => a.status === 'Hadir').length, [uniqueDailyRecords]);
  const totalTerlambat = React.useMemo(() => uniqueDailyRecords.filter((a) => a.status === 'Terlambat').length, [uniqueDailyRecords]);
  const totalIzin = React.useMemo(() => uniqueDailyRecords.filter((a) => a.status === 'Izin').length, [uniqueDailyRecords]);
  const totalSakit = React.useMemo(() => uniqueDailyRecords.filter((a) => a.status === 'Sakit').length, [uniqueDailyRecords]);
  const totalAlpa = React.useMemo(() => uniqueDailyRecords.filter((a) => a.status === 'Alpa').length, [uniqueDailyRecords]);
  const totalSiswaMasuk = totalHadir + totalTerlambat;

  const totalActiveTeachers = React.useMemo(() => teachers.filter((t) => t.status === 'aktif').length, [teachers]);
  
  const uniqueTeacherDailyRecords = React.useMemo(() => {
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
    return Array.from(teacherDailyMap.values());
  }, [teacherAttendance, selectedDate]);

  const teacherTotalHadir = React.useMemo(() => uniqueTeacherDailyRecords.filter((a) => a.status === 'Hadir').length, [uniqueTeacherDailyRecords]);
  const teacherTotalTerlambat = React.useMemo(() => uniqueTeacherDailyRecords.filter((a) => a.status === 'Terlambat').length, [uniqueTeacherDailyRecords]);
  const teacherTotalIzin = React.useMemo(() => uniqueTeacherDailyRecords.filter((a) => a.status === 'Izin').length, [uniqueTeacherDailyRecords]);
  const teacherTotalSakit = React.useMemo(() => uniqueTeacherDailyRecords.filter((a) => a.status === 'Sakit').length, [uniqueTeacherDailyRecords]);
  const teacherTotalCuti = React.useMemo(() => uniqueTeacherDailyRecords.filter((a) => a.status === 'Cuti').length, [uniqueTeacherDailyRecords]);
  const teacherTotalDinas = React.useMemo(() => uniqueTeacherDailyRecords.filter((a) => a.status === 'Dinas Luar').length, [uniqueTeacherDailyRecords]);
  const teacherTotalAlpa = React.useMemo(() => uniqueTeacherDailyRecords.filter((a) => a.status === 'Alpa').length, [uniqueTeacherDailyRecords]);
  const teacherTotalMasuk = teacherTotalHadir + teacherTotalTerlambat;

  const classData = React.useMemo(() => {
    const classList = Array.from(
      new Set([
        ...students.map((s) => s.kelas.trim()),
        ...attendance.map((a) => a.kelas.trim()),
      ])
    ).filter(Boolean).sort();

    return classList.map((cls) => {
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
  }, [students, attendance, uniqueDailyRecords]);

  const trendData = React.useMemo(() => {
    const uniqueNormalizedDates: string[] = Array.from(
      new Set<string>(
        attendance
          .map((a) => store.normalizeToYyyyMmDd(a.tanggal) || store.normalizeToYyyyMmDd(a.timestamp))
          .filter((d): d is string => Boolean(d))
      )
    )
      .sort()
      .slice(-10);

    return uniqueNormalizedDates.map((d) => {
      const dayRecords = attendance.filter((a) => store.isRecordForDate(a, d));
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
  }, [attendance]);

  const pieData = React.useMemo(() => {
    return [
      { name: 'Hadir', value: totalHadir || (uniqueDailyRecords.length === 0 ? 0 : 1), color: '#10b981' },
      { name: 'Terlambat', value: totalTerlambat, color: '#f59e0b' },
      { name: 'Izin', value: totalIzin, color: '#3b82f6' },
      { name: 'Sakit', value: totalSakit, color: '#8b5cf6' },
      { name: 'Alpa', value: totalAlpa, color: '#ef4444' },
    ].filter((item) => item.value > 0);
  }, [totalHadir, totalTerlambat, totalIzin, totalSakit, totalAlpa, uniqueDailyRecords.length]);

  const isTodaySelected = selectedDate === todayYyyyMmDd;
  const latestDataDate: string | null = availableDates.length > 0 ? availableDates[0] : null;

  useGSAP(() => {
    gsap.from('.gsap-dash-hero', {
      y: 40,
      opacity: 0,
      duration: 1,
      ease: 'power3.out',
      stagger: 0.1
    });

    gsap.from('.gsap-bento-item', {
      y: 30,
      opacity: 0,
      duration: 0.8,
      ease: 'back.out(1.2)',
      stagger: 0.05,
      scrollTrigger: {
        trigger: '.gsap-bento-grid',
        start: 'top 85%'
      }
    });
  }, { scope: containerRef, dependencies: [] });

  return (
    <div ref={containerRef} className="pb-24 space-y-12 bg-[#020617]">
      {/* 
        AIDA: ATTENTION (HERO)
      */}
      <div className="pt-16 pb-8 px-6 max-w-6xl mx-auto flex flex-col items-center justify-center text-center relative z-10">
        <SchoolLogo className="gsap-dash-hero w-16 h-16 mb-8 drop-shadow-2xl opacity-90" />
        <h1 className="gsap-dash-hero w-full text-white font-black text-4xl md:text-5xl lg:text-6xl leading-[1.1] tracking-tighter">
          Pusat Kendali. <span className="inline-block w-20 h-10 rounded-full align-middle bg-blue-600/30 border border-blue-500/50 mx-3 overflow-hidden relative"><div className="absolute inset-0 bg-blue-500 animate-pulse mix-blend-overlay"></div></span> Presensi Akurat.
        </h1>
        <p className="gsap-dash-hero text-slate-400 mt-6 max-w-2xl text-base font-light">
          Pemantauan langsung data kehadiran siswa dan staf pengajar untuk tanggal {formatIndoDate(selectedDate)}.
        </p>
        
        <div className="gsap-dash-hero mt-8 flex flex-wrap items-center justify-center gap-4">
          <div className="flex items-center gap-3 bg-white/5 backdrop-blur-xl px-5 py-3 rounded-full border border-white/10">
            <Calendar className="w-5 h-5 text-blue-400" />
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer appearance-none"
            >
              <option value={todayYyyyMmDd}>Hari Ini ({todayStr})</option>
              {availableDates.map((d) => {
                if (d === todayYyyyMmDd) return null;
                const [y, m, day] = d.split('-');
                return <option key={d} value={d} className="text-black">{day}-{m}-{y}</option>;
              })}
            </select>
          </div>

          <button onClick={handleManualRefresh} className="group flex items-center justify-center gap-2 px-6 py-3 bg-white text-black font-bold text-sm rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_-10px_rgba(255,255,255,0.3)]">
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'}`} />
            Sinkronisasi
          </button>
        </div>
      </div>

      {/* Info Notice Banner */}
      {isTodaySelected && uniqueDailyRecords.length === 0 && latestDataDate && (
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-5 text-amber-200">
            <div className="flex items-center gap-4">
              <Clock className="w-6 h-6 text-amber-500 shrink-0" />
              <p className="text-sm font-medium">
                Tidak ada data kehadiran untuk tanggal {todayStr}. Koneksi terakhir tercatat pada {latestDataDate.split('-').reverse().join('-')}.
              </p>
            </div>
            <button
              onClick={() => setSelectedDate(latestDataDate)}
              className="px-5 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap text-sm"
            >
              Muat Data Terakhir
            </button>
          </div>
        </div>
      )}

      {/* Floating Pill Nav */}
      <div className="sticky top-4 z-50 flex justify-center px-4">
        <div className="inline-flex bg-white/5 backdrop-blur-3xl border border-white/10 rounded-full p-1.5 shadow-2xl">
          {[
            { id: 'siswa', icon: GraduationCap, val: `${totalSiswaMasuk}/${totalStudents}` },
            { id: 'guru', icon: Briefcase, val: `${teacherTotalMasuk}/${totalActiveTeachers}` },
            { id: 'grafik', icon: BarChart2, val: 'Analitik' },
            { id: 'peringatan', icon: Clock, val: 'Anomali' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveMetricTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all duration-500 ${
                activeMetricTab === tab.id 
                  ? 'bg-white text-black shadow-lg scale-105' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.val}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Areas */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Tab 1: Siswa */}
        {activeMetricTab === 'siswa' && (
          <div className="animate-in fade-in duration-500 slide-in-from-bottom-5">
            <DailySummaryWidget
              students={students}
              attendance={attendance}
              selectedDate={selectedDate}
              onOpenScanner={onNavigateTab ? () => onNavigateTab('scan') : undefined}
            />
          </div>
        )}

        {/* Tab 2: Guru */}
        {activeMetricTab === 'guru' && (
          <div className="gsap-bento-grid animate-in fade-in duration-500 slide-in-from-bottom-5 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 grid-rows-[minmax(100px,auto)] gap-3 lg:gap-4 mt-6 md:mt-8">
            
            <div className="gsap-bento-item col-span-1 md:col-span-2 lg:col-span-3 row-span-2 border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-5 md:p-6 flex flex-col justify-between group overflow-hidden relative rounded-[1.5rem] min-h-[140px]">
              <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 blur-3xl"></div>
              <Briefcase className="w-6 h-6 text-sky-400 mb-3 opacity-50 group-hover:scale-110 transition-transform duration-700" />
              <div>
                <div className="text-4xl md:text-5xl font-black text-white leading-none tracking-tighter tabular-nums">{totalActiveTeachers}</div>
                <div className="text-sm md:text-base text-slate-400 mt-2 font-medium">Total Guru Aktif</div>
              </div>
            </div>

            <div className="gsap-bento-item col-span-1 md:col-span-2 lg:col-span-3 row-span-1 border border-white/10 bg-emerald-500/5 p-4 md:p-5 flex items-center justify-between group rounded-[1.5rem]">
              <div>
                <div className="text-3xl md:text-4xl font-black text-emerald-400 tabular-nums group-hover:scale-105 transition-transform origin-left">{teacherTotalHadir}</div>
                <div className="text-xs md:text-sm text-emerald-600 mt-1 font-bold uppercase tracking-widest">Hadir Tepat</div>
              </div>
              <UserCheck className="w-10 h-10 md:w-12 md:h-12 text-emerald-500/20" />
            </div>

            <div className="gsap-bento-item col-span-1 md:col-span-1 lg:col-span-1 row-span-1 border border-white/10 bg-amber-500/5 p-4 md:p-5 flex flex-col justify-center group rounded-[1.5rem]">
              <div className="text-2xl md:text-3xl font-black text-amber-400 tabular-nums">{teacherTotalTerlambat}</div>
              <div className="text-[10px] md:text-xs text-amber-600 mt-1 font-bold uppercase tracking-widest">Terlambat</div>
            </div>

            <div className="gsap-bento-item col-span-1 md:col-span-1 lg:col-span-1 row-span-1 border border-white/10 bg-blue-500/5 p-4 md:p-5 flex flex-col justify-center group rounded-[1.5rem]">
              <div className="text-2xl md:text-3xl font-black text-blue-400 tabular-nums">{teacherTotalIzin + teacherTotalCuti}</div>
              <div className="text-[10px] md:text-xs text-blue-600 mt-1 font-bold uppercase tracking-widest">Izin/Cuti</div>
            </div>

            <div className="gsap-bento-item col-span-1 md:col-span-2 lg:col-span-1 row-span-1 border border-white/10 bg-rose-500/5 p-4 md:p-5 flex flex-col justify-center group rounded-[1.5rem]">
              <div className="text-2xl md:text-3xl font-black text-rose-400 tabular-nums">{teacherTotalSakit + teacherTotalAlpa}</div>
              <div className="text-[10px] md:text-xs text-rose-600 mt-1 font-bold uppercase tracking-widest">Sakit/Alpa</div>
            </div>

            <div className="gsap-bento-item col-span-1 md:col-span-4 lg:col-span-6 border border-white/10 bg-black/20 p-4 md:p-6 rounded-[1.5rem]">
              {uniqueTeacherDailyRecords.length === 0 ? (
                <div className="text-center py-12 text-slate-600 font-medium text-base">
                  Tidak ada data kehadiran guru untuk hari ini.
                </div>
              ) : (
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-500 font-bold uppercase tracking-widest text-xs">
                        <th className="py-3 px-4 font-medium">Nama Guru</th>
                        <th className="py-3 px-4 font-medium">NIP</th>
                        <th className="py-3 px-4 font-medium">Jabatan</th>
                        <th className="py-3 px-4 font-medium text-center">Status</th>
                        <th className="py-3 px-4 font-medium text-right">Waktu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {uniqueTeacherDailyRecords.map((r, idx) => {
                        const tInfo = teachers.find(t => t.nip === r.nip);
                        return (
                          <tr key={`${r.nip}-${idx}`} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="py-4 px-4 font-bold text-white group-hover:pl-5 transition-all duration-300">
                              {r.nama}
                            </td>
                            <td className="py-4 px-4 font-mono text-slate-400 text-xs">{r.nip}</td>
                            <td className="py-4 px-4 text-slate-300 text-xs">{tInfo?.jabatan || '-'}</td>
                            <td className="py-4 px-4 text-center">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                r.status === 'Hadir' ? 'bg-emerald-500/20 text-emerald-400' :
                                r.status === 'Terlambat' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-blue-500/20 text-blue-400'
                              }`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right font-mono text-slate-400 text-xs">
                              {r.timestamp ? new Date(r.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Grafik */}
        {activeMetricTab === 'grafik' && (
          <div className="gsap-bento-grid grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            <div className="gsap-bento-item lg:col-span-2 border border-white/10 p-6 md:p-8 min-h-[400px] rounded-[2rem] bg-white/[0.02]">
              <h3 className="text-xl md:text-2xl font-black text-white mb-6">Distribusi Kehadiran Kelas</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis dataKey="kelas" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '1rem', color: '#fff', fontSize: '12px' }} />
                  <Bar dataKey="Hadir" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Terlambat" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="gsap-bento-item lg:col-span-1 border border-white/10 p-6 md:p-8 flex flex-col justify-center items-center bg-black/20 min-h-[300px] rounded-[2rem]">
               <h3 className="text-lg md:text-xl font-bold text-white mb-6 text-center">Proporsi Hari Ini</h3>
               <div className="w-full h-56">
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                       {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                     </Pie>
                     <Tooltip contentStyle={{ backgroundColor: '#020617', borderRadius: '1rem', color: '#fff', border: 'none', fontSize: '12px' }} />
                   </PieChart>
                 </ResponsiveContainer>
               </div>
            </div>
            
            <div className="gsap-bento-item lg:col-span-3 border border-white/10 p-6 md:p-8 min-h-[350px] rounded-[2rem] bg-white/[0.02]">
              <h3 className="text-xl md:text-2xl font-black text-white mb-6">Tren Kehadiran (10 Hari Terakhir)</h3>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHadirDark" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis dataKey="tanggal" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#020617', borderRadius: '1rem', border: 'none', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="Hadir" stroke="#38bdf8" strokeWidth={3} fillOpacity={1} fill="url(#colorHadirDark)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab 4: Peringatan */}
        {activeMetricTab === 'peringatan' && (
          <div className="animate-in fade-in duration-500">
            <div className="p-8 md:p-10 border border-rose-500/20 bg-rose-500/5 rounded-[2rem] md:rounded-[3rem] backdrop-blur-md">
              <LowAttendanceNotifications students={students} attendance={attendance} />
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
};

export default Dashboard;
