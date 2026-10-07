import React, { useMemo, useState } from 'react';
import { store } from '../lib/store';
import { Student, AttendanceRecord } from '../types';
import { AlertTriangle, UserX, XCircle, Search, MessageSquare, Flame, CheckCircle2, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LowAttendanceNotificationsProps {
  students: Student[];
  attendance: AttendanceRecord[];
}

export const LowAttendanceNotifications: React.FC<LowAttendanceNotificationsProps> = ({
  students,
  attendance,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  const flaggedStudents = useMemo(() => {
    const activeStudents = students.filter((s) => s.status === 'aktif');
    const flagged: Array<{
      student: Student;
      attendanceRate: number;
      totalAlpa: number;
      totalLate: number;
      totalExcused: number;
      totalDays: number;
      riskLevel: 'Kritis' | 'Tinggi' | 'Sedang';
    }> = [];

    activeStudents.forEach((student) => {
      const studentRecords = attendance.filter((a) => a.nisn === student.nisn);
      const uniqueDays = new Set(
        studentRecords.map(
          (a) => store.normalizeToYyyyMmDd(a.tanggal) || store.normalizeToYyyyMmDd(a.timestamp)
        ).filter(Boolean)
      );
      const totalDays = uniqueDays.size;

      if (totalDays === 0) return;

      const dailyRecords = Array.from(uniqueDays).map((dateStr) => {
        const dayRecs = studentRecords.filter((a) => store.isRecordForDate(a, dateStr));
        const pulang = dayRecs.find((r) => r.jenis === 'Pulang');
        const masuk = dayRecs.find((r) => r.jenis === 'Masuk' || (!r.jenis && r.status));
        return masuk || pulang || dayRecs[0];
      });

      const alpaCount = dailyRecords.filter((a) => a?.status === 'Alpa').length;
      const lateCount = dailyRecords.filter((a) => a?.status === 'Terlambat').length;
      const excusedCount = dailyRecords.filter((a) => a?.status === 'Sakit' || a?.status === 'Izin').length;

      const presentCount = dailyRecords.filter(
        (a) => a?.status === 'Hadir' || a?.status === 'Terlambat'
      ).length;

      const rate = Math.round((presentCount / totalDays) * 100);

      if (rate < 75 || alpaCount >= 3) {
        flagged.push({
          student,
          attendanceRate: rate,
          totalAlpa: alpaCount,
          totalLate: lateCount,
          totalExcused: excusedCount,
          totalDays,
          riskLevel: rate < 50 || alpaCount >= 5 ? 'Kritis' : rate < 65 ? 'Tinggi' : 'Sedang',
        });
      }
    });

    return flagged.sort((a, b) => a.attendanceRate - b.attendanceRate);
  }, [students, attendance]);

  const filteredFlagged = useMemo(() => {
    if (!searchQuery.trim()) return flaggedStudents;
    const q = searchQuery.toLowerCase();
    return flaggedStudents.filter(
      (f) =>
        f.student.nama.toLowerCase().includes(q) ||
        f.student.nisn.includes(q) ||
        f.student.kelas.toLowerCase().includes(q)
    );
  }, [flaggedStudents, searchQuery]);

  const toggleResolve = (id: string) => {
    setResolvedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getWhatsAppLink = (student: Student, riskLevel: string) => {
    if (!student.no_hp_ortu) return null;
    let number = student.no_hp_ortu.replace(/\D/g, '');
    if (number.startsWith('0')) number = '62' + number.slice(1);
    
    const message = `Yth. Bapak/Ibu Wali Murid dari ${student.nama},\nKami dari sekolah ingin menginformasikan bahwa ananda saat ini masuk dalam kategori pemantauan kehadiran (${riskLevel}). Mohon kerjasamanya untuk mengingatkan ananda agar dapat meningkatkan kedisiplinan kehadirannya. Terima kasih.`;
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  };

  const copyMessage = (student: Student, riskLevel: string) => {
      const message = `Yth. Bapak/Ibu Wali Murid dari ${student.nama},\nKami dari sekolah ingin menginformasikan bahwa ananda saat ini masuk dalam kategori pemantauan kehadiran (${riskLevel}). Mohon kerjasamanya untuk mengingatkan ananda agar dapat meningkatkan kedisiplinan kehadirannya. Terima kasih.`;
      navigator.clipboard.writeText(message);
      alert('Pesan disalin ke clipboard');
  }

  if (flaggedStudents.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center p-12 text-center">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h3 className="text-xl md:text-2xl font-black text-emerald-400 mb-2">Sistem Optimal</h3>
        <p className="text-emerald-500/50 max-w-md text-sm">Tidak ada anomali kritis yang terdeteksi. Seluruh siswa terpantau dengan baik.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-rose-500/20 flex items-center justify-center border border-rose-500/30 relative">
            <Flame className="w-6 h-6 text-rose-500 absolute animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-rose-500">Peringatan Anomali</h2>
            <p className="text-rose-500/70 font-medium text-sm md:text-base">Diperlukan intervensi untuk {flaggedStudents.length} siswa.</p>
          </div>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-rose-500/50 absolute left-4 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari identitas..."
            className="w-full pl-11 pr-4 py-2 bg-rose-500/5 rounded-full text-sm font-medium text-white focus:outline-none focus:bg-rose-500/10 transition-colors border border-rose-500/20 placeholder:text-rose-500/30"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredFlagged.map((flag) => {
            const isExpanded = expandedId === flag.student.id;
            const isResolved = resolvedIds.has(flag.student.id);
            const waLink = getWhatsAppLink(flag.student, flag.riskLevel);

            return (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={flag.student.id}
                className={`border p-5 md:p-6 rounded-[2rem] transition-all duration-500 ${
                  isResolved 
                    ? 'border-emerald-500/20 bg-emerald-500/5 grayscale opacity-50 hover:grayscale-0 hover:opacity-100' 
                    : flag.riskLevel === 'Kritis' 
                      ? 'border-rose-500/40 bg-rose-500/10' 
                      : 'border-orange-500/30 bg-orange-500/5'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className={`text-base md:text-lg font-black ${isResolved ? 'text-emerald-400' : 'text-white'}`}>{flag.student.nama}</h4>
                    <p className="text-xs md:text-sm text-slate-500 mt-1">{flag.student.kelas} - {flag.student.nisn}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest ${
                    isResolved ? 'bg-emerald-500/20 text-emerald-400' :
                    flag.riskLevel === 'Kritis' ? 'bg-rose-500/20 text-rose-400' : 
                    flag.riskLevel === 'Tinggi' ? 'bg-orange-500/20 text-orange-400' : 
                    'bg-amber-500/20 text-amber-400'
                  }`}>
                    {isResolved ? 'Selesai' : flag.riskLevel}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                   <div className="bg-black/20 rounded-xl p-3">
                     <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Kehadiran</div>
                     <div className={`text-xl font-black ${flag.attendanceRate < 50 ? 'text-rose-500' : 'text-orange-400'}`}>{flag.attendanceRate}%</div>
                   </div>
                   <div className="bg-black/20 rounded-xl p-3">
                     <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Total Alpa</div>
                     <div className={`text-xl font-black ${flag.totalAlpa >= 3 ? 'text-rose-500' : 'text-orange-400'}`}>{flag.totalAlpa}</div>
                   </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2 pb-4 space-y-2 border-t border-white/5 mt-2">
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Total Terlambat:</span>
                          <span className="font-bold text-white">{flag.totalLate}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Sakit/Izin:</span>
                          <span className="font-bold text-white">{flag.totalExcused}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Evaluasi:</span>
                          <span className="font-bold text-white">{flag.totalDays} hari</span>
                        </div>

                        <div className="flex gap-2 mt-4 pt-2">
                          {waLink ? (
                            <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[10px] font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors">
                              <MessageSquare className="w-3 h-3" /> WA Wali
                            </a>
                          ) : (
                            <button disabled className="flex-1 bg-white/5 text-slate-600 text-[10px] font-bold py-2 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed">
                              <UserX className="w-3 h-3" /> No WA Absen
                            </button>
                          )}
                          <button onClick={() => copyMessage(flag.student, flag.riskLevel)} className="px-3 bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center">
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex justify-between items-center mt-2">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : flag.student.id)}
                    className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors"
                  >
                    {isExpanded ? 'Tutup Detail' : 'Buka Detail'}
                  </button>
                  <button
                    onClick={() => toggleResolve(flag.student.id)}
                    className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${
                      isResolved ? 'text-slate-500 hover:text-rose-400' : 'text-emerald-500/70 hover:text-emerald-400'
                    }`}
                  >
                    {isResolved ? 'Batal Selesai' : 'Tandai Selesai'}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredFlagged.length === 0 && (
        <div className="text-center py-12 text-slate-500 text-sm font-medium">
          Tidak ada data yang cocok dengan filter pencarian.
        </div>
      )}
    </div>
  );
};
