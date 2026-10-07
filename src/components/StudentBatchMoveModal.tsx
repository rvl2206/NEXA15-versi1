import React, { useState } from 'react';
import { X, RefreshCw } from 'lucide-react';

interface StudentBatchMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  classOptions: { name: string; count: number }[];
  onConfirm: (targetClass: string) => void;
}

export function StudentBatchMoveModal({
  isOpen,
  onClose,
  selectedCount,
  classOptions,
  onConfirm,
}: StudentBatchMoveModalProps) {
  const [batchTargetClass, setBatchTargetClass] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (batchTargetClass) {
      onConfirm(batchTargetClass);
      setBatchTargetClass('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0b1121]/95 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl shadow-xl border border-white/10 max-w-md w-full overflow-hidden transition-colors">
        <div className="bg-amber-600 p-4 text-white flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Mutasi Kelas {selectedCount} Siswa
          </h3>
          <button onClick={onClose} className="text-amber-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-slate-800 dark:text-slate-100">
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60 text-xs text-amber-700 dark:text-amber-300">
            <p className="font-bold">Info Pembaruan Massal:</p>
            <p className="mt-1">
              Anda akan mengubah data kelas untuk <strong>{selectedCount} siswa</strong> yang Anda centang secara bersamaan. Sangat berguna untuk kenaikan kelas atau pemindahan kelas paralel.
            </p>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">
              Pilih Kelas Tujuan
            </label>
            <select
              value={batchTargetClass}
              onChange={(e) => setBatchTargetClass(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-amber-500/30"
            >
              <option value="">-- Pilih Kelas Tujuan --</option>
              {classOptions.map((cls) => (
                <option key={cls.name} value={cls.name}>
                  {cls.name} ({cls.count} siswa)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-4 border-t border-white/10 bg-white/5 backdrop-blur-xl/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-300 bg-white dark:bg-slate-700 border border-white/20 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-xl transition-colors text-sm"
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={!batchTargetClass}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl shadow transition-colors flex items-center gap-2 text-sm"
          >
            Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  );
}
