import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface StudentClearAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentsLength: number;
  onConfirm: () => void;
}

export function StudentClearAllModal({
  isOpen,
  onClose,
  studentsLength,
  onConfirm,
}: StudentClearAllModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0b1121]/95 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl shadow-xl border border-white/10 max-w-md w-full overflow-hidden transition-colors">
        <div className="bg-red-700 p-4 text-white flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Hapus & Kosongkan Seluruh Database Siswa
          </h3>
          <button onClick={onClose} className="text-red-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-slate-800 dark:text-slate-100">
          <div className="p-3.5 bg-red-50 dark:bg-red-950/50 rounded-xl border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 space-y-1.5">
            <p className="font-bold flex items-center gap-1 text-red-800 dark:text-red-200">
              <AlertTriangle className="w-4 h-4 text-red-600" /> PERINGATAN HAPUS TOTAL DATA:
            </p>
            <p>
              Sistem akan secara otomatis <strong>menghapus keseluruhan {studentsLength} data siswa</strong> yang tersimpan di database saat ini.
            </p>
            <p className="text-[11px] font-semibold text-red-800 dark:text-red-300 bg-red-100 dark:bg-red-900/60 p-2 rounded-lg border border-red-300 dark:border-red-800">
              ⚠️ <strong>Tujuan:</strong> Mengosongkan database sepenuhnya agar Anda dapat melakukan <u>import ulang data siswa dari file Excel tanpa ada risiko tercatat ganda / duplikat</u>.
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-md transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus & Kosongkan Database Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
