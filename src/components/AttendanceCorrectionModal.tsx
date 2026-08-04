import React, { useState, useEffect } from 'react';
import { AttendanceRecord, Student, AttendanceStatus, AttendanceType } from '../types';
import { store } from '../lib/store';
import { generateWhatsAppMessage, getWhatsAppLink, formatPetugasRole } from '../lib/exportUtils';
import {
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Stethoscope,
  XCircle,
  User,
  Calendar,
  LogIn,
  LogOut,
  Send,
  Sparkles,
  Edit3,
  Check,
  ShieldCheck,
} from 'lucide-react';

interface AttendanceCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialRecord?: AttendanceRecord | null;
  initialStudent?: Student | null;
  initialDate?: string; // YYYY-MM-DD or DD-MM-YYYY
  currentOfficer: string;
}

export const AttendanceCorrectionModal: React.FC<AttendanceCorrectionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialRecord,
  initialStudent,
  initialDate,
  currentOfficer,
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  // Form State
  const [tanggal, setTanggal] = useState<string>('');
  const [jenis, setJenis] = useState<AttendanceType>('Masuk');
  const [status, setStatus] = useState<AttendanceStatus>('Hadir');
  const [jamScan, setJamScan] = useState<string>('07:00');
  const [terlambatMenit, setTerlambatMenit] = useState<number>(0);
  const [catatan, setCatatan] = useState<string>('');
  const [petugas, setPetugas] = useState<string>('');
  const [sendWaNotif, setSendWaNotif] = useState<boolean>(false);

  // Helper to extract time string "HH:mm" from timestamp or date
  const extractJamFromRecord = (rec: AttendanceRecord | null | undefined): string => {
    if (!rec || !rec.timestamp) return '07:00';
    try {
      const d = new Date(rec.timestamp);
      if (isNaN(d.getTime())) return '07:00';
      const timeStr = d.toLocaleTimeString('en-US', { timeZone: 'Asia/Jayapura', hour12: false });
      const parts = timeStr.split(':');
      if (parts.length >= 2) {
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
      }
    } catch {}
    return '07:00';
  };

  // Helper to normalize date to YYYY-MM-DD for input[type="date"]
  const formatForDateInput = (dStr?: string): string => {
    if (!dStr) {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    if (dStr.includes('T')) dStr = dStr.split('T')[0];
    const parts = dStr.split(/[-/.]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else if (parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return dStr;
  };

  useEffect(() => {
    const allStudents = store.getStudents();
    setStudents(allStudents);
    setPetugas(formatPetugasRole(currentOfficer) || 'Petugas Piket');

    if (initialRecord) {
      setSelectedRecordId(initialRecord.id);
      const foundStd = allStudents.find(
        (s) => s.nisn === initialRecord.nisn || s.id_qr === initialRecord.id_qr || s.nama === initialRecord.nama
      );
      if (foundStd) setSelectedStudentId(foundStd.id);

      setTanggal(formatForDateInput(initialRecord.tanggal || initialRecord.timestamp));
      setJenis(initialRecord.jenis || 'Masuk');
      setStatus(initialRecord.status || 'Hadir');
      setJamScan(extractJamFromRecord(initialRecord));
      setTerlambatMenit(initialRecord.terlambatMenit || 0);
      setCatatan(initialRecord.catatan || 'Koreksi Kehadiran');
    } else {
      setSelectedRecordId(null);
      if (initialStudent) {
        setSelectedStudentId(initialStudent.id);
      } else if (allStudents.length > 0) {
        setSelectedStudentId(allStudents[0].id);
      }
      setTanggal(formatForDateInput(initialDate));
      setJenis('Masuk');
      setStatus('Hadir');
      setJamScan('07:00');
      setTerlambatMenit(0);
      setCatatan('Koreksi Kehadiran');
    }
  }, [initialRecord, initialStudent, initialDate, currentOfficer, isOpen]);

  // Recalculate late minutes when status or jamScan changes
  useEffect(() => {
    if (status === 'Terlambat') {
      const cutoffTime = store.getSettings().cutoffTime || '07:15';
      const [cutoffH, cutoffM] = cutoffTime.split(':').map(Number);
      const [scanH, scanM] = jamScan.split(':').map(Number);
      if (!isNaN(cutoffH) && !isNaN(scanH)) {
        const cutoffTotalMin = cutoffH * 60 + cutoffM;
        const scanTotalMin = scanH * 60 + scanM;
        if (scanTotalMin > cutoffTotalMin) {
          setTerlambatMenit(scanTotalMin - cutoffTotalMin);
        } else {
          setTerlambatMenit(1);
        }
      }
    } else {
      setTerlambatMenit(0);
    }
  }, [status, jamScan]);

  const [isSaving, setIsSaving] = useState(false);

  const currentStudent = React.useMemo(() => {
    return students.find((s) => s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  // Check if a record exists for this student on this date and jenis (memoized)
  const existingRecordForForm = React.useMemo(() => {
    if (initialRecord) return initialRecord;
    if (!currentStudent) return null;
    const targetDate = store.normalizeToYyyyMmDd(tanggal);
    const allAttendance = store.getAttendance();
    return allAttendance.find((a) => {
      const matchIdentity = (a.nisn && a.nisn === currentStudent.nisn) || (a.nama && a.nama === currentStudent.nama);
      const matchDate = store.normalizeToYyyyMmDd(a.tanggal) === targetDate;
      const matchJenis = a.jenis === jenis;
      return matchIdentity && matchDate && matchJenis;
    }) || null;
  }, [initialRecord, currentStudent, tanggal, jenis]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent) {
      alert('Silakan pilih siswa terlebih dahulu.');
      return;
    }
    if (isSaving) return;

    setIsSaving(true);

    try {
      let resultRecord: AttendanceRecord | null = null;

      if (existingRecordForForm && existingRecordForForm.id) {
        // Update existing record
        await store.updateAttendanceRecord(existingRecordForForm.id, {
          status,
          jenis,
          tanggal,
          catatan,
          terlambatMenit: status === 'Terlambat' ? terlambatMenit : 0,
          petugas: petugas || currentOfficer,
          nama: currentStudent.nama,
          kelas: currentStudent.kelas,
          nisn: currentStudent.nisn,
          id_qr: currentStudent.id_qr,
        });
        resultRecord = {
          ...existingRecordForForm,
          status,
          jenis,
          tanggal,
          catatan,
          terlambatMenit: status === 'Terlambat' ? terlambatMenit : 0,
          petugas: petugas || currentOfficer,
        };
      } else {
        // Create new record for this correction
        resultRecord = await store.addManualAttendance({
          tanggal: store.normalizeToYyyyMmDd(tanggal) || store.getTodayFormatted(),
          nisn: currentStudent.nisn,
          nama: currentStudent.nama,
          kelas: currentStudent.kelas,
          id_qr: currentStudent.id_qr,
          jenis,
          status,
          petugas: petugas || currentOfficer,
          catatan,
          terlambatMenit: status === 'Terlambat' ? terlambatMenit : 0,
        });
      }

      // Send WhatsApp notification if checked and phone exists
      if (sendWaNotif && currentStudent && resultRecord) {
        let phone = currentStudent.no_hp_ortu;
        if (!phone) {
          phone = prompt(`Masukkan No. WhatsApp Orang Tua untuk ${currentStudent.nama}:`, '08123456789') || undefined;
          if (phone && phone.trim()) {
            store.updateStudent(currentStudent.id, { no_hp_ortu: phone.trim() });
            currentStudent.no_hp_ortu = phone.trim();
          }
        }
        if (phone) {
          const schoolSettings = store.getSettings();
          let template: string | undefined;
          if (status === 'Hadir') template = schoolSettings.waTemplateHadir;
          else if (status === 'Terlambat') template = schoolSettings.waTemplateTerlambat;
          else if (status === 'Izin' || status === 'Sakit') template = schoolSettings.waTemplateIzinSakit;
          else if (status === 'Alpa') template = schoolSettings.waTemplateAlpa;

          const schoolName = schoolSettings.schoolName || 'SMA NEGERI 15 AMBON';
          const waMsg = generateWhatsAppMessage(currentStudent, resultRecord, schoolName, template);
          const waUrl = getWhatsAppLink(phone, waMsg);
          window.open(waUrl, '_blank');
        }
      }

      if (onSuccess) onSuccess();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadgeIcon = (s: AttendanceStatus) => {
    switch (s) {
      case 'Hadir':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'Terlambat':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'Izin':
        return <FileCheck className="w-4 h-4 text-blue-600" />;
      case 'Sakit':
        return <Stethoscope className="w-4 h-4 text-purple-600" />;
      case 'Alpa':
        return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full overflow-hidden my-auto transition-colors animate-fadeIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-4 sm:p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/20">
              <Edit3 className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                  Koreksi Data Kehadiran Siswa
                </h3>
                <span className="text-[10px] font-bold uppercase bg-blue-500/30 text-blue-100 border border-blue-400/30 px-2 py-0.5 rounded-full">
                  Status & Jam Scan
                </span>
              </div>
              <p className="text-xs text-blue-100/90 mt-0.5">
                Ubah atau sesuaikan status kehadiran dan jam scan absensi harian secara resmi.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Siswa Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Target Siswa:</span>
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                setSelectedRecordId(null);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              required
            >
              <option value="">-- Pilih Siswa --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama} ({s.kelas}) - NISN: {s.nisn}
                </option>
              ))}
            </select>
          </div>

          {/* Tanggal & Jenis Scan Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Tanggal Absensi:</span>
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                <span>Jenis Scan:</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setJenis('Masuk')}
                  className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all border ${
                    jenis === 'Masuk'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Scan Masuk</span>
                </button>
                <button
                  type="button"
                  onClick={() => setJenis('Pulang')}
                  className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all border ${
                    jenis === 'Pulang'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Scan Pulang</span>
                </button>
              </div>
            </div>
          </div>

          {/* Status Kehadiran Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Status Kehadiran Hasil Koreksi:
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[
                { key: 'Hadir', label: 'Hadir', color: 'emerald' },
                { key: 'Terlambat', label: 'Terlambat', color: 'amber' },
                { key: 'Izin', label: 'Izin', color: 'blue' },
                { key: 'Sakit', label: 'Sakit', color: 'purple' },
                { key: 'Alpa', label: 'Alpa', color: 'red' },
              ].map((item) => {
                const isSelected = status === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setStatus(item.key as AttendanceStatus)}
                    className={`py-2 px-2 rounded-xl font-extrabold text-[11px] flex flex-col items-center justify-center gap-1 transition-all border ${
                      isSelected
                        ? item.key === 'Hadir'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300'
                          : item.key === 'Terlambat'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-300'
                          : item.key === 'Izin'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300'
                          : item.key === 'Sakit'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-300'
                          : 'bg-red-600 text-white border-red-600 shadow-md ring-2 ring-red-300'
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200/80'
                    }`}
                  >
                    <div className={isSelected ? 'text-white' : ''}>
                      {getStatusBadgeIcon(item.key as AttendanceStatus)}
                    </div>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Jam Scan & Late Minutes Row */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Koreksi Jam Scan (Waktu WIT):</span>
                </label>
                <input
                  type="time"
                  value={jamScan}
                  onChange={(e) => setJamScan(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold"
                  required
                />
              </div>

              {status === 'Terlambat' && (
                <div>
                  <label className="block text-[11px] font-bold text-amber-700 dark:text-amber-300 mb-1">
                    Durasi Keterlambatan (Menit):
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={300}
                    value={terlambatMenit}
                    onChange={(e) => setTerlambatMenit(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-1.5 text-xs border border-amber-300 dark:border-amber-700 rounded-lg focus:ring-2 focus:ring-amber-500 bg-amber-50/50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold"
                  />
                </div>
              )}
            </div>

            {/* Jam Scan Shortcut Buttons */}
            <div>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                Pilihan Waktu Pintas:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {['06:45', '07:00', '07:15', '07:30', '08:00', '12:30', '13:30'].map((timeStr) => (
                  <button
                    key={timeStr}
                    type="button"
                    onClick={() => setJamScan(timeStr)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition-all border ${
                      jamScan === timeStr
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {timeStr}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Alasan / Catatan Koreksi */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Catatan / Alasan Koreksi Kehadiran:
            </label>
            <input
              type="text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Koreksi salah jam scan piket, Dispensasi lomba OSIS"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
            {/* Presets */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {[
                'Koreksi salah jam scan',
                'Dispensasi Kegiatan Lomba',
                'Penyerahan Surat Izin Ortu',
                'Pemeriksaan UKS Sekolah',
                'Lupa Scan QR Code',
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCatatan(preset)}
                  className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-400 rounded text-[10px] transition-colors"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Officer & WhatsApp Checkbox */}
          <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200/80 dark:border-blue-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold text-blue-900 dark:text-blue-200 block">
                Petugas Eksekutor Koreksi:
              </span>
              <span className="text-[10px] text-blue-700 dark:text-blue-300 font-semibold">
                {formatPetugasRole(petugas || currentOfficer) || 'Petugas Piket'}
              </span>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-[11px] font-bold text-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={sendWaNotif}
                onChange={(e) => setSendWaNotif(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                <Send className="w-3.5 h-3.5" />
                <span>Kirim WA Baru ke Orang Tua</span>
              </span>
            </label>
          </div>

          {/* Submit & Cancel Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <ShieldCheck className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Koreksi Kehadiran'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
