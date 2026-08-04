import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Student, AttendanceRecord, ActivityLog } from '../types';

let cachedClient: SupabaseClient | null = null;
let cachedConfigKey = '';

export interface SupabaseConfig {
  url: string;
  key: string;
}

export function sanitizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  // Remove trailing slashes
  url = url.replace(/\/+$/, '');
  // Remove /rest/v1 suffix if present
  if (url.endsWith('/rest/v1')) {
    url = url.substring(0, url.length - '/rest/v1'.length);
  }
  return url.replace(/\/+$/, '');
}

const DEFAULT_SUPABASE_URL = 'https://tpxyvbfbahsjssqwubfl.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_oH-2538e28kbMbpk8ESZ7w_LpeIn1Jh';

export function getSupabaseCredentials(): SupabaseConfig {
  // Check localStorage settings first
  let url = '';
  let key = '';

  try {
    const saved = localStorage.getItem('school_settings_v2');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.supabaseUrl) url = sanitizeSupabaseUrl(parsed.supabaseUrl);
      if (parsed.supabaseKey) key = parsed.supabaseKey.trim();
    }
  } catch {
    // ignore
  }

  // Fallback to environment variables or hardcoded user credentials if not set in UI settings
  if (!url) {
    const envUrl = ((import.meta as any).env?.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
    url = sanitizeSupabaseUrl(envUrl) || DEFAULT_SUPABASE_URL;
  }
  if (!key) {
    key = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_KEY || '').trim() || DEFAULT_SUPABASE_KEY;
  }

  return { url: sanitizeSupabaseUrl(url), key };
}

export function isSupabaseConfigured(customConfig?: SupabaseConfig): boolean {
  const config = customConfig || getSupabaseCredentials();
  return Boolean(config.url && config.key && config.url.startsWith('https://'));
}

