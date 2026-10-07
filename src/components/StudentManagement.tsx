import React, { useState, useEffect, useRef, useMemo, useDeferredValue } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { store, isGenericQrCode } from '../lib/store';
import { toast } from '../lib/toast';
import { Student, UserRole, AttendanceRecord, Teacher } from '../types';
import {
  exportStudentListToExcel,
  exportStudentListToCSV,
  downloadStudentImportTemplate,
  parseStudentImportFile,
  printElement,
  getWhatsAppLink,
  generateWhatsAppMessage,
} from '../lib/exportUtils';
import { SchoolLogo } from './SchoolLogo';
import { StudentImportModal } from './StudentImportModal';
import { StudentMassPrintModal } from './StudentMassPrintModal';
import { StudentFormModal } from './StudentFormModal';
import { StudentBatchMoveModal } from './StudentBatchMoveModal';
import { StudentBatchDeleteModal } from './StudentBatchDeleteModal';
import { StudentDeleteConfirmModal } from './StudentDeleteConfirmModal';
import { StudentRfidBindModal } from './StudentRfidBindModal';
import { StudentQrPrintModal } from './StudentQrPrintModal';
import { StudentClearAllModal } from './StudentClearAllModal';
import { OfficialStudentIDCardFront, OfficialStudentIDCardBack } from './OfficialStudentIDCard';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  QrCode,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  X,
  Printer,
  Sparkles,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  Check,
  RotateCcw,
  FileText,
  Layers,
  Clock,
  FileCheck,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  MessageCircle,
  Radio,
  Smartphone,
  CheckCircle2,
  Archive,
  RefreshCw,
} from 'lucide-react';

export function getGradeFromClass(kelasStr: string): string {
  if (!kelasStr) return 'Lainnya';
  const clean = kelasStr.trim();
  const match = clean.match(/^(XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I|\d+)/i);
  if (match) {
    return match[1].toUpperCase();
  }
  const firstWord = clean.split(/\s+/)[0].toUpperCase();
  return firstWord || 'Lainnya';
}

