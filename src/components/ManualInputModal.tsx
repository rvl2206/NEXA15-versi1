import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Student, AttendanceType, AttendanceStatus } from '../types';

export interface ManualInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onSubmit: (studentNisn: string, jenis: AttendanceType, status: AttendanceStatus, catatan: string) => void;
}

export const ManualInputModal: React.FC<ManualInputModalProps> = ({
  isOpen,
  onClose,
  students,
  onSubmit
}) => {
  const [manualForm, setManualForm] = useState({
    studentNisn: '',
    jenis: 'Masuk' as AttendanceType,
    status: 'Hadir' as AttendanceStatus,
    catatan: '',
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(manualForm.studentNisn, manualForm.jenis, manualForm.status, manualForm.catatan);
    setManualForm({
      studentNisn: '',
      jenis: 'Masuk',
      status: 'Hadir',
      catatan: '',
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden">
        <div className="bg-emerald-900 p-4 text-white flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider">Pencatatan Absensi Manual (Izin/Sakit/Alpa)</h3>
          <button onClick={onClose} className="text-emerald-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Pilih Siswa</label>
            <select
              value={manualForm.studentNisn}
              onChange={(e) => setManualForm({ ...manualForm, studentNisn: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-600 bg-white dark:bg-slate-800 dark:text-white"
              required
            >
              <option value="" disabled>-- Cari atau Pilih Siswa --</option>
              {students.map((s) => (
                <option key={s.id} value={s.nisn}>{s.nama} ({s.kelas})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Jenis Absen</label>
              <select
                value={manualForm.jenis}
                onChange={(e) => setManualForm({ ...manualForm, jenis: e.target.value as AttendanceType })}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-600 bg-white dark:bg-slate-800 dark:text-white"
              >
                <option value="Masuk">Absen Masuk</option>
                <option value="Pulang">Absen Pulang</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status Kehadiran</label>
              <select
                value={manualForm.status}
                onChange={(e) => setManualForm({ ...manualForm, status: e.target.value as AttendanceStatus })}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-600 bg-white dark:bg-slate-800 dark:text-white"
              >
                <option value="Hadir">Hadir</option>
                <option value="Terlambat">Terlambat</option>
                <option value="Izin">Izin</option>
                <option value="Sakit">Sakit</option>
                <option value="Alpa">Alpa / Tanpa Keterangan</option>
                <option value="Bolos">Bolos</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Catatan Tambahan</label>
            <textarea
              rows={2}
              value={manualForm.catatan}
              onChange={(e) => setManualForm({ ...manualForm, catatan: e.target.value })}
              placeholder="Contoh: Sakit demam dengan surat dokter"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-600 bg-white dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md transition-colors"
            >
              Simpan Presensi Manual
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
