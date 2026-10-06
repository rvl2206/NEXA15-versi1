import React from 'react';
import { X, Archive } from 'lucide-react';
import { Student } from '../types';

interface StudentDeleteConfirmModalProps {
  student: Student | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function StudentDeleteConfirmModal({
  student,
  onClose,
  onConfirm,
}: StudentDeleteConfirmModalProps) {
  if (!student) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden transition-colors">
        <div className="bg-amber-600 p-4 text-white flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Archive className="w-4 h-4" />
            Konfirmasi Nonaktifkan Data Siswa
          </h3>
          <button onClick={onClose} className="text-amber-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-slate-800 dark:text-slate-100">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300">
            <p className="font-bold">⚠️ Perhatian Admin (Soft Delete):</p>
            <p className="mt-1">
              Data siswa ini akan diubah statusnya menjadi <strong>Nonaktif</strong>. Rekaman presensi historis <strong>tidak akan dihapus</strong>, namun siswa ini tidak akan bisa melakukan scan presensi baru sebelum diaktifkan kembali.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
            <p>
              <span className="text-slate-500 dark:text-slate-400">Nama Siswa:</span>{' '}
              <strong className="text-slate-900 dark:text-white font-bold">{student.nama}</strong>
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">NISN:</span>{' '}
              <strong className="font-mono text-blue-600 dark:text-blue-400">{student.nisn}</strong>
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">ID QR Code:</span>{' '}
              <strong className="font-mono text-cyan-600 dark:text-cyan-400">{student.id_qr}</strong>
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">Kelas:</span>{' '}
              <strong className="text-slate-800 dark:text-slate-200">{student.kelas}</strong>
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-md transition-all flex items-center gap-1.5"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Nonaktifkan Siswa</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
