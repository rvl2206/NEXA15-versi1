import React, { useState, useEffect } from 'react';
import { X, Radio, CreditCard } from 'lucide-react';
import { Student } from '../types';
import { toast } from '../lib/toast';

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingStudent: Student | null;
  students: Student[];
  onSave: (formattedData: Omit<Student, 'id' | 'createdAt'>, isEdit: boolean) => void;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  onClose,
  editingStudent,
  students,
  onSave,
}) => {
  const [formData, setFormData] = useState<Omit<Student, 'id' | 'createdAt'>>({
    nama: '',
    nisn: '',
    kelas: '',
    rfid_uid: '',
    id_qr: '',
    status: 'aktif',
    no_hp_ortu: '',
    foto: '',
  });

  useEffect(() => {
    if (isOpen) {
      if (editingStudent) {
        setFormData({
          nama: editingStudent.nama,
          nisn: editingStudent.nisn,
          kelas: editingStudent.kelas,
          rfid_uid: editingStudent.rfid_uid || '',
          id_qr: editingStudent.id_qr,
          status: editingStudent.status || 'aktif',
          no_hp_ortu: editingStudent.no_hp_ortu || '',
          foto: editingStudent.foto || '',
        });
      } else {
        setFormData({
          nama: '',
          nisn: '',
          kelas: '',
          rfid_uid: '',
          id_qr: '',
          status: 'aktif',
          no_hp_ortu: '',
          foto: '',
        });
      }
    }
  }, [isOpen, editingStudent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim() || !formData.nisn.trim()) {
      toast.error('Form Belum Lengkap', 'Nama Siswa dan NISN wajib diisi.');
      return;
    }

    const cleanRfid = formData.rfid_uid?.trim().toUpperCase() || '';

    // Check if another student already uses this RFID UID
    if (cleanRfid) {
      const existingWithRfid = students.find(
        (s) => s.rfid_uid && s.rfid_uid.trim().toUpperCase() === cleanRfid && s.id !== editingStudent?.id
      );
      if (existingWithRfid) {
        toast.error('UID RFID Sudah Dipakai', `Kartu RFID [${cleanRfid}] sudah digunakan oleh ${existingWithRfid.nama} (${existingWithRfid.kelas}).`);
        return;
      }
    }

    const formattedData = {
      ...formData,
      nama: formData.nama.trim(),
      nisn: formData.nisn.trim(),
      id_qr: `69933068.${formData.nisn.trim()}.${formData.nama.trim()}`,
      rfid_uid: cleanRfid || undefined,
    };

    onSave(formattedData, !!editingStudent);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden transition-colors">
        <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
          <h3 className="font-bold text-sm">
            {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-slate-800 dark:text-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">ID QR Code (Otomatis)</label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, id_qr: `69933068.${formData.nisn.trim()}.${formData.nama.trim()}` })}
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    title="Format ulang ID QR"
                  >
                    = Format Ulang
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={`69933068.${formData.nisn.trim()}.${formData.nama.trim()}`}
                onChange={(e) => setFormData({ ...formData, id_qr: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-600 font-mono bg-slate-50 dark:bg-slate-900"
                placeholder="69933068.nisn.nama siswa"
                readOnly
              />
              <p className="text-[10px] text-slate-400 mt-1">Format ID QR: <code>69933068.nisn.nama siswa</code></p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">NISN / No. Kartu</label>
              <input
                type="text"
                value={formData.nisn}
                onChange={(e) => {
                  const newNisn = e.target.value;
                  setFormData({
                    ...formData,
                    nisn: newNisn,
                    id_qr: `69933068.${newNisn.trim()}.${formData.nama.trim()}`
                  });
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-600 font-mono"
                placeholder="Contoh: 0081234567"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">Nomor Induk Siswa Nasional.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap Siswa</label>
            <input
              type="text"
              value={formData.nama}
              onChange={(e) => {
                const newNama = e.target.value;
                setFormData({
                  ...formData,
                  nama: newNama,
                  id_qr: `69933068.${formData.nisn.trim()}.${newNama.trim()}`
                });
              }}
              placeholder="Contoh: DADANG BUAMONA"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-600 uppercase"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Kelas</label>
            <input
              type="text"
              value={formData.kelas}
              onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
              placeholder="Contoh: X IPA 1, XI MIPA 2, XII IPS 3"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>

          {/* RFID / NFC Card UID */}
          <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
            <div className="flex items-center justify-between mb-1">
              <label className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-300">
                <Radio className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                UID Kartu RFID / Contactless NFC (Opsional)
              </label>
              {formData.rfid_uid && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, rfid_uid: '' })}
                  className="text-[10px] text-red-500 hover:underline cursor-pointer"
                >
                  Hapus Kartu
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                value={formData.rfid_uid}
                onChange={(e) => setFormData({ ...formData, rfid_uid: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                placeholder="Contoh: E28068A1 atau tempelkan kartu ke reader..."
                className="w-full pl-8 pr-3 py-2 text-xs border border-indigo-200 dark:border-indigo-800 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono uppercase tracking-wider"
              />
              <CreditCard className="w-4 h-4 text-indigo-400 absolute left-2.5 top-2.5" />
            </div>
            <p className="text-[10px] text-indigo-700/80 dark:text-indigo-400/80 mt-1">
              💡 <strong>Tip Cepat:</strong> Klik kolom ini lalu tempelkan kartu RFID siswa pada alat USB RFID Reader untuk mengisi otomatis.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">No. WhatsApp / HP Orang Tua</label>
            <input
              type="text"
              value={formData.no_hp_ortu || ''}
              onChange={(e) => setFormData({ ...formData, no_hp_ortu: e.target.value })}
              placeholder="Contoh: 08123456789 atau 628123456789"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-600 font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1">Digunakan untuk pengiriman notifikasi presensi langsung ke WhatsApp orang tua.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">URL Foto Profil</label>
            <input
              type="text"
              value={formData.foto || ''}
              onChange={(e) => setFormData({ ...formData, foto: e.target.value })}
              placeholder="https://..."
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status Keaktifan</label>
            <select
              value={formData.status || 'aktif'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'aktif' | 'nonaktif' })}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-600"
            >
              <option value="aktif">Aktif (Bisa Absen)</option>
              <option value="nonaktif">Nonaktif (Ditolak Saat Absen)</option>
            </select>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900 text-[11px] text-blue-700 dark:text-blue-300 space-y-1">
            <p className="font-bold">Tips Pemindaian Siswa Manual:</p>
            <p>Siswa baru yang ditambahkan bisa langsung dipindai menggunakan <strong>ID QR</strong>, <strong>NISN</strong>, atau <strong>Nama Lengkap</strong> pada scanner piket.</p>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md"
            >
              Simpan Data
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
