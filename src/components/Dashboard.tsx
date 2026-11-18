import React, { useEffect, useState, useRef } from 'react';
import { store } from '../lib/store';
import { Student, AttendanceRecord } from '../types';
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
  GraduationCap,
  Sparkles,
  AlertCircle,
  Zap,
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
import {
  KpiCard,
  Callout,
  Tracker,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
} from './ui';

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface DashboardProps {
  onNavigateTab?: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateTab }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(store.getTodayYyyyMmDd());
  const [activeMetricTab, setActiveMetricTab] = useState<'siswa' | 'grafik' | 'peringatan'>('siswa');

  const syncData = async () => {
    setIsRefreshing(true);
    try {
      await store.fetchFromServer();
    } catch (err) {
      console.error('Auto sync error:', err);
    } finally {
      setStudents(store.getStudents());
      setAttendance(store.getAttendance());
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
    setLastUpdated(new Date());

    const unsubscribe = store.subscribe(() => {
      setStudents(store.getStudents());
      setAttendance(store.getAttendance());
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
  const attendanceRate = totalStudents > 0 ? (totalSiswaMasuk / totalStudents) * 100 : 0;
  const onTimeRate = totalSiswaMasuk > 0 ? (totalHadir / totalSiswaMasuk) * 100 : 0;
  const belumScanCount = Math.max(0, totalStudents - uniqueDailyRecords.length);

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

  const classTrackerData = React.useMemo(() => {
    return classData.map((c) => {
      const rate = c.TotalSiswa > 0 ? ((c.Hadir + c.Terlambat) / c.TotalSiswa) * 100 : 0;
      let color: 'emerald' | 'amber' | 'rose' | 'slate' = 'emerald';
      if (rate < 60) color = 'rose';
      else if (rate < 85) color = 'amber';
      return {
        key: c.kelas,
        color,
        tooltip: `${c.kelas}: ${rate.toFixed(0)}% (${c.Hadir + c.Terlambat}/${c.TotalSiswa} Siswa Masuk)`,
      };
    });
  }, [classData]);

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

          <Button
            onClick={handleManualRefresh}
            variant="secondary"
            size="lg"
            className="group rounded-full bg-white text-slate-950 font-extrabold hover:bg-slate-100 shadow-[0_0_30px_-10px_rgba(255,255,255,0.4)] cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'}`} />
            <span>Sinkronisasi Data</span>
          </Button>
        </div>
      </div>

      {/* Info Notice Banner via Tremor Callout */}
      {isTodaySelected && uniqueDailyRecords.length === 0 && latestDataDate && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Callout
            variant="warning"
            title={`Tidak ada data kehadiran baru untuk hari ini (${todayStr})`}
            action={{
              label: 'Muat Data Terakhir',
              onClick: () => setSelectedDate(latestDataDate),
            }}
          >
            Data kehadiran terakhir tercatat pada tanggal {latestDataDate.split('-').reverse().join('-')}. Anda dapat mengklik tombol untuk meninjau data historis tersebut.
          </Callout>
        </div>
      )}

      {/* Tremor-Style Executive KPI Summary Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Tingkat Kehadiran"
            value={`${attendanceRate.toFixed(1)}%`}
            subtitle={`${totalSiswaMasuk} dari ${totalStudents} siswa masuk`}
            icon={TrendingUp}
            accentColor="emerald"
            progress={{
              value: attendanceRate,
              targetLabel: 'Target Disiplin Sekolah: ≥95%',
            }}
          />

          <KpiCard
            title="Hadir Tepat Waktu"
            value={totalHadir}
            subtitle={`${onTimeRate.toFixed(0)}% dari siswa hadir`}
            icon={UserCheck}
            accentColor="cyan"
            delta={{
              value: `${onTimeRate.toFixed(0)}%`,
              type: onTimeRate >= 80 ? 'increase' : 'neutral',
              label: 'Disiplin',
            }}
          />

          <KpiCard
            title="Siswa Terlambat"
            value={totalTerlambat}
            subtitle={totalTerlambat > 0 ? 'Perlu pembinaan piket gerbang' : 'Tertib tanpa keterlambatan'}
            icon={Clock}
            accentColor="amber"
            delta={{
              value: `${totalTerlambat} siswa`,
              type: totalTerlambat > 0 ? 'decrease' : 'neutral',
            }}
          />

          <KpiCard
            title="Belum Absen / Alpa"
            value={belumScanCount}
            subtitle={totalAlpa > 0 ? `${totalAlpa} terkonfirmasi Alpa` : `${belumScanCount} belum scan gerbang`}
            icon={XCircle}
            accentColor="rose"
            delta={{
              value: belumScanCount > 0 ? 'Perlu Follow-up' : 'Lengkap',
              type: belumScanCount > 0 ? 'decrease' : 'increase',
            }}
          />
        </div>
      </div>

      {/* Floating Pill Nav */}
      <div className="sticky top-4 z-40 flex justify-center px-4">
        <div className="inline-flex bg-slate-900/90 backdrop-blur-2xl border border-slate-700/80 rounded-full p-1.5 shadow-2xl">
          {[
            { id: 'siswa', icon: GraduationCap, val: `${totalSiswaMasuk}/${totalStudents} Siswa` },
            { id: 'grafik', icon: BarChart2, val: 'Analitik & Tren' },
            { id: 'peringatan', icon: Clock, val: 'Anomali Kehadiran' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveMetricTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer ${
                activeMetricTab === tab.id 
                  ? 'bg-white text-slate-950 shadow-lg scale-105 font-black' 
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

        {/* Tab 2: Grafik */}
        {activeMetricTab === 'grafik' && (
          <div className="space-y-6 animate-in fade-in duration-500 slide-in-from-bottom-5">
            {/* Tremor Class Health Tracker */}
            {classTrackerData.length > 0 && (
              <Card variant="tremor" className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white">Status Tingkat Kehadiran Antar Kelas</h4>
                    <p className="text-xs text-slate-400">Arahkan kursor pada balok kelas untuk melihat detail statistik</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> ≥85% (Baik)</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> 60-84% (Sedang)</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> &lt;60% (Rendah)</span>
                  </div>
                </div>
                <Tracker data={classTrackerData} />
              </Card>
            )}

            <div className="gsap-bento-grid grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              <Card variant="tremor" className="gsap-bento-item lg:col-span-2 min-h-[420px]">
                <CardHeader>
                  <CardTitle className="text-white text-xl">Distribusi Kehadiran Kelas</CardTitle>
                  <CardDescription>Perbandingan jumlah siswa Hadir dan Terlambat per rombel</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
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
                </CardContent>
              </Card>

              <Card variant="tremor" className="gsap-bento-item lg:col-span-1 min-h-[420px] flex flex-col justify-between">
                <CardHeader>
                  <CardTitle className="text-white text-xl">Proporsi Kehadiran</CardTitle>
                  <CardDescription>Status kehadiran siswa tanggal {formatIndoDate(selectedDate)}</CardDescription>
                </CardHeader>
                <CardContent className="h-72 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#020617', borderRadius: '1rem', color: '#fff', border: 'none', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card variant="tremor" className="gsap-bento-item lg:col-span-3 min-h-[380px]">
                <CardHeader>
                  <CardTitle className="text-white text-xl">Tren Kehadiran (10 Hari Terakhir)</CardTitle>
                  <CardDescription>Grafik fluktuasi kedatangan siswa harian</CardDescription>
                </CardHeader>
                <CardContent className="h-72">
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
                </CardContent>
              </Card>
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
