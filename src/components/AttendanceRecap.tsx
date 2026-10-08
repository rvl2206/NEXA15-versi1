import React, { useState, useEffect, useRef } from 'react';
import { store } from '../lib/store';
import { toast } from '../lib/toast';
import { AttendanceRecord, Student, AttendanceStatus, AttendanceType } from '../types';
import {
  StudentMonthlySummary,
  PairedDailyRecord,
  normalizeToYyyyMmDd,
  isMatchKelas,
  isMatchTanggal,
  isMatchBulan,
  calculateMonthlyStudentSummaries,
  calculateRawPairedDailyRecords
} from '../lib/attendanceCalculations';
import { PrintReportModal } from './PrintReportModal';
import { AttendanceRecoveryModal } from './AttendanceRecoveryModal';
import { AttendanceCorrectionModal } from './AttendanceCorrectionModal';
import { ExportProblematicModal } from './ExportProblematicModal';
import { ImportAttendanceModal } from './ImportAttendanceModal';
import { ManualInputModal } from './ManualInputModal';
import {
  exportAttendanceToExcel,
  exportAttendanceToPDF,
  exportAttendanceToCSV,
  exportMonthlyAggregateToCSV,
  calculateLateMinutes,
  formatLateDuration,
  formatPetugasRole,
  downloadAttendanceImportTemplate,
  parseAttendanceImportFile,
  getWhatsAppLink,
  generateWhatsAppMessage,
  generateWhatsAppLateGuidanceMessage,
  exportLateGuidanceToPDF,
  exportLateGuidanceToExcel,
  exportProblematicStudentsToExcel,
  exportProblematicStudentsToPDF,
  drawOfficialKopSurat,
  LateGuidanceExportItem,
} from '../lib/exportUtils';
import {
  FileSpreadsheet,
  FileText,
  Search,
  PlusCircle,
  Calendar,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Clock,
  XCircle,
  FileCheck,
  Stethoscope,
  Trash2,
  X,
  Users,
  BarChart3,
  TrendingUp,
  Download,
  Filter,
  RefreshCw,
  Clock3,
  LogIn,
  LogOut,
  Upload,
  Sparkles,
  AlertTriangle,
  Check,
  MessageCircle,
  AlertCircle,
  ShieldAlert,
  UserX,
  Send,
  Award,
  Printer,
  Edit3,
  CreditCard,
  QrCode,
  Cloud,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AttendanceRecapProps {
  currentOfficer: string;
}

type RecapMode = 'harian' | 'bulanan' | 'analisis_terlambat' | 'semua';
type MonthlyViewType = 'agregat' | 'log';
type HarianViewType = 'pasangan' | 'log';


function paginateList<T>(list: T[], page: number, size: number): T[] {
  if (size === 0) return list;
  const start = (page - 1) * size;
  return list.slice(start, start + size);
}

export const AttendanceRecap: React.FC<AttendanceRecapProps> = ({ currentOfficer }) => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  // Mode Selection: 'harian' | 'bulanan' | 'semua'
  const [recapMode, setRecapMode] = useState<RecapMode>('harian');
  const [monthlyViewType, setMonthlyViewType] = useState<MonthlyViewType>('agregat');
  const [harianViewType, setHarianViewType] = useState<HarianViewType>('pasangan');
  const [disciplineFilterType, setDisciplineFilterType] = useState<'semua_indisiplin' | 'hanya_terlambat' | 'hanya_alpa'>('semua_indisiplin');

  // Date Filters
  const getLocalYYYYMMDD = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getLocalYYYYMM = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const todayISO = getLocalYYYYMMDD();
  const currentMonthISO = getLocalYYYYMM();

  const [filterTanggal, setFilterTanggal] = useState<string>(todayISO); // YYYY-MM-DD
  const [semuaTanggalFilter, setSemuaTanggalFilter] = useState<string>(''); // YYYY-MM-DD for mode 'semua'
  const [filterBulan, setFilterBulan] = useState<string>(currentMonthISO); // YYYY-MM
  const [filterKelas, setFilterKelas] = useState<string>('Semua');
  const [filterNama, setFilterNama] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [filterJenis, setFilterJenis] = useState<string>('Semua'); // 'Semua' | 'Masuk' | 'Pulang'
  const [filterStatusPulang, setFilterStatusPulang] = useState<'Semua' | 'SudahPulang' | 'BelumPulang'>('Semua');

  // Print Monthly Report / Slip Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printStudentSlip, setPrintStudentSlip] = useState<Student | null>(null);
  const [printWaliKelasName, setPrintWaliKelasName] = useState<string>('Drs. Wali Kelas');

  // Problematic Student Export Modal State
  const [isProblematicExportModalOpen, setIsProblematicExportModalOpen] = useState(false);

  // Manual Log Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);


  // Import Attendance Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const handleExecuteImport = (records: Omit<AttendanceRecord, 'id'>[], mode: 'append' | 'replace') => {
    store.importAttendanceRecords(records, mode);
    setIsImportModalOpen(false);
  };

  // Auto-refresh State
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [selectedAttendanceIds, setSelectedAttendanceIds] = useState<string[]>([]);

  // Attendance Correction Modal State
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionRecord, setCorrectionRecord] = useState<AttendanceRecord | null>(null);
  const [correctionStudent, setCorrectionStudent] = useState<Student | null>(null);
  const [correctionDate, setCorrectionDate] = useState<string>('');
  const [correctionType, setCorrectionType] = useState<AttendanceType>('Masuk');

  const handleOpenCorrection = (
    record?: AttendanceRecord | null,
    student?: Student | null,
    dateStr?: string,
    initialType?: AttendanceType
  ) => {
    setCorrectionRecord(record || null);
    setCorrectionStudent(student || null);
    setCorrectionDate(dateStr || filterTanggal || todayISO);
    setCorrectionType(initialType || (record?.jenis as AttendanceType) || 'Masuk');
    setIsCorrectionModalOpen(true);
  };

  // Pagination State (Default 10 per page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [isFetchingCloud, setIsFetchingCloud] = useState(false);

  const handleFetchCloud = async () => {
    setIsFetchingCloud(true);
    try {
      let startDateStr = '';
      let endDateStr = '';

      if (recapMode === 'harian') {
        startDateStr = filterTanggal;
        endDateStr = filterTanggal;
      } else if (recapMode === 'bulanan' || recapMode === 'analisis_terlambat') {
        // e.g. "2026-08" -> "2026-08-01" to "2026-08-31"
        const [year, month] = filterBulan.split('-');
        startDateStr = `${filterBulan}-01`;
        const lastDay = new Date(Number(year), Number(month), 0).getDate();
        endDateStr = `${filterBulan}-${lastDay.toString().padStart(2, '0')}`;
      } else {
        toast.info('Pilih mode Harian atau Bulanan terlebih dahulu untuk menarik data dari Cloud.');
        setIsFetchingCloud(false);
        return;
      }

      const totalLoaded = await store.fetchHistoricalAttendance(startDateStr, endDateStr);
      if (totalLoaded > 0) {
        setAttendance(store.getAttendance());
        toast.success('Berhasil', `Berhasil memuat ${totalLoaded} data dari Cloud untuk periode ini.`);
      } else {
        toast.info('Info', 'Tidak ada data presensi tambahan ditemukan di Cloud untuk periode ini.');
      }
    } catch (err: any) {
      toast.error('Gagal', err?.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsFetchingCloud(false);
    }
  };

  // Reset page to 1 when filter, mode, or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterTanggal, filterBulan, filterKelas, filterNama, filterStatus, filterJenis, filterStatusPulang, recapMode, harianViewType, monthlyViewType, semuaTanggalFilter, pageSize]);

  const renderPaginationFooter = (totalItems: number) => {
    if (totalItems === 0) return null;
    const totalPages = pageSize === 0 ? 1 : Math.ceil(totalItems / pageSize) || 1;

    return (
      <div className="px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            Menampilkan{' '}
            <span className="font-bold text-white dark:text-slate-200">
              {pageSize === 0 ? 1 : (currentPage - 1) * pageSize + 1}
            </span>{' '}
            -{' '}
            <span className="font-bold text-white dark:text-slate-200">
              {pageSize === 0 ? totalItems : Math.min(currentPage * pageSize, totalItems)}
            </span>{' '}
            dari <span className="font-bold text-white dark:text-slate-200">{totalItems}</span> data
          </div>

          <div className="flex items-center gap-1.5 border-l border-white/10 pl-3">
            <span className="text-slate-400 font-medium">Per Halaman:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 text-xs border border-white/10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg font-semibold focus:ring-2 focus:ring-blue-600 cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={0}>Semua</option>
            </select>
          </div>
        </div>

        {pageSize > 0 && totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg disabled:opacity-50 font-bold hover:bg-white/10 border border-white/10 dark:hover:bg-slate-700 cursor-pointer transition-colors"
            >
              Sebelumnya
            </button>
            <span className="font-semibold text-white dark:text-slate-200">
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg disabled:opacity-50 font-bold hover:bg-white/10 border border-white/10 dark:hover:bg-slate-700 cursor-pointer transition-colors"
            >
              Berikutnya
            </button>
          </div>
        )}
      </div>
    );
  };

  const handleToggleSelectAllAttendance = (filteredList: AttendanceRecord[]) => {
    if (selectedAttendanceIds.length === filteredList.length && filteredList.length > 0) {
      setSelectedAttendanceIds([]);
    } else {
      setSelectedAttendanceIds(filteredList.map((r) => r.id));
    }
  };

  const handleToggleSelectAttendance = (id: string) => {
    if (selectedAttendanceIds.includes(id)) {
      setSelectedAttendanceIds(selectedAttendanceIds.filter((item) => item !== id));
    } else {
      setSelectedAttendanceIds([...selectedAttendanceIds, id]);
    }
  };

  const handleDeleteSelectedAttendance = () => {
    if (selectedAttendanceIds.length === 0) return;
    const count = selectedAttendanceIds.length;
    store.deleteMultipleAttendance(selectedAttendanceIds);
    setSelectedAttendanceIds([]);
    handleManualRefresh();
    toast.success('Rekaman Dihapus', `Berhasil menghapus ${count} rekaman absensi terpilih.`);
  };

  const handleSingleSetPulang1430 = (student: Student) => {
    if (!student) return;
    const res = store.recordStudentPulang1430(student, filterTanggal, currentOfficer);
    if (res.success) {
      toast.success('Presensi Pulang Dicatat', `Siswa ${student.nama} berhasil dicatat pulang (14:30 WIT).`);
      handleManualRefresh();
    }
  };

  const handleBulkSetPulang1430 = () => {
    const countToUpdate = pairedSummaryCounts.belumPulang;
    if (countToUpdate === 0) {
      toast.info('Semua Siswa Lengkap', 'Semua siswa yang masuk sudah memiliki rekaman scan Pulang.');
      return;
    }

    const res = store.recordBulkStudentsPulang1430(filterTanggal, filterKelas, currentOfficer);
    if (res.success) {
      toast.success('Batas Akhir Pulang Dicatat', `${res.count} siswa telah dicatat presensi Pulang pada batas akhir 14:30 WIT.`);
      handleManualRefresh();
    }
  };

  const handleBulkSetAlpa = () => {
    // Guard: Pastikan bukan hari libur atau akhir pekan sekolah
    if (store.isHoliday(filterTanggal)) {
      toast.warning('Hari Libur / Akhir Pekan', 'Tanggal yang dipilih merupakan hari libur atau akhir pekan sekolah. Tutup Gerbang (Alpa) tidak dapat diproses.');
      return;
    }

    // Kita anggap "yang belum masuk" sebagai alpa. 
    // Hitungannya: total siswa (filterKelas) - total yang sudah ada record masuk hari ini
    const totalStudentsInClass = filterKelas === 'Semua' 
      ? students.filter(s => s.status !== 'nonaktif').length 
      : students.filter(s => s.status !== 'nonaktif' && s.kelas === filterKelas).length;
    const studentsCheckedIn = pairedSummaryCounts.total; // yang punya pasangan data (Masuk)
    const countToUpdate = totalStudentsInClass - studentsCheckedIn;

    if (countToUpdate <= 0) {
      toast.info('Semua Hadir', 'Semua siswa aktif sudah memproses presensi Masuk hari ini.');
      return;
    }

    if (!window.confirm(`Apakah Anda yakin ingin menutup gerbang dan memproses status ALPA untuk ${countToUpdate} siswa (Kelas: ${filterKelas}) yang belum melakukan presensi Masuk hari ini?`)) {
      return;
    }

    const res = store.recordBulkStudentsAlpa(filterTanggal, filterKelas, currentOfficer);
    if (res.success) {
      toast.success('Tutup Gerbang Selesai', `Telah memproses ${res.count} siswa menjadi ALPA (Tanpa Keterangan).`);
      handleManualRefresh();
    } else {
      toast.error('Gagal Memproses Alpa', res.message);
    }
  };

  const handlePurgeSaturdayAlpa = async () => {
    if (
      !window.confirm(
        'Revisi Presensi: Apakah Anda yakin ingin menghapus SELURUH data presensi hari Sabtu yang berstatus ALPA? Tindakan ini akan membersihkan data dari aplikasi lokal dan database cloud.'
      )
    ) {
      return;
    }
    try {
      const res = await store.purgeSaturdayAlpaAttendance();
      if (res.total > 0) {
        toast.success(
          'Revisi Alpa Sabtu Selesai',
          `Berhasil menghapus ${res.total} data presensi Alpa pada hari Sabtu (Siswa: ${res.deletedStudents}, Guru: ${res.deletedTeachers}).`
        );
      } else {
        toast.info('Data Sudah Bersih', 'Tidak ada data presensi hari Sabtu yang berstatus Alpa.');
      }
      handleManualRefresh();
    } catch (error: any) {
      toast.error('Gagal', error?.message || 'Terjadi kesalahan saat menghapus data Alpa.');
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await store.fetchFromServer();
      setAttendance(store.getAttendance());
      setStudents(store.getStudents());
      setLastUpdated(new Date());
    } catch (error: any) {
      toast.error('Gagal Menyegarkan', error?.message || 'Gagal mengambil data dari server.');
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  useEffect(() => {
    setAttendance(store.getAttendance());
    setStudents(store.getStudents());
    store.fetchFromServer();
    setLastUpdated(new Date());

    const unsubscribe = store.subscribe(() => {
      setAttendance(store.getAttendance());
      setStudents(store.getStudents());
      setLastUpdated(new Date());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const classOptions = React.useMemo(() => {
    const fromStudents = students.map((s) => s.kelas.trim()).filter(Boolean);
    const fromAttendance = attendance.map((a) => a.kelas.trim()).filter(Boolean);
    return Array.from(new Set([...fromStudents, ...fromAttendance])).sort();
  }, [students, attendance]);

  // List of unique available dates in attendance data (sorted descending)
  const availableDatesWithData = React.useMemo(() => {
    const dates = new Set<string>();
    attendance.forEach((r) => {
      const norm = normalizeToYyyyMmDd(r.tanggal);
      if (norm) dates.add(norm);
      if (r.timestamp) {
        const tsNorm = normalizeToYyyyMmDd(r.timestamp);
        if (tsNorm) dates.add(tsNorm);
      }
    });
    return Array.from(dates).sort().reverse();
  }, [attendance]);

  // Initial load check: if today has no records, select latest available date with data once
  const initialAutoSelectDone = useRef(false);
  useEffect(() => {
    if (!initialAutoSelectDone.current && attendance.length > 0 && availableDatesWithData.length > 0) {
      const hasRecordsToday = attendance.some((r) => isMatchTanggal(r, todayISO));
      if (!hasRecordsToday && availableDatesWithData.length > 0) {
        setFilterTanggal(availableDatesWithData[0]);
      }
      initialAutoSelectDone.current = true;
    }
  }, [attendance, availableDatesWithData, todayISO]);

  // Filtered Attendance List based on mode and active filters
  const filteredAttendance = React.useMemo(() => {
    return attendance.filter((r) => {
      // Nama / NISN / ID QR filter
      const matchNama =
        !filterNama ||
        r.nama.toLowerCase().includes(filterNama.toLowerCase()) ||
        r.nisn.includes(filterNama) ||
        r.id_qr.includes(filterNama);

      // Class filter
      const matchKelas = isMatchKelas(r.kelas, filterKelas);

      // Status filter
      const matchStatus = filterStatus === 'Semua' || r.status === filterStatus;

      // Jenis Presensi filter (Masuk / Pulang)
      const matchJenis = filterJenis === 'Semua' || r.jenis === filterJenis;

      // Date / Month mode matching
      let matchTime = true;
      if (recapMode === 'harian') {
        matchTime = isMatchTanggal(r, filterTanggal);
      } else if (recapMode === 'bulanan') {
        matchTime = isMatchBulan(r, filterBulan);
      } else {
        // mode 'semua': show ALL records by default, unless user set a specific tanggal filter
        if (semuaTanggalFilter) {
          matchTime = isMatchTanggal(r, semuaTanggalFilter);
        }
      }

      return matchNama && matchKelas && matchStatus && matchJenis && matchTime;
    });
  }, [attendance, filterNama, filterKelas, filterStatus, filterJenis, recapMode, filterTanggal, filterBulan, semuaTanggalFilter]);

  // Calculate Monthly Summary per Student
  const monthlyStudentSummaries: StudentMonthlySummary[] = React.useMemo(() => {
    const cutoffTime = store.getSettings().cutoffTime || '07:15';
    return calculateMonthlyStudentSummaries(students, attendance, filterKelas, filterNama, filterBulan, cutoffTime);
  }, [students, attendance, filterBulan, filterKelas, filterNama]);

  // Calculate Raw Paired Daily Attendance (Waktu Masuk, Waktu Pulang, and Waktu Terlambat)
  const rawPairedDailyRecords: PairedDailyRecord[] = React.useMemo(() => {
    const cutoffTime = store.getSettings().cutoffTime || '07:15';
    return calculateRawPairedDailyRecords(recapMode, cutoffTime, students, attendance, filterTanggal, filterKelas, filterNama);
  }, [students, attendance, filterTanggal, filterKelas, filterNama, recapMode]);

  // Quick summary count of paired records for tabs and badges
  const pairedSummaryCounts = React.useMemo(() => {
    const total = rawPairedDailyRecords.length;
    const sudahPulang = rawPairedDailyRecords.filter((r) => Boolean(r.pulang)).length;
    const belumPulang = rawPairedDailyRecords.filter((r) => Boolean(r.masuk) && !r.pulang).length;
    const hadirMasuk = rawPairedDailyRecords.filter((r) => Boolean(r.masuk)).length;
    const dayRecords = attendance.filter((r) => isMatchTanggal(r, filterTanggal));
    const totalScans = dayRecords.filter((r) => {
      const matchKelas = isMatchKelas(r.kelas, filterKelas);
      const matchNama =
        !filterNama ||
        r.nama.toLowerCase().includes(filterNama.toLowerCase()) ||
        r.nisn.includes(filterNama);
      return matchKelas && matchNama;
    }).length;

    return { total, sudahPulang, belumPulang, hadirMasuk, totalScans };
  }, [rawPairedDailyRecords, attendance, filterTanggal, filterKelas, filterNama]);

  // Filtered Paired Daily Records for current table view
  const pairedDailyRecords = React.useMemo(() => {
    return rawPairedDailyRecords.filter((item) => {
      if (filterStatus !== 'Semua') {
        if (item.status !== filterStatus) return false;
      }
      if (filterStatusPulang === 'SudahPulang') {
        if (!item.pulang) return false;
      } else if (filterStatusPulang === 'BelumPulang') {
        if (item.pulang || !item.masuk) return false;
      }
      return true;
    });
  }, [rawPairedDailyRecords, filterStatus, filterStatusPulang]);

  // Lateness & Absence Discipline Guidance Analysis
  const latenessAnalysisData: LateGuidanceExportItem[] = React.useMemo(() => {
    const cutoffTime = store.getSettings().cutoffTime || '07:15';

    const activeStudents = students.filter((s) => {
      const matchKelas = filterKelas === 'Semua' || s.kelas === filterKelas;
      const matchNama =
        !filterNama ||
        s.nama.toLowerCase().includes(filterNama.toLowerCase()) ||
        s.nisn.includes(filterNama);
      return matchKelas && matchNama;
    });

    const targetRecords = attendance.filter((r) => {
      if (recapMode === 'bulanan' || filterBulan) {
        return isMatchBulan(r, filterBulan);
      }
      return true;
    });

    const uniqueActiveDates: string[] = Array.from(
      new Set(
        targetRecords
          .map((r) => normalizeToYyyyMmDd(r.tanggal) || normalizeToYyyyMmDd(r.timestamp))
          .filter((d): d is string => Boolean(d))
      )
    );

    const items = activeStudents.map((student) => {
      const lateRecords = targetRecords.filter(
        (r) => r.nisn === student.nisn && r.jenis === 'Masuk' && r.status === 'Terlambat'
      );

      // Alpa calculations
      const alpaDatesSet = new Set<string>();
      let sakitCount = 0;
      let izinCount = 0;

      if (uniqueActiveDates.length === 0) {
        const studentRecords = targetRecords.filter((r) => r.nisn === student.nisn && r.jenis === 'Masuk');
        studentRecords.forEach((r) => {
          const dStr = normalizeToYyyyMmDd(r.tanggal) || normalizeToYyyyMmDd(r.timestamp) || r.tanggal;
          if (r.status === 'Alpa' && dStr) alpaDatesSet.add(dStr);
          if (r.status === 'Sakit') sakitCount++;
          if (r.status === 'Izin') izinCount++;
        });
      } else {
        uniqueActiveDates.forEach((dateStr) => {
          const dayRecords = targetRecords.filter(
            (r) => r.nisn === student.nisn && (normalizeToYyyyMmDd(r.tanggal) === dateStr || normalizeToYyyyMmDd(r.timestamp) === dateStr)
          );
          const masuk = dayRecords.find((r) => r.jenis === 'Masuk');
          const status = masuk?.status;
          if (status === 'Alpa') {
            alpaDatesSet.add(dateStr);
          } else if (status === 'Sakit') {
            sakitCount++;
          } else if (status === 'Izin') {
            izinCount++;
          } else if (!masuk && dayRecords.length === 0) {
            alpaDatesSet.add(dateStr);
          }
        });
      }

      const alpaDatesRaw = Array.from(alpaDatesSet).sort().reverse();
      const alpaDates = alpaDatesRaw.map((dStr) => {
        const parts = dStr.split('-');
        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dStr;
      });
      const alpaCount = alpaDates.length;

      // Late calculations
      const lateCount = lateRecords.length;
      let totalLateMinutes = 0;
      const lateDatesSet = new Set<string>();
      const lateDetailsMap = new Map<string, { tanggal: string; lateMinutes: number; jamMasuk?: string }>();

      lateRecords.forEach((r) => {
        const lateMin = calculateLateMinutes(r, cutoffTime);
        totalLateMinutes += lateMin;
        const dStr = normalizeToYyyyMmDd(r.tanggal) || normalizeToYyyyMmDd(r.timestamp) || r.tanggal;
        if (dStr) {
          lateDatesSet.add(dStr);
          const parts = dStr.split('-');
          const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dStr;
          const scanTime = r.timestamp
            ? new Date(r.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jayapura' })
            : '';
          lateDetailsMap.set(dStr, {
            tanggal: formattedDate,
            lateMinutes: lateMin,
            jamMasuk: scanTime ? `${scanTime} WIT` : undefined,
          });
        }
      });

      const lateDates = Array.from(lateDatesSet).sort().reverse();
      const lateDetails = lateDates.map((dStr) => lateDetailsMap.get(dStr)!).filter(Boolean);
      const avgLateMinutes = lateCount > 0 ? Math.round(totalLateMinutes / lateCount) : 0;

      let riskLevel: 'Kritis' | 'Sedang' | 'Ringan' | 'Normal' = 'Normal';
      let rekomendasiPembinaan = '';
      let tindakanSelanjutnya = '';

      if (alpaCount >= 3 || lateCount >= 5 || totalLateMinutes >= 90) {
        riskLevel = 'Kritis';
        rekomendasiPembinaan =
          'Pemanggilan Orang Tua / Wali ke Sekolah, Bimbingan Konseling (BK) Khusus, serta Penandatanganan Surat Perjanjian Kesiswaan.';
        tindakanSelanjutnya = 'Panggilan Ortu & Konseling BK';
      } else if (alpaCount >= 1 || lateCount >= 3 || totalLateMinutes >= 30) {
        riskLevel = 'Sedang';
        rekomendasiPembinaan =
          'Pembinaan Khusus oleh Wali Kelas & BK, Pembuatan Surat Pernyataan Janji Kedisiplinan, dan Notifikasi WA Ortu.';
        tindakanSelanjutnya = 'Pembinaan Wali Kelas & Pernyataan';
      } else if (lateCount >= 1) {
        riskLevel = 'Ringan';
        rekomendasiPembinaan =
          'Teguran Lisan oleh Guru Piket / Wali Kelas & Pengingat Pembiasaan Tiba 15 Menit Sebelum Bel Masuk (07.15 WIT).';
        tindakanSelanjutnya = 'Teguran Lisan & Pengarahan Piket';
      } else {
        riskLevel = 'Normal';
        rekomendasiPembinaan = 'Siswa Teladan: Selalu Tepat Waktu & Kehadiran 100%.';
        tindakanSelanjutnya = 'Pertahankan Kedisiplinan';
      }

      return {
        student,
        lateCount,
        totalLateMinutes,
        avgLateMinutes,
        lateDates,
        lateDetails,
        alpaCount,
        alpaDates,
        sakitCount,
        izinCount,
        riskLevel,
        rekomendasiPembinaan,
        tindakanSelanjutnya,
      };
    });

    return items
      .filter((item) => item.lateCount > 0 || item.alpaCount > 0)
      .sort((a, b) => b.alpaCount - a.alpaCount || b.lateCount - a.lateCount || b.totalLateMinutes - a.totalLateMinutes);
  }, [students, attendance, filterBulan, filterKelas, filterNama, recapMode]);

  const filteredDisciplineData = React.useMemo(() => {
    if (disciplineFilterType === 'hanya_terlambat') {
      return latenessAnalysisData.filter((i) => i.lateCount > 0);
    }
    if (disciplineFilterType === 'hanya_alpa') {
      return latenessAnalysisData.filter((i) => i.alpaCount > 0);
    }
    return latenessAnalysisData;
  }, [latenessAnalysisData, disciplineFilterType]);


  // Statistics Counter for Current View (Consistent with Dashboard & Student Totals)
  const stats = React.useMemo(() => {
    if (recapMode === 'harian') {
      const hadir = rawPairedDailyRecords.filter((r) => r.status === 'Hadir').length;
      const terlambat = rawPairedDailyRecords.filter((r) => r.status === 'Terlambat').length;
      const izin = rawPairedDailyRecords.filter((r) => r.status === 'Izin').length;
      const sakit = rawPairedDailyRecords.filter((r) => r.status === 'Sakit').length;
      const alpa = rawPairedDailyRecords.filter((r) => r.status === 'Alpa').length;
      const totalSiswaMasuk = hadir + terlambat;
      const scanPulang = rawPairedDailyRecords.filter((r) => Boolean(r.pulang)).length;
      const totalScan = filteredAttendance.length;
      const totalScanMasuk = filteredAttendance.filter((r) => r.jenis === 'Masuk').length;
      const totalScanPulang = filteredAttendance.filter((r) => r.jenis === 'Pulang').length;

      return {
        total: totalScan,
        totalSiswaMasuk,
        hadir,
        terlambat,
        izin,
        sakit,
        alpa,
        scanPulang,
        totalScanMasuk,
        totalScanPulang,
      };
    } else {
      const totalScan = filteredAttendance.length;
      const totalScanMasuk = filteredAttendance.filter((r) => r.jenis === 'Masuk').length;
      const totalScanPulang = filteredAttendance.filter((r) => r.jenis === 'Pulang').length;

      // Count status from Masuk / primary records to avoid double counting Pulang as extra Hadir
      const masukRecords = filteredAttendance.filter((r) => r.jenis === 'Masuk');
      const hadir = masukRecords.filter((r) => r.status === 'Hadir').length;
      const terlambat = masukRecords.filter((r) => r.status === 'Terlambat').length;
      const izin = filteredAttendance.filter((r) => r.status === 'Izin').length;
      const sakit = filteredAttendance.filter((r) => r.status === 'Sakit').length;
      const alpa = filteredAttendance.filter((r) => r.status === 'Alpa').length;
      const totalSiswaMasuk = hadir + terlambat;

      return {
        total: totalScan,
        totalSiswaMasuk,
        hadir,
        terlambat,
        izin,
        sakit,
        alpa,
        scanPulang: totalScanPulang,
        totalScanMasuk,
        totalScanPulang,
      };
    }
  }, [recapMode, rawPairedDailyRecords, filteredAttendance]);

  const handleManualSubmit = (studentNisn: string, jenis: AttendanceType, status: AttendanceStatus, catatan: string) => {
    const student = students.find((s) => s.nisn === studentNisn);
    if (!student) {
      toast.error('Siswa Tidak Ditemukan', 'Silakan pilih siswa yang valid dari daftar.');
      return;
    }

    store.addManualAttendance({
      tanggal: store.getTodayFormatted(),
      nisn: student.nisn,
      nama: student.nama,
      kelas: student.kelas,
      id_qr: student.id_qr,
      jenis: jenis,
      status: status,
      petugas: currentOfficer,
      catatan: catatan,
    });

    toast.success('Presensi Dicatat', `Presensi ${status} untuk ${student.nama} (${jenis}) berhasil dicatat.`);
    setIsManualModalOpen(false);
  };

  // Export Monthly Agregat Table to Excel
  const exportMonthlyAggregateExcel = () => {
    const data = monthlyStudentSummaries.map((item, idx) => ({
      No: idx + 1,
      NISN: item.student.nisn,
      Nama: item.student.nama,
      Kelas: item.student.kelas,
      Hadir: item.hadir,
      Terlambat: item.terlambat,
      'Total Waktu Terlambat': formatLateDuration(item.totalTerlambatMenit),
      'Jumlah Menit Terlambat': item.totalTerlambatMenit,
      Izin: item.izin,
      Sakit: item.sakit,
      Alpa: item.alpa,
      'Total Kehadiran': item.totalMasuk,
      'Persentase Kehadiran': `${item.persentaseHadir}%`,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Rekap_Bulanan_${filterBulan}`);
    XLSX.writeFile(workbook, `Rekap_Bulanan_Absensi_${filterKelas}_${filterBulan}.xlsx`);
  };

  // Export Monthly Agregat Table to PDF
  const exportMonthlyAggregatePDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const startY = drawOfficialKopSurat(doc, 'landscape');

    doc.setTextColor(30, 64, 175);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('REKAPITULASI KEHADIRAN BULANAN SISWA', 148.5, startY + 4, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const classLabel = filterKelas !== 'Semua' ? `Kelas: ${filterKelas}` : 'Semua Kelas';
    doc.text(`Bulan: ${filterBulan} | ${classLabel} | Unduh: ${new Date().toLocaleDateString('id-ID')}`, 148.5, startY + 8.5, { align: 'center' });

    const tableHead = [['No', 'NISN', 'Nama Siswa', 'Kelas', 'Hadir', 'Tlp', 'Waktu Terlambat', 'Izin', 'Sakit', 'Alpa', '% Hadir']];
    const tableBody = monthlyStudentSummaries.map((item, i) => [
      i + 1,
      item.student.nisn,
      item.student.nama,
      item.student.kelas,
      item.hadir,
      item.terlambat,
      formatLateDuration(item.totalTerlambatMenit),
      item.izin,
      item.sakit,
      item.alpa,
      `${item.persentaseHadir}%`,
    ]);

    autoTable(doc, {
      startY: startY + 13,
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    doc.save(`Rekap_Bulanan_Absensi_NEXA15_${filterBulan}.pdf`);
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'Hadir':
        return <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800"><CheckCircle2 className="w-3 h-3" /> Hadir</span>;
      case 'Terlambat':
        return <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800"><Clock className="w-3 h-3" /> Terlambat</span>;
      case 'Izin':
        return <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800"><FileCheck className="w-3 h-3" /> Izin</span>;
      case 'Sakit':
        return <span className="inline-flex items-center gap-1 bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800"><Stethoscope className="w-3 h-3" /> Sakit</span>;
      case 'Alpa':
        return <span className="inline-flex items-center gap-1 bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800"><XCircle className="w-3 h-3" /> Alpa</span>;
    }
  };

  // Format YYYY-MM-DD to Indonesian Date string
  const formatIndoDate = (isoDate: string) => {
    if (!isoDate) return '-';
    const [y, m, d] = isoDate.split('-');
    if (!y || !m || !d) return isoDate;
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
  };

  // Format YYYY-MM to Indonesian Month Year
  const formatIndoMonth = (isoMonth: string) => {
    if (!isoMonth) return '-';
    const [y, m] = isoMonth.split('-');
    if (!y || !m) return isoMonth;
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${months[parseInt(m, 10) - 1]} ${y}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-black/20 backdrop-blur-md p-5 sm:p-6 rounded-2xl border border-white/10 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-xs uppercase tracking-wider mb-1">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Rekapitulasi Kehadiran Siswa</span>
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Laporan Absensi NEXA15
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Pilih jenis rekapitulasi (Harian / Bulanan), atur filter kelas, dan unduh laporan resmi Excel/PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs font-medium shadow-sm mr-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-[11px]">Realtime Direct Sync</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 border-l border-emerald-200 dark:border-emerald-800 pl-2 font-mono">
              {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <button
              onClick={handleManualRefresh}
              className="p-1 hover:bg-emerald-200/50 dark:hover:bg-emerald-800/50 rounded-lg text-emerald-600 dark:text-emerald-300 transition-colors ml-0.5"
              title="Perbarui data sekarang dari server"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-700' : ''}`} />
            </button>
          </div>

          <button
            onClick={() => handleOpenCorrection()}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            title="Koreksi status kehadiran dan jam scan absensi siswa"
          >
            <Edit3 className="w-4 h-4" />
            <span>Koreksi Kehadiran</span>
          </button>

          <button
            onClick={() => setIsManualModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Input Izin/Sakit/Alpa</span>
          </button>

          <button
            onClick={() => setIsRecoveryModalOpen(true)}
            className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            title="Pindai Log Aktivitas dan pulihkan rekaman absensi yang belum masuk ke Koleksi Master"
          >
            <Sparkles className="w-4 h-4" />
            <span>Pemulihan Absensi</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            title="Import manual data kehadiran dari file Excel / CSV"
          >
            <Upload className="w-4 h-4" />
            <span>Import Data Kehadiran</span>
          </button>

          <button
            onClick={() => setIsProblematicExportModalOpen(true)}
            id="btn-open-export-problematic-modal"
            className="px-3.5 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-rose-600/20 transition-all flex items-center gap-1.5 active:scale-[0.98]"
            title="Ekspor Rekap Siswa Bermasalah (Alpa, Terlambat, Kehadiran Rendah) ke Excel atau PDF Resmi Berkop Surat"
          >
            <ShieldAlert className="w-4 h-4 text-rose-200" />
            <span>Rekap Siswa Bermasalah</span>
          </button>

          {recapMode === 'analisis_terlambat' ? (
            <>
              <button
                onClick={() => exportLateGuidanceToExcel(filteredDisciplineData, formatIndoMonth(filterBulan), filterKelas)}
                className="px-3.5 py-2 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 font-bold text-xs rounded-xl border border-emerald-300 dark:border-emerald-700 transition-all flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
                <span>Export Excel Pembinaan BK</span>
              </button>
              <button
                onClick={() => exportLateGuidanceToPDF(filteredDisciplineData, formatIndoMonth(filterBulan), filterKelas)}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" />
                <span>Cetak Laporan Pembinaan BK (PDF)</span>
              </button>
            </>
          ) : recapMode === 'bulanan' && monthlyViewType === 'agregat' ? (
            <>
              <button
                onClick={exportMonthlyAggregateExcel}
                className="px-3.5 py-2 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 font-bold text-xs rounded-xl border border-emerald-300 dark:border-emerald-700 transition-all flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
                <span>Export Excel</span>
              </button>
              <button
                onClick={() => exportMonthlyAggregateToCSV(monthlyStudentSummaries, filterBulan)}
                className="px-3.5 py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/80 text-amber-900 dark:text-amber-200 font-bold text-xs rounded-xl border border-amber-300 dark:border-amber-700 transition-all flex items-center gap-1.5"
                title="Unduh rekap bulanan dalam format CSV"
              >
                <Download className="w-4 h-4 text-amber-700 dark:text-amber-300" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={exportMonthlyAggregatePDF}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" />
                <span>Export PDF</span>
              </button>
              <button
                onClick={() => {
                  setPrintStudentSlip(null);
                  setIsPrintModalOpen(true);
                }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                title="Buka pratinjau & cetak resmi laporan rekapitulasi bulanan untuk wali kelas / orang tua"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Laporan Bulanan (Print)</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => exportAttendanceToExcel(filteredAttendance, `Rekap_Absensi_${recapMode.toUpperCase()}_NEXA15`)}
                className="px-3.5 py-2 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 font-bold text-xs rounded-xl border border-emerald-300 dark:border-emerald-700 transition-all flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
                <span>Export Excel</span>
              </button>
              <button
                onClick={() => exportAttendanceToCSV(filteredAttendance, `Rekap_Absensi_${recapMode.toUpperCase()}_NEXA15`)}
                className="px-3.5 py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/80 text-amber-900 dark:text-amber-200 font-bold text-xs rounded-xl border border-amber-300 dark:border-amber-700 transition-all flex items-center gap-1.5"
                title="Unduh data kehadiran dalam format CSV"
              >
                <Download className="w-4 h-4 text-amber-700 dark:text-amber-300" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => exportAttendanceToPDF(filteredAttendance, `Laporan Rekapitulasi Absensi ${recapMode === 'harian' ? 'Harian (' + formatIndoDate(filterTanggal) + ')' : 'Bulanan'}`)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" />
                <span>Export PDF</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 w-full max-w-full">
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setRecapMode('harian')}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              recapMode === 'harian'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-white/10 dark:hover:bg-slate-700/60'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Rekap Harian</span>
          </button>

          <button
            onClick={() => setRecapMode('bulanan')}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              recapMode === 'bulanan'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-white/10 dark:hover:bg-slate-700/60'
            }`}
          >
            <CalendarRange className="w-4 h-4" />
            <span>Rekap Bulanan</span>
          </button>

          <button
            onClick={() => setRecapMode('analisis_terlambat')}
            className={`w-full sm:w-auto sm:flex-none px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              recapMode === 'analisis_terlambat'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-white/10 dark:hover:bg-slate-700/60'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Analisis Kedisiplinan (Terlambat & Alpa)</span>
          </button>

          <button
            onClick={() => setRecapMode('semua')}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              recapMode === 'semua'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-white/10 dark:hover:bg-slate-700/60'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Semua Data</span>
          </button>
        </div>

        {/* Status Indicator */}
        <div className="px-3 py-1 bg-white/5 backdrop-blur-xl border border-white/10 dark:bg-slate-900/80 rounded-xl border border-white/10/60 dark:border-slate-700 text-[11px] font-semibold text-slate-300 hidden md:flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          <span>
            {recapMode === 'harian' && `Menampilkan Data Hari: ${formatIndoDate(filterTanggal)}`}
            {recapMode === 'bulanan' && `Menampilkan Data Bulan: ${formatIndoMonth(filterBulan)}`}
            {recapMode === 'analisis_terlambat' && `Analisis Kedisiplinan & BK (Terlambat & Alpa) ${filterKelas !== 'Semua' ? 'Kelas ' + filterKelas : 'Semua Kelas'} - ${formatIndoMonth(filterBulan)}`}
            {recapMode === 'semua' && 'Menampilkan Seluruh Riwayat Absensi'}
          </span>
        </div>
      </div>


      {/* Main Filter Control Box */}
      <div className="bg-black/20 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-sm space-y-3 transition-colors">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Dynamic Time Filter Selector based on Mode */}
          {recapMode === 'harian' && (
            <div className="col-span-1 sm:col-span-2 lg:col-span-2 space-y-1.5">
              <label className="block text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Pilih Tanggal Harian</span>
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                <input
                  type="date"
                  value={filterTanggal}
                  onChange={(e) => setFilterTanggal(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-blue-300 dark:border-blue-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-600 font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setFilterTanggal(todayISO)}
                  className={`px-2.5 py-1.5 text-[10px] font-extrabold rounded-xl border whitespace-nowrap transition-all ${
                    filterTanggal === todayISO
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                  }`}
                >
                  Hari Ini
                </button>

                {/* Quick date chips for dates with attendance data */}
                {availableDatesWithData.slice(0, 5).map((dStr) => {
                  const isSelected = filterTanggal === dStr;
                  const parts = dStr.split('-');
                  const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dStr;
                  return (
                    <button
                      key={dStr}
                      type="button"
                      onClick={() => setFilterTanggal(dStr)}
                      className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white/5 backdrop-blur-xl border border-white/10 text-slate-200 dark:text-slate-300 border-white/10 hover:bg-slate-200'
                      }`}
                      title={`Tampilkan data tanggal ${dStr}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {recapMode === 'bulanan' && (
            <div>
              <label className="block text-[11px] font-bold text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
                <CalendarRange className="w-3.5 h-3.5" />
                <span>Pilih Bulan Rekapan</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="month"
                  value={filterBulan}
                  onChange={(e) => setFilterBulan(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-blue-300 dark:border-blue-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-600 font-semibold"
                />
                <button
                  type="button"
                  onClick={handleFetchCloud}
                  disabled={isFetchingCloud}
                  title="Tarik Data dari Cloud Database"
                  className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/60 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-xl transition-colors shrink-0 flex items-center justify-center disabled:opacity-50"
                >
                  <Cloud className={`w-4 h-4 ${isFetchingCloud ? 'animate-bounce text-blue-500' : ''}`} />
                </button>
              </div>
            </div>
          )}

          {recapMode === 'semua' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-slate-400">Filter Tanggal (Opsional)</label>
                {semuaTanggalFilter && (
                  <button
                    type="button"
                    onClick={() => setSemuaTanggalFilter('')}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
              <input
                type="date"
                value={semuaTanggalFilter}
                onChange={(e) => setSemuaTanggalFilter(e.target.value)}
                placeholder="Semua Tanggal"
                className="w-full px-3 py-1.5 text-xs border border-white/10 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-600"
              />
            </div>
          )}

          {/* Search Name/NISN */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Cari Nama / NISN</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={filterNama}
                onChange={(e) => setFilterNama(e.target.value)}
                placeholder="Nama / NISN..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-white/10 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Filter Class */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Filter Kelas</label>
            <select
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-600 bg-white/5 backdrop-blur-xl border border-white/10 dark:text-white font-medium"
            >
              <option value="Semua">Semua Kelas</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Status Kehadiran</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-600 bg-white/5 backdrop-blur-xl border border-white/10 dark:text-white font-medium"
            >
              <option value="Semua">Semua Status</option>
              <option value="Hadir">Hadir</option>
              <option value="Terlambat">Terlambat</option>
              <option value="Izin">Izin</option>
              <option value="Sakit">Sakit</option>
              <option value="Alpa">Alpa</option>
            </select>
          </div>

          {/* Filter Jenis Presensi (Masuk / Pulang) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Jenis Presensi</label>
            <select
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-600 bg-white/5 backdrop-blur-xl border border-white/10 dark:text-white font-medium"
            >
              <option value="Semua">Semua Scan (Masuk & Pulang)</option>
              <option value="Masuk">Hanya Scan Masuk</option>
              <option value="Pulang">Hanya Scan Pulang</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-black/20 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 shadow-sm transition-colors">
          <div className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-400">Total Siswa Presensi</div>
          <div className="text-xl font-black text-white mt-1">{stats.totalSiswaMasuk}</div>
          <div className="text-[10px] text-slate-400 mt-0.5" title={`${stats.totalScanMasuk} Masuk, ${stats.totalScanPulang} Pulang`}>
            {stats.total} Total Scan ({stats.totalScanPulang} Pulang)
          </div>
        </div>

        <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
          <div className="text-[10px] font-extrabold uppercase text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
            <span>Hadir</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-900 dark:text-emerald-200 mt-1">{stats.hadir}</div>
          <div className="text-[10px] text-emerald-800/80 dark:text-emerald-300 mt-0.5">Tepat Waktu</div>
        </div>

        <div className="bg-amber-50/70 dark:bg-amber-950/40 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800/60 shadow-sm">
          <div className="text-[10px] font-extrabold uppercase text-amber-700 dark:text-amber-400 flex items-center justify-between">
            <span>Terlambat</span>
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-900 dark:text-amber-200 mt-1">{stats.terlambat}</div>
          <div className="text-[10px] text-amber-800/80 dark:text-amber-300 mt-0.5">Lewat Jam Masuk</div>
        </div>

        <div className="bg-blue-50/70 dark:bg-blue-950/40 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-800/60 shadow-sm">
          <div className="text-[10px] font-extrabold uppercase text-blue-700 dark:text-blue-400 flex items-center justify-between">
            <span>Izin</span>
            <FileCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-xl font-black text-blue-900 dark:text-blue-200 mt-1">{stats.izin}</div>
          <div className="text-[10px] text-blue-800/80 dark:text-blue-300 mt-0.5">Surat Izin</div>
        </div>

        <div className="bg-purple-50/70 dark:bg-purple-950/40 p-3.5 rounded-2xl border border-purple-200 dark:border-purple-800/60 shadow-sm">
          <div className="text-[10px] font-extrabold uppercase text-purple-700 dark:text-purple-400 flex items-center justify-between">
            <span>Sakit</span>
            <Stethoscope className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-xl font-black text-purple-900 dark:text-purple-200 mt-1">{stats.sakit}</div>
          <div className="text-[10px] text-purple-800/80 dark:text-purple-300 mt-0.5">Keterangan Dokter</div>
        </div>

        <div className="bg-red-50/70 dark:bg-red-950/40 p-3.5 rounded-2xl border border-red-200 dark:border-red-800/60 shadow-sm">
          <div className="text-[10px] font-extrabold uppercase text-red-700 dark:text-red-400 flex items-center justify-between">
            <span>Alpa</span>
            <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
          </div>
          <div className="text-xl font-black text-red-900 dark:text-red-200 mt-1">{stats.alpa}</div>
          <div className="text-[10px] text-red-800/80 dark:text-red-300 mt-0.5">Tanpa Keterangan</div>
        </div>
      </div>

      {/* Synchronization & Breakdown Info Banner */}
      <div className="bg-black/20 backdrop-blur-md/60 p-3.5 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-200 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            <strong>Data Sinkron dengan Dashboard:</strong> {stats.totalSiswaMasuk} Siswa Masuk ({stats.hadir} Hadir Tepat Waktu + {stats.terlambat} Terlambat) • {stats.scanPulang} Siswa Scan Pulang • {stats.total} Total Transaksi Scan.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-[11px] border border-blue-200 dark:border-blue-800">
            {stats.totalScanMasuk} Scan Masuk
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-[11px] border border-purple-200 dark:border-purple-800">
            {stats.totalScanPulang} Scan Pulang
          </span>
        </div>
      </div>

      {/* Sub-View Selector for Harian mode */}
      {recapMode === 'harian' && (
        <div className="flex items-center justify-between bg-black/20 backdrop-blur-md p-3 rounded-2xl border border-white/10">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Clock3 className="w-4 h-4 text-blue-600" />
            <span>Tampilan Absensi Harian ({formatIndoDate(filterTanggal)}):</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setHarianViewType('pasangan')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                harianViewType === 'pasangan'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white/5 backdrop-blur-xl border border-white/10 text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Pasangan Masuk & Pulang</span>
            </button>

            <button
              onClick={() => setHarianViewType('log')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                harianViewType === 'log'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white/5 backdrop-blur-xl border border-white/10 text-slate-300 hover:bg-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Log Scan Individual</span>
            </button>
          </div>
        </div>
      )}

      {/* Monthly Sub-View Selector (Only when in Bulanan mode) */}
      {recapMode === 'bulanan' && (
        <div className="flex items-center justify-between bg-black/20 backdrop-blur-md p-3 rounded-2xl border border-white/10">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span>Tampilan Rekap Bulanan ({formatIndoMonth(filterBulan)}):</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMonthlyViewType('agregat')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                monthlyViewType === 'agregat'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white/5 backdrop-blur-xl border border-white/10 text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Ringkasan Per Siswa</span>
            </button>

            <button
              onClick={() => setMonthlyViewType('log')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                monthlyViewType === 'log'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white/5 backdrop-blur-xl border border-white/10 text-slate-300 hover:bg-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Log Transaksi Absensi</span>
            </button>
          </div>
        </div>
      )}

      {/* Render Table based on selected mode & view type */}
      {recapMode === 'harian' && harianViewType === 'pasangan' ? (
        /* Harian Paired View Table (Jam Masuk, Jam Pulang, Status, Jumlah Waktu Terlambat) */
        <div className="bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 shadow-sm overflow-hidden transition-colors">
          <div className="p-4 border-b border-white/5 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-sm text-white">
                Rekap Pasangan Waktu Masuk & Pulang Siswa ({formatIndoDate(filterTanggal)})
              </h3>
              <p className="text-xs text-slate-400">
                Mencatat waktu masuk, waktu pulang, serta perhitungan akurat jumlah waktu keterlambatan siswa.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleBulkSetAlpa}
                className="px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-sm cursor-pointer"
                title="Tutup gerbang dan otomatis set Alpa untuk siswa yang tidak scan masuk"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>🚨 Tutup Gerbang (Auto-Alpa)</span>
              </button>

              <button
                type="button"
                onClick={handlePurgeSaturdayAlpa}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800 shadow-xs cursor-pointer"
                title="Hapus seluruh data presensi hari Sabtu yang berstatus ALPA"
              >
                <Trash2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Revisi Alpa Sabtu</span>
              </button>

              <button
                type="button"
                onClick={handleBulkSetPulang1430}
                disabled={pairedSummaryCounts.belumPulang === 0}
                className="px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Set otomatis scan Pulang batas akhir (14:30 WIT) untuk semua siswa yang belum/lupa scan pulang"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>⚡ Auto Pulang 14:30 ({pairedSummaryCounts.belumPulang} Siswa)</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterStatusPulang('Semua')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                  filterStatusPulang === 'Semua'
                    ? 'bg-slate-900 text-white dark:bg-white/10 border border-white/10 dark:text-white shadow-sm'
                    : 'bg-white/5 backdrop-blur-xl border border-white/10 text-slate-300 hover:bg-slate-200'
                }`}
              >
                Semua ({pairedSummaryCounts.total})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatusPulang('SudahPulang')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  filterStatusPulang === 'SudahPulang'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                }`}
                title="Tampilkan hanya siswa yang sudah melakukan scan pulang"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sudah Scan Pulang ({pairedSummaryCounts.sudahPulang})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterStatusPulang('BelumPulang')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  filterStatusPulang === 'BelumPulang'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                }`}
                title="Tampilkan siswa yang masuk namun belum scan pulang"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Belum Scan Pulang ({pairedSummaryCounts.belumPulang})</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 backdrop-blur-xl border border-white/10 text-slate-300 border-b border-white/10 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">No</th>
                  <th className="p-3.5">Nama Siswa</th>
                  <th className="p-3.5">NISN / Kelas</th>
                  <th className="p-3.5">Waktu Masuk</th>
                  <th className="p-3.5">Waktu Pulang</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Jumlah Waktu Terlambat</th>
                  <th className="p-3.5">Petugas</th>
                  <th className="p-3.5 text-center">Aksi / Koreksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 dark:divide-slate-800 text-slate-200">
                {pairedDailyRecords.length > 0 ? (
                  paginateList<any>(pairedDailyRecords, currentPage, pageSize).map((item, index) => (
                    <tr key={item.student.id} className="hover:bg-white/5 border border-white/10 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3.5 font-medium text-slate-400 dark:text-slate-400">
                        {pageSize === 0 ? index + 1 : (currentPage - 1) * pageSize + index + 1}
                      </td>
                      <td className="p-3.5 font-bold text-white">{item.student.nama}</td>
                      <td className="p-3.5">
                        <span className="font-mono text-slate-400">{item.student.nisn}</span>
                        <span className="text-slate-400 dark:text-slate-400 font-semibold ml-1.5">({item.student.kelas})</span>
                      </td>
                      <td className="p-3.5">
                        {item.masuk ? (
                          <button
                            type="button"
                            onClick={() => handleOpenCorrection(item.masuk, item.student, filterTanggal, 'Masuk')}
                            className="font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1 group transition cursor-pointer"
                            title={`Klik untuk koreksi Scan Masuk ${item.student.nama}`}
                          >
                            <LogIn className="w-3 h-3 text-emerald-600" />
                            {new Date(item.masuk.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jayapura' })} WIT
                            <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 ml-0.5 text-emerald-600" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenCorrection(null, item.student, filterTanggal, 'Masuk')}
                            className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 px-2 py-0.5 rounded border border-dashed border-white/10 font-mono text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                            title={`Input Presensi Masuk untuk ${item.student.nama}`}
                          >
                            <span>-</span>
                          </button>
                        )}
                      </td>
                      <td className="p-3.5">
                        {item.pulang ? (
                          <button
                            type="button"
                            onClick={() => handleOpenCorrection(item.pulang, item.student, filterTanggal, 'Pulang')}
                            className="font-mono font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800 inline-flex items-center gap-1 group transition cursor-pointer"
                            title={`Klik untuk koreksi Scan Pulang ${item.student.nama}`}
                          >
                            <LogOut className="w-3 h-3 text-purple-600" />
                            {new Date(item.pulang.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jayapura' })} WIT
                            <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 ml-0.5 text-purple-600" />
                          </button>
                        ) : item.masuk ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenCorrection(null, item.student, filterTanggal, 'Pulang')}
                              className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 inline-flex items-center gap-1 transition cursor-pointer"
                              title={`Input Manual Scan Pulang untuk ${item.student.nama}`}
                            >
                              <span>Belum Pulang</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSingleSetPulang1430(item.student)}
                              className="text-[10px] font-bold text-white bg-purple-600 hover:bg-purple-700 active:scale-95 px-2 py-0.5 rounded-md shadow-xs inline-flex items-center gap-1 transition cursor-pointer"
                              title={`Set otomatis ${item.student.nama} pulang pada batas akhir 14:30 WIT (Lupa/Tidak sempat scan)`}
                            >
                              <Clock className="w-2.5 h-2.5" />
                              <span>Set 14:30</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenCorrection(null, item.student, filterTanggal, 'Pulang')}
                              className="text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 px-2 py-0.5 rounded border border-dashed border-white/10 font-mono text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                              title={`Input Presensi Pulang untuk ${item.student.nama}`}
                            >
                              <span>-</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSingleSetPulang1430(item.student)}
                              className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 px-1.5 py-0.5 rounded shadow-xs inline-flex items-center gap-1 transition cursor-pointer"
                              title={`Set otomatis pulang 14:30 WIT untuk ${item.student.nama}`}
                            >
                              <span>Pulang 14:30</span>
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {getStatusBadge(item.status)}
                          {item.partialInfo === 'Tanpa Absen Pulang' && (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800" title="Siswa hadir masuk namun tidak mencatat scan pulang">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Tanpa Absen Pulang
                            </span>
                          )}
                          {item.partialInfo === 'Tanpa Absen Masuk' && (
                            <span className="inline-flex items-center gap-1 bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-sky-300 dark:border-sky-800" title="Siswa mencatat scan pulang namun tidak mencatat scan masuk">
                              <AlertCircle className="w-3 h-3 text-sky-600" />
                              Tanpa Absen Masuk
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5">
                        {item.status === 'Terlambat' && item.lateMinutes > 0 ? (
                          <span className="font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-700 inline-flex items-center gap-1 text-[11px]">
                            <Clock className="w-3 h-3 text-amber-600" />
                            {formatLateDuration(item.lateMinutes)}
                          </span>
                        ) : item.status === 'Hadir' ? (
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            Tepat Waktu
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-400 truncate max-w-[120px]">{formatPetugasRole(item.petugas)}</td>
                      <td className="p-3.5 text-center flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenCorrection(item.masuk || item.pulang, item.student, filterTanggal)}
                          className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors inline-flex items-center gap-1 font-bold text-[11px]"
                          title={`Koreksi status / jam scan ${item.student.nama}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Koreksi</span>
                        </button>

                        <button
                          onClick={() => {
                            let phone = item.student.no_hp_ortu;
                            if (!phone) {
                              phone = prompt(`Masukkan No. WhatsApp Orang Tua untuk ${item.student.nama}:`, '08123456789') || undefined;
                              if (phone && phone.trim()) {
                                store.updateStudent(item.student.id, { no_hp_ortu: phone.trim() });
                                item.student.no_hp_ortu = phone.trim();
                              }
                            }
                            if (phone) {
                              const schoolSettings = store.getSettings();
                              let template: string | undefined;
                              if (item.status === 'Hadir') template = schoolSettings.waTemplateHadir;
                              else if (item.status === 'Terlambat') template = schoolSettings.waTemplateTerlambat;
                              else if (item.status === 'Izin' || item.status === 'Sakit') template = schoolSettings.waTemplateIzinSakit;
                              else if (item.status === 'Alpa') template = schoolSettings.waTemplateAlpa;

                              const recordToUse = item.masuk || {
                                id: '',
                                studentId: item.student.id,
                                studentName: item.student.nama,
                                nisn: item.student.nisn,
                                class: item.student.kelas,
                                timestamp: new Date().toISOString(),
                                type: 'Masuk' as const,
                                status: item.status,
                                officer: item.petugas,
                                terlambatMenit: item.lateMinutes,
                              };

                              const schoolName = schoolSettings.schoolName || 'SMA NEGERI 15 AMBON';
                              const waMsg = generateWhatsAppMessage(item.student, recordToUse, schoolName, template);
                              const waUrl = getWhatsAppLink(phone, waMsg);
                              window.open(waUrl, '_blank');
                            }
                          }}
                          className={`p-1.5 rounded-lg transition-colors inline-flex items-center justify-center ${
                            item.student.no_hp_ortu
                              ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                              : 'text-slate-400 dark:text-slate-400 hover:bg-white/10'
                          }`}
                          title={item.student.no_hp_ortu ? `Kirim Notifikasi WA (${item.student.no_hp_ortu})` : 'Input No HP & Kirim WA'}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 text-xs">
                      Tidak ada data siswa atau absensi harian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {renderPaginationFooter(pairedDailyRecords.length)}
        </div>
      ) : recapMode === 'analisis_terlambat' ? (
        /* Discipline & Absence Analysis View */
        <div className="space-y-4">
          {/* Top Banner & Summary Badges */}
          <div className="bg-gradient-to-r from-red-900 via-slate-900 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-red-800/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-600/30 rounded-xl border border-red-500/40 text-red-300">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight">
                    Analisis Kedisiplinan & Ketidakhadiran Siswa (BK & Wali Kelas)
                  </h3>
                  <p className="text-xs text-red-200/80">
                    Sistem menganalisis akumulasi keterlambatan dan ketidakhadiran (alpa) siswa serta menyusun rekomendasi pembinaan kedisiplinan yang transparan untuk dilaporkan kepada orang tua.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsProblematicExportModalOpen(true)}
                  className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-800 text-white font-bold text-xs rounded-xl border border-white/20 shadow transition-all flex items-center gap-1.5"
                  title="Buka panel ekspor lengkap rekap siswa bermasalah (Excel & PDF)"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Ekspor Rekap Siswa Bermasalah</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportLateGuidanceToPDF(filteredDisciplineData, formatIndoMonth(filterBulan), filterKelas)}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  <span>Cetak PDF Laporan Pembinaan BK</span>
                </button>
              </div>
            </div>

            {/* Discipline Stat Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-red-800/50 text-xs">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                <div className="text-red-200 text-[10px] uppercase font-bold">Total Siswa Indisiplin</div>
                <div className="text-lg font-black text-white mt-0.5">{latenessAnalysisData.length} Siswa</div>
              </div>

              <div className="bg-amber-500/20 p-3 rounded-xl backdrop-blur-sm border border-amber-500/30">
                <div className="text-amber-200 text-[10px] uppercase font-bold">Siswa Terlambat</div>
                <div className="text-lg font-black text-amber-300 mt-0.5">
                  {latenessAnalysisData.filter((i) => i.lateCount > 0).length} Siswa
                </div>
              </div>

              <div className="bg-rose-500/20 p-3 rounded-xl backdrop-blur-sm border border-rose-500/30">
                <div className="text-rose-200 text-[10px] uppercase font-bold">Siswa Alpa / Tidak Hadir</div>
                <div className="text-lg font-black text-rose-300 mt-0.5">
                  {latenessAnalysisData.filter((i) => i.alpaCount > 0).length} Siswa
                </div>
              </div>

              <div className="bg-red-500/20 p-3 rounded-xl backdrop-blur-sm border border-red-500/30">
                <div className="text-red-200 text-[10px] uppercase font-bold flex items-center justify-between">
                  <span>Risiko Kritis (BK)</span>
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
                </div>
                <div className="text-lg font-black text-red-300 mt-0.5">
                  {latenessAnalysisData.filter((i) => i.riskLevel === 'Kritis').length} Siswa
                </div>
              </div>
            </div>
          </div>

          {/* Discipline Analysis Table & Sub-filters */}
          <div className="bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 shadow-sm overflow-hidden transition-colors">
            <div className="p-4 border-b border-white/5 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <span>Rekapitulasi Kedisiplinan Siswa</span>
                  <span className="text-[10px] bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 px-2 py-0.5 rounded-full font-mono">
                    Urutan Tingkat Kritis
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Daftar diurutkan berdasarkan jumlah hari Alpa dan frekuensi keterlambatan siswa. Filter Aktif: <strong className="text-white dark:text-slate-200">{filterKelas}</strong>.
                </p>
              </div>

              {/* Sub-filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setDisciplineFilterType('semua_indisiplin')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    disciplineFilterType === 'semua_indisiplin'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-white/5 backdrop-blur-xl border border-white/10 text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Semua Terlambat & Alpa ({latenessAnalysisData.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDisciplineFilterType('hanya_terlambat')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    disciplineFilterType === 'hanya_terlambat'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-white/5 backdrop-blur-xl border border-white/10 text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Terlambat ({latenessAnalysisData.filter((i) => i.lateCount > 0).length})
                </button>
                <button
                  type="button"
                  onClick={() => setDisciplineFilterType('hanya_alpa')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    disciplineFilterType === 'hanya_alpa'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-white/5 backdrop-blur-xl border border-white/10 text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Alpa / Tidak Hadir ({latenessAnalysisData.filter((i) => i.alpaCount > 0).length})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 backdrop-blur-xl border border-white/10 text-slate-300 border-b border-white/10 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">No</th>
                    <th className="p-3.5">Nama Siswa</th>
                    <th className="p-3.5">NISN / Kelas</th>
                    <th className="p-3.5 text-center">Keterlambatan</th>
                    <th className="p-3.5 text-center">Ketidakhadiran (Alpa)</th>
                    <th className="p-3.5">Tingkat Risiko & BK</th>
                    <th className="p-3.5">Rekomendasi Pembinaan BK</th>
                    <th className="p-3.5 text-center">Kirim WA Ortu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 dark:divide-slate-800 text-slate-200">
                  {filteredDisciplineData.length > 0 ? (
                    paginateList<any>(filteredDisciplineData, currentPage, pageSize).map((item, idx) => (
                      <tr key={item.student.id} className="hover:bg-white/5 border border-white/10 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3.5 font-bold text-slate-400 dark:text-slate-400">
                          {pageSize === 0 ? idx + 1 : (currentPage - 1) * pageSize + idx + 1}
                        </td>
                        <td className="p-3.5">
                          <div className="font-extrabold text-white">{item.student.nama}</div>
                          <div className="space-y-0.5 mt-0.5 text-[10px]">
                            {item.lateDates.length > 0 && (
                              <div className="text-amber-700 dark:text-amber-400 font-mono">
                                Terlambat: {item.lateDates.slice(0, 3).join(', ')}{item.lateDates.length > 3 ? ` (+${item.lateDates.length - 3})` : ''}
                              </div>
                            )}
                            {item.alpaDates.length > 0 && (
                              <div className="text-red-600 dark:text-red-400 font-mono font-bold">
                                Alpa: {item.alpaDates.slice(0, 3).join(', ')}{item.alpaDates.length > 3 ? ` (+${item.alpaDates.length - 3})` : ''}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="font-mono text-slate-400">{item.student.nisn}</span>
                          <span className="text-slate-400 dark:text-slate-400 font-semibold ml-1.5">({item.student.kelas})</span>
                        </td>
                        <td className="p-3.5 text-center">
                          {item.lateCount > 0 ? (
                            <span className="font-extrabold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800 inline-block">
                              {item.lateCount}x ({formatLateDuration(item.totalLateMinutes)})
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          {item.alpaCount > 0 ? (
                            <span className="font-extrabold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/80 px-2.5 py-1 rounded-full border border-red-200 dark:border-red-800 inline-block">
                              {item.alpaCount} Hari Alpa
                            </span>
                          ) : (
                            <span className="text-slate-400">0 Hari</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          {item.riskLevel === 'Kritis' ? (
                            <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full border border-red-300 dark:border-red-800">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              RISIKO KRITIS (BK)
                            </span>
                          ) : item.riskLevel === 'Sedang' ? (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              RISIKO SEDANG
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full border border-blue-300 dark:border-blue-800">
                              <AlertCircle className="w-3.5 h-3.5" />
                              RISIKO RINGAN
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 max-w-xs leading-relaxed text-[11px] text-slate-200 dark:text-slate-300">
                          {item.rekomendasiPembinaan}
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              let phone = item.student.no_hp_ortu;
                              if (!phone) {
                                phone = prompt(`Masukkan No. WA Orang Tua / Wali murid ${item.student.nama}:`, '08123456789') || undefined;
                                if (phone && phone.trim()) {
                                  store.updateStudent(item.student.id, { no_hp_ortu: phone.trim() });
                                  item.student.no_hp_ortu = phone.trim();
                                }
                              }
                              if (phone) {
                                const schoolName = store.getSettings().schoolName || 'SMA Negeri 15 Ambon';
                                const msg = generateWhatsAppLateGuidanceMessage(
                                  item.student,
                                  item.lateCount,
                                  item.totalLateMinutes,
                                  item.lateDates,
                                  schoolName,
                                  item.lateDetails,
                                  item.alpaCount,
                                  item.alpaDates
                                );
                                const link = getWhatsAppLink(phone, msg);
                                window.open(link, '_blank');
                              }
                            }}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[11px] flex items-center justify-center gap-1.5 shadow-sm transition-all mx-auto"
                            title="Kirim Pesan WA Pembinaan Kedisiplinan & Kehadiran ke Orang Tua"
                          >
                            <Send className="w-3 h-3" />
                            <span>WA Pembinaan</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-slate-400 text-xs">
                        🎉 Tidak ada data siswa yang memenuhi kriteria filter kedisiplinan ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {renderPaginationFooter(filteredDisciplineData.length)}
          </div>
        </div>
      ) : recapMode === 'bulanan' && monthlyViewType === 'agregat' ? (

        /* Monthly Aggregate Table Per Student */
        <div className="bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 shadow-sm overflow-hidden transition-colors">
          <div className="p-4 border-b border-white/5 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-white">
                Tabel Ringkasan Kehadiran Bulanan Per Siswa
              </h3>
              <p className="text-xs text-slate-400">
                Total kumulatif kehadiran dan akumulasi waktu keterlambatan siswa pada bulan {formatIndoMonth(filterBulan)}.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400 bg-white/5 backdrop-blur-xl border border-white/10 px-3 py-1 rounded-xl">
              {monthlyStudentSummaries.length} Siswa Terdaftar
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 backdrop-blur-xl border border-white/10 text-slate-300 border-b border-white/10 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">No</th>
                  <th className="p-3.5">Nama Siswa</th>
                  <th className="p-3.5">NISN / Kelas</th>
                  <th className="p-3.5 text-center text-emerald-700 dark:text-emerald-400">Hadir</th>
                  <th className="p-3.5 text-center text-amber-700 dark:text-amber-400">Terlambat (Hari)</th>
                  <th className="p-3.5 text-center text-amber-700 dark:text-amber-400">Total Waktu Terlambat</th>
                  <th className="p-3.5 text-center text-blue-700 dark:text-blue-400">Izin</th>
                  <th className="p-3.5 text-center text-purple-700 dark:text-purple-400">Sakit</th>
                  <th className="p-3.5 text-center text-red-700 dark:text-red-400">Alpa</th>
                  <th className="p-3.5 text-center">Total Masuk</th>
                  <th className="p-3.5 text-center">% Kehadiran</th>
                  <th className="p-3.5 text-center">Cetak / Slip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 dark:divide-slate-800 text-slate-200">
                {monthlyStudentSummaries.length > 0 ? (
                  paginateList<any>(monthlyStudentSummaries, currentPage, pageSize).map((item, index) => (
                    <tr key={item.student.id} className="hover:bg-white/5 border border-white/10 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3.5 font-medium text-slate-400 dark:text-slate-400">
                        {pageSize === 0 ? index + 1 : (currentPage - 1) * pageSize + index + 1}
                      </td>
                      <td className="p-3.5 font-bold text-white">{item.student.nama}</td>
                      <td className="p-3.5">
                        <span className="font-mono text-slate-400">{item.student.nisn}</span>
                        <span className="text-slate-400 dark:text-slate-400 font-semibold ml-1.5">({item.student.kelas})</span>
                      </td>
                      <td className="p-3.5 text-center font-bold text-emerald-600 dark:text-emerald-400">{item.hadir}</td>
                      <td className="p-3.5 text-center font-bold text-amber-600 dark:text-amber-400">{item.terlambat}</td>
                      <td className="p-3.5 text-center font-bold text-amber-600 dark:text-amber-400">
                        {item.totalTerlambatMenit > 0 ? formatLateDuration(item.totalTerlambatMenit) : '-'}
                      </td>
                      <td className="p-3.5 text-center font-bold text-blue-600 dark:text-blue-400">{item.izin}</td>
                      <td className="p-3.5 text-center font-bold text-purple-600 dark:text-purple-400">{item.sakit}</td>
                      <td className="p-3.5 text-center font-bold text-red-600 dark:text-red-400">{item.alpa}</td>
                      <td className="p-3.5 text-center font-bold text-white">{item.totalMasuk} kali</td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-block font-extrabold px-2.5 py-0.5 rounded-full text-[11px] ${
                            item.persentaseHadir >= 85
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : item.persentaseHadir >= 70
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          }`}
                        >
                          {item.persentaseHadir}%
                        </span>
                      </td>
                      <td className="p-3.5 text-center flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenCorrection(null, item.student)}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 font-bold rounded-lg text-[11px] border border-blue-200 dark:border-blue-800 inline-flex items-center gap-1 transition-all"
                          title={`Koreksi status/jam scan kehadiran ${item.student.nama}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Koreksi</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setPrintStudentSlip(item.student);
                            setIsPrintModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 font-bold rounded-lg text-[11px] border border-indigo-200 dark:border-indigo-800 inline-flex items-center gap-1 transition-all"
                          title={`Cetak Slip Rekapitulasi Kehadiran Bulanan ${item.student.nama}`}
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Slip</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-slate-400 text-xs">
                      Tidak ada data siswa atau absensi untuk bulan ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {renderPaginationFooter(monthlyStudentSummaries.length)}
        </div>
      ) : (
        /* Standard Attendance Record Log Table */
        <div className="bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 shadow-sm overflow-hidden transition-colors">
          <div className="p-4 border-b border-white/5 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-white">
                  Log Detail Absensi Siswa ({filteredAttendance.length} Rekaman)
                </h3>
                {selectedAttendanceIds.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    {selectedAttendanceIds.length} Terpilih
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {recapMode === 'harian' && `Catatan riwayat scan absensi pada hari ${formatIndoDate(filterTanggal)}.`}
                {recapMode === 'bulanan' && `Catatan riwayat scan absensi pada bulan ${formatIndoMonth(filterBulan)}.`}
                {recapMode === 'semua' && 'Seluruh log riwayat scan absensi.'}
              </p>
            </div>

            {selectedAttendanceIds.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteSelectedAttendance}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md animate-fadeIn"
                title="Hapus semua rekaman absensi yang dipilih"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus {selectedAttendanceIds.length} Absensi Terpilih</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 backdrop-blur-xl border border-white/10 text-slate-300 border-b border-white/10 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredAttendance.length > 0 &&
                        selectedAttendanceIds.length === filteredAttendance.length
                      }
                      onChange={() => handleToggleSelectAllAttendance(filteredAttendance)}
                      className="rounded border-white/20 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      title="Pilih Semua / Batal Pilih"
                    />
                  </th>
                  <th className="p-3.5">No</th>
                  <th className="p-3.5">Tanggal</th>
                  <th className="p-3.5">Waktu Scan</th>
                  <th className="p-3.5">Nama Siswa</th>
                  <th className="p-3.5">NISN / Kelas</th>
                  <th className="p-3.5">Jenis</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Waktu Terlambat</th>
                  <th className="p-3.5">Petugas</th>
                  <th className="p-3.5 text-center">Hapus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 dark:divide-slate-800 text-slate-200">
                {filteredAttendance.length > 0 ? (
                  paginateList<any>(filteredAttendance, currentPage, pageSize).map((r, index) => {
                    const lateMin = calculateLateMinutes(r, store.getSettings().cutoffTime);
                    const isSelected = selectedAttendanceIds.includes(r.id);
                    return (
                      <tr
                        key={r.id}
                        className={`hover:bg-white/5 border border-white/10 dark:hover:bg-slate-800/50 transition-colors ${
                          isSelected ? 'bg-sky-50/60 dark:bg-sky-950/30' : ''
                        }`}
                      >
                        <td className="p-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectAttendance(r.id)}
                            className="rounded border-white/20 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-3.5 font-medium text-slate-400 dark:text-slate-400">
                          {pageSize === 0 ? index + 1 : (currentPage - 1) * pageSize + index + 1}
                        </td>
                        <td className="p-3.5 font-semibold text-white">{r.tanggal}</td>
                        <td className="p-3.5 font-mono text-slate-200 dark:text-slate-300">
                          {r.timestamp ? new Date(r.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jayapura' }) + ' WIT' : '-'}
                        </td>
                        <td className="p-3.5 font-bold text-white">{r.nama}</td>
                        <td className="p-3.5">
                          <span className="font-mono text-slate-400">{r.nisn}</span>
                          <span className="text-slate-400 dark:text-slate-400 font-semibold ml-1.5">({r.kelas})</span>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                r.jenis === 'Masuk'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                  : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              }`}
                            >
                              {r.jenis}
                            </span>
                            {r.scan_method === 'RFID' ? (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded inline-flex items-center gap-0.5" title="Discan via Kartu RFID">
                                <CreditCard className="w-2.5 h-2.5" />
                                <span>RFID</span>
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="p-3.5">{getStatusBadge(r.status)}</td>
                        <td className="p-3.5">
                          {r.jenis === 'Masuk' && r.status === 'Terlambat' ? (
                            <span className="font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-700 inline-flex items-center gap-1 text-[10px]">
                              <Clock className="w-3 h-3 text-amber-600" />
                              {formatLateDuration(lateMin)}
                            </span>
                          ) : r.jenis === 'Masuk' && r.status === 'Hadir' ? (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              Tepat Waktu
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-400 truncate max-w-[120px]">{formatPetugasRole(r.petugas)}</td>
                        <td className="p-3.5 text-center flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenCorrection(r, null, r.tanggal)}
                            className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors"
                            title="Koreksi Status / Jam Scan Absensi"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              store.deleteAttendance(r.id);
                              setSelectedAttendanceIds((prev) => prev.filter((id) => id !== r.id));
                              toast.success('Rekaman Dihapus', `Rekaman presensi ${r.nama} (${r.jenis}) berhasil dihapus.`);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors cursor-pointer"
                            title="Hapus Rekaman Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-400 text-xs">
                      Tidak ada rekaman absensi yang cocok dengan kriteria filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {renderPaginationFooter(filteredAttendance.length)}
        </div>
      )}

      <ManualInputModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        students={students}
        onSubmit={handleManualSubmit}
      />

      <ImportAttendanceModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        students={students}
        currentOfficer={currentOfficer}
        onExecuteImport={handleExecuteImport}
      />

      <PrintReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        students={students}
        monthlyStudentSummaries={monthlyStudentSummaries}
        printStudentSlip={printStudentSlip}
        setPrintStudentSlip={setPrintStudentSlip}
        printWaliKelasName={printWaliKelasName}
        setPrintWaliKelasName={setPrintWaliKelasName}
        filterBulan={filterBulan}
        filterKelas={filterKelas}
        todayISO={todayISO}
        formatIndoMonth={formatIndoMonth}
        formatIndoDate={formatIndoDate}
        currentOfficer={currentOfficer}
      />

      <AttendanceRecoveryModal
        isOpen={isRecoveryModalOpen}
        onClose={() => setIsRecoveryModalOpen(false)}
        onSuccess={handleManualRefresh}
      />

      <AttendanceCorrectionModal
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        onSuccess={handleManualRefresh}
        initialRecord={correctionRecord}
        initialStudent={correctionStudent}
        initialDate={correctionDate}
        initialType={correctionType}
        currentOfficer={currentOfficer}
      />

      <ExportProblematicModal
        isOpen={isProblematicExportModalOpen}
        onClose={() => setIsProblematicExportModalOpen(false)}
        classList={classOptions}
        initialClass={filterKelas !== 'Semua' ? filterKelas : 'Semua'}
        initialBulan={filterBulan}
      />
    </div>
  );
};
