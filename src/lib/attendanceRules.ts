/**
 * ATTENDANCE RULES PRIMITIVES (NEXA15)
 * 
 * Modul ini berisi pure functions untuk aturan domain presensi (kalkulasi dan primitive helpers)
 * yang sepenuhnya stateless dan bebas dari efek samping (I/O, database, storage, UI).
 * 
 * Aturan-aturan ini diekstrak dari implementasi kanonikal NEXA15 untuk memastikan
 * determinisme dan konsistensi perhitungan di seluruh sistem.
 */

import { isRecordOnSaturday } from './dateUtils';
import type { AttendanceType } from '../types';

export interface LateCalculationResult {
  isLate: boolean;
  lateMinutes: number;
}

/**
 * Menghitung status keterlambatan dan jumlah menit terlambat berdasarkan waktu WIT dan batas cutoff.
 * Mengikuti implementasi kanonikal NEXA15:
 * - Menggunakan perbandingan menit: (currentHour * 60 + currentMinute) vs (cutoffHour * 60 + cutoffMin)
 * - Default cutoffTime jika tidak disediakan: '07:15'
 * - Jika nowMinutes > cutoffMinutes: isLate = true, lateMinutes = nowMinutes - cutoffMinutes
 * - Jika nowMinutes <= cutoffMinutes: isLate = false, lateMinutes = 0
 * 
 * @param currentHourWIT Jam saat ini dalam zona waktu WIT (0-23)
 * @param currentMinuteWIT Menit saat ini dalam zona waktu WIT (0-59)
 * @param cutoffTimeStr String waktu cutoff dalam format "HH:mm" (contoh: "07:15")
 */
export function calculateLateMinutes(
  currentHourWIT: number,
  currentMinuteWIT: number,
  cutoffTimeStr = '07:15'
): LateCalculationResult {
  const [cutoffHour, cutoffMin] = (cutoffTimeStr || '07:15').split(':').map(Number);
  const nowMinutes = currentHourWIT * 60 + currentMinuteWIT;
  const cutoffMinutes = (cutoffHour || 7) * 60 + (cutoffMin || 15);

  if (nowMinutes > cutoffMinutes) {
    return {
      isLate: true,
      lateMinutes: nowMinutes - cutoffMinutes,
    };
  }

  return {
    isLate: false,
    lateMinutes: 0,
  };
}

/**
 * Membangun composite key untuk deduplikasi rekaman presensi per entitas, tanggal, dan jenis.
 * Mengikuti implementasi kanonikal NEXA15:
 * - Siswa: `${nisn}_${tanggal}_${jenis}`
 * - Guru: `${nip}_${tanggal}_${jenis}`
 * 
 * @param identifier NISN siswa atau NIP guru
 * @param tanggal Tanggal presensi dalam format YYYY-MM-DD
 * @param jenis Jenis presensi ('Masuk' | 'Pulang')
 */
export function buildAttendanceCompositeKey(
  identifier: string,
  tanggal: string,
  jenis: string
): string {
  return `${identifier}_${tanggal}_${jenis}`;
}

/**
 * Menghasilkan ID deterministik untuk presensi Alpa otomatis siswa.
 * Format kanonikal: `att-autoalpa-${nisn}-${checkDate}`
 * Format ini mempertahankan idempotensi jika proses auto-alpa dijalankan ulang.
 * 
 * @param nisn Nomor Induk Siswa Nasional
 * @param checkDate Tanggal target dalam format YYYY-MM-DD
 */
export function generateDeterministicAutoAlpaId(
  nisn: string,
  checkDate: string
): string {
  return `att-autoalpa-${nisn}-${checkDate}`;
}

/**
 * Memeriksa apakah suatu record presensi (siswa atau guru) berstatus ALPA dan terjadi pada hari Sabtu.
 * Mengikuti implementasi kanonikal NEXA15:
 * - Memeriksa apakah status record adalah 'Alpa' (case-insensitive & trimmed)
 * - Memeriksa apakah tanggal/timestamp record jatuh pada hari Sabtu (menggunakan isRecordOnSaturday)
 * 
 * @param record Objek rekaman presensi dengan field tanggal/timestamp dan status
 */
export function isSaturdayAlpaRecord(
  record?: { tanggal?: string; timestamp?: string; status?: string } | null
): boolean {
  if (!record || !record.status) return false;
  const isAlpa = String(record.status).trim().toLowerCase() === 'alpa';
  if (!isAlpa) return false;
  return isRecordOnSaturday(record);
}

export type ScanDuplicateReason = 'ALREADY_MASUK' | 'ALREADY_PULANG' | 'BOTH_COMPLETED';

