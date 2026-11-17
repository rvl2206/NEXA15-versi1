import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, ShieldAlert, AlertTriangle, Sparkles, CreditCard, QrCode, WifiOff } from 'lucide-react';
import { Student } from '../types';
import { ScanOutcome } from './QRScanner';

export interface QRScannerModalProps {
  scanResult: ScanOutcome | null;
  isOpen: boolean;
  onClose: () => void;
  modalDuration: number;
  scanTargetMode?: 'siswa';
  
  // States and lists for linking
  selectedStudentForQR: string;
  setSelectedStudentForQR: (val: string) => void;
  studentsList: Student[];
  
  // Actions
  handleAssignRfidToStudent: (code: string, studentId: string) => void;
  handleConnectQRToStudent: (code: string, studentId: string) => void;
  
  lastScannedQR: string;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  scanResult,
  isOpen,
  onClose,
  modalDuration,
  selectedStudentForQR,
  setSelectedStudentForQR,
  studentsList,
  handleAssignRfidToStudent,
  handleConnectQRToStudent,
  lastScannedQR
}) => {
  const [countdown, setCountdown] = useState(modalDuration);
  const [bindMode, setBindMode] = useState<'RFID' | 'QR'>('QR');

  // Synchronize bindMode when a new scan result arrives
  useEffect(() => {
    if (scanResult?.scanMethod === 'RFID') {
      setBindMode('RFID');
    } else {
      setBindMode('QR');
    }
  }, [scanResult?.scanMethod, isOpen]);

  useEffect(() => {
    if (!isOpen || modalDuration <= 0) return;
    setCountdown(modalDuration);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, modalDuration, onClose]);

  if (!isOpen || !scanResult) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-lg bg-[#0b1121]/95 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl overflow-hidden shadow-2xl transform transition-all duration-300 scale-100 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon / Status Banner */}
        <div
          className={`p-6 text-white text-center relative overflow-hidden transition-all ${
            scanResult.success
              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700'
              : scanResult.isDuplicate
              ? 'bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700'
              : 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700'
          }`}
        >
          {/* Close button with countdown badge */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {modalDuration > 0 && (
              <span className="text-[10px] font-mono font-bold bg-black/30 backdrop-blur-md px-2.5 py-1 rounded-full text-white/90 border border-white/20">
                {countdown}s
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors cursor-pointer"
              title="Tutup (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Status Icon */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shadow-inner border border-white/20 mb-3">
            {scanResult.success ? (
              <CheckCircle2 className="w-9 h-9 text-emerald-100" />
            ) : scanResult.isDuplicate ? (
              <ShieldAlert className="w-9 h-9 text-rose-100" />
            ) : (
              <AlertTriangle className="w-9 h-9 text-amber-100" />
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
          {scanResult.student ? (
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
            <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/10 text-center space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Kode Terpindai:
              </span>
              <span className="font-mono text-base font-extrabold text-indigo-400 select-all block">
                {scanResult.scannedCode || lastScannedQR || '-'}
              </span>
            </div>
          )}

          {/* Quick Binding card for unregistered tags */}
          {!scanResult.success && !scanResult.isDuplicate && !scanResult.student && (
            <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-bold text-indigo-200">
                  Tautkan Kartu / QR Ini ke Data Siswa
                </h4>
              </div>

              <div className="space-y-3">
                {/* Mode Selector RFID vs QR */}
                <div className="flex items-center justify-between gap-2 pb-1 border-b border-indigo-100 dark:border-indigo-900/40">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-300">Target Media:</span>
                    <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-white/10">
                      <button
                        type="button"
                        onClick={() => setBindMode('RFID')}
                        className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                          bindMode === 'RFID'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <CreditCard className="w-3 h-3" />
                        Kartu RFID
                      </button>
                      <button
                        type="button"
                        onClick={() => setBindMode('QR')}
                        className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                          bindMode === 'QR'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <QrCode className="w-3 h-3" />
                        Kode QR
                      </button>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] bg-slate-800 border border-white/10 px-2 py-0.5 rounded text-indigo-300 font-bold">
                    {scanResult.scannedCode || lastScannedQR}
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="block text-[11px] font-bold text-slate-200 dark:text-slate-300">
                    Tautkan ke Siswa ({bindMode === 'RFID' ? 'Kartu Fisik RFID' : 'Kode QR'})
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
                        if (bindMode === 'RFID') {
                          handleAssignRfidToStudent(code, selectedStudentForQR);
                        } else {
                          handleConnectQRToStudent(code, selectedStudentForQR);
                        }
                      }}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-extrabold text-xs rounded-xl shadow whitespace-nowrap cursor-pointer"
                    >
                      {bindMode === 'RFID' ? 'Tautkan RFID Siswa' : 'Hubungkan QR Siswa'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Offline Storage Notice in Modal */}
          {scanResult.isOffline && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 rounded-2xl border border-rose-300 dark:border-rose-700 text-[11px] text-rose-900 dark:text-rose-200 space-y-1">
              <div className="flex items-center gap-1.5 font-extrabold">
                <WifiOff className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                <span>Presensi Ditolak (Perangkat Offline)</span>
              </div>
              <p className="text-[10px] leading-relaxed opacity-90">
                NEXA15 berjalan dalam mode online penuh demi akurasi data presensi siswa. Silakan hubungkan perangkat ke internet.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-900/60 border-t border-white/10 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
          >
            Lanjutkan Scan Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
};