interface StudentManagementProps {
  userRole?: UserRole;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({ userRole = 'Admin' }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [selectedTingkat, setSelectedTingkat] = useState('Semua');
  const [selectedKelas, setSelectedKelas] = useState('Semua');
  const [selectedAccountStatus, setSelectedAccountStatus] = useState('Semua');
  const [selectedAttendanceStatus, setSelectedAttendanceStatus] = useState('Semua');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [qrModalStudent, setQrModalStudent] = useState<Student | null>(null);

  // RFID Card Binding State
  const [rfidBindStudent, setRfidBindStudent] = useState<Student | null>(null);
  const [rfidInputVal, setRfidInputVal] = useState('');
  const [rfidConflict, setRfidConflict] = useState<{
    type: 'siswa' | 'guru';
    student?: Student;
    teacher?: Teacher;
  } | null>(null);
  const [isNfcActive, setIsNfcActive] = useState(false);
  const rfidInputRef = useRef<HTMLInputElement>(null);

  // Selection & Batch Delete State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [isBatchMoveModalOpen, setIsBatchMoveModalOpen] = useState(false);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);

  // Import Excel Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<Omit<Student, 'id' | 'createdAt'>[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importTotalRows, setImportTotalRows] = useState(0);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mass Card Print State
  const [isMassPrintModalOpen, setIsMassPrintModalOpen] = useState(false);
  const [massPrintSelectedIds, setMassPrintSelectedIds] = useState<string[]>([]);

  // Export Dropdown State & Handlers
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  const handleExportExcel = (customList?: Student[]) => {
    const target =
      customList ||
      (selectedIds.length > 0
        ? students.filter((s) => selectedIds.includes(s.id))
        : filteredStudents);
    const classLabel =
      selectedKelas !== 'Semua' ? `Kelas_${selectedKelas.replace(/\s+/g, '_')}` : '';
    const searchLabel = searchTerm ? `Filter_Cari` : '';
    const prefix = `Data_Siswa_NEXA15${classLabel ? '_' + classLabel : ''}${searchLabel ? '_' + searchLabel : ''}`;
    exportStudentListToExcel(target, prefix);
  };

  const handleExportCSV = (customList?: Student[]) => {
    const target =
      customList ||
      (selectedIds.length > 0
        ? students.filter((s) => selectedIds.includes(s.id))
        : filteredStudents);
    const classLabel =
      selectedKelas !== 'Semua' ? `Kelas_${selectedKelas.replace(/\s+/g, '_')}` : '';
    const searchLabel = searchTerm ? `Filter_Cari` : '';
    const prefix = `Data_Siswa_NEXA15${classLabel ? '_' + classLabel : ''}${searchLabel ? '_' + searchLabel : ''}`;
    exportStudentListToCSV(target, prefix);
  };

  const handleOpenMassPrint = (preselectedIds?: string[]) => {
    const listToUse =
      preselectedIds && preselectedIds.length > 0
        ? preselectedIds
        : filteredStudents.map((s) => s.id);
    setMassPrintSelectedIds(listToUse);
    setIsMassPrintModalOpen(true);
  };

  const handlePrintAllQRCodes = () => {
    setMassPrintSelectedIds(students.map((s) => s.id));
    setIsMassPrintModalOpen(true);
  };

  // Form State
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setStudents(store.getStudents());
    setAttendance(store.getAttendance());
    store.fetchFromServer();
    const unsubscribe = store.subscribe(() => {
      setStudents(store.getStudents());
      setAttendance(store.getAttendance());
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (rfidBindStudent) {
      setRfidInputVal(rfidBindStudent.rfid_uid || '');
      setRfidConflict(null);
      setIsNfcActive(false);
      const timer = setTimeout(() => {
        rfidInputRef.current?.focus();
        rfidInputRef.current?.select();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [rfidBindStudent]);

  const { hexFormatted, decFormatted } = useMemo(() => {
    const clean = rfidInputVal
      .trim()
      .toUpperCase()
      .replace(/[\s:-]/g, '');
    if (!clean) return { hexFormatted: '', decFormatted: '' };

    let hex = '';
    let dec = '';

    // Check if input is hex
    if (/^[0-9A-F]+$/.test(clean)) {
      if (clean.length <= 8) {
        try {
          const decNum = parseInt(clean, 16);
          if (!isNaN(decNum)) {
            dec = String(decNum).padStart(10, '0');
            hex = clean.padStart(8, '0');
          }
        } catch {}
      } else {
        hex = clean;
      }
    }

    // Check if input is decimal
    if (/^\d+$/.test(clean)) {
      try {
        const decVal = parseInt(clean, 10);
        if (!isNaN(decVal)) {
          const hexStr = decVal.toString(16).toUpperCase();
          if (!hex) hex = hexStr.padStart(8, '0');
          if (!dec) dec = clean.padStart(10, '0');
        }
      } catch {}
    }

    return { hexFormatted: hex, decFormatted: dec };
  }, [rfidInputVal]);

  const handleTingkatChange = (tingkat: string) => {
    setSelectedTingkat(tingkat);
    if (tingkat !== 'Semua' && selectedKelas !== 'Semua') {
      const matchingClasses = students
        .filter((s) => getGradeFromClass(s.kelas) === tingkat)
        .map((s) => s.kelas);
      if (!matchingClasses.includes(selectedKelas)) {
        setSelectedKelas('Semua');
      }
    }
  };

  const gradeOptions = useMemo(() => {
    const grades = new Set<string>();
    students.forEach((s) => {
      const g = getGradeFromClass(s.kelas);
      if (g) grades.add(g);
    });
    const order = [
      'X',
      'XI',
      'XII',
      'VII',
      'VIII',
      'IX',
      '10',
      '11',
      '12',
      '7',
      '8',
      '9',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
    ];
    return Array.from(grades).sort((a, b) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [students]);

  const classOptions = useMemo(() => {
    let list = students;
    if (selectedTingkat !== 'Semua') {
      list = students.filter((s) => getGradeFromClass(s.kelas) === selectedTingkat);
    }
    const classCounts = new Map<string, number>();
    list.forEach((s) => {
      if (s.kelas) {
        classCounts.set(s.kelas, (classCounts.get(s.kelas) || 0) + 1);
      }
    });
    return Array.from(classCounts.keys())
      .sort()
      .map((c) => ({
        name: c,
        count: classCounts.get(c) || 0,
      }));
  }, [students, selectedTingkat]);

  // Fast O(1) attendance lookup map instead of scanning full attendance array on every student
  const todayAttendanceMap = useMemo(() => {
    const todayMap = new Map<string, AttendanceRecord>();
    const fallbackMap = new Map<string, AttendanceRecord>();

    for (let i = 0; i < attendance.length; i++) {
      const a = attendance[i];
      const isToday = store.isRecordForToday(a);
      const nisn = (a.nisn || '').trim();
      const idQr = (a.id_qr || '').trim();
      const namaKelas = `${(a.nama || '').trim().toLowerCase()}_${(a.kelas || '').trim().toLowerCase()}`;

      const targetMap = isToday ? todayMap : fallbackMap;

      if (nisn && !targetMap.has(`nisn:${nisn}`)) targetMap.set(`nisn:${nisn}`, a);
      if (idQr && !isGenericQrCode(idQr) && !targetMap.has(`qr:${idQr.toLowerCase()}`))
        targetMap.set(`qr:${idQr.toLowerCase()}`, a);
      if (namaKelas && !targetMap.has(`namakelas:${namaKelas}`))
        targetMap.set(`namakelas:${namaKelas}`, a);
    }

    return { todayMap, fallbackMap };
  }, [attendance]);

  const getStudentTodayAttendance = (student: Student): AttendanceRecord | undefined => {
    const targetNisn = (student.nisn || '').trim();
    const targetQr = (student.id_qr || '').trim();
    const targetNamaKelas = `${(student.nama || '').trim().toLowerCase()}_${(student.kelas || '').trim().toLowerCase()}`;

    const { todayMap, fallbackMap } = todayAttendanceMap;

    if (targetNisn && todayMap.has(`nisn:${targetNisn}`)) return todayMap.get(`nisn:${targetNisn}`);
    if (targetQr && !isGenericQrCode(targetQr) && todayMap.has(`qr:${targetQr.toLowerCase()}`))
      return todayMap.get(`qr:${targetQr.toLowerCase()}`);
    if (targetNamaKelas && todayMap.has(`namakelas:${targetNamaKelas}`))
      return todayMap.get(`namakelas:${targetNamaKelas}`);

    if (targetNisn && fallbackMap.has(`nisn:${targetNisn}`))
      return fallbackMap.get(`nisn:${targetNisn}`);
    if (targetQr && !isGenericQrCode(targetQr) && fallbackMap.has(`qr:${targetQr.toLowerCase()}`))
      return fallbackMap.get(`qr:${targetQr.toLowerCase()}`);
    if (targetNamaKelas && fallbackMap.has(`namakelas:${targetNamaKelas}`))
      return fallbackMap.get(`namakelas:${targetNamaKelas}`);

    return undefined;
  };

  const filteredStudents = useMemo(() => {
    const term = deferredSearchTerm.toLowerCase().trim();

    return students.filter((s) => {
      // 1. Text Search
      const matchSearch =
        !term ||
        s.nama.toLowerCase().includes(term) ||
        s.id.toLowerCase().includes(term) ||
        s.nisn.toLowerCase().includes(term) ||
        s.id_qr.toLowerCase().includes(term) ||
        (s.rfid_uid && s.rfid_uid.toLowerCase().includes(term)) ||
        s.kelas.toLowerCase().includes(term);

      if (!matchSearch) return false;

      // 2. Grade Level (Tingkat) match
      if (selectedTingkat !== 'Semua') {
        const grade = getGradeFromClass(s.kelas);
        if (grade !== selectedTingkat) return false;
      }

      // 3. Class section (Kelas) match
      if (selectedKelas !== 'Semua') {
        if (s.kelas !== selectedKelas) return false;
      }

      // 4. Account Status match
      if (selectedAccountStatus !== 'Semua') {
        if (s.status !== selectedAccountStatus) return false;
      }

      // 5. Attendance Status match
      if (selectedAttendanceStatus !== 'Semua') {
        const todayRec = getStudentTodayAttendance(s);
        const isToday = todayRec ? store.isRecordForToday(todayRec) : false;
        const currentStatus = isToday && todayRec ? todayRec.status : 'Belum Absen';

        if (selectedAttendanceStatus === 'Hadir_All') {
          if (currentStatus !== 'Hadir' && currentStatus !== 'Terlambat') return false;
        } else if (selectedAttendanceStatus === 'Excused') {
          if (currentStatus !== 'Izin' && currentStatus !== 'Sakit') return false;
        } else if (currentStatus !== selectedAttendanceStatus) {
          return false;
        }
      }

      return true;
    });
  }, [
    students,
    deferredSearchTerm,
    selectedTingkat,
    selectedKelas,
    selectedAccountStatus,
    selectedAttendanceStatus,
    todayAttendanceMap,
  ]);

  const hasActiveFilters =
    searchTerm !== '' ||
    selectedTingkat !== 'Semua' ||
    selectedKelas !== 'Semua' ||
    selectedAccountStatus !== 'Semua' ||
    selectedAttendanceStatus !== 'Semua';

  const resetAllFilters = () => {
    setSearchTerm('');
    setSelectedTingkat('Semua');
    setSelectedKelas('Semua');
    setSelectedAccountStatus('Semua');
    setSelectedAttendanceStatus('Semua');
  };

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedTingkat,
    selectedKelas,
    selectedAccountStatus,
    selectedAttendanceStatus,
    pageSize,
  ]);

  const totalStudentsCount = filteredStudents.length;
  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(totalStudentsCount / pageSize));

  const paginatedStudents = useMemo(() => {
    if (pageSize === 0) return filteredStudents;
    const startIdx = (currentPage - 1) * pageSize;
    return filteredStudents.slice(startIdx, startIdx + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  // Select All Checkbox Handler
  const isAllSelected =
    filteredStudents.length > 0 && filteredStudents.every((s) => selectedIds.includes(s.id));

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map((s) => s.id));
    }
  };

  const handleSelectStudent = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleConfirmBatchDelete = () => {
    if (selectedIds.length > 0) {
      store.deleteMultipleStudents(selectedIds);
      setSelectedIds([]);
      setIsBatchDeleteModalOpen(false);
    }
  };

  const handleConfirmBatchMove = async (targetClass: string) => {
    if (selectedIds.length > 0 && targetClass) {
      await store.updateMultipleStudents(selectedIds, { kelas: targetClass });
      setSelectedIds([]);
      setIsBatchMoveModalOpen(false);
    }
  };

  const handleConfirmClearAll = () => {
    store.deleteAllStudents();
    setSelectedIds([]);
    setIsClearAllModalOpen(false);
  };

  // Import Handlers
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const selected = files[0];
      setImportFile(selected);
      setIsParsing(true);
      const res = await parseStudentImportFile(selected);
      setIsParsing(false);
      setImportPreview(res.data);
      setImportErrors(res.errors);
      setImportTotalRows(res.totalRows);
    }
  };

  const handleExecuteImport = () => {
    if (importPreview.length === 0) return;
    store.importStudents(importPreview, importMode);
    setIsImportModalOpen(false);
    setImportFile(null);
    setImportPreview([]);
    setImportErrors([]);
  };

  const resetImportModal = () => {
    setImportFile(null);
    setImportPreview([]);
    setImportErrors([]);
    setImportTotalRows(0);
    setIsImportModalOpen(false);
  };

  const handleOpenAdd = () => {
    setEditingStudent(null);
    const newNISN = String(Math.floor(3000000000 + Math.random() * 900000000));
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Student) => {
    setEditingStudent(s);
    setIsModalOpen(true);
  };

  const handleSaveStudent = (formattedData: Omit<Student, 'id' | 'createdAt'>, isEdit: boolean) => {
    if (isEdit && editingStudent) {
      store.updateStudent(editingStudent.id, formattedData);
      toast.success('Data Diperbarui', `Data siswa ${formattedData.nama} berhasil diperbarui.`);
    } else {
      store.addStudent(formattedData);
      toast.success('Siswa Ditambahkan', `Siswa baru ${formattedData.nama} berhasil didaftarkan.`);
    }
  };
  const handleDeleteClick = (s: Student) => {
    setDeletingStudent(s);
  };

  const confirmDeleteStudent = () => {
    if (deletingStudent) {
      store.deleteStudent(deletingStudent.id);
      setDeletingStudent(null);
    }
  };

  // RFID Binding Handlers & Helpers
  const handleOpenBindRfid = (s: Student) => {
    setRfidBindStudent(s);
    setRfidInputVal(s.rfid_uid || '');
    setRfidConflict(null);
    setIsNfcActive(false);
  };

  const handleRfidInputChange = (val: string) => {
    setRfidInputVal(val);
    const clean = val
      .trim()
      .toUpperCase()
      .replace(/[\s:-]/g, '');
    if (!clean) {
      setRfidConflict(null);
      return;
    }
    const match = store.findByRfidUid(clean);
    if (match) {
      if (match.type === 'siswa' && match.student?.id === rfidBindStudent?.id) {
        setRfidConflict(null);
      } else {
        setRfidConflict(match);
      }
    } else {
      setRfidConflict(null);
    }
  };

  const handleSaveRfidBind = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!rfidBindStudent) return;
    const clean = rfidInputVal
      .trim()
      .toUpperCase()
      .replace(/[\s:-]/g, '');
    if (!clean) {
      toast.error('UID Kosong', 'Silakan ketik atau tempelkan kartu RFID fisik ke reader.');
      return;
    }

    store.assignRfidToStudent(rfidBindStudent.id, clean);
    toast.success(
      'Kartu RFID Ditautkan',
      `Kartu [${clean}] berhasil dipetakan ke profil siswa ${rfidBindStudent.nama} (${rfidBindStudent.kelas}).`,
    );
    setRfidBindStudent(null);
  };

