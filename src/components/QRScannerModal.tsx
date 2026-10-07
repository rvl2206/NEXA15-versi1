import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, ShieldAlert, AlertTriangle, Sparkles, CreditCard, QrCode, WifiOff } from 'lucide-react';
import { Student, Teacher } from '../types';
import { ScanOutcome } from './QRScanner';

export interface QRScannerModalProps {
  scanResult: ScanOutcome | null;
  isOpen: boolean;
  onClose: () => void;
  modalDuration: number;
  scanTargetMode: 'auto' | 'siswa' | 'guru';
  
  // States and lists for linking
  selectedStudentForQR: string;
  setSelectedStudentForQR: (val: string) => void;
  studentsList: Student[];
  
  selectedTeacherForQR: string;
  setSelectedTeacherForQR: (val: string) => void;
  teachersList: Teacher[];
  
  // Actions
  handleAssignRfidToStudent: (code: string, studentId: string) => void;
  handleConnectQRToStudent: (code: string, studentId: string) => void;
  handleAssignRfidToTeacher: (code: string, teacherId: string) => void;
  handleConnectQRToTeacher: (code: string, teacherId: string) => void;
  
  lastScannedQR: string;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  scanResult,
  isOpen,
  onClose,
  modalDuration,
  scanTargetMode,
  selectedStudentForQR,
  setSelectedStudentForQR,
  studentsList,
  selectedTeacherForQR,
  setSelectedTeacherForQR,
  teachersList,
  handleAssignRfidToStudent,
  handleConnectQRToStudent,
  handleAssignRfidToTeacher,
  handleConnectQRToTeacher,
  lastScannedQR
}) => {
  const [countdown, setCountdown] = useState(modalDuration);

  // Auto-close and countdown logic
  useEffect(() => {
    if (isOpen) {
      setCountdown(modalDuration);
      
      const timer = setTimeout(() => {
        onClose();
      }, modalDuration * 1000);

      const interval = setInterval(() => {
        setCountdown((prev) => Math.max(0, prev - 1));
      }, 1000);

      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
  }, [isOpen, modalDuration, onClose]);

  if (!isOpen || !scanResult) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[#0b1121]/95 backdrop-blur-2xl border border-white/10 shadow-2xl border border-white/10 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
        {/* Header Banner */}
        <div
          className={`p-6 text-white relative overflow-hidden text-center ${
            scanResult.success
              ? 'bg-gradient-to-br from-emerald-600 via-teal-600 to-green-700'
              : scanResult.isDuplicate
              ? 'bg-gradient-to-br from-rose-600 via-red-600 to-amber-700'
              : 'bg-gradient-to-br from-amber-600 via-orange-600 to-red-700'
          }`}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex justify-center mb-2">
            <div className="w-16 h-16 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg">
              {scanResult.success ? (
                <CheckCircle2 className="w-10 h-10 text-white" />
              ) : scanResult.isDuplicate ? (
                <ShieldAlert className="w-10 h-10 text-white animate-bounce" />
              ) : (
                <AlertTriangle className="w-10 h-10 text-amber-200" />
              )}
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full text-xs font-extrabold uppercase tracking-wider mb-1">
            {scanResult.success ? (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>PRESENSI BERHASIL</span>
              </>
            ) : scanResult.isDuplicate ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-white" />
                <span>SCAN GANDA DITOLAK</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>PERINGATAN ABSENSI</span>
              </>
            )}
          </div>

          <h3 className="text-xl font-black uppercase tracking-tight">
            {scanResult.success
              ? 'SCAN QR BERHASIL'
              : scanResult.isDuplicate
              ? 'PRESENSI SUDAH ADA'
              : 'NOTIFIKASI SISTEM'}
          </h3>
          <p className="text-xs text-white/95 font-medium mt-1 px-2">{scanResult.message}</p>
        </div>

        {/* Body Details */}
        <div className="p-6 space-y-4">
          {scanResult.teacher ? (
            <>
              <div className="text-center pb-2 border-b border-white/5 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-0.5">
                  Nama Guru / Pegawai
                </span>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                  {scanResult.teacher.nama}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-sky-50/80 dark:bg-sky-950/50 p-3 rounded-2xl border border-sky-200/80 dark:border-sky-800/60 text-center">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400 block mb-0.5">
                    NIP
                  </span>
                  <span className="font-mono text-sm font-black text-white">
                    {scanResult.teacher.nip}
                  </span>
                </div>

                <div className="bg-emerald-50/80 dark:bg-emerald-950/50 p-3 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 text-center">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-0.5">
                    Jabatan
                  </span>
                  <span className="text-xs font-black text-white truncate block">
                    {scanResult.teacher.jabatan}
                  </span>
                </div>
              </div>
            </>
          ) : scanResult.student ? (
            <>
              <div className="text-center pb-2 border-b border-white/5 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-0.5">
                  Nama Siswa
                </span>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                  {scanResult.student.nama}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50/80 dark:bg-blue-950/50 p-3 rounded-2xl border border-blue-200/80 dark:border-blue-800/60 text-center">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-0.5">
                    NISN
                  </span>
                  <span className="font-mono text-sm font-black text-white">
                    {scanResult.student.nisn}
                  </span>
                </div>

                <div className="bg-emerald-50/80 dark:bg-emerald-950/50 p-3 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 text-center">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-0.5">
                    Kelas
                  </span>
                  <span className="text-sm font-black text-white">
                    {scanResult.student.kelas}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3 text-left">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-3.5 rounded-2xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-[11px] font-extrabold text-white dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    {scanResult.scanMethod === 'RFID' ? (
                      <>
                        <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Daftarkan Kartu RFID</span>
                      </>
                    ) : (
                      <>
                        <QrCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>Hubungkan Kode QR</span>
                      </>
                    )}
                  </span>
                  <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-200 dark:text-slate-300 font-bold">
                    {scanResult.scannedCode || lastScannedQR}
                  </span>
                </div>

                {/* Choose Target Type if in Auto or specific mode */}
                {(scanTargetMode === 'auto' || scanTargetMode === 'siswa') && (
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-[11px] font-bold text-slate-200 dark:text-slate-300">
                      1. Hubungkan ke Siswa
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedStudentForQR}
                        onChange={(e) => setSelectedStudentForQR(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs border border-white/10 dark:bg-slate-900 dark:text-white rounded-xl font-medium"
                      >
                        <option value="">-- Pilih Nama Siswa --</option>
                        {studentsList.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nama} ({s.kelas} - NISN: {s.nisn})
                          </option>
                        ))}
                      </select>
                      <button
                        disabled={!selectedStudentForQR}
                        onClick={() => {
                          const code = scanResult.scannedCode || lastScannedQR;
                          if (scanResult.scanMethod === 'RFID') {
                            handleAssignRfidToStudent(code, selectedStudentForQR);
                          } else {
                            handleConnectQRToStudent(code, selectedStudentForQR);
                          }
                        }}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-extrabold text-xs rounded-xl shadow whitespace-nowrap cursor-pointer"
                      >
                        Hubungkan Siswa
                      </button>
                    </div>
                  </div>
                )}

                {(scanTargetMode === 'auto' || scanTargetMode === 'guru') && (
                  <div className="space-y-1.5 pt-2 border-t border-white/10">
                    <label className="block text-[11px] font-bold text-slate-200 dark:text-slate-300">
                      2. Hubungkan ke Guru / Tenaga Pendidik
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedTeacherForQR}
                        onChange={(e) => setSelectedTeacherForQR(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs border border-white/10 dark:bg-slate-900 dark:text-white rounded-xl font-medium"
                      >
                        <option value="">-- Pilih Nama Guru / NIP --</option>
                        {teachersList.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.nama} (NIP: {t.nip}) - {t.jabatan}
                          </option>
                        ))}
                      </select>
                      <button
                        disabled={!selectedTeacherForQR}
                        onClick={() => {
                          const code = scanResult.scannedCode || lastScannedQR;
                          if (scanResult.scanMethod === 'RFID') {
                            handleAssignRfidToTeacher(code, selectedTeacherForQR);
                          } else {
                            handleConnectQRToTeacher(code, selectedTeacherForQR);
                          }
                        }}
                        className="px-3.5 py-2 bg-sky-700 hover:bg-sky-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-extrabold text-xs rounded-xl shadow whitespace-nowrap cursor-pointer"
                      >
                        Hubungkan Guru
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Offline Storage Notice in Modal */}
          {scanResult.isOffline && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-2xl border border-amber-300 dark:border-amber-700 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 font-extrabold">
                <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <span>Tersimpan di Cache Lokal (Mode Offline)</span>
              </div>
              <p className="leading-relaxed text-[10.5px]">
                Koneksi internet terputus saat pemindaian. Data presensi disimpan di memori browser dan akan otomatis disinkronkan ke Supabase Cloud saat jaringan pulih.
              </p>
            </div>
          )}

          {/* Duplicate Information Explainer */}
          {scanResult.isDuplicate && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 rounded-2xl border border-rose-200 dark:border-rose-800 text-[11px] text-rose-800 dark:text-rose-300 space-y-1">
              <div className="flex items-center gap-1.5 font-extrabold">
                <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>Pencegahan Scan Ganda Otomatis</span>
              </div>
              <p className="leading-relaxed">
                Sistem mendeteksi dan menolak pemindaian berulang untuk menjaga integritas dan kevalidan data presensi harian.
              </p>
            </div>
          )}

          <button
            onClick={onClose}
            className={`w-full py-3 text-white font-extrabold text-xs rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
              scanResult.isDuplicate
                ? 'bg-rose-600 hover:bg-rose-500'
                : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            <span>Tutup & Lanjutkan Scan ({countdown}s)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
