import React, { useState, useEffect, useMemo, useRef } from 'react';
import { store } from '../lib/store';
import { Student, AttendanceRecord } from '../types';
import {
  UserCheck,
  Clock,
  XCircle,
  AlertTriangle,
  FileCheck,
  Stethoscope,
  TrendingUp,
  CheckCircle2,
  Users,
  Sparkles,
  QrCode,
  ArrowRight,
  Filter,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Flame,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

interface DailySummaryWidgetProps {
  students: Student[];
  attendance: AttendanceRecord[];
  selectedDate: string;
  onOpenScanner?: () => void;
  onSelectClassFilter?: (className: string) => void;
}

export const DailySummaryWidget: React.FC<DailySummaryWidgetProps> = ({
  students,
  attendance,
  selectedDate,
  onOpenScanner,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'hadir' | 'terlambat' | 'alpa' | 'belum_absen' | 'izin_sakit'>('all');
  const [showStudentListModal, setShowStudentListModal] = useState<boolean>(false);
  const [modalFilter, setModalFilter] = useState<'hadir' | 'terlambat' | 'alpa' | 'belum_absen' | 'izin_sakit'>('belum_absen');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLivePulsing, setIsLivePulsing] = useState<boolean>(false);
  const [lastScanRecord, setLastScanRecord] = useState<AttendanceRecord | null>(null);

  const todayYyyyMmDd = store.getTodayYyyyMmDd();
  const isToday = selectedDate === todayYyyyMmDd;

  const dateRecords = useMemo(() => {
    return attendance.filter((a) => store.isRecordForDate(a, selectedDate));
  }, [attendance, selectedDate]);

  const studentDailyMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    dateRecords.forEach((r) => {
      const existing = map.get(r.nisn);
      if (!existing) {
        map.set(r.nisn, r);
      } else {
        if (existing.jenis === 'Pulang' && r.jenis !== 'Pulang') {
          map.set(r.nisn, r);
        }
      }
    });
    return map;
  }, [dateRecords]);

  const uniqueDailyRecords = useMemo(() => {
    return Array.from(studentDailyMap.values());
  }, [studentDailyMap]);

  const activeStudents = useMemo(() => {
    return students.filter((s) => s.status === 'aktif');
  }, [students]);

  const totalActive = activeStudents.length;

  const hadirRecords = useMemo(() => uniqueDailyRecords.filter((a) => a.status === 'Hadir'), [uniqueDailyRecords]);
  const terlambatRecords = useMemo(() => uniqueDailyRecords.filter((a) => a.status === 'Terlambat'), [uniqueDailyRecords]);
  const izinRecords = useMemo(() => uniqueDailyRecords.filter((a) => a.status === 'Izin'), [uniqueDailyRecords]);
  const sakitRecords = useMemo(() => uniqueDailyRecords.filter((a) => a.status === 'Sakit'), [uniqueDailyRecords]);
  const alpaRecords = useMemo(() => uniqueDailyRecords.filter((a) => a.status === 'Alpa'), [uniqueDailyRecords]);

  const hadirCount = hadirRecords.length;
  const terlambatCount = terlambatRecords.length;
  const izinCount = izinRecords.length;
  const sakitCount = sakitRecords.length;
  const alpaCount = alpaRecords.length;
  const totalMasuk = hadirCount + terlambatCount;

  const scannedNisns = useMemo(() => {
    return new Set(uniqueDailyRecords.map((r) => r.nisn));
  }, [uniqueDailyRecords]);

  const belumAbsenStudents = useMemo(() => {
    return activeStudents.filter((s) => !scannedNisns.has(s.nisn));
  }, [activeStudents, scannedNisns]);

  const belumAbsenCount = belumAbsenStudents.length;

  const attendanceRate = totalActive > 0 ? Math.round((totalMasuk / totalActive) * 100) : 0;
  const onTimeRate = totalMasuk > 0 ? Math.round((hadirCount / totalMasuk) * 100) : 0;

  const recentScans = useMemo(() => {
    return [...dateRecords]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [dateRecords]);

  useEffect(() => {
    if (recentScans.length > 0) {
      setLastScanRecord(recentScans[0]);
    }
  }, [recentScans]);

  const classBreakdown = useMemo(() => {
    const classes: string[] = Array.from(
      new Set<string>(activeStudents.map((s) => (s.kelas ? s.kelas.trim() : '')))
    ).filter((c): c is string => Boolean(c)).sort();

    return classes.map((cls: string) => {
      const clsStudents = activeStudents.filter(
        (s) => s.kelas && s.kelas.trim().toLowerCase() === cls.toLowerCase()
      );
      const clsTotal = clsStudents.length;
      const clsDailyRecords = uniqueDailyRecords.filter(
        (r) => r.kelas && r.kelas.trim().toLowerCase() === cls.toLowerCase()
      );
      const clsHadir = clsDailyRecords.filter((r) => r.status === 'Hadir').length;
      const clsLate = clsDailyRecords.filter((r) => r.status === 'Terlambat').length;
      const clsMasuk = clsHadir + clsLate;
      const clsRate = clsTotal > 0 ? Math.round((clsMasuk / clsTotal) * 100) : 0;
      return {
        kelas: cls,
        total: clsTotal,
        hadir: clsHadir,
        terlambat: clsLate,
        masuk: clsMasuk,
        belumAbsen: Math.max(0, clsTotal - clsDailyRecords.length),
        rate: clsRate,
      };
    });
  }, [activeStudents, uniqueDailyRecords]);

  const modalStudentList = useMemo(() => {
    let list: Array<{ student: Student; record?: AttendanceRecord; statusLabel: string; time?: string }> = [];

    if (modalFilter === 'hadir') {
      list = hadirRecords.map((r) => {
        const s = activeStudents.find((st) => st.nisn === r.nisn) || {
          id: r.nisn, nisn: r.nisn, nama: r.nama, kelas: r.kelas, id_qr: r.id_qr, foto: '', status: 'aktif',
        };
        return { student: s, record: r, statusLabel: 'Hadir Tepat Waktu', time: r.timestamp };
      });
    } else if (modalFilter === 'terlambat') {
      list = terlambatRecords.map((r) => {
        const s = activeStudents.find((st) => st.nisn === r.nisn) || {
          id: r.nisn, nisn: r.nisn, nama: r.nama, kelas: r.kelas, id_qr: r.id_qr, foto: '', status: 'aktif',
        };
        return { student: s, record: r, statusLabel: `Terlambat (+${r.terlambatMenit || 0} mnt)`, time: r.timestamp };
      });
    } else if (modalFilter === 'alpa') {
      list = alpaRecords.map((r) => {
        const s = activeStudents.find((st) => st.nisn === r.nisn) || {
          id: r.nisn, nisn: r.nisn, nama: r.nama, kelas: r.kelas, id_qr: r.id_qr, foto: '', status: 'aktif',
        };
        return { student: s, record: r, statusLabel: 'Alpa (Tanpa Keterangan)', time: r.timestamp };
      });
    } else if (modalFilter === 'izin_sakit') {
      const combined = [...izinRecords, ...sakitRecords];
      list = combined.map((r) => {
        const s = activeStudents.find((st) => st.nisn === r.nisn) || {
          id: r.nisn, nisn: r.nisn, nama: r.nama, kelas: r.kelas, id_qr: r.id_qr, foto: '', status: 'aktif',
        };
        return { student: s, record: r, statusLabel: r.status, time: r.timestamp };
      });
    } else if (modalFilter === 'belum_absen') {
      list = belumAbsenStudents.map((s) => ({
        student: s, statusLabel: 'Belum Scan Masuk',
      }));
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (item) =>
        item.student.nama.toLowerCase().includes(q) ||
        item.student.nisn.includes(q) ||
        item.student.kelas.toLowerCase().includes(q)
    );
  }, [modalFilter, hadirRecords, terlambatRecords, alpaRecords, izinRecords, sakitRecords, belumAbsenStudents, activeStudents, searchQuery]);

  const openModalWithFilter = (filter: 'hadir' | 'terlambat' | 'alpa' | 'belum_absen' | 'izin_sakit') => {
    setModalFilter(filter);
    setSearchQuery('');
    setShowStudentListModal(true);
  };

  useGSAP(() => {
    gsap.from('.gsap-summary-item', {
      y: 30,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: 'back.out(1.2)'
    });
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="w-full">
      {/* Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <TrendingUp className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-white">Pemantauan Presensi</h2>
            <p className="text-slate-400 font-medium text-sm md:text-base">{totalMasuk} / {totalActive} Siswa Terdata</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          {isToday && (
            <div className="px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Real-time Aktif
            </div>
          )}
          {onOpenScanner && (
            <button onClick={onOpenScanner} className="px-5 py-2.5 bg-white text-black font-bold text-sm rounded-full flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer">
              <QrCode className="w-4 h-4" /> Buka Pemindai
            </button>
          )}
        </div>
      </div>

      {/* Gapless Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-3 lg:gap-4">
        
        {/* Massive Card 1 - On Time */}
        <div 
          onClick={() => openModalWithFilter('hadir')}
          className="gsap-summary-item col-span-1 md:col-span-2 lg:col-span-3 row-span-2 border border-white/10 bg-gradient-to-br from-emerald-500/10 to-transparent p-5 md:p-6 flex flex-col justify-between group cursor-pointer relative overflow-hidden min-h-[140px] rounded-[1.5rem]"
        >
          <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl"></div>
          <UserCheck className="w-6 h-6 text-emerald-400 mb-3 opacity-50 group-hover:scale-110 transition-transform duration-700" />
          <div>
            <div className="text-4xl md:text-5xl font-black text-white leading-none tracking-tighter tabular-nums">{hadirCount}</div>
            <div className="flex items-center justify-between mt-3">
              <div className="text-xs md:text-sm text-emerald-400 font-bold uppercase tracking-widest">Hadir Tepat</div>
              <div className="text-sm md:text-base font-light text-slate-500">{onTimeRate}% Tepat Waktu</div>
            </div>
          </div>
        </div>

        {/* Metric Cell 2 - Late */}
        <div 
          onClick={() => openModalWithFilter('terlambat')}
          className="gsap-summary-item col-span-1 md:col-span-2 lg:col-span-3 row-span-1 border border-white/10 bg-amber-500/5 p-4 md:p-5 flex items-center justify-between group cursor-pointer rounded-[1.5rem]"
        >
          <div>
            <div className="text-3xl md:text-4xl font-black text-amber-400 tabular-nums group-hover:scale-105 transition-transform origin-left">{terlambatCount}</div>
            <div className="text-xs md:text-sm text-amber-600 mt-2 font-bold uppercase tracking-widest">Terlambat</div>
          </div>
          <Clock className="w-10 h-10 md:w-12 md:h-12 text-amber-500/20" />
        </div>

        {/* Metric Cell 3 - Pending */}
        <div 
          onClick={() => openModalWithFilter('belum_absen')}
          className="gsap-summary-item col-span-1 md:col-span-2 lg:col-span-1 row-span-1 border border-white/10 bg-sky-500/5 p-4 md:p-5 flex flex-col justify-center group cursor-pointer rounded-[1.5rem]"
        >
          <div className="text-2xl md:text-3xl font-black text-sky-400 tabular-nums">{belumAbsenCount}</div>
          <div className="text-[10px] md:text-xs text-sky-600 mt-1 font-bold uppercase tracking-widest">Belum Scan</div>
        </div>

        {/* Metric Cell 4 - Excused/Sick */}
        <div 
          onClick={() => openModalWithFilter('izin_sakit')}
          className="gsap-summary-item col-span-1 md:col-span-1 lg:col-span-1 row-span-1 border border-white/10 bg-blue-500/5 p-4 md:p-5 flex flex-col justify-center group cursor-pointer rounded-[1.5rem]"
        >
          <div className="text-2xl md:text-3xl font-black text-blue-400 tabular-nums">{izinCount + sakitCount}</div>
          <div className="text-[10px] md:text-xs text-blue-600 mt-1 font-bold uppercase tracking-widest">Izin/Sakit</div>
        </div>

        {/* Metric Cell 5 - Absent */}
        <div 
          onClick={() => openModalWithFilter('alpa')}
          className="gsap-summary-item col-span-1 md:col-span-1 lg:col-span-1 row-span-1 border border-white/10 bg-rose-500/5 p-4 md:p-5 flex flex-col justify-center group cursor-pointer rounded-[1.5rem]"
        >
          <div className="text-2xl md:text-3xl font-black text-rose-400 tabular-nums">{alpaCount}</div>
          <div className="text-[10px] md:text-xs text-rose-600 mt-1 font-bold uppercase tracking-widest">Alpa</div>
        </div>

        {/* Progress Timeline Row */}
        <div className="gsap-summary-item col-span-1 md:col-span-4 lg:col-span-6 border border-white/10 bg-black/20 p-4 md:px-6 md:py-5 rounded-[1.5rem]">
          <div className="flex items-center justify-between text-[10px] md:text-xs font-bold uppercase tracking-widest mb-3 md:mb-4">
            <span className="text-slate-400">Progres Pemindaian Hari Ini</span>
            <span className="text-white">{attendanceRate}% Terdata</span>
          </div>
          <div className="w-full h-3 md:h-4 rounded-full bg-white/5 overflow-hidden flex gap-0.5 p-0.5">
            <div style={{ width: `${totalActive > 0 ? (hadirCount / totalActive) * 100 : 0}%` }} className="h-full bg-emerald-500 rounded-l-full" />
            <div style={{ width: `${totalActive > 0 ? (terlambatCount / totalActive) * 100 : 0}%` }} className="h-full bg-amber-500" />
            <div style={{ width: `${totalActive > 0 ? ((izinCount + sakitCount) / totalActive) * 100 : 0}%` }} className="h-full bg-blue-500" />
            <div style={{ width: `${totalActive > 0 ? (alpaCount / totalActive) * 100 : 0}%` }} className="h-full bg-rose-500" />
            <div style={{ width: `${totalActive > 0 ? (belumAbsenCount / totalActive) * 100 : 0}%` }} className="h-full bg-white/10 rounded-r-full" />
          </div>
        </div>

        {/* Data Split: Recent Scans and Class Breakdown */}
        <div className="gsap-summary-item col-span-1 md:col-span-2 lg:col-span-3 border border-white/10 p-5 md:p-6 rounded-[1.5rem] bg-white/[0.02]">
          <div className="flex items-center justify-between mb-4 md:mb-5">
             <h3 className="text-base md:text-lg font-black text-white">Pemindaian Terbaru</h3>
             <Flame className="w-4 h-4 md:w-5 md:h-5 text-orange-500 animate-pulse" />
          </div>
          {recentScans.length === 0 ? (
            <div className="text-slate-500 text-sm py-4">Belum ada pemindaian...</div>
          ) : (
            <div className="space-y-4">
              {recentScans.map((r, idx) => {
                const timeStr = r.timestamp ? new Date(r.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
                return (
                  <div key={idx} className="flex justify-between items-center group">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${r.status === 'Terlambat' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      <div>
                        <div className="text-white font-bold text-xs md:text-sm group-hover:text-blue-400 transition-colors">{r.nama}</div>
                        <div className="text-slate-500 text-[10px] md:text-xs">{r.kelas} - {r.nisn}</div>
                      </div>
                    </div>
                    <div className="font-mono text-slate-400 text-xs">{timeStr}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="gsap-summary-item col-span-1 md:col-span-2 lg:col-span-3 border border-white/10 p-5 md:p-6 bg-white/[0.01] rounded-[1.5rem]">
          <h3 className="text-base md:text-lg font-black text-white mb-4 md:mb-5">Matriks Kelas</h3>
          <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto no-scrollbar pr-2 md:pr-4">
            {classBreakdown.map((c) => (
              <div key={c.kelas} className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-3 md:mb-4">
                  <span className="font-bold text-slate-300 text-sm">{c.kelas}</span>
                  <span className={`text-[9px] md:text-[10px] font-black px-2 py-1 rounded-sm ${
                    c.rate >= 90 ? 'bg-emerald-500/20 text-emerald-400' : 
                    c.rate >= 70 ? 'bg-blue-500/20 text-blue-400' : 
                    'bg-rose-500/20 text-rose-400'
                  }`}>
                    {c.rate}%
                  </span>
                </div>
                <div className="text-[10px] md:text-xs text-slate-500 flex justify-between flex-wrap gap-1">
                  <span>{c.masuk} / {c.total}</span>
                  {c.belumAbsen > 0 && <span className="text-amber-500">{c.belumAbsen} Belum</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal View for Lists */}
      <AnimatePresence>
        {showStudentListModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="bg-[#020617] rounded-[2rem] w-full max-w-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Cinematic Modal Header */}
              <div className="p-6 md:p-8 border-b border-white/10 flex justify-between items-start bg-white/[0.02]">
                <div>
                  <h3 className="text-2xl md:text-3xl font-black text-white capitalize">
                      {modalFilter === 'belum_absen' ? 'Belum Scan' : 
                       modalFilter === 'hadir' ? 'Hadir Tepat Waktu' : 
                       modalFilter === 'terlambat' ? 'Terlambat' : 
                       modalFilter === 'alpa' ? 'Alpa' : 'Sakit / Izin'}
                  </h3>
                  <p className="text-slate-400 mt-2 font-medium text-sm">Ditemukan {modalStudentList.length} siswa dalam kategori ini.</p>
                </div>
                <button onClick={() => setShowStudentListModal(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors cursor-pointer shrink-0">
                  <XCircle className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </div>

              {/* Filtering Array */}
              <div className="px-6 md:px-8 py-4 bg-white/[0.01] border-b border-white/10 flex flex-wrap gap-2">
                {[
                  { key: 'belum_absen', label: 'Belum Scan' },
                  { key: 'hadir', label: 'Hadir Tepat' },
                  { key: 'terlambat', label: 'Terlambat' },
                  { key: 'alpa', label: 'Alpa' },
                  { key: 'izin_sakit', label: 'Sakit/Izin' }
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setModalFilter(f.key as any)}
                    className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[10px] md:text-xs font-bold transition-all uppercase tracking-widest ${
                      modalFilter === f.key ? 'bg-white text-black' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="px-6 md:px-8 py-3 md:py-4 bg-transparent border-b border-white/10">
                <div className="relative">
                  <Search className="w-4 h-4 md:w-5 md:h-5 text-slate-500 absolute left-4 top-3 md:top-3.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama atau NISN..."
                    className="w-full pl-10 md:pl-12 pr-4 py-2 md:py-3 bg-white/5 rounded-xl text-xs md:text-sm font-medium text-white focus:outline-none focus:bg-white/10 transition-colors border border-transparent focus:border-white/20"
                  />
                </div>
              </div>

              {/* The List */}
              <div className="p-6 md:p-8 overflow-y-auto flex-1">
                {modalStudentList.length === 0 ? (
                  <div className="text-center py-12 md:py-20 text-slate-600 font-medium text-sm">Tidak ada data yang cocok.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {modalStudentList.map((item, idx) => (
                      <div key={idx} className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-white/[0.03] border border-white/5 flex justify-between items-center group hover:bg-white/[0.06] transition-colors">
                        <div>
                           <div className="text-white font-bold text-sm">{item.student.nama}</div>
                           <div className="text-slate-500 text-[10px] md:text-xs mt-1">{item.student.kelas} - {item.student.nisn}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ${
                            modalFilter === 'hadir' ? 'text-emerald-400' :
                            modalFilter === 'terlambat' ? 'text-amber-400' :
                            modalFilter === 'alpa' ? 'text-rose-400' :
                            modalFilter === 'belum_absen' ? 'text-sky-400' : 'text-blue-400'
                          }`}>{item.statusLabel}</div>
                          {item.time && <div className="text-[10px] md:text-xs font-mono text-slate-600 mt-1">{new Date(item.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
