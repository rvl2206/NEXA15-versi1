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
  QrCode,
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
  const [drilldownFilter, setDrilldownFilter] = useState<'hadir' | 'terlambat' | 'alpa' | 'belum_absen' | 'izin_sakit' | null>(null);

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
          .filter((d): d is string => Boolean(d) && d <= todayYyyyMmDd)
      )
    ).sort().reverse();
  }, [attendance, todayYyyyMmDd]);

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

  // Filter rombel/kelas hanya dari rombel yang benar-benar aktif memiliki siswa di database
  const classData = React.useMemo(() => {
    const activeClassList = Array.from(
      new Set(
        students
          .filter((s) => s.status === 'aktif' && s.kelas && s.kelas.trim())
          .map((s) => s.kelas.trim())
      )
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    return activeClassList.map((cls) => {
      const clsStudents = students.filter(
        (s) => s.kelas && s.kelas.trim().toLowerCase() === cls.toLowerCase() && s.status === 'aktif'
      );
      const clsRecords = uniqueDailyRecords.filter(
        (a) => a.kelas && a.kelas.trim().toLowerCase() === cls.toLowerCase()
      );
      const hadir = clsRecords.filter((a) => a.status === 'Hadir').length;
      const terlambat = clsRecords.filter((a) => a.status === 'Terlambat').length;
      const izin = clsRecords.filter((a) => a.status === 'Izin').length;
      const sakit = clsRecords.filter((a) => a.status === 'Sakit').length;
      const alpa = clsRecords.filter((a) => a.status === 'Alpa').length;
      const totalMasuk = hadir + terlambat;
      const totalSiswa = clsStudents.length;
      const belumAbsen = Math.max(0, totalSiswa - clsRecords.length);
      const rate = totalSiswa > 0 ? (totalMasuk / totalSiswa) * 100 : 0;

      return {
        kelas: cls,
        TotalSiswa: totalSiswa,
        Hadir: hadir,
        Terlambat: terlambat,
        Izin: izin,
        Sakit: sakit,
        Alpa: alpa,
        TotalMasuk: totalMasuk,
        BelumAbsen: belumAbsen,
        rate,
      };
    });
  }, [students, uniqueDailyRecords]);

  const classTrackerData = React.useMemo(() => {
    return classData.map((c) => {
      let color: 'emerald' | 'amber' | 'rose' | 'slate' = 'emerald';
      if (c.rate < 60) color = 'rose';
      else if (c.rate < 85) color = 'amber';
      return {
        key: c.kelas,
        color,
        tooltip: `Kelas ${c.kelas}: ${c.rate.toFixed(0)}% (${c.TotalMasuk}/${c.TotalSiswa} Siswa Masuk • ${c.Hadir} Tepat, ${c.Terlambat} Telat, ${c.Alpa} Alpa)`,
      };
    });
  }, [classData]);

  const trendData = React.useMemo(() => {
    const validDates = Array.from(
      new Set<string>(
        attendance
          .map((a) => store.normalizeToYyyyMmDd(a.tanggal) || store.normalizeToYyyyMmDd(a.timestamp))
          .filter((d): d is string => Boolean(d) && d <= todayYyyyMmDd)
      )
    )
      .sort()
      .slice(-10);

    return validDates.map((d) => {
      const dayRecords = attendance.filter((a) => store.isRecordForDate(a, d));
      const dayStudentMap = new Map<string, AttendanceRecord>();
      dayRecords.forEach((r) => {
        if (!dayStudentMap.has(r.nisn) || (dayStudentMap.get(r.nisn)?.jenis === 'Pulang' && r.jenis !== 'Pulang')) {
          dayStudentMap.set(r.nisn, r);
        }
      });
      const uniqueDayRecords = Array.from(dayStudentMap.values());
      const parts = d.split('-');
      const labelDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;

      const hadir = uniqueDayRecords.filter((a) => a.status === 'Hadir').length;
      const terlambat = uniqueDayRecords.filter((a) => a.status === 'Terlambat').length;
      const alpa = uniqueDayRecords.filter((a) => a.status === 'Alpa').length;

      return {
        tanggal: labelDate,
        fullDate: d,
        Hadir: hadir,
        Terlambat: terlambat,
        Alpa: alpa,
        TotalMasuk: hadir + terlambat,
      };
    });
  }, [attendance, todayYyyyMmDd]);

  const pieData = React.useMemo(() => {
    return [
      { name: 'Hadir Tepat', value: totalHadir, color: '#10b981' },
      { name: 'Terlambat', value: totalTerlambat, color: '#f59e0b' },
      { name: 'Izin', value: totalIzin, color: '#3b82f6' },
      { name: 'Sakit', value: totalSakit, color: '#8b5cf6' },
      { name: 'Alpa', value: totalAlpa, color: '#ef4444' },
      { name: 'Belum Scan', value: belumScanCount, color: '#475569' },
    ].filter((item) => item.value > 0);
  }, [totalHadir, totalTerlambat, totalIzin, totalSakit, totalAlpa, belumScanCount]);

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
    <div ref={containerRef} className="pb-24 space-y-8 bg-[#020617]">
      {/* Executive Header Bar */}
      <div className="pt-8 pb-2 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-500/30 shadow-lg">
              <SchoolLogo className="w-10 h-10 object-contain drop-shadow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Pusat Kendali Presensi
                </h1>
                <Badge variant="outline" className="hidden sm:inline-flex bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] py-0.5">
                  LIVE
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Pemantauan real-time kedatangan siswa • <span className="text-blue-400 font-semibold">{formatIndoDate(selectedDate)}</span>
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Date Selector */}
            <div className="flex items-center gap-2 bg-slate-900/90 hover:bg-slate-800/80 transition-colors px-3.5 py-2 rounded-xl border border-slate-700/80 text-white shadow-sm">
              <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs sm:text-sm font-semibold text-white focus:outline-none cursor-pointer appearance-none pr-2"
                aria-label="Pilih Tanggal Presensi"
              >
                <option value={todayYyyyMmDd} className="bg-slate-900 text-white">Hari Ini ({todayStr})</option>
                {availableDates.map((d) => {
                  if (d === todayYyyyMmDd) return null;
                  const [y, m, day] = d.split('-');
                  return <option key={d} value={d} className="bg-slate-900 text-white">{day}-{m}-{y}</option>;
                })}
              </select>
            </div>

            {/* Sync Button */}
            <Button
              onClick={handleManualRefresh}
              variant="outline"
              size="sm"
              className="rounded-xl border-slate-700 bg-slate-900/90 text-slate-200 hover:text-white hover:bg-slate-800 font-semibold cursor-pointer shadow-sm text-xs sm:text-sm h-9 px-3.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
              <span>{isRefreshing ? 'Sinkron...' : 'Sinkron'}</span>
            </Button>

            {/* Buka Pemindai Button */}
            {onNavigateTab && (
              <Button
                onClick={() => onNavigateTab('scan')}
                size="sm"
                className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer shadow-lg shadow-blue-600/20 text-xs sm:text-sm h-9 px-4"
              >
                <QrCode className="w-4 h-4 mr-1.5" />
                <span>Buka Pemindai</span>
              </Button>
            )}
          </div>
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

      {/* Tremor-Style Executive KPI Summary Grid (Single Source of Truth) */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <KpiCard
            title="Tingkat Hadir"
            value={`${attendanceRate.toFixed(1)}%`}
            subtitle={`${totalSiswaMasuk}/${totalStudents} siswa masuk`}
            icon={TrendingUp}
            accentColor="emerald"
            progress={{
              value: attendanceRate,
              targetLabel: 'Target Disiplin: ≥95%',
            }}
            onClick={() => setActiveMetricTab('siswa')}
          />

          <KpiCard
            title="Hadir Tepat"
            value={totalHadir}
            subtitle={`${onTimeRate.toFixed(0)}% disiplin`}
            icon={UserCheck}
            accentColor="cyan"
            delta={{
              value: `${onTimeRate.toFixed(0)}%`,
              type: onTimeRate >= 80 ? 'increase' : 'neutral',
              label: 'Disiplin',
            }}
            onClick={() => {
              setActiveMetricTab('siswa');
              setDrilldownFilter('hadir');
            }}
          />

          <KpiCard
            title="Terlambat"
            value={totalTerlambat}
            subtitle={totalTerlambat > 0 ? 'Perlu pembinaan' : 'Tertib nihil'}
            icon={Clock}
            accentColor="amber"
            delta={{
              value: `${totalTerlambat} siswa`,
              type: totalTerlambat > 0 ? 'decrease' : 'neutral',
            }}
            onClick={() => {
              setActiveMetricTab('siswa');
              setDrilldownFilter('terlambat');
            }}
          />

          <KpiCard
            title="Izin & Sakit"
            value={totalIzin + totalSakit}
            subtitle={`${totalIzin} Izin • ${totalSakit} Sakit`}
            icon={FileCheck}
            accentColor="blue"
            delta={{
              value: `${totalIzin + totalSakit} surat`,
              type: 'neutral',
            }}
            onClick={() => {
              setActiveMetricTab('siswa');
              setDrilldownFilter('izin_sakit');
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
            onClick={() => {
              setActiveMetricTab('siswa');
              setDrilldownFilter('belum_absen');
            }}
          />
        </div>
      </div>

      {/* Floating Pill Nav */}
      <div className="sticky top-4 z-40 flex justify-center px-4">
        <div className="inline-flex bg-slate-900/90 backdrop-blur-2xl border border-slate-700/80 rounded-full p-1.5 shadow-2xl">
          {[
            { id: 'siswa', icon: Users, val: 'Ringkasan & Presensi' },
            { id: 'grafik', icon: BarChart2, val: 'Grafik & Analitik' },
            { id: 'peringatan', icon: AlertCircle, val: 'Anomali Kehadiran' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveMetricTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer ${
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
        
        {/* Tab 1: Ringkasan & Presensi */}
        {activeMetricTab === 'siswa' && (
          <div className="space-y-6 animate-in fade-in duration-500 slide-in-from-bottom-5">
            {/* Tremor Class Health Tracker */}
            {classTrackerData.length > 0 && (
              <Card variant="tremor" className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      Status Tingkat Kehadiran Antar Kelas
                    </h4>
                    <p className="text-xs text-slate-400">Tingkat kehadiran siswa per rombel aktif pada {formatIndoDate(selectedDate)}</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> ≥85% (Baik)</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> 60-84% (Sedang)</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> &lt;60% (Rendah)</span>
                  </div>
                </div>

                <Tracker data={classTrackerData} />

                {/* Visible Class Badges Grid for Instant Mobile/Touchscreen Clarity */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-slate-800/60">
                  {classData.map((c) => (
                    <div
                      key={c.kelas}
                      onClick={() => {
                        setDrilldownFilter('hadir');
                      }}
                      className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 hover:border-slate-700 transition-all cursor-pointer group flex flex-col justify-between"
                      title={`Klik untuk melihat data siswa kelas ${c.kelas}`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                          Kelas {c.kelas}
                        </span>
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                            c.rate >= 85
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : c.rate >= 60
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {c.rate.toFixed(0)}%
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {c.TotalMasuk} / {c.TotalSiswa} Siswa Masuk
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            c.rate >= 85
                              ? 'bg-emerald-500'
                              : c.rate >= 60
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, c.rate)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <DailySummaryWidget
              students={students}
              attendance={attendance}
              selectedDate={selectedDate}
              onOpenScanner={onNavigateTab ? () => onNavigateTab('scan') : undefined}
              externalModalFilter={drilldownFilter}
              onCloseExternalModal={() => setDrilldownFilter(null)}
            />
          </div>
        )}

        {/* Tab 2: Grafik & Analitik */}
        {activeMetricTab === 'grafik' && (
          <div className="space-y-6 animate-in fade-in duration-500 slide-in-from-bottom-5">
            <div className="gsap-bento-grid grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              <Card variant="tremor" className="gsap-bento-item lg:col-span-2 min-h-[420px]">
                <CardHeader>
                  <CardTitle className="text-white text-xl">Distribusi Kehadiran Kelas</CardTitle>
                  <CardDescription>Perbandingan jumlah siswa Hadir Tepat, Terlambat, dan Alpa per rombel aktif ({formatIndoDate(selectedDate)})</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={classData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                      <XAxis dataKey="kelas" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                        contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '1rem', color: '#fff', fontSize: '12px' }}
                      />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 600 }}
                      />
                      <Bar name="Hadir Tepat" dataKey="Hadir" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar name="Terlambat" dataKey="Terlambat" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <Bar name="Alpa" dataKey="Alpa" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card variant="tremor" className="gsap-bento-item lg:col-span-1 min-h-[420px] flex flex-col justify-between">
                <CardHeader>
                  <CardTitle className="text-white text-xl">Proporsi Kehadiran</CardTitle>
                  <CardDescription>Status kehadiran siswa tanggal {formatIndoDate(selectedDate)}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-between">
                  <div className="w-full h-56 relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="#020617"
                          strokeWidth={2}
                        >
                          {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '1rem', color: '#fff', fontSize: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Donut Center Info */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xl sm:text-2xl font-black text-white">{totalSiswaMasuk}</span>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Masuk ({attendanceRate.toFixed(0)}%)</span>
                    </div>
                  </div>

                  {/* Legend / Status Badges */}
                  <div className="w-full grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-800/80">
                    {pieData.map((p) => {
                      const pct = totalStudents > 0 ? ((p.value / totalStudents) * 100).toFixed(0) : '0';
                      return (
                        <div key={p.name} className="flex items-center justify-between text-xs bg-slate-950/40 px-2 py-1.5 rounded-lg border border-slate-800/40">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                            <span className="text-slate-300 truncate text-[11px]">{p.name}</span>
                          </div>
                          <span className="font-mono font-bold text-white text-[11px] shrink-0 ml-1">
                            {p.value} ({pct}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card variant="tremor" className="gsap-bento-item lg:col-span-3 min-h-[380px]">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-white text-xl">Tren Kehadiran (10 Hari Terakhir)</CardTitle>
                      <CardDescription>Grafik fluktuasi kedatangan siswa harian (Hadir Tepat, Terlambat, dan Total Masuk)</CardDescription>
                    </div>
                    <span className="text-xs text-slate-400 font-semibold bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700/50 w-fit">
                      10 Periode Aktif
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorHadir" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorTerlambat" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                      <XAxis dataKey="tanggal" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '1rem', color: '#fff', fontSize: '12px' }}
                      />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 600 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="TotalMasuk"
                        name="Total Masuk"
                        stroke="#38bdf8"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorTotal)"
                      />
                      <Area
                        type="monotone"
                        dataKey="Hadir"
                        name="Hadir Tepat"
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorHadir)"
                      />
                      <Area
                        type="monotone"
                        dataKey="Terlambat"
                        name="Terlambat"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorTerlambat)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Tab 3: Peringatan */}
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
