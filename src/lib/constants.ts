/**
 * NEXA15 Static Constants and Small Pure Matching Helpers
 * Contains storage keys, default immutable configurations, and identifier matchers.
 */

import { User, SchoolSettings } from '../types';
import { hashPasswordSync } from './bcrypt';

export const STORAGE_KEYS = {
  SETTINGS: 'nexa15_settings_v3',
  PASSWORDS: 'nexa15_passwords_v3',
  CURRENT_USER: 'nexa15_user_v3',
  USERS: 'nexa15_users_v3',
  STUDENTS: 'nexa15_students_v3',
  ATTENDANCE: 'nexa15_attendance_v3',
  TEACHERS: 'nexa15_teachers_v3',
  TEACHER_ATTENDANCE: 'nexa15_teacher_attendance_v3',
  LOGS: 'nexa15_logs_v3',
  SYNC_QUEUE: 'nexa15_sync_queue_v3',
  DISPATCHES: 'nexa15_dispatches_v3',
} as const;

export const INITIAL_USERS: User[] = [
  {
    uid: 'usr-admin',
    username: 'admin',
    email: 'admin@sman15.sch.id',
    name: 'Super Administrator (NEXA15)',
    role: 'Admin',
    subRole: 'Super Admin',
    assignedClass: '',
    password: hashPasswordSync('admin'),
    status: 'aktif',
    createdAt: new Date().toISOString(),
    notes: 'Akun Utama Administrator Sistem',
  },
  {
    uid: 'usr-piket',
    username: 'guru_piket',
    email: 'piket@sman15.sch.id',
    name: 'Petugas Guru Piket',
    role: 'Guru',
    subRole: 'Guru Piket',
    assignedClass: '',
    password: hashPasswordSync('piket'),
    status: 'aktif',
    createdAt: new Date().toISOString(),
    notes: 'Petugas Piket Presensi Harian',
  },
  {
    uid: 'usr-kepsek',
    username: 'kepsek',
    email: 'kepsek@sman15.sch.id',
    name: 'Drs. H. Rustam Rumra, M.Pd',
    role: 'Kepala Sekolah',
    subRole: 'Kepala Sekolah',
    assignedClass: '',
    password: hashPasswordSync('kepsek'),
    status: 'aktif',
    createdAt: new Date().toISOString(),
    notes: 'Kepala SMA Negeri 15 Ambon',
  },
  {
    uid: 'usr-wali-x1',
    username: 'wali_x1',
    email: 'wali.x1@sman15.sch.id',
    name: 'Dra. Siti Aminah, M.Pd',
    role: 'Guru',
    subRole: 'Wali Kelas',
    assignedClass: 'X-1',
    password: hashPasswordSync('wali'),
    status: 'aktif',
    createdAt: new Date().toISOString(),
    notes: 'Wali Kelas X-1',
  },
];

export const DEFAULT_SETTINGS: SchoolSettings = {
  schoolName: 'SMA NEGERI 15 AMBON',
  schoolNPSN: '69933068',
  schoolLogo: '', // No hardcoded logo by default - allows upload/import in settings
  cutoffTime: '07:15',
  autoAlpaCutoffTime: '14:30',
  enableAutoAlpa: true,
  schoolDays: 6, // 6 = 6 Hari Sekolah (Senin - Sabtu), 5 = 5 Hari Sekolah (Senin - Jumat)
  academicYear: '2026/2027',
  enableWaNotif: true,
  waTemplateHadir: 'Yth. Orang Tua / Wali murid dari *{nama}* (Kelas {kelas}),\n\nMemberitahukan data presensi sekolah di *{sekolah}*:\n📅 Tanggal: {tanggal}\n⏰ Waktu Scan: {waktu}\n📌 Status Presensi: ✅ *HADIR (Tepat Waktu)*\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_Pesan otomatis dari Sistem Presensi Digital {sekolah}_',
  waTemplateTerlambat: 'Yth. Orang Tua / Wali murid dari *{nama}* (Kelas {kelas}),\n\nMemberitahukan data presensi sekolah di *{sekolah}*:\n📅 Tanggal: {tanggal}\n⏰ Waktu Scan: {waktu}\n📌 Status Presensi: ⏰ *TERLAMBAT* ({terlambat})\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_Pesan otomatis dari Sistem Presensi Digital {sekolah}_',
  waTemplateIzinSakit: 'Yth. Orang Tua / Wali murid dari *{nama}* (Kelas {kelas}),\n\nMemberitahukan data presensi sekolah di *{sekolah}*:\n📅 Tanggal: {tanggal}\n📌 Status Presensi: 📄 *{status}*\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_Pesan otomatis dari Sistem Presensi Digital {sekolah}_',
  waTemplateAlpa: 'Yth. Orang Tua / Wali murid dari *{nama}* (Kelas {kelas}),\n\nMemberitahukan data presensi sekolah di *{sekolah}*:\n📅 Tanggal: {tanggal}\n📌 Status Presensi: ❌ *ALPA (Tanpa Keterangan)*\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_Pesan otomatis dari Sistem Presensi Digital {sekolah}_',
  waTemplateWaliKelas: 'Yth. Bapak/Ibu Wali Kelas *{kelas}* (*{wali_kelas}*),\n\nBerikut kami teruskan *Laporan Disposisi Siswa Butuh Perhatian Khusus / Bermasalah* dari Tim Kedisiplinan & Presensi Digital *{sekolah}*:\n\n👤 *Nama Siswa:* {nama}\n🔢 *NISN:* {nisn}\n🏫 *Kelas:* {kelas}\n📱 *No. HP/WA Ortu:* {no_hp_ortu}\n\n📊 *Catatan Kehadiran & Rekam Kedisiplinan:*\n• 📈 Persentase Kehadiran: *{persentase_kehadiran}*\n• ❌ Jumlah Alpa (Tanpa Keterangan): *{alpa} hari*\n• ⏰ Jumlah Keterlambatan: *{terlambat} kali*\n• 🩺 Jumlah Sakit/Izin: *{sakit_izin} hari*\n\n🚨 *Indikasi Masalah:*\n{alasan_masalah}\n\n💡 *Rekomendasi Tindak Lanjut Wali Kelas & BK:*\n{rekomendasi}\n\n📝 *Catatan Tambahan Petugas:*\n{catatan_petugas}\n\nMohon Bapak/Ibu Wali Kelas dapat segera menindaklanjuti dengan pembinaan internal, koordinasi Guru BK, serta pemanggilan Orang Tua / Wali murid ke sekolah jika diperlukan.\n\nTerima kasih atas dedikasi dan kerja sama Bapak/Ibu.\n_Tim Presensi & Kesiswaan {sekolah}_\n📅 {tanggal}',
  problemThresholdAlpa: 2,
  problemThresholdTerlambat: 3,
  problemThresholdMinRate: 75,
  homeroomAssignments: {},
  supabaseUrl: 'https://tpxyvbfbahsjssqwubfl.supabase.co',
  supabaseKey: 'sb_publishable_oH-2538e28kbMbpk8ESZ7w_LpeIn1Jh',
  enableSupabaseAutoSync: true,
  holidays: [],
  // RFID & Contactless Card Support
  enableRfidReader: true,
  rfidReaderMode: 'auto',
  rfidBeepSound: true,
  rfidFastTapDelay: 1500,
  rfidPrefix: '',
  rfidSuffix: '',
};

