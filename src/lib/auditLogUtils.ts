/**
 * NEXA15 Pure Audit Log & Activity Log Utilities
 * Stateless parsing, formatting, and predicate utilities for activity log entries.
 */

import { AttendanceStatus, AttendanceType } from '../types';

export interface ParsedAttendanceLog {
  nama: string;
  kelas: string;
  status: AttendanceStatus;
  jenis: AttendanceType;
}

/**
 * Memeriksa apakah sebuah nama aksi (action) merupakan log aktivitas presensi
 */
export function isAttendanceActionLog(action?: string): boolean {
  if (!action) return false;
  return action.startsWith('SCAN_') || action.startsWith('PRESENSI_');
}

/**
 * Melakukan parsing nama, kelas, status, dan jenis presensi dari teks log aktivitas (action & details).
 * Mendukung format:
 * - Scan Presensi Masuk/Pulang [STATUS]: NAMA (KELAS) [RFID] Terlambat X mnt oleh PETUGAS
 * - Menambahkan presensi manual: NAMA (KELAS) - STATUS
 */
export function parseAttendanceLogDetails(log: {
  action?: string;
  details?: string;
}): ParsedAttendanceLog | null {
  const details = log.details || '';
  const action = log.action || '';

  if (!isAttendanceActionLog(action) && !details.toLowerCase().includes('presensi')) {
    return null;
  }

  const isPulang = action.includes('PULANG') || details.toLowerCase().includes('pulang');
  const jenis: AttendanceType = isPulang ? 'Pulang' : 'Masuk';

  let parsedNama = '';
  let parsedKelas = '';
  let parsedStatus: AttendanceStatus = 'Hadir';

  const scanMatch = details.match(/Scan Presensi (?:Masuk|Pulang)(?: \[(.*?)\])?: ([^(]+) \(([^)]+)\)/i);
  const manualMatch = details.match(/presensi manual: ([^(]+) \(([^)]+)\) - (\w+)/i);

  if (scanMatch) {
    if (scanMatch[1]) {
      const rawSt = scanMatch[1].trim().toUpperCase();
      if (rawSt.includes('TERLAMBAT')) parsedStatus = 'Terlambat';
      else if (rawSt.includes('IZIN')) parsedStatus = 'Izin';
      else if (rawSt.includes('SAKIT')) parsedStatus = 'Sakit';
      else if (rawSt.includes('ALPA')) parsedStatus = 'Alpa';
      else parsedStatus = 'Hadir';
    }
    parsedNama = scanMatch[2]?.trim() || '';
    parsedKelas = scanMatch[3]?.trim() || '';
  } else if (manualMatch) {
    parsedNama = manualMatch[1]?.trim() || '';
    parsedKelas = manualMatch[2]?.trim() || '';
    const rawSt = manualMatch[3]?.trim().toUpperCase();
    if (rawSt.includes('TERLAMBAT')) parsedStatus = 'Terlambat';
    else if (rawSt.includes('IZIN')) parsedStatus = 'Izin';
    else if (rawSt.includes('SAKIT')) parsedStatus = 'Sakit';
    else if (rawSt.includes('ALPA')) parsedStatus = 'Alpa';
    else parsedStatus = 'Hadir';
  }

  if (!parsedNama) return null;

  return {
    nama: parsedNama,
    kelas: parsedKelas,
    status: parsedStatus,
    jenis,
  };
}

/**
 * Format string log aktivitas untuk presensi scan siswa
 */
export function formatScanLogDetails(params: {
  nama: string;
  kelas: string;
  status: string;
  jenis: 'Masuk' | 'Pulang';
  isRfidScan?: boolean;
  lateMinutes?: number;
  officer?: string;
}): string {
  const { nama, kelas, status, jenis, isRfidScan, lateMinutes, officer } = params;
  const officerName = officer || 'Petugas Piket';
  const rfidTag = isRfidScan ? ' [RFID]' : '';

  if (jenis === 'Pulang') {
    return `Scan Presensi Pulang${rfidTag}: ${nama} (${kelas}) oleh ${officerName}`;
  }

  const isLate = status.toLowerCase() === 'terlambat' && (lateMinutes || 0) > 0;
  const lateStr = isLate ? ` Terlambat ${lateMinutes} mnt` : '';
  return `Scan Presensi Masuk [${status.toUpperCase()}]${rfidTag}: ${nama} (${kelas})${lateStr} oleh ${officerName}`;
}

/**
 * Format string log aktivitas untuk presensi scan guru / GTK
 */
export function formatTeacherScanLogDetails(params: {
  nama: string;
  jabatan?: string;
  status: string;
  jenis: 'Masuk' | 'Pulang';
  isRfidScan?: boolean;
  lateMinutes?: number;
  officer?: string;
}): string {
  const { nama, jabatan, status, jenis, isRfidScan, lateMinutes, officer } = params;
  const officerName = officer || 'Petugas Piket';
  const rfidTag = isRfidScan ? ' [RFID]' : '';
  const roleLabel = jabatan || 'Guru / GTK';

  if (jenis === 'Pulang') {
    return `Scan Presensi Guru Pulang${rfidTag}: ${nama} (${roleLabel}) oleh ${officerName}`;
  }

  const isLate = status.toLowerCase() === 'terlambat' && (lateMinutes || 0) > 0;
  const lateStr = isLate ? ` Terlambat ${lateMinutes} mnt` : '';
  return `Scan Presensi Guru Masuk [${status.toUpperCase()}]${rfidTag}: ${nama} (${roleLabel})${lateStr} oleh ${officerName}`;
}
