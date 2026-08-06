import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Student, AttendanceRecord, ActivityLog, Teacher, TeacherAttendanceRecord } from '../types';

let cachedClient: SupabaseClient | null = null;
let cachedConfigKey = '';

export interface SupabaseConfig {
  url: string;
  key: string;
}

export function sanitizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  url = url.replace(/\/+$/, '');
  if (url.endsWith('/rest/v1')) {
    url = url.substring(0, url.length - '/rest/v1'.length);
  }
  return url.replace(/\/+$/, '');
}

const DEFAULT_SUPABASE_URL = 'https://tpxyvbfbahsjssqwubfl.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_oH-2538e28kbMbpk8ESZ7w_LpeIn1Jh';

export function getSupabaseCredentials(): SupabaseConfig {
  let url = '';
  let key = '';

  try {
    const savedV3 = localStorage.getItem('nexa15_settings_v3');
    if (savedV3) {
      const parsed = JSON.parse(savedV3);
      if (parsed.supabaseUrl) url = sanitizeSupabaseUrl(parsed.supabaseUrl);
      if (parsed.supabaseKey) key = parsed.supabaseKey.trim();
    }
    if (!url || !key) {
      const savedV2 = localStorage.getItem('school_settings_v2');
      if (savedV2) {
        const parsed = JSON.parse(savedV2);
        if (!url && parsed.supabaseUrl) url = sanitizeSupabaseUrl(parsed.supabaseUrl);
        if (!key && parsed.supabaseKey) key = parsed.supabaseKey.trim();
      }
    }
  } catch {
    // ignore
  }

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
    console.warn('Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Utility helper to ensure a valid ISO 8601 string for TIMESTAMPTZ columns in PostgreSQL
 */
function toValidIsoTimestamp(rawTimestamp?: string, fallbackDate?: string): string {
  if (rawTimestamp) {
    const d = new Date(rawTimestamp);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  }
  if (fallbackDate) {
    const clean = fallbackDate.trim();
    if (clean.includes('-')) {
      const parts = clean.split('-');
      if (parts[0].length === 4) {
        const d = new Date(`${clean}T07:00:00.000Z`);
        if (!isNaN(d.getTime())) return d.toISOString();
      } else if (parts[2]?.length === 4) {
        const d = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T07:00:00.000Z`);
        if (!isNaN(d.getTime())) return d.toISOString();
      }
    }
  }
  return new Date().toISOString();
}

/**
 * Utility helper to chunk array for reliable batch upserts
 */
function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
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
    const requiredTables = ['students', 'attendance', 'activity_logs', 'teachers', 'teacher_attendance'];
    const tablesFound: string[] = [];
    const missingTables: string[] = [];

    for (const tableName of requiredTables) {
      try {
        const { error } = await client.from(tableName).select('count', { count: 'exact', head: true });
        if (error) {
          if (error.code === '42P01' || error.message?.toLowerCase().includes('does not exist')) {
            missingTables.push(tableName);
          } else {
            tablesFound.push(tableName);
          }
        } else {
          tablesFound.push(tableName);
        }
      } catch {
        missingTables.push(tableName);
      }
    }

    if (missingTables.length > 0) {
      return {
        success: true,
        message: `Terhubung ke Supabase! Beberapa tabel belum dibuat: (${missingTables.join(', ')}). Gunakan tombol 'Tampilkan SQL Schema' untuk membuat tabel yang belum ada.`,
        tablesFound,
        missingTables,
      };
    }

    return {
      success: true,
      message: 'Koneksi ke Supabase Berhasil! Semua tabel database siap digunakan.',
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

// ==========================================
// STUDENTS SYNC & FETCH
// ==========================================

export async function syncStudentsToSupabase(
  students: Student[],
  customConfig?: SupabaseConfig
): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabaseClient(customConfig);
  if (!client) return { success: false, count: 0, error: 'Klien Supabase tidak aktif' };
  if (students.length === 0) return { success: true, count: 0 };

  try {
    const records = students
      .map((s) => ({
        id: s.id || `std-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        id_qr: s.id_qr || '',
        nisn: s.nisn ? s.nisn.trim() : '',
        nama: s.nama ? s.nama.trim() : 'Siswa',
        kelas: s.kelas ? s.kelas.trim() : '-',
        no_hp_ortu: s.no_hp_ortu || '',
        foto: s.foto || '',
        status: s.status || 'aktif',
        created_at: toValidIsoTimestamp(s.createdAt),
      }))
      .filter((r) => r.nisn && r.nisn.length > 0);

    const chunks = chunkArray(records, 50);
    for (const chunk of chunks) {
      const { error } = await client.from('students').upsert(chunk, { onConflict: 'nisn' });
      if (error) throw error;
    }

    return { success: true, count: records.length };
  } catch (err: any) {
    console.warn('Supabase student sync notice:', err?.message || err);
    return {
      success: false,
      count: 0,
      error: err?.message || 'Gagal menyimpan tabel students ke Supabase',
    };
  }
}

export async function fetchStudentsFromSupabase(customConfig?: SupabaseConfig): Promise<Student[] | null> {
  const client = getSupabaseClient(customConfig);
  if (!client) return null;
  try {
    const { data, error } = await client.from('students').select('*').order('nama', { ascending: true });
    if (error) {
      console.warn('Supabase student fetch notice:', error.message);
      return null;
    }
    if (!data) return [];
    return data.map((row) => ({
      id: row.id || `std-${row.nisn}`,
      id_qr: row.id_qr || '',
      nisn: row.nisn || '',
      nama: row.nama || '',
      kelas: row.kelas || '',
      no_hp_ortu: row.no_hp_ortu || '',
      foto: row.foto || '',
      status: (row.status as any) || 'aktif',
      createdAt: row.created_at || new Date().toISOString(),
    }));
  } catch (err: any) {
    console.warn('Supabase fetch students error:', err?.message || err);
    return null;
  }
}

export async function deleteStudentFromSupabase(identifier: string, customConfig?: SupabaseConfig): Promise<boolean> {
  const client = getSupabaseClient(customConfig);
  if (!client || !identifier) return false;

  try {
    const { error } = await client
      .from('students')
      .delete()
      .or(`nisn.eq.${identifier},id.eq.${identifier}`);
    return !error;
  } catch {
    return false;
  }
}

// ==========================================
// ATTENDANCE SYNC & FETCH
// ==========================================

export async function syncAttendanceToSupabase(
  attendance: AttendanceRecord[],
  customConfig?: SupabaseConfig
): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabaseClient(customConfig);
  if (!client) return { success: false, count: 0, error: 'Klien Supabase tidak aktif' };
  if (attendance.length === 0) return { success: true, count: 0 };

  try {
    const records = attendance.map((a) => {
      const validTimestamp = toValidIsoTimestamp(a.timestamp, a.tanggal);
      let tanggal = a.tanggal || '';
      if (!tanggal) {
        const d = new Date(validTimestamp);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        tanggal = `${day}-${month}-${year}`;
      }

      return {
        id: a.id || `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        tanggal,
        timestamp: validTimestamp,
        nisn: a.nisn ? String(a.nisn).trim() : '',
        nama: a.nama ? String(a.nama).trim() : 'Siswa',
        kelas: a.kelas ? String(a.kelas).trim() : '-',
        id_qr: a.id_qr ? String(a.id_qr).trim() : '',
        jenis: a.jenis || 'Masuk',
        status: a.status || 'Hadir',
        petugas: a.petugas ? String(a.petugas).trim() : 'Sistem',
        catatan: a.catatan || '',
        terlambat_menit: typeof a.terlambatMenit === 'number' && !isNaN(a.terlambatMenit) ? Math.max(0, Math.floor(a.terlambatMenit)) : 0,
      };
    });

    const chunks = chunkArray(records, 50);
    for (const chunk of chunks) {
      const { error } = await client.from('attendance').upsert(chunk, { onConflict: 'id' });
      if (error) throw error;
    }

    return { success: true, count: records.length };
  } catch (err: any) {
    console.warn('Supabase attendance sync notice:', err?.message || err);
    return { success: false, count: 0, error: err?.message || 'Gagal menyimpan tabel attendance ke Supabase' };
  }
}

export async function fetchAttendanceFromSupabase(customConfig?: SupabaseConfig): Promise<AttendanceRecord[] | null> {
  const client = getSupabaseClient(customConfig);
  if (!client) return null;
  try {
    const { data, error } = await client.from('attendance').select('*').order('timestamp', { ascending: false });
    if (error) {
      console.warn('Supabase attendance fetch notice:', error.message);
      return null;
    }
    if (!data) return [];
    return data.map((row) => ({
      id: row.id || `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
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
  } catch (err: any) {
    console.warn('Supabase fetch attendance error:', err?.message || err);
    return null;
  }
}

export async function deleteAttendanceFromSupabase(id: string, customConfig?: SupabaseConfig): Promise<boolean> {
  const client = getSupabaseClient(customConfig);
  if (!client || !id) return false;
  try {
    const { error } = await client.from('attendance').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// ==========================================
// TEACHERS SYNC & FETCH
// ==========================================

export async function syncTeachersToSupabase(
  teachers: Teacher[],
  customConfig?: SupabaseConfig
): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabaseClient(customConfig);
  if (!client) return { success: false, count: 0, error: 'Klien Supabase tidak aktif' };
  if (teachers.length === 0) return { success: true, count: 0 };

  try {
    const records = teachers
      .map((t) => ({
        id: t.id || `tch-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        nip: t.nip ? t.nip.trim() : '',
        nama: t.nama ? t.nama.trim() : 'Guru',
        jabatan: t.jabatan ? t.jabatan.trim() : 'Guru',
        id_qr: t.id_qr || `69933068.${t.nip}`,
        status: t.status || 'aktif',
        no_hp: t.no_hp || '',
        foto: t.foto || '',
        created_at: toValidIsoTimestamp(t.createdAt),
      }))
      .filter((r) => r.nip && r.nip.length > 0);

    const chunks = chunkArray(records, 50);
    for (const chunk of chunks) {
      const { error } = await client.from('teachers').upsert(chunk, { onConflict: 'nip' });
      if (error) throw error;
    }

    return { success: true, count: records.length };
  } catch (err: any) {
    console.warn('Supabase teachers sync notice:', err?.message || err);
    return {
      success: false,
      count: 0,
      error: err?.message || 'Gagal menyimpan tabel teachers ke Supabase',
    };
  }
}

export async function fetchTeachersFromSupabase(customConfig?: SupabaseConfig): Promise<Teacher[] | null> {
  const client = getSupabaseClient(customConfig);
  if (!client) return null;
  try {
    const { data, error } = await client.from('teachers').select('*').order('nama', { ascending: true });
    if (error) {
      console.warn('Supabase teachers fetch notice:', error.message);
      return null;
    }
    if (!data) return [];
    return data.map((row) => ({
      id: row.id || `tch-${row.nip}`,
      nip: row.nip || '',
      nama: row.nama || '',
      jabatan: row.jabatan || '',
      id_qr: row.id_qr || `69933068.${row.nip}`,
      status: (row.status as any) || 'aktif',
      no_hp: row.no_hp || '',
      foto: row.foto || '',
      createdAt: row.created_at || new Date().toISOString(),
    }));
  } catch (err: any) {
    console.warn('Supabase fetch teachers error:', err?.message || err);
    return null;
  }
}

export async function deleteTeacherFromSupabase(identifier: string, customConfig?: SupabaseConfig): Promise<boolean> {
  const client = getSupabaseClient(customConfig);
  if (!client || !identifier) return false;

  try {
    const { error } = await client
      .from('teachers')
      .delete()
      .or(`nip.eq.${identifier},id.eq.${identifier}`);
    return !error;
  } catch {
    return false;
  }
}

// ==========================================
// TEACHER ATTENDANCE SYNC & FETCH
// ==========================================

export async function syncTeacherAttendanceToSupabase(
  attendance: TeacherAttendanceRecord[],
  customConfig?: SupabaseConfig
): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabaseClient(customConfig);
  if (!client) return { success: false, count: 0, error: 'Klien Supabase tidak aktif' };
  if (attendance.length === 0) return { success: true, count: 0 };

  try {
    const records = attendance.map((a) => {
      const validTimestamp = toValidIsoTimestamp(a.timestamp, a.tanggal);
      let tanggal = a.tanggal || '';
      if (!tanggal) {
        const d = new Date(validTimestamp);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        tanggal = `${day}-${month}-${year}`;
      }

      return {
        id: a.id || `tch-att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        tanggal,
        timestamp: validTimestamp,
        nip: a.nip ? String(a.nip).trim() : '',
        nama: a.nama ? String(a.nama).trim() : 'Guru',
        jabatan: a.jabatan ? String(a.jabatan).trim() : 'Guru',
        id_qr: a.id_qr || `69933068.${a.nip}`,
        jenis: a.jenis || 'Masuk',
        status: a.status || 'Hadir',
        petugas: a.petugas ? String(a.petugas).trim() : 'Sistem',
        catatan: a.catatan || '',
        terlambat_menit: typeof a.terlambatMenit === 'number' && !isNaN(a.terlambatMenit) ? Math.max(0, Math.floor(a.terlambatMenit)) : 0,
      };
    });

    const chunks = chunkArray(records, 50);
    for (const chunk of chunks) {
      const { error } = await client.from('teacher_attendance').upsert(chunk, { onConflict: 'id' });
      if (error) throw error;
    }

    return { success: true, count: records.length };
  } catch (err: any) {
    console.warn('Supabase teacher attendance sync notice:', err?.message || err);
    return { success: false, count: 0, error: err?.message || 'Gagal menyimpan tabel teacher_attendance ke Supabase' };
  }
}

export async function fetchTeacherAttendanceFromSupabase(customConfig?: SupabaseConfig): Promise<TeacherAttendanceRecord[] | null> {
  const client = getSupabaseClient(customConfig);
  if (!client) return null;
  try {
    const { data, error } = await client.from('teacher_attendance').select('*').order('timestamp', { ascending: false });
    if (error) {
      console.warn('Supabase teacher attendance fetch notice:', error.message);
      return null;
    }
    if (!data) return [];
    return data.map((row) => ({
      id: row.id || `tch-att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      tanggal: row.tanggal || '',
      timestamp: row.timestamp || new Date().toISOString(),
      nip: row.nip || '',
      nama: row.nama || '',
      jabatan: row.jabatan || '',
      id_qr: row.id_qr || '',
      jenis: (row.jenis as any) || 'Masuk',
      status: (row.status as any) || 'Hadir',
      petugas: row.petugas || 'Sistem',
      catatan: row.catatan || '',
      terlambatMenit: row.terlambat_menit || 0,
    }));
  } catch (err: any) {
    console.warn('Supabase fetch teacher attendance error:', err?.message || err);
    return null;
  }
}

export async function deleteTeacherAttendanceFromSupabase(id: string, customConfig?: SupabaseConfig): Promise<boolean> {
  const client = getSupabaseClient(customConfig);
  if (!client || !id) return false;
  try {
    const { error } = await client.from('teacher_attendance').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// ==========================================
// ACTIVITY LOGS SYNC & FETCH
// ==========================================

export async function syncLogsToSupabase(logs: ActivityLog[], customConfig?: SupabaseConfig): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabaseClient(customConfig);
  if (!client) return { success: false, count: 0, error: 'Klien Supabase tidak aktif' };
  if (logs.length === 0) return { success: true, count: 0 };

  try {
    const records = logs.map((l) => ({
      id: l.id || `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: toValidIsoTimestamp(l.timestamp),
      user_name: l.user || 'Sistem',
      role: l.role || 'Admin',
      action: l.action || 'LOG',
      details: l.details || '',
    }));

    const chunks = chunkArray(records, 50);
    for (const chunk of chunks) {
      const { error } = await client.from('activity_logs').upsert(chunk, { onConflict: 'id' });
      if (error) throw error;
    }

    return { success: true, count: records.length };
  } catch (err: any) {
    console.warn('Supabase activity logs sync notice:', err?.message || err);
    return { success: false, count: 0, error: err?.message || 'Gagal menyimpan tabel activity_logs ke Supabase' };
  }
}

export async function fetchLogsFromSupabase(customConfig?: SupabaseConfig): Promise<ActivityLog[] | null> {
  const client = getSupabaseClient(customConfig);
  if (!client) return null;
  try {
    const { data, error } = await client.from('activity_logs').select('*').order('timestamp', { ascending: false });
    if (error) {
      console.warn('Supabase logs fetch notice:', error.message);
      return null;
    }
    if (!data) return [];
    return data.map((row) => ({
      id: row.id || `log-${Date.now()}`,
      timestamp: row.timestamp || new Date().toISOString(),
      user: row.user_name || '',
      role: (row.role as any) || 'Admin',
      action: row.action || '',
      details: row.details || '',
    }));
  } catch (err: any) {
    console.warn('Supabase fetch logs error:', err?.message || err);
    return null;
  }
}

export async function deleteLogFromSupabase(id: string, customConfig?: SupabaseConfig): Promise<boolean> {
  const client = getSupabaseClient(customConfig);
  if (!client || !id) return false;
  try {
    const { error } = await client.from('activity_logs').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// ==========================================
// SQL SCHEMA GENERATOR
// ==========================================

export function getSupabaseTeacherOnlySchemaSQL(): string {
  return `-- ==============================================================================
-- SQL Schema Khusus Tabel Guru & Presensi Guru di Supabase (PostgreSQL)
-- Jalankan di menu: SQL Editor > New Query di Dashboard Supabase
-- ==============================================================================

-- 1. TABEL GURU & TENAGA KEPENDIDIKAN (teachers)
CREATE TABLE IF NOT EXISTS public.teachers (
    id TEXT,
    nip TEXT PRIMARY KEY,
    nama TEXT NOT NULL,
    jabatan TEXT NOT NULL,
    id_qr TEXT,
    status TEXT DEFAULT 'aktif',
    no_hp TEXT,
    foto TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memastikan kolom baru ada
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS id_qr TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS no_hp TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS foto TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'aktif';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_teachers_id_qr ON public.teachers(id_qr);
CREATE INDEX IF NOT EXISTS idx_teachers_nama ON public.teachers(nama);

-- 2. TABEL PRESENSI GURU & GTK (teacher_attendance)
CREATE TABLE IF NOT EXISTS public.teacher_attendance (
    id TEXT PRIMARY KEY,
    tanggal TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    nip TEXT NOT NULL,
    nama TEXT NOT NULL,
    jabatan TEXT NOT NULL,
    id_qr TEXT,
    jenis TEXT NOT NULL,
    status TEXT NOT NULL,
    petugas TEXT,
    catatan TEXT,
    terlambat_menit INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memastikan kolom baru ada
ALTER TABLE public.teacher_attendance ADD COLUMN IF NOT EXISTS catatan TEXT;
ALTER TABLE public.teacher_attendance ADD COLUMN IF NOT EXISTS terlambat_menit INT DEFAULT 0;
ALTER TABLE public.teacher_attendance ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_teacher_attendance_tanggal ON public.teacher_attendance(tanggal);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_nip ON public.teacher_attendance(nip);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_jenis ON public.teacher_attendance(jenis);

-- 3. HAK AKSES ROW LEVEL SECURITY (RLS)
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teachers' AND policyname = 'Allow all teachers') THEN
        CREATE POLICY "Allow all teachers" ON public.teachers FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teacher_attendance' AND policyname = 'Allow all teacher attendance') THEN
        CREATE POLICY "Allow all teacher attendance" ON public.teacher_attendance FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
`;
}

export function getSupabaseSchemaSQL(): string {
  return `-- ==============================================================================
-- SQL Schema Lengkap untuk Aplikasi Presensi Digital di Supabase (PostgreSQL)
-- Jalankan seluruh script SQL ini di menu: SQL Editor > New Query di Supabase
-- ==============================================================================

-- 1. TABEL SISWA (students)
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT,
    id_qr TEXT,
    nisn TEXT PRIMARY KEY,
    nama TEXT NOT NULL,
    kelas TEXT NOT NULL,
    no_hp_ortu TEXT,
    foto TEXT,
    status TEXT DEFAULT 'aktif',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS id_qr TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS no_hp_ortu TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS foto TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'aktif';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_students_id_qr ON public.students(id_qr);
CREATE INDEX IF NOT EXISTS idx_students_nama ON public.students(nama);
CREATE INDEX IF NOT EXISTS idx_students_kelas ON public.students(kelas);

-- 2. TABEL PRESENSI SISWA (attendance)
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

ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS catatan TEXT;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS terlambat_menit INT DEFAULT 0;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_attendance_tanggal ON public.attendance(tanggal);
CREATE INDEX IF NOT EXISTS idx_attendance_nisn ON public.attendance(nisn);
CREATE INDEX IF NOT EXISTS idx_attendance_id_qr ON public.attendance(id_qr);
CREATE INDEX IF NOT EXISTS idx_attendance_jenis ON public.attendance(jenis);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance(status);

-- 3. TABEL GURU & TENAGA KEPENDIDIKAN (teachers)
CREATE TABLE IF NOT EXISTS public.teachers (
    id TEXT,
    nip TEXT PRIMARY KEY,
    nama TEXT NOT NULL,
    jabatan TEXT NOT NULL,
    id_qr TEXT,
    status TEXT DEFAULT 'aktif',
    no_hp TEXT,
    foto TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS id_qr TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS no_hp TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS foto TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'aktif';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_teachers_id_qr ON public.teachers(id_qr);
CREATE INDEX IF NOT EXISTS idx_teachers_nama ON public.teachers(nama);

-- 4. TABEL PRESENSI GURU & GTK (teacher_attendance)
CREATE TABLE IF NOT EXISTS public.teacher_attendance (
    id TEXT PRIMARY KEY,
    tanggal TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    nip TEXT NOT NULL,
    nama TEXT NOT NULL,
    jabatan TEXT NOT NULL,
    id_qr TEXT,
    jenis TEXT NOT NULL,
    status TEXT NOT NULL,
    petugas TEXT,
    catatan TEXT,
    terlambat_menit INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.teacher_attendance ADD COLUMN IF NOT EXISTS catatan TEXT;
ALTER TABLE public.teacher_attendance ADD COLUMN IF NOT EXISTS terlambat_menit INT DEFAULT 0;
ALTER TABLE public.teacher_attendance ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_teacher_attendance_tanggal ON public.teacher_attendance(tanggal);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_nip ON public.teacher_attendance(nip);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_jenis ON public.teacher_attendance(jenis);

-- 5. TABEL LOG AKTIVITAS (activity_logs)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    user_name TEXT,
    role TEXT,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON public.activity_logs(timestamp);

-- 6. KEBIJAKAN ROW LEVEL SECURITY (RLS) & HAK AKSES API
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'students' AND policyname = 'Allow all students') THEN
        CREATE POLICY "Allow all students" ON public.students FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attendance' AND policyname = 'Allow all attendance') THEN
        CREATE POLICY "Allow all attendance" ON public.attendance FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teachers' AND policyname = 'Allow all teachers') THEN
        CREATE POLICY "Allow all teachers" ON public.teachers FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teacher_attendance' AND policyname = 'Allow all teacher attendance') THEN
        CREATE POLICY "Allow all teacher attendance" ON public.teacher_attendance FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_logs' AND policyname = 'Allow all logs') THEN
        CREATE POLICY "Allow all logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
`;
}