/**
 * Helper to check if a QR identifier is a generic template/NPSN placeholder rather than a unique student/teacher QR
 */
export function isGenericQrCode(qr?: string): boolean {
  if (!qr) return true;
  const v = qr.trim().toLowerCase();
  return (
    v === '' ||
    v === '69933068' ||
    v === 'smanegeri15ambon_template' ||
    v === 'templatesma15ambon' ||
    v === '69933068..' ||
    v === '69933068.'
  );
}

/**
 * Strict and resilient NISN matcher that compares exact and digit-normalized strings (ignoring leading zeros)
 */
export function isMatchingNisn(nisnA?: string, nisnB?: string): boolean {
  if (!nisnA || !nisnB) return false;
  const cleanA = String(nisnA).trim();
  const cleanB = String(nisnB).trim();
  if (!cleanA || !cleanB) return false;
  if (cleanA === cleanB) return true;

  // Compare digit sequences without leading zeros
  const normA = cleanA.replace(/\D/g, '').replace(/^0+/, '');
  const normB = cleanB.replace(/\D/g, '').replace(/^0+/, '');
  if (normA && normB && normA === normB && normA.length >= 3) {
    return true;
  }
  return false;
}

/**
 * Strict NIP matcher for teachers
 */
export function isMatchingNip(nipA?: string, nipB?: string): boolean {
  if (!nipA || !nipB) return false;
  const cleanA = String(nipA).trim();
  const cleanB = String(nipB).trim();
  if (!cleanA || !cleanB) return false;
  if (cleanA === cleanB) return true;

  const normA = cleanA.replace(/\D/g, '').replace(/^0+/, '');
  const normB = cleanB.replace(/\D/g, '').replace(/^0+/, '');
  if (normA && normB && normA === normB && normA.length >= 3) {
    return true;
  }
  return false;
}

/**
 * Strict and resilient RFID / NFC UID matcher (supports Hex, Decimal, colons/spaces stripped)
 */
export function isMatchingRfidUid(uidA?: string, uidB?: string): boolean {
  if (!uidA || !uidB) return false;
  const cleanA = String(uidA).replace(/[\s:-]+/g, '').trim().toUpperCase();
  const cleanB = String(uidB).replace(/[\s:-]+/g, '').trim().toUpperCase();
  if (!cleanA || !cleanB) return false;
  if (cleanA === cleanB) return true;

  // Check if one is 10-digit decimal representation of 8-character hex UID (standard Wiegand-26 / Wiegand-34 / HID conversion)
  if (/^\d{8,12}$/.test(cleanA) && /^[0-9A-F]{6,16}$/i.test(cleanB)) {
    try {
      const decB = parseInt(cleanB, 16);
      if (!isNaN(decB) && (String(decB) === cleanA || String(decB).padStart(10, '0') === cleanA)) return true;
    } catch {}
  }
  if (/^\d{8,12}$/.test(cleanB) && /^[0-9A-F]{6,16}$/i.test(cleanA)) {
    try {
      const decA = parseInt(cleanA, 16);
      if (!isNaN(decA) && (String(decA) === cleanB || String(decA).padStart(10, '0') === cleanB)) return true;
    } catch {}
  }
  return false;
}