export function getSupabaseClient(customConfig?: SupabaseConfig): SupabaseClient | null {
  const rawConfig = customConfig || getSupabaseCredentials();
  const config = {
    url: sanitizeSupabaseUrl(rawConfig.url),
    key: rawConfig.key?.trim() || '',
  };
  if (!config.url || !config.key || !config.url.startsWith('https://')) {
    return null;
  }

  const currentKey = `${config.url}_${config.key}`;
  if (cachedClient && cachedConfigKey === currentKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.key, {
      auth: { persistSession: false },
    });
    cachedConfigKey = currentKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

export async function testSupabaseConnection(customConfig?: SupabaseConfig): Promise<{
  success: boolean;
  message: string;
  tablesFound?: string[];
  missingTables?: string[];
}> {
  const rawConfig = customConfig || getSupabaseCredentials();
  const config = {
    url: sanitizeSupabaseUrl(rawConfig.url),
    key: rawConfig.key?.trim() || '',
  };
  if (!config.url || !config.key) {
    return {
      success: false,
      message: 'URL Supabase dan Key belum dikonfigurasi. Masukkan URL dan Key terlebih dahulu.',
    };
  }

  if (!config.url.startsWith('https://')) {
    return {
      success: false,
      message: 'URL Supabase harus diawali dengan https:// (contoh: https://xyz.supabase.co)',
    };
  }

  const client = getSupabaseClient(config);
  if (!client) {
    return {
      success: false,
      message: 'Gagal membuat klien Supabase. Periksa format URL dan Key Anda.',
    };
  }

  try {
    const requiredTables = ['students', 'attendance', 'activity_logs'];
    const tablesFound: string[] = [];
    const missingTables: string[] = [];

    for (const tableName of requiredTables) {
      const { error } = await client.from(tableName).select('count', { count: 'exact', head: true });
      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          missingTables.push(tableName);
        } else {
          // Table exists or permission issue, but connection reached Supabase
          tablesFound.push(tableName);
        }
      } else {
        tablesFound.push(tableName);
      }
    }

    if (missingTables.length > 0) {
      return {
        success: true,
        message: `Terhubung ke Supabase! Beberapa tabel belum dibuat di Supabase: (${missingTables.join(', ')}). Gunakan tombol 'Tampilkan SQL Schema' untuk membuat tabel.`,
        tablesFound,
        missingTables,
      };
    }

    return {
      success: true,
      message: 'Koneksi ke Supabase Berhasil! Semua tabel (students, attendance, activity_logs) siap digunakan.',
      tablesFound,
      missingTables: [],
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal terhubung ke Supabase: ${err?.message || 'Koneksi gagal'}`,
    };
  }
}

export async function syncStudentsToSupabase(students: Student[], customConfig?: SupabaseConfig): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabaseClient(customConfig);
  if (!client || students.length === 0) return { success: false, count: 0, error: 'Klien tidak aktif atau data kosong' };

  try {
    const records = students.map((s) => ({
      id: s.id,
      id_qr: s.id_qr || '',
      nisn: s.nisn || '',
      nama: s.nama || '',
      kelas: s.kelas || '',
      no_hp_ortu: s.no_hp_ortu || '',
      foto: s.foto || '',
      status: s.status || 'aktif',
      created_at: s.createdAt || new Date().toISOString(),
    }));

    const { error } = await client.from('students').upsert(records, { onConflict: 'id' });
    if (error) {
      throw error;
    }
    return { success: true, count: records.length };
  } catch (err: any) {
    console.error('Error syncing students to Supabase:', err);
    return { success: false, count: 0, error: err.message || 'Gagal menyimpan ke Supabase' };
  }
}

export async function syncAttendanceToSupabase(attendance: AttendanceRecord[], customConfig?: SupabaseConfig): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabaseClient(customConfig);
  if (!client || attendance.length === 0) return { success: false, count: 0, error: 'Klien tidak aktif atau data kosong' };

  try {
    const records = attendance.map((a) => ({
      id: a.id,
      tanggal: a.tanggal || '',
      timestamp: a.timestamp || new Date().toISOString(),
      nisn: a.nisn || '',
      nama: a.nama || '',
      kelas: a.kelas || '',
      id_qr: a.id_qr || '',
      jenis: a.jenis || 'Masuk',
      status: a.status || 'Hadir',
      petugas: a.petugas || 'Sistem',
      catatan: a.catatan || '',
      terlambat_menit: a.terlambatMenit || 0,
    }));

    const { error } = await client.from('attendance').upsert(records, { onConflict: 'id' });
    if (error) {
      throw error;
    }
    return { success: true, count: records.length };
  } catch (err: any) {
    console.error('Error syncing attendance to Supabase:', err);
    return { success: false, count: 0, error: err.message || 'Gagal menyimpan ke Supabase' };
  }
}

export async function syncLogsToSupabase(logs: ActivityLog[], customConfig?: SupabaseConfig): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabaseClient(customConfig);
  if (!client || logs.length === 0) return { success: false, count: 0, error: 'Klien tidak aktif atau data kosong' };

  try {
    const records = logs.map((l) => ({
      id: l.id,
      timestamp: l.timestamp || new Date().toISOString(),
      user_name: l.user || '',
      role: l.role || 'Admin',
      action: l.action || '',
      details: l.details || '',
    }));

    const { error } = await client.from('activity_logs').upsert(records, { onConflict: 'id' });
    if (error) {
      throw error;
    }
    return { success: true, count: records.length };
  } catch (err: any) {
    console.error('Error syncing activity logs to Supabase:', err);
    return { success: false, count: 0, error: err.message || 'Gagal menyimpan ke Supabase' };
  }
}

export async function fetchStudentsFromSupabase(customConfig?: SupabaseConfig): Promise<Student[] | null> {
  const client = getSupabaseClient(customConfig);
  if (!client) return null;
  try {
    const { data, error } = await client.from('students').select('*').order('nama', { ascending: true });
    if (error) {
      console.error('Failed to fetch students from Supabase:', error);
      return null;
    }
    if (!data) return [];
    return data.map((row) => ({
      id: row.id,
      id_qr: row.id_qr || '',
      nisn: row.nisn || '',
      nama: row.nama || '',
      kelas: row.kelas || '',
      no_hp_ortu: row.no_hp_ortu || '',
      foto: row.foto || '',
      status: (row.status as any) || 'aktif',
      createdAt: row.created_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.error('Error fetching students from Supabase:', err);
    return null;
  }
}

export async function fetchAttendanceFromSupabase(customConfig?: SupabaseConfig): Promise<AttendanceRecord[] | null> {
  const client = getSupabaseClient(customConfig);
  if (!client) return null;
  try {
    const { data, error } = await client.from('attendance').select('*').order('timestamp', { ascending: false });
    if (error) {
      console.error('Failed to fetch attendance from Supabase:', error);
      return null;
    }
    if (!data) return [];
    return data.map((row) => ({
      id: row.id,
      tanggal: row.tanggal || '',
      timestamp: row.timestamp || new Date().toISOString(),
      nisn: row.nisn || '',
      nama: row.nama || '',
      kelas: row.kelas || '',
      id_qr: row.id_qr || '',
      jenis: (row.jenis as any) || 'Masuk',
      status: (row.status as any) || 'Hadir',
      petugas: row.petugas || 'Sistem',
      catatan: row.catatan || '',
      terlambatMenit: row.terlambat_menit || 0,
    }));
  } catch (err) {
    console.error('Error fetching attendance from Supabase:', err);
    return null;
  }
}

export async function fetchLogsFromSupabase(customConfig?: SupabaseConfig): Promise<ActivityLog[] | null> {
  const client = getSupabaseClient(customConfig);
  if (!client) return null;
  try {
    const { data, error } = await client.from('activity_logs').select('*').order('timestamp', { ascending: false });
    if (error) {
      console.error('Failed to fetch activity logs from Supabase:', error);
      return null;
    }
    if (!data) return [];
    return data.map((row) => ({
      id: row.id,
      timestamp: row.timestamp || new Date().toISOString(),
      user: row.user_name || '',
      role: (row.role as any) || 'Admin',
      action: row.action || '',
      details: row.details || '',
    }));
  } catch (err) {
    console.error('Error fetching activity logs from Supabase:', err);
    return null;
  }
}

export async function deleteStudentFromSupabase(id: string, customConfig?: SupabaseConfig): Promise<boolean> {
  const client = getSupabaseClient(customConfig);
  if (!client) return false;
  try {
    const { error } = await client.from('students').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteAttendanceFromSupabase(id: string, customConfig?: SupabaseConfig): Promise<boolean> {
  const client = getSupabaseClient(customConfig);
  if (!client) return false;
  try {
    const { error } = await client.from('attendance').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteLogFromSupabase(id: string, customConfig?: SupabaseConfig): Promise<boolean> {
  const client = getSupabaseClient(customConfig);
  if (!client) return false;
  try {
    const { error } = await client.from('activity_logs').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export function getSupabaseSchemaSQL(): string {
  return `-- SQL Schema untuk aplikasi Presensi Siswa di Supabase
-- Jalankan perintah SQL ini di menu SQL Editor pada Dashboard Supabase Anda

-- 1. Tabel Siswa (students)
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY,
    id_qr TEXT,
    nisn TEXT,
    nama TEXT NOT NULL,
    kelas TEXT NOT NULL,
    no_hp_ortu TEXT,
    foto TEXT,
    status TEXT DEFAULT 'aktif',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk mempercepat pencarian siswa berdasarkan QR code dan NISN
CREATE INDEX IF NOT EXISTS idx_students_id_qr ON public.students(id_qr);
CREATE INDEX IF NOT EXISTS idx_students_nisn ON public.students(nisn);

-- 2. Tabel Presensi / Absensi (attendance)
CREATE TABLE IF NOT EXISTS public.attendance (
    id TEXT PRIMARY KEY,
    tanggal TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    nisn TEXT,
    nama TEXT NOT NULL,
    kelas TEXT NOT NULL,
    id_qr TEXT,
    jenis TEXT NOT NULL,
    status TEXT NOT NULL,
    petugas TEXT,
    catatan TEXT,
    terlambat_menit INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk mempercepat query laporan dan pencarian tanggal
CREATE INDEX IF NOT EXISTS idx_attendance_tanggal ON public.attendance(tanggal);
CREATE INDEX IF NOT EXISTS idx_attendance_nisn ON public.attendance(nisn);
CREATE INDEX IF NOT EXISTS idx_attendance_id_qr ON public.attendance(id_qr);

-- 3. Tabel Log Aktivitas (activity_logs)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    user_name TEXT,
    role TEXT,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Nonaktifkan RLS (Row Level Security) atau izinkan akses anonim untuk tabel presensi
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy untuk izinkan akses read & write bagi pengguna anonim dengan Key
CREATE POLICY "Allow public read students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update students" ON public.students FOR ALL USING (true);

CREATE POLICY "Allow public read attendance" ON public.attendance FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update attendance" ON public.attendance FOR ALL USING (true);

CREATE POLICY "Allow public read logs" ON public.activity_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update logs" ON public.activity_logs FOR ALL USING (true);
`;
}