export interface ScanEligibilityResult<T> {
  allowed: boolean;
  isDuplicate: boolean;
  targetJenis: AttendanceType;
  reason?: ScanDuplicateReason;
  conflictingRecord?: T;
  masukRecord?: T;
  pulangRecord?: T;
}

export interface DayScheduleStatus {
  dayOfWeek: number; // 0 = Minggu, 1 = Senin, ..., 5 = Jumat, 6 = Sabtu
  dayName: string;
  isFriday: boolean;
  isWeekend: boolean;
  isSchoolDay: boolean;
  pulangStartTime: string;
  pulangHour: number;
  pulangMinute: number;
  currentSession: 'Masuk' | 'Pulang' | 'Libur';
  statusBadge: string;
  statusTitle: string;
  statusDescription: string;
}

/**
 * Menentukan status hari, shift, dan jadwal jam pulang presensi (Jumat vs Senin-Kamis)
 */
export function getDayScheduleStatus(
  dayOfWeek: number,
  currentHourWIT: number,
  currentMinuteWIT: number,
  schoolDays = 5,
  pulangStartTimeNormal = '13:30',
  pulangStartTimeFriday = '10:00'
): DayScheduleStatus {
  const isFriday = dayOfWeek === 5;
  const isWeekend = dayOfWeek === 0 || (schoolDays === 5 && dayOfWeek === 6);
  const isSchoolDay = !isWeekend;

  const [normalH, normalM] = (pulangStartTimeNormal || '13:30').split(':').map(Number);
  const [fridayH, fridayM] = (pulangStartTimeFriday || '10:00').split(':').map(Number);

  const pulangH = isFriday ? (isNaN(fridayH) ? 10 : fridayH) : (isNaN(normalH) ? 13 : normalH);
  const pulangM = isFriday ? (isNaN(fridayM) ? 0 : fridayM) : (isNaN(normalM) ? 30 : normalM);
  const pulangTimeStr = `${String(pulangH).padStart(2, '0')}:${String(pulangM).padStart(2, '0')}`;

  const nowMinutes = currentHourWIT * 60 + currentMinuteWIT;
  const pulangMinutes = pulangH * 60 + pulangM;
  const isPulangTime = nowMinutes >= pulangMinutes;

  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const dayName = dayNames[dayOfWeek] || 'Hari Ini';

  if (isWeekend) {
    return {
      dayOfWeek,
      dayName,
      isFriday: false,
      isWeekend: true,
      isSchoolDay: false,
      pulangStartTime: pulangTimeStr,
      pulangHour: pulangH,
      pulangMinute: pulangM,
      currentSession: 'Libur',
      statusBadge: schoolDays === 5 && dayOfWeek === 6 ? 'Sabtu Libur (5 Hari Sekolah)' : 'Hari Libur Akhir Pekan',
      statusTitle: `${dayName} — Libur Akhir Pekan`,
      statusDescription: 'Tidak ada jadwal KBM dan presensi wajib hari ini.',
    };
  }

  if (isFriday) {
    return {
      dayOfWeek,
      dayName,
      isFriday: true,
      isWeekend: false,
      isSchoolDay: true,
      pulangStartTime: pulangTimeStr,
      pulangHour: pulangH,
      pulangMinute: pulangM,
      currentSession: isPulangTime ? 'Pulang' : 'Masuk',
      statusBadge: 'Hari Jumat (1 Shift Pendek)',
      statusTitle: 'Jumat — 1 Shift Pendek',
      statusDescription: `Hari Jumat berdurasi pendek. Sesi absen pulang dibuka mulai pukul ${pulangTimeStr} WIT ke atas.`,
    };
  }

  return {
    dayOfWeek,
    dayName,
    isFriday: false,
    isWeekend: false,
    isSchoolDay: true,
    pulangStartTime: pulangTimeStr,
    pulangHour: pulangH,
    pulangMinute: pulangM,
    currentSession: isPulangTime ? 'Pulang' : 'Masuk',
    statusBadge: 'Senin - Kamis (Jadwal Reguler Normal)',
    statusTitle: `${dayName} — Jadwal Reguler Normal`,
    statusDescription: `KBM berlangsung penuh. Sesi absen pulang dibuka mulai pukul ${pulangTimeStr} WIT ke atas.`,
  };
}

