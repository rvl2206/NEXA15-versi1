import React, { useState, useEffect, useRef } from 'react';
import { X, Radio, CreditCard, Camera, Upload, Trash2, CheckCircle2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Student } from '../types';
import { toast } from '../lib/toast';
import { store } from '../lib/store';
import { uploadProfilePhotoToSupabase } from '../lib/supabase';

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingStudent: Student | null;
  students: Student[];
  onSave: (formattedData: Omit<Student, 'id' | 'createdAt'>, isEdit: boolean) => void;
}

function compressImageFile(file: File, maxWidth = 800, quality = 0.85): Promise<Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', quality);
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
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
    nis: '',
    nik: '',
    kelas: '',
    tempat_lahir: 'Ambon',
    tanggal_lahir: '',
    jenis_kelamin: 'L',
    agama: 'Islam',
    alamat: '',
    rfid_uid: '',
    id_qr: '',
    status: 'aktif',
    no_hp_ortu: '',
    foto: '',
  });

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('File Tidak Valid', 'Silakan pilih file gambar (JPG, PNG, WEBP).');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const compressedBlob = await compressImageFile(file, 800, 0.85);
      const nisnIdentifier = formData.nisn.trim() || `siswa_${Date.now()}`;
      const uploadRes = await uploadProfilePhotoToSupabase(
        compressedBlob,
        'siswa',
        nisnIdentifier,
        store.getSupabaseConfig()
      );

      if (uploadRes.success && uploadRes.publicUrl) {
        setFormData((prev) => ({ ...prev, foto: uploadRes.publicUrl }));
        toast.success('Foto Terunggah', 'Foto profil siswa tersimpan di Cloud Storage.');
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          setFormData((prev) => ({ ...prev, foto: reader.result as string }));
          toast.info('Foto Disimpan Lokal', 'Foto disimpan lokal (Supabase Storage offline).');
        };
        reader.readAsDataURL(compressedBlob);
      }
    } catch (err: any) {
      toast.error('Gagal Mengunggah', err?.message || 'Terjadi kesalahan saat memproses foto.');
    } finally {
      setIsUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (editingStudent) {
        setFormData({
          nama: editingStudent.nama,
          nisn: editingStudent.nisn,
          nis: editingStudent.nis || '',
          nik: editingStudent.nik || '',
          kelas: editingStudent.kelas,
          tempat_lahir: editingStudent.tempat_lahir || 'Ambon',
          tanggal_lahir: editingStudent.tanggal_lahir || '',
          jenis_kelamin: editingStudent.jenis_kelamin || 'L',
          agama: editingStudent.agama || 'Islam',
          alamat: editingStudent.alamat || '',
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
          nis: '',
          nik: '',
          kelas: '',
          tempat_lahir: 'Ambon',
          tanggal_lahir: '',
          jenis_kelamin: 'L',
          agama: 'Islam',
          alamat: '',
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

    // Check if another student or teacher already uses this RFID UID
    if (cleanRfid) {
      const match = store.findByRfidUid(cleanRfid);
      if (match) {
        if (match.type === 'siswa' && match.student?.id !== editingStudent?.id) {
          toast.error('UID RFID Sudah Dipakai', `Kartu RFID [${cleanRfid}] sudah digunakan oleh Siswa ${match.student?.nama} (${match.student?.kelas}).`);
          return;
        }
        if (match.type === 'guru') {
          toast.error('UID RFID Sudah Dipakai', `Kartu RFID [${cleanRfid}] sudah digunakan oleh Guru ${match.teacher?.nama} (${match.teacher?.jabatan}).`);
          return;
        }
      }
    }

    const currentNpsn = store.getSettings()?.schoolNPSN?.trim() || '69933068';
    const formattedData = {
      ...formData,
      nama: formData.nama.trim(),
      nisn: formData.nisn.trim(),
      id_qr: `${currentNpsn}.${formData.nisn.trim()}.${formData.nama.trim()}`,
      rfid_uid: cleanRfid || undefined,
    };

    onSave(formattedData, !!editingStudent);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0b1121]/95 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-2xl shadow-xl border border-white/10 max-w-lg w-full overflow-hidden transition-colors">
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
                className="w-full px-3 py-2 text-xs border border-white/10 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-600 font-mono bg-black/20 backdrop-blur-md"
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
                className="w-full px-3 py-2 text-xs border border-white/10 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-600 font-mono"
                placeholder="Contoh: 0081234567"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">Nomor Induk Siswa Nasional.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">NIS Lokal (Opsional)</label>
              <input
                type="text"
                value={formData.nis || ''}
                onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                placeholder="Kosong = NISN"
                className="w-full px-3 py-2 text-xs border border-white/10 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-600 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">NIK (16 Digit KTP/KK)</label>
              <input
                type="text"
                value={formData.nik || ''}
                onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                placeholder="Contoh: 817102..."
                maxLength={16}
                className="w-full px-3 py-2 text-xs border border-white/10 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-600 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Kelas</label>
              <input
                type="text"
                value={formData.kelas}
                onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                placeholder="Contoh: X IPA 1, XI MIPA 2, XII IPS 3"
                className="w-full px-3 py-2 text-xs border border-white/10 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-600"
                required
              />
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
              className="w-full px-3 py-2 text-xs border border-white/10 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-600 uppercase"
              required
            />
          </div>

          {/* Biodata Siswa untuk Kartu Pelajar Resmi */}
          <div className="p-3 bg-blue-50/40 dark:bg-slate-900/60 rounded-xl border border-blue-100 dark:border-slate-800 space-y-2.5">
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block uppercase tracking-wider">
              Biodata Kartu Pelajar (Sisi Depan)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Tempat Lahir</label>
                <input
                  type="text"
                  value={formData.tempat_lahir || ''}
                  onChange={(e) => setFormData({ ...formData, tempat_lahir: e.target.value })}
                  placeholder="Contoh: Ambon"
                  className="w-full px-2.5 py-1.5 text-xs border border-white/10 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Tanggal Lahir</label>
                <input
                  type="date"
                  value={formData.tanggal_lahir || ''}
                  onChange={(e) => setFormData({ ...formData, tanggal_lahir: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-white/10 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Jenis Kelamin</label>
                <select
                  value={formData.jenis_kelamin || 'L'}
                  onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-white/10 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Agama</label>
                <select
                  value={formData.agama || 'Islam'}
                  onChange={(e) => setFormData({ ...formData, agama: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-white/10 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="Islam">Islam</option>
                  <option value="Kristen Protestan">Kristen Protestan</option>
                  <option value="Katolik">Katolik</option>
                  <option value="Hindu">Hindu</option>
                  <option value="Buddha">Buddha</option>
                  <option value="Konghucu">Konghucu</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Alamat Tinggal Siswa</label>
              <input
                type="text"
                value={formData.alamat || ''}
                onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                placeholder="Contoh: Jl. Ir. M. Putuhena, Kota Ambon"
                className="w-full px-2.5 py-1.5 text-xs border border-white/10 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-600"
              />
            </div>
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
              className="w-full px-3 py-2 text-xs border border-white/10 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-600 font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1">Digunakan untuk pengiriman notifikasi presensi langsung ke WhatsApp orang tua.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-blue-500" />
                Foto Profil Siswa
              </span>
              {formData.foto && formData.foto.startsWith('http') && (
                <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Cloud Storage
                </span>
              )}
            </label>

            <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-800 border border-white/10 shrink-0 flex items-center justify-center">
                {formData.foto ? (
                  <img
                    src={formData.foto}
                    alt={formData.nama || 'Siswa'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '';
                    }}
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-slate-500" />
                )}
                {isUploadingPhoto && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isUploadingPhoto}
                    onClick={() => photoInputRef.current?.click()}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingPhoto ? 'Mengunggah...' : 'Pilih Foto'}</span>
                  </button>

                  {formData.foto && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, foto: '' })}
                      className="px-2.5 py-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.foto || ''}
                  onChange={(e) => setFormData({ ...formData, foto: e.target.value })}
                  placeholder="Atau tempel URL gambar (https://...)"
                  className="w-full px-2.5 py-1 text-[11px] border border-white/10 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-1 focus:ring-blue-600 placeholder-slate-500"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Foto akan dikompresi otomatis dan disimpan di Supabase Storage Bucket ('nexa-photos').
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status Keaktifan</label>
            <select
              value={formData.status || 'aktif'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'aktif' | 'nonaktif' })}
              className="w-full px-3 py-2 text-xs border border-white/10 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-600"
            >
              <option value="aktif">Aktif (Bisa Absen)</option>
              <option value="nonaktif">Nonaktif (Ditolak Saat Absen)</option>
            </select>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900 text-[11px] text-blue-700 dark:text-blue-300 space-y-1">
            <p className="font-bold">Tips Pemindaian Siswa Manual:</p>
            <p>Siswa baru yang ditambahkan bisa langsung dipindai menggunakan <strong>ID QR</strong>, <strong>NISN</strong>, atau <strong>Nama Lengkap</strong> pada scanner piket.</p>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 rounded-lg"
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
