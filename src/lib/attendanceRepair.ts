/**
 * ATTENDANCE REPAIR & RECOVERY PURE UTILITIES (NEXA15)
 * 
 * Modul ini berisi fungsi-fungsi murni (pure & stateless) untuk mendeteksi
 * anomali data presensi dan rekonsiliasi data yang hilang dari log aktivitas.
 * 
 * Sepenuhnya bebas dari efek samping (I/O, database, storage, UI, mutasi state).
 */

import type {
  AttendanceRecord,
  Student,
  ActivityLog,
  MissingAttendanceLogItem,
  AttendanceType,
} from '../types';
import { normalizeToYyyyMmDd, isRecordForDate } from './dateUtils';
import { parseAttendanceLogDetails, isAttendanceActionLog } from './auditLogUtils';

export interface DoubleMasukAnomaly<T = AttendanceRecord> {
  studentNisn: string;
  studentName: string;
  kelas: string;
  date: string;
  dateStr: string;
  firstRecord: T;
  duplicateRecords: T[];
  records: T[];
}

/**
 * Mendeteksi anomali rekaman scan 'Masuk' ganda untuk siswa pada tanggal yang sama.
 * Mengikuti implementasi kanonikal NEXA15:
 * - Mengelompokkan rekaman presensi Masuk berdasarkan `${nisn}_${tanggal}`
 * - Untuk setiap kelompok dengan > 1 rekaman:
 *   * Mengurutkan rekaman berdasarkan timestamp secara ascending (terawal di posisi 0)
 *   * Rekaman terawal ditetapkan sebagai `firstRecord` (rekaman sah)
 *   * Rekaman setelahnya ditetapkan sebagai `duplicateRecords` (anomali scan ganda)
 * - Bersifat stateless dan tidak memutasi array atau objek input.
 * 
 * @param records Daftar rekaman presensi yang akan diperiksa
 */
export function findDoubleMasukRecords<
  T extends {
    id?: string;
    jenis: AttendanceType;
    nisn: string;
    tanggal: string;
    nama: string;
    kelas?: string;
    timestamp: string;
  }
>(records: readonly T[]): DoubleMasukAnomaly<T>[] {
  const groups = new Map<string, T[]>();

  records.forEach((r) => {
    if (r.jenis === 'Masuk') {
      const key = `${r.nisn}_${r.tanggal}`;
      const existing = groups.get(key) || [];
      existing.push(r);
      groups.set(key, existing);
    }
  });

  const anomalies: DoubleMasukAnomaly<T>[] = [];

  groups.forEach((groupRecords, key) => {
    if (groupRecords.length > 1) {
      const [nisn, date] = key.split('_');
      const sorted = [...groupRecords].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      const first = sorted[0];
      const duplicates = sorted.slice(1);
      anomalies.push({
        studentNisn: nisn,
        studentName: first.nama,
        kelas: first.kelas || '-',
        date,
        dateStr: date,
        firstRecord: first,
        duplicateRecords: duplicates,
        records: sorted,
      });
    }
  });

  return anomalies;
}

/**
 * Menganalisis log aktivitas sistem untuk mendeteksi rekaman presensi yang tercatat di log
 * tetapi hilang dari tabel rekaman presensi utama (misal akibat sinkronisasi terputus).
 * 
 * Aturan Kanonikal NEXA15:
 * - Hanya memproses log dengan action berawalan 'SCAN_' atau 'PRESENSI_'
 * - Melakukan parsing log menggunakan `parseAttendanceLogDetails`
 * - Mencocokkan nama dengan master data siswa (case-insensitive) untuk resolusi NISN dan kelas
 * - Memeriksa keberadaan rekaman di daftar attendance:
 *   * Pencocokan via NISN atau Nama lengkap
 *   * Pencocokan tanggal via `isRecordForDate`
 *   * Pencocokan jenis presensi ('Masuk' / 'Pulang')
 * - Jika tidak ditemukan di attendance, item dikembalikan sebagai `MissingAttendanceLogItem`
 * 
 * @param logs Daftar log aktivitas sistem
 * @param attendance Daftar rekaman presensi siswa saat ini
 * @param students Daftar master data siswa untuk resolusi identitas
 */
export function getMissingAttendanceItemsFromLogs(
  logs: readonly ActivityLog[],
  attendance: readonly AttendanceRecord[],
  students: readonly Student[] = []
): MissingAttendanceLogItem[] {
  const missing: MissingAttendanceLogItem[] = [];
  const studentMapByName = new Map<string, Student>();

  students.forEach((s) => {
    if (s.nama) {
      studentMapByName.set(s.nama.toLowerCase().trim(), s);
    }
  });

  logs.forEach((log) => {
    if (!isAttendanceActionLog(log.action)) {
      return;
    }

    const dateStr = normalizeToYyyyMmDd(log.timestamp);
    const parsed = parseAttendanceLogDetails(log);
    if (!parsed) return;

    const { nama: parsedNama, kelas: parsedKelas, status: parsedStatus, jenis } = parsed;

    const matchedStudent = studentMapByName.get(parsedNama.toLowerCase().trim());
    const nisn = matchedStudent
      ? matchedStudent.nisn
      : `manual-${parsedNama.replace(/\s+/g, '').toLowerCase()}`;
    const kelas = matchedStudent ? matchedStudent.kelas : (parsedKelas || 'X');

    // Cek apakah presensi ini sudah ada di daftar attendance
    const exists = attendance.some(
      (a) =>
        (a.nisn === nisn || a.nama.toLowerCase().trim() === parsedNama.toLowerCase().trim()) &&
        isRecordForDate(a, dateStr) &&
        a.jenis === jenis
    );

    if (!exists) {
      const parts = dateStr.split('-');
      const dateFormatted = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : dateStr;

      missing.push({
        logId: log.id,
        timestamp: log.timestamp,
        dateFormatted,
        nama: parsedNama,
        nisn,
        kelas,
        jenis,
        status: parsedStatus,
        petugas: log.user || 'Petugas Piket',
        action: log.action,
        details: log.details || '',
      });
    }
  });

  return missing;
}
