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
  externalModalFilter?: 'hadir' | 'terlambat' | 'alpa' | 'belum_absen' | 'izin_sakit' | null;
  onCloseExternalModal?: () => void;
}

export const DailySummaryWidget: React.FC<DailySummaryWidgetProps> = ({
  students,
  attendance,
  selectedDate,
  onOpenScanner,
  externalModalFilter,
  onCloseExternalModal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'hadir' | 'terlambat' | 'alpa' | 'belum_absen' | 'izin_sakit'>('all');
  const [showStudentListModal, setShowStudentListModal] = useState<boolean>(false);
  const [modalFilter, setModalFilter] = useState<'hadir' | 'terlambat' | 'alpa' | 'belum_absen' | 'izin_sakit'>('belum_absen');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLivePulsing, setIsLivePulsing] = useState<boolean>(false);
  const [lastScanRecord, setLastScanRecord] = useState<AttendanceRecord | null>(null);

  useEffect(() => {
    if (externalModalFilter) {
      setModalFilter(externalModalFilter);
      setSearchQuery('');
      setShowStudentListModal(true);
    }
  }, [externalModalFilter]);

  const handleCloseModal = () => {
    setShowStudentListModal(false);
    if (onCloseExternalModal) onCloseExternalModal();
  };

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
  }, { scope: containerRef, dependencies: [] });

  return (
    <div ref={containerRef} className="w-full space-y-6">
      {/* 2-Column Clean Layout: Pemindaian Terbaru & Matriks Kelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        
        {/* Kolom 1: Pemindaian Terbaru (Live Activity Feed) */}
        <div className="gsap-summary-item border border-slate-800 bg-slate-900/90 backdrop-blur-md p-5 sm:p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
                <Flame className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Pemindaian Terbaru</h3>
                <p className="text-xs text-slate-400">Aktivitas presensi kartu gerbang secara langsung</p>
              </div>
            </div>
            {isToday && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live
              </span>
            )}
          </div>

          {recentScans.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              Belum ada pemindaian tercatat untuk tanggal ini.
            </div>
          ) : (
            <div className="space-y-3">
              {recentScans.map((r, idx) => {
                const timeStr = r.timestamp
                  ? new Date(r.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                  : '-';
                const isLate = r.status === 'Terlambat';
                return (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 rounded-xl bg-slate-950/50 border border-slate-800/60 hover:border-slate-700 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          isLate ? 'bg-amber-400 shadow-sm shadow-amber-400/50' : 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="text-white font-bold text-xs sm:text-sm truncate group-hover:text-blue-400 transition-colors">
                          {r.nama}
                        </div>
                        <div className="text-slate-400 text-[10px] sm:text-xs truncate">
                          {r.kelas} • NISN: {r.nisn}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isLate ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {r.status || 'Hadir'}
                      </span>
                      <div className="font-mono text-slate-400 text-[10px] mt-1">{timeStr}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Kolom 2: Matriks Kelas */}
        <div className="gsap-summary-item border border-slate-800 bg-slate-900/90 backdrop-blur-md p-5 sm:p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
            <div>
              <h3 className="text-base font-bold text-white">Matriks Performa Kelas</h3>
              <p className="text-xs text-slate-400">Rincian rasio kehadiran per rombel kelas</p>
            </div>
            <span className="text-xs text-slate-400 font-semibold">{classBreakdown.length} Kelas</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
            {classBreakdown.map((c) => (
              <div
                key={c.kelas}
                onClick={() => {
                  setSearchQuery(c.kelas);
                  setModalFilter('hadir');
                  setShowStudentListModal(true);
                }}
                className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/60 hover:border-slate-700 transition-all flex flex-col justify-between cursor-pointer group"
                title={`Klik untuk melihat data siswa kelas ${c.kelas}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-slate-200 text-xs sm:text-sm group-hover:text-blue-400 transition-colors">
                    {c.kelas}
                  </span>
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                      c.rate >= 90
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : c.rate >= 75
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {c.rate}%
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between items-center">
                  <span>{c.masuk}/{c.total} Masuk</span>
                  {c.belumAbsen > 0 && <span className="text-rose-400 font-semibold">{c.belumAbsen} Belum</span>}
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
                <button onClick={handleCloseModal} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors cursor-pointer shrink-0">
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
