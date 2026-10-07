import React, { useRef, useEffect } from 'react';
import { X, Smartphone, Radio, CheckCircle2, AlertTriangle, Check, Link } from 'lucide-react';
import { Student } from '../types';

interface StudentRfidBindModalProps {
  isOpen: boolean;
  rfidBindStudent: Student | null;
  onClose: () => void;
  rfidInputVal: string;
  setRfidInputVal: (val: string) => void;
  isNfcActive: boolean;
  handleStartNfcScan: () => void;
  hexFormatted: string;
  decFormatted: string;
  rfidConflict: { type: 'siswa' | 'guru', student?: Student, teacher?: any } | null;
  handleUnbindRfid: () => void;
  handleSaveRfidBind: (e?: React.FormEvent) => void;
}

export function StudentRfidBindModal({
  isOpen,
  rfidBindStudent,
  onClose,
  rfidInputVal,
  setRfidInputVal,
  isNfcActive,
  handleStartNfcScan,
  hexFormatted,
  decFormatted,
  rfidConflict,
  handleUnbindRfid,
  handleSaveRfidBind,
}: StudentRfidBindModalProps) {
  const rfidInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        rfidInputRef.current?.focus();
        rfidInputRef.current?.select();
      }, 150);
    }
  }, [isOpen]);

  if (!isOpen || !rfidBindStudent) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0b1121]/95 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl shadow-xl border border-white/10 max-w-md w-full overflow-hidden transition-colors">
        {/* Modal Header */}
        <div className="bg-indigo-600 p-4 text-white flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Link className="w-4 h-4" />
            Tautkan Kartu RFID / NFC
          </h3>
          <button onClick={onClose} className="text-indigo-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveRfidBind(e);
          }}
          className="p-5 space-y-5"
        >
          {/* Target Student Info */}
          <div className="flex gap-4 items-center p-3.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center border border-indigo-200 dark:border-indigo-800 shrink-0">
              <span className="text-xl font-bold text-indigo-700 dark:text-indigo-300">
                {rfidBindStudent.nama.charAt(0)}
              </span>
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">
                {rfidBindStudent.nama}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-300 rounded font-semibold">
                  {rfidBindStudent.kelas}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  NISN: {rfidBindStudent.nisn}
                </span>
                {rfidBindStudent.rfid_uid && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Ada RFID
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* RFID Input Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                UID Kartu RFID / NFC Fisik:
              </label>
              {typeof window !== 'undefined' && 'NDEFReader' in window && (
                <button
                  type="button"
                  onClick={handleStartNfcScan}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 border transition cursor-pointer ${
                    isNfcActive
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                  }`}
                >
                  <Smartphone className="w-3 h-3" />
                  <span>{isNfcActive ? 'NFC HP Aktif...' : 'Scan via NFC HP'}</span>
                </button>
              )}
            </div>

            <div className="relative">
              <input
                ref={rfidInputRef}
                type="text"
                value={rfidInputVal}
                onChange={(e) => setRfidInputVal(e.target.value)}
                placeholder="Tempelkan kartu RFID pada reader USB atau ketik UID..."
                className="w-full pl-9 pr-20 py-2.5 text-xs border border-indigo-300 dark:border-indigo-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-600 font-mono uppercase tracking-wider font-bold shadow-inner"
                autoComplete="off"
                autoFocus
              />
              <Radio className="w-4 h-4 text-indigo-500 absolute left-3 top-3 animate-pulse" />
              {rfidInputVal && (
                <button
                  type="button"
                  onClick={() => setRfidInputVal('')}
                  className="absolute right-2.5 top-2.5 px-2 py-0.5 text-[10px] font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 rounded text-slate-300 cursor-pointer"
                >
                  Bersihkan
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span>💡</span>
              <span>
                <strong>USB Reader:</strong> Klik kolom di atas lalu tempelkan kartu RFID ke alat USB Reader untuk membaca nomor UID otomatis.
              </span>
            </p>
          </div>

          {/* Format Conversions Preview (Hex & Dec) */}
          {(hexFormatted || decFormatted) && (
            <div className="bg-indigo-50/60 dark:bg-indigo-950/40 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/60 space-y-1.5 text-xs">
              <div className="text-[10px] font-extrabold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Konversi Format Kartu Otomatis</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-white/5 backdrop-blur-xl rounded-lg border border-indigo-100 dark:border-indigo-800">
                  <span className="text-[10px] text-slate-400 block">Hexadecimal (Hex):</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {hexFormatted || '-'}
                  </span>
                </div>
                <div className="p-2 bg-white/5 backdrop-blur-xl rounded-lg border border-indigo-100 dark:border-indigo-800">
                  <span className="text-[10px] text-slate-400 block">Decimal (Dec):</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {decFormatted || '-'}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                Sistem otomatis mengenali kartu ini baik saat dipindai reader USB bertipe Hex maupun Dec.
              </p>
            </div>
          )}

          {/* Conflict / Occupancy Warning */}
          {rfidConflict && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-xl space-y-1.5 text-xs text-amber-950 dark:text-amber-200 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Perhatian: Kartu Sedang Dipakai!</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Kartu UID <strong>[{rfidInputVal}]</strong> saat ini sedang ditautkan ke{' '}
                <strong>
                  {rfidConflict.type === 'siswa' ? rfidConflict.student?.nama : rfidConflict.teacher?.nama}
                </strong>{' '}
                ({rfidConflict.type === 'siswa' ? `Siswa Kelas ${rfidConflict.student?.kelas}` : `Guru - ${rfidConflict.teacher?.jabatan}`}).
              </p>
              <p className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-900/50 p-2 rounded-lg">
                ⚡ Jika Anda melanjutkan penyimpanan, kepemilikan kartu RFID ini akan otomatis dialihkan secara eksklusif ke <strong>{rfidBindStudent.nama}</strong>.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10">
            {rfidBindStudent.rfid_uid ? (
              <button
                type="button"
                onClick={handleUnbindRfid}
                className="px-3.5 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 rounded-xl transition-all cursor-pointer"
              >
                Lepas Tautan Kartu
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={!rfidInputVal.trim()}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                <span>Tautkan Kartu RFID</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
