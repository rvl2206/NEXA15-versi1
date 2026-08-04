export type UserRole = 'Admin' | 'Guru' | 'Kepala Sekolah';

export interface User {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export interface Student {
  id: string; // Document ID
  id_qr: string; // e.g. "69933068"
  nisn: string; // e.g. "3080370790"
  nama: string; // e.g. "DADANG BUAMONA"
  kelas: string; // e.g. "XI IPA 1"
  no_hp_ortu?: string; // No. WA / HP Orang Tua (e.g. 08123456789)
  foto: string;
  status: 'aktif' | 'nonaktif';
  createdAt?: string;
}

export type AttendanceType = 'Masuk' | 'Pulang';
export type AttendanceStatus = 'Hadir' | 'Terlambat' | 'Izin' | 'Sakit' | 'Alpa';

export interface AttendanceRecord {
  id: string;
  tanggal: string; // format "DD-MM-YYYY" or "YYYY-MM-DD"
  timestamp: string; // ISO String
  nisn: string;
  nama: string;
  kelas: string;
  id_qr: string;
  jenis: AttendanceType;
  status: AttendanceStatus;
  petugas: string; // Email/Name of officer scanning or logged in user
  catatan?: string;
  terlambatMenit?: number; // Late duration in minutes
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  role: UserRole;
  action: string;
  details: string;
}

export interface Holiday {
  id: string;
  tanggal: string; // format YYYY-MM-DD
  keterangan: string;
}

export interface SchoolSettings {
  schoolName: string;
  schoolNPSN: string;
  cutoffTime: string; // e.g. "07:15"
  autoAlpaCutoffTime?: string; // e.g. "14:30"
  enableAutoAlpa?: boolean; // default true
  academicYear: string;
  enableWaNotif?: boolean;
  waTemplateHadir?: string;
  waTemplateTerlambat?: string;
  waTemplateIzinSakit?: string;
  waTemplateAlpa?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  enableSupabaseAutoSync?: boolean;
  lastSupabaseSync?: string;
  holidays?: Holiday[];
}

export interface FilterOptions {
  tanggal: string;
  bulan: string; // YYYY-MM
  kelas: string;
  nama: string;
  status: string;
}

export interface AIAnalysisRequest {
  type: 'attendance_summary' | 'risk_detection' | 'monthly_report';
  month?: string;
  kelas?: string;
}

export interface OfflineQueueItem {
  id: string;
  type: 'attendance' | 'attendance_sync' | 'attendance_clear' | 'student' | 'log';
  data: any;
  timestamp: string;
  retryCount: number;
}

export interface MissingAttendanceLogItem {
  logId: string;
  timestamp: string;
  dateFormatted: string;
  nama: string;
  nisn: string;
  kelas: string;
  jenis: AttendanceType;
  status: AttendanceStatus;
  petugas: string;
  action: string;
  details: string;
}