  const handleUnbindRfid = () => {
    if (!rfidBindStudent) return;
    store.updateStudent(rfidBindStudent.id, { rfid_uid: undefined });
    toast.info(
      'Tautan Kartu Dihapus',
      `Kartu RFID untuk siswa ${rfidBindStudent.nama} berhasil dilepas.`,
    );
    setRfidBindStudent(null);
  };

  const handleStartNfcScan = async () => {
    if (typeof window === 'undefined' || !('NDEFReader' in window)) {
      toast.error('NFC Tidak Didukung', 'Browser atau perangkat tidak mendukung Web NFC API.');
      return;
    }
    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();
      setIsNfcActive(true);
      toast.info(
        'NFC Smartphone Aktif',
        'Tempelkan kartu RFID/NFC ke bagian belakang smartphone Anda.',
      );
      ndef.addEventListener('reading', (event: any) => {
        const serial = (event.serialNumber || '').replace(/[:\s-]/g, '').toUpperCase();
        if (serial) {
          handleRfidInputChange(serial);
          toast.success('Kartu Terdeteksi', `UID [${serial}] berhasil dipindai via NFC!`);
        }
      });
    } catch (err: any) {
      setIsNfcActive(false);
      toast.error(
        'Gagal Mengaktifkan NFC',
        err?.message || 'Izin NFC ditolak atau tidak tersedia.',
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl shadow-black/40 relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-xs uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Database Siswa Terintegrasi</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Single DB Admin & Piket ({students.length} Siswa)
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Manajemen Data Siswa & QR
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Database utama siswa terpusat untuk Admin, Guru Piket, & Kepala Sekolah.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            title="Import data siswa dari file Excel / CSV"
          >
            <Upload className="w-4 h-4" />
            <span>Import Excel</span>
          </button>

          {students.length > 0 && (
            <button
              onClick={() => setIsClearAllModalOpen(true)}
              className="px-3.5 py-2.5 bg-red-100 dark:bg-red-950/60 hover:bg-red-200 dark:hover:bg-red-900 text-red-700 dark:text-red-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-red-200 dark:border-red-900"
              title="Hapus keseluruhan data siswa dari database agar bisa di-import ulang tanpa tercatat ganda"
            >
              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span>Hapus Seluruh Data Siswa</span>
            </button>
          )}

          {students.length > 0 && (
            <>
              <button
                onClick={handlePrintAllQRCodes}
                className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                title="Tampilkan & cetak tampilan printable seluruh QR code siswa dalam layout grid"
              >
                <QrCode className="w-4 h-4" />
                <Printer className="w-4 h-4" />
                <span>Cetak Semua QR Code</span>
              </button>

              <button
                onClick={() => handleOpenMassPrint()}
                className="px-3.5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                title="Cetak Kartu Presensi Digital QR secara massal"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Kartu Masal</span>
              </button>
            </>
          )}

          {/* Export Dropdown Menu (Excel & CSV) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              className="px-3.5 py-2.5 bg-white/5 backdrop-blur-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-white/10 shadow-sm"
              title="Unduh Data Siswa (Excel / CSV)"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Export Data Siswa ({filteredStudents.length})</span>
            </button>

            {isExportDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsExportDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-black/20 backdrop-blur-md border border-white/10 rounded-xl shadow-xl z-30 p-1.5 space-y-1 animate-in fade-in zoom-in-95">
                  <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Export ({filteredStudents.length} Siswa Terfilter)
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleExportExcel();
                      setIsExportDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-2.5 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <div>Download Excel (.xlsx)</div>
                      <div className="text-[10px] font-normal text-slate-400">
                        Format Spreadsheet Excel
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleExportCSV();
                      setIsExportDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-2.5 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <div>
                      <div>Download CSV (.csv)</div>
                      <div className="text-[10px] font-normal text-slate-400">
                        Format Teks Komutatif (CSV)
                      </div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Siswa</span>
          </button>
        </div>
      </div>

      {/* Batch Actions Bar (When checkboxes are selected) */}
      {selectedIds.length > 0 && (
        <div className="bg-amber-500/10 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200 font-bold">
            <span className="px-2.5 py-1 bg-amber-500 text-white rounded-lg font-mono">
              {selectedIds.length} Siswa Terpilih
            </span>
            <span>Data siswa terpilih dapat dihapus secara masal sekaligus.</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => handleExportExcel(students.filter((s) => selectedIds.includes(s.id)))}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
              title="Export data siswa terpilih ke Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel ({selectedIds.length})</span>
            </button>
            <button
              type="button"
              onClick={() => handleExportCSV(students.filter((s) => selectedIds.includes(s.id)))}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
              title="Export data siswa terpilih ke CSV (.csv)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export CSV ({selectedIds.length})</span>
            </button>
            <button
              onClick={() => handleOpenMassPrint(selectedIds)}
              className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
              title="Cetak Kartu Presensi Digital untuk siswa terpilih"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Kartu ({selectedIds.length})</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-200/50 rounded-lg transition-colors"
            >
              Batal Pilih
            </button>
            <button
              onClick={() => setIsBatchMoveModalOpen(true)}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Mutasi Kelas ({selectedIds.length})</span>
            </button>
            <button
              onClick={() => setIsBatchDeleteModalOpen(true)}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus {selectedIds.length} Siswa Terpilih</span>
            </button>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-black/20 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/10 shadow-sm space-y-4 transition-colors">
        {/* Top Search Row */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama siswa, NISN, ID QR, atau kelas..."
              className="w-full pl-10 pr-9 py-2.5 text-xs border border-white/10 dark:bg-slate-800/90 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-md transition-colors"
                title="Bersihkan pencarian"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Result Count & Reset Button */}
          <div className="flex items-center justify-between lg:justify-end gap-3 text-xs">
            <span className="text-slate-400 font-medium">
              Menampilkan{' '}
              <strong className="text-blue-600 dark:text-blue-400 font-bold">
                {filteredStudents.length}
              </strong>{' '}
              dari {students.length} siswa
            </span>
            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-[11px] flex items-center gap-1.5 transition-colors border border-white/10 shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-white/10/80">
          {/* 1. Grade Level (Tingkat Kelas) */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Tingkat Kelas
            </label>
            <select
              value={selectedTingkat}
              onChange={(e) => handleTingkatChange(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white/5 backdrop-blur-xl dark:text-white transition-all cursor-pointer font-semibold"
            >
              <option value="Semua">Semua Tingkat ({gradeOptions.length})</option>
              {gradeOptions.map((g) => (
                <option key={g} value={g}>
                  Tingkat {g}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Class Section (Kelas / Rombel) */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Kelas / Section
            </label>
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white/5 backdrop-blur-xl dark:text-white transition-all cursor-pointer font-semibold"
            >
              <option value="Semua">
                {selectedTingkat !== 'Semua'
                  ? `Semua Kelas (Tingkat ${selectedTingkat})`
                  : `Semua Kelas (${classOptions.length})`}
              </option>
              {classOptions.map((c) => (
                <option key={c.name} value={c.name}>
                  Kelas {c.name} ({c.count} Siswa)
                </option>
              ))}
            </select>
          </div>

          {/* 3. Presensi Hari Ini */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Presensi Hari Ini
            </label>
            <select
              value={selectedAttendanceStatus}
              onChange={(e) => setSelectedAttendanceStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white/5 backdrop-blur-xl dark:text-white transition-all cursor-pointer font-semibold"
            >
              <option value="Semua">Semua Status Presensi</option>
              <option value="Hadir_All">🟢 Hadir & Terlambat</option>
              <option value="Hadir">✅ Hadir Tepat Waktu</option>
              <option value="Terlambat">â° Terlambat</option>
              <option value="Excused">â„¹ï¸ Izin & Sakit</option>
              <option value="Izin">📄 Izin</option>
              <option value="Sakit">ðŸ¥ Sakit</option>
              <option value="Alpa">âŒ Alpa / Tanpa Keterangan</option>
              <option value="Belum Absen">â³ Belum Absen Hari Ini</option>
            </select>
          </div>

          {/* 4. Status Akun Siswa */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Status Akun
            </label>
            <select
              value={selectedAccountStatus}
              onChange={(e) => setSelectedAccountStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white/5 backdrop-blur-xl dark:text-white transition-all cursor-pointer font-semibold"
            >
              <option value="Semua">Semua Status Akun</option>
              <option value="aktif">🟢 Aktif</option>
              <option value="nonaktif">🔴 Nonaktif</option>
            </select>
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filter Aktif:
            </span>

            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Pencarian: "{searchTerm}"
                <button
                  onClick={() => setSearchTerm('')}
                  className="hover:text-blue-900 dark:hover:text-white cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedTingkat !== 'Semua' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Tingkat: {selectedTingkat}
                <button
                  onClick={() => setSelectedTingkat('Semua')}
                  className="hover:text-indigo-900 dark:hover:text-white cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedKelas !== 'Semua' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                Kelas: {selectedKelas}
                <button
                  onClick={() => setSelectedKelas('Semua')}
                  className="hover:text-purple-900 dark:hover:text-white cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedAttendanceStatus !== 'Semua' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Presensi: {selectedAttendanceStatus}
                <button
                  onClick={() => setSelectedAttendanceStatus('Semua')}
                  className="hover:text-emerald-900 dark:hover:text-white cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedAccountStatus !== 'Semua' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                Status Akun: {selectedAccountStatus}
                <button
                  onClick={() => setSelectedAccountStatus('Semua')}
                  className="hover:text-amber-900 dark:hover:text-white cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Student Table */}
      <div className="bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 backdrop-blur-xl/80 text-slate-300 border-b border-white/10 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                    title="Pilih Semua Siswa"
                  />
                </th>
                <th className="p-3.5">No</th>
                <th className="p-3.5">Foto & Nama</th>
                <th className="p-3.5">NISN</th>
                <th className="p-3.5">ID QR Code</th>
                <th className="p-3.5">Kelas</th>
                <th className="p-3.5">Presensi Hari Ini</th>
                <th className="p-3.5">Status Akun</th>
                <th className="p-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-slate-200">
              {paginatedStudents.length > 0 ? (
                paginatedStudents.map((s, index) => {
                  const isSelected = selectedIds.includes(s.id);
                  const todayRec = getStudentTodayAttendance(s);
                  const isToday = todayRec ? store.isRecordForToday(todayRec) : false;
                  const itemNumber =
                    pageSize === 0 ? index + 1 : (currentPage - 1) * pageSize + index + 1;

                  return (
                    <tr
                      key={s.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-blue-50/70 dark:bg-blue-950/50'
                          : 'hover:bg-white/10'
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectStudent(s.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                        />
                      </td>
                      <td className="p-3.5 font-medium text-slate-400 dark:text-slate-500">
                        {itemNumber}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              s.foto ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'
                            }
                            alt={s.nama}
                            className="w-9 h-9 rounded-full object-cover border border-white/10"
                          />
                          <div>
                            <p className="font-bold text-white">{s.nama}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">
                              QR: 69933068.{s.nisn}.{s.nama}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono font-semibold text-slate-800 dark:text-slate-200">
                        <div>{s.nisn}</div>
                        {s.rfid_uid ? (
                          <button
                            type="button"
                            onClick={() => handleOpenBindRfid(s)}
                            className="inline-flex items-center gap-1 text-[9.5px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 mt-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition cursor-pointer"
                            title={`UID Kartu: ${s.rfid_uid} (Klik untuk ubah / kelola tautan kartu RFID)`}
                          >
                            <Radio className="w-2.5 h-2.5 text-indigo-500 animate-pulse" />{' '}
                            {s.rfid_uid}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenBindRfid(s)}
                            className="inline-flex items-center gap-1 text-[9.5px] text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 mt-1 hover:underline cursor-pointer"
                            title={`Tautkan Kartu RFID Fisik untuk ${s.nama}`}
                          >
                            <CreditCard className="w-2.5 h-2.5" /> +Taut RFID
                          </button>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-blue-700 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-950/40 px-2 py-1 rounded w-max">
                        {s.id_qr}
                      </td>
                      <td className="p-3.5 font-medium">
                        <span className="bg-white/5 backdrop-blur-xl text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded font-semibold">
                          {s.kelas}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {(() => {
                          if (!isToday || !todayRec) {
                            return (
                              <span className="inline-flex items-center gap-1 bg-white/5 backdrop-blur-xl text-slate-400 text-[10px] font-medium px-2 py-0.5 rounded-full border border-white/10">
                                <Clock className="w-3 h-3 text-slate-400" /> Belum Absen
                              </span>
                            );
                          }
                          switch (todayRec.status) {
                            case 'Hadir':
                              return (
                                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                  <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />{' '}
                                  Hadir ({todayRec.jenis})
                                </span>
                              );
                            case 'Terlambat':
                              return (
                                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                                  <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />{' '}
                                  Terlambat
                                </span>
                              );
                            case 'Izin':
                              return (
                                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                                  <FileCheck className="w-3 h-3 text-blue-600 dark:text-blue-400" />{' '}
                                  Izin
                                </span>
                              );
                            case 'Sakit':
                              return (
                                <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                                  <Stethoscope className="w-3 h-3 text-purple-600 dark:text-purple-400" />{' '}
                                  Sakit
                                </span>
                              );
                            case 'Alpa':
                              return (
                                <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                                  <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />{' '}
                                  Alpa
                                </span>
                              );
                            default:
                              return (
                                <span className="inline-flex items-center gap-1 bg-white/5 backdrop-blur-xl text-slate-400 text-[10px] font-medium px-2 py-0.5 rounded-full border border-white/10">
                                  <Clock className="w-3 h-3" /> {todayRec.status}
                                </span>
                              );
                          }
                        })()}
                      </td>
                      <td className="p-3.5">
                        {s.status === 'aktif' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle className="w-3 h-3" /> Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-white/5 backdrop-blur-xl text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/10">
                            <XCircle className="w-3 h-3" /> Nonaktif
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Bind RFID Card Button */}
                          <button
                            onClick={() => handleOpenBindRfid(s)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              s.rfid_uid
                                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800'
                                : 'text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50'
                            }`}
                            title={
                              s.rfid_uid
                                ? `Kartu RFID Tertaut: ${s.rfid_uid} (Klik untuk kelola/ganti kartu)`
                                : `Tautkan Kartu Fisik RFID untuk ${s.nama}`
                            }
                          >
                            <Radio className={`w-4 h-4 ${s.rfid_uid ? 'animate-pulse' : ''}`} />
                          </button>
                          <button
                            onClick={() => setQrModalStudent(s)}
                            className="p-1.5 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 rounded-lg transition-colors"
                            title="Lihat Kartu QR Siswa"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          {/* WhatsApp Parent Notification Button */}
                          <button
                            onClick={() => {
                              if (s.no_hp_ortu) {
                                const waMsg = generateWhatsAppMessage(s, todayRec);
                                const waUrl = getWhatsAppLink(s.no_hp_ortu, waMsg);
                                window.open(waUrl, '_blank');
                              } else {
                                const phone = prompt(
                                  `Masukkan No WhatsApp Orang Tua untuk ${s.nama}:`,
                                  '08123456789',
                                );
                                if (phone && phone.trim()) {
                                  store.updateStudent(s.id, { no_hp_ortu: phone.trim() });
                                  const waMsg = generateWhatsAppMessage(
                                    { ...s, no_hp_ortu: phone.trim() },
                                    todayRec,
                                  );
                                  const waUrl = getWhatsAppLink(phone.trim(), waMsg);
                                  window.open(waUrl, '_blank');
                                }
                              }
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              s.no_hp_ortu
                                ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                                : 'text-slate-400 dark:text-slate-500 hover:bg-white/10'
                            }`}
                            title={
                              s.no_hp_ortu
                                ? `Kirim Notifikasi WA ke Ortu (${s.no_hp_ortu})`
                                : 'Tambah No WA Ortu & Kirim Pesan'
                            }
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors"
                            title="Edit Data Siswa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(s)}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors"
                            title="Hapus Data Siswa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-400 text-xs">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="font-bold text-slate-300">Belum Ada Data Siswa</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Silakan gunakan tombol "Import Excel" atau "Tambah Siswa" untuk mengisi
                      database.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {filteredStudents.length > 0 && (
        <div className="bg-black/20 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-xs transition-colors">
          <div className="flex items-center gap-3 text-slate-400">
            <span>
              Menampilkan{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {pageSize === 0 ? 1 : (currentPage - 1) * pageSize + 1}
              </span>{' '}
              -{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {pageSize === 0
                  ? totalStudentsCount
                  : Math.min(currentPage * pageSize, totalStudentsCount)}
              </span>{' '}
              dari{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {totalStudentsCount}
              </span>{' '}
              siswa
            </span>

            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-[11px]">Tampilkan:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 text-xs border border-white/10 bg-white/5 backdrop-blur-xl rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value={10}>10 / hal</option>
                <option value={25}>25 / hal</option>
                <option value={50}>50 / hal</option>
                <option value={100}>100 / hal</option>
                <option value={0}>Semua ({totalStudentsCount})</option>
              </select>
            </div>
          </div>

          {pageSize > 0 && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 px-2 font-semibold">
                <span className="text-blue-600 dark:text-blue-400 font-bold">{currentPage}</span>
                <span className="text-slate-400">/</span>
                <span className="text-slate-300">{totalPages}</span>
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                title="Halaman Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal Add / Edit Student */}
      <StudentFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingStudent={editingStudent}
        students={students}
        onSave={handleSaveStudent}
      />

      {/* Modal Batch Move (Mutasi Kelas Massal) */}
      <StudentBatchMoveModal
        isOpen={isBatchMoveModalOpen}
        onClose={() => setIsBatchMoveModalOpen(false)}
        selectedCount={selectedIds.length}
        classOptions={classOptions}
        onConfirm={handleConfirmBatchMove}
      />

      {/* Modal Batch Delete (Admin Only) */}
      <StudentBatchDeleteModal
        isOpen={isBatchDeleteModalOpen}
        onClose={() => setIsBatchDeleteModalOpen(false)}
        selectedCount={selectedIds.length}
        onConfirm={handleConfirmBatchDelete}
      />

      {/* Modal Konfirmasi Hapus Single */}
      <StudentDeleteConfirmModal
        student={deletingStudent}
        onClose={() => setDeletingStudent(null)}
        onConfirm={() => {
          if (deletingStudent) {
            store.deleteStudent(deletingStudent.id);
            setDeletingStudent(null);
          }
        }}
      />

      {/* Modal Assign RFID */}
      <StudentRfidBindModal
        isOpen={!!rfidBindStudent}
        rfidBindStudent={rfidBindStudent}
        onClose={() => {
          setRfidBindStudent(null);
          setRfidInputVal('');
        }}
        rfidInputVal={rfidInputVal}
        setRfidInputVal={setRfidInputVal}
        isNfcActive={isNfcActive}
        handleStartNfcScan={handleStartNfcScan}
        hexFormatted={hexFormatted}
        decFormatted={decFormatted}
        rfidConflict={rfidConflict}
        handleSaveRfidBind={handleSaveRfidBind}
        handleUnbindRfid={handleUnbindRfid}
      />

      {/* Modal Cetak QR Code Tunggal */}
      <StudentQrPrintModal
        qrModalStudent={qrModalStudent}
        onClose={() => setQrModalStudent(null)}
      />

      {/* Modal Clear All Database (Admin Only) */}
      <StudentClearAllModal
        isOpen={isClearAllModalOpen}
        onClose={() => setIsClearAllModalOpen(false)}
        studentsLength={students.length}
        onConfirm={handleConfirmClearAll}
      />

      {/* Modal Import Data Siswa dari Excel */}
      <StudentImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        studentsLength={students.length}
      />

      {/* Modal Mass Card Print Preview */}
      <StudentMassPrintModal
        isOpen={isMassPrintModalOpen}
        onClose={() => setIsMassPrintModalOpen(false)}
        students={students}
        initialSelectedIds={massPrintSelectedIds}
      />
    </div>
  );
};
