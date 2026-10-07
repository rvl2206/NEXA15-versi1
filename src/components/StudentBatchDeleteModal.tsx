import React from 'react';
import { X, Trash2 } from 'lucide-react';

interface StudentBatchDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  onConfirm: () => void;
}

export function StudentBatchDeleteModal({
  isOpen,
  onClose,
  selectedCount,
  onConfirm,
}: StudentBatchDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0b1121]/95 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl shadow-xl border border-white/10 max-w-md w-full overflow-hidden transition-colors">
        <div className="bg-red-600 p-4 text-white flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Hapus {selectedCount} Data Siswa Terpilih
          </h3>
          <button onClick={onClose} className="text-red-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-slate-800 dark:text-slate-100">
          <div className="p-3.5 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300">
            <p className="font-bold">⚠️ Perhatian Admin:</p>
            <p className="mt-1">
              Anda akan menghapus <strong>{selectedCount} data siswa</strong> yang Anda centang secara bersamaan. Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-white/10">
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
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow transition-colors flex items-center gap-2 text-sm"
            >
              Hapus Permanen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