/**
 * Evaluator kelayakan scan presensi kanonikal (Siswa dan Guru).
 * 
 * Mengevaluasi rekaman presensi pada hari ini untuk menentukan:
 * 1. Target scan type (jenis presensi yang akan dicatat: 'Masuk' atau 'Pulang')
 * 2. Apakah scan diizinkan atau ditolak karena duplikasi
 * 3. Alasan penolakan jika duplikasi ('BOTH_COMPLETED', 'ALREADY_MASUK', 'ALREADY_PULANG')
 * 
 * Aturan Kanonikal NEXA15:
 * - Mengabaikan record placeholder auto-alpa saat mencari record Masuk riil.
 * - Penentuan Target Scan Type:
 *   a. forcedType === 'Masuk' -> 'Masuk'
 *   b. forcedType === 'Pulang' -> 'Pulang'
 *   c. forcedType === 'Auto' (atau undefined):
 *      - Hari Jumat (dayOfWeek === 5): Siswa mulai absen pulang di atas jam 10:00 WIT (1 shift pendek).
 *      - Hari Senin - Kamis: Sesi pulang aktif sesuai waktu normal (pukul 13:30 WIT ke atas).
 *      - Jika waktu jam tidak disediakan: fallback jika ada masukRecord dan belum pulang -> 'Pulang', selain itu 'Masuk'.
 */
export function evaluateScanEligibility<
  T extends {
    jenis: AttendanceType;
    status?: string;
    timestamp?: string;
    id?: string;
    catatan?: string;
  }
>(
  recordsToday: readonly T[],
  forcedType?: AttendanceType | 'Auto',
  currentHourWIT?: number,
  currentMinuteWIT?: number,
  dayOfWeek?: number,
  pulangConfig?: { normalTime?: string; fridayTime?: string }
): ScanEligibilityResult<T> {
  const isAutoAlpa = (r: T) =>
    r.status === 'Alpa' ||
    Boolean(r.id?.startsWith('att-autoalpa-')) ||
    Boolean(r.catatan?.includes('Alpa Otomatis'));

  const masukRecord = recordsToday.find((r) => r.jenis === 'Masuk' && !isAutoAlpa(r));
  const pulangRecord = recordsToday.find((r) => r.jenis === 'Pulang');

  let targetJenis: AttendanceType = 'Masuk';

  if (forcedType === 'Masuk') {
    targetJenis = 'Masuk';
  } else if (forcedType === 'Pulang') {
    targetJenis = 'Pulang';
  } else {
    // Mode Auto
    if (typeof currentHourWIT === 'number') {
      const curMinute = typeof currentMinuteWIT === 'number' ? currentMinuteWIT : 0;
      const nowMinutes = currentHourWIT * 60 + curMinute;

      // Evaluasi apakah hari Jumat (dayOfWeek === 5) vs Senin-Kamis
      const isFriday = dayOfWeek === 5;
      
      const [fridayH, fridayM] = (pulangConfig?.fridayTime || '10:00').split(':').map(Number);
      const fridayTargetMinutes = (isNaN(fridayH) ? 10 : fridayH) * 60 + (isNaN(fridayM) ? 0 : fridayM);

      const [normalH, normalM] = (pulangConfig?.normalTime || '13:30').split(':').map(Number);
      const normalTargetMinutes = (isNaN(normalH) ? 13 : normalH) * 60 + (isNaN(normalM) ? 30 : normalM);

      // Hari Jumat: mulai bisa absen pulang di atas jam 10:00 WIT
      // Hari Senin - Kamis: waktu pulang normal (13:30 WIT)
      const targetThresholdMinutes = isFriday ? fridayTargetMinutes : normalTargetMinutes;
      const isAfternoonSession = nowMinutes >= targetThresholdMinutes;

      targetJenis = isAfternoonSession ? 'Pulang' : 'Masuk';
    } else {
      targetJenis = masukRecord && !pulangRecord ? 'Pulang' : 'Masuk';
    }
  }

  // 1. Sudah lengkap Masuk dan Pulang hari ini
  if (masukRecord && pulangRecord) {
    return {
      allowed: false,
      isDuplicate: true,
      reason: 'BOTH_COMPLETED',
      targetJenis: 'Pulang',
      conflictingRecord: pulangRecord,
      masukRecord,
      pulangRecord,
    };
  }

  // 2. Scan Masuk kedua kali
  if (targetJenis === 'Masuk' && masukRecord) {
    return {
      allowed: false,
      isDuplicate: true,
      reason: 'ALREADY_MASUK',
      targetJenis: 'Masuk',
      conflictingRecord: masukRecord,
      masukRecord,
      pulangRecord,
    };
  }

  // 3. Scan Pulang kedua kali
  if (targetJenis === 'Pulang' && pulangRecord) {
    return {
      allowed: false,
      isDuplicate: true,
      reason: 'ALREADY_PULANG',
      targetJenis: 'Pulang',
      conflictingRecord: pulangRecord,
      masukRecord,
      pulangRecord,
    };
  }

  // 4. Diizinkan
  return {
    allowed: true,
    isDuplicate: false,
    targetJenis,
    masukRecord,
    pulangRecord,
  };
}


