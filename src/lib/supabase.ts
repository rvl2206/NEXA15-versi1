import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  Student, 
  AttendanceRecord, 
  ActivityLog, 
  Teacher, 
  TeacherAttendanceRecord,
  User,
  SchoolSettings,
  ProblematicStudentDispatch
} from '../types';

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

/**
 * Executes async tasks with concurrency control to prevent rate limits while maximizing speed
 */
async function parallelBatchExecution<T>(
  chunks: T[][],
  fn: (chunk: T[]) => Promise<any>,
  concurrency = 4
): Promise<void> {
  if (chunks.length === 0) return;
  const executing: Promise<any>[] = [];
  for (const chunk of chunks) {
    const p = fn(chunk);
    executing.push(p);
    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // Clean up settled promises
      for (let i = executing.length - 1; i >= 0; i--) {
        const status = await Promise.race([executing[i].then(() => true).catch(() => true), Promise.resolve(false)]);
        if (status) {
          executing.splice(i, 1);
        }
      }
    }
  }
  await Promise.all(executing);
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
    const requiredTables = [
      'students',
      'attendance',
      'activity_logs',
      'teachers',
      'teacher_attendance',
      'app_users',
      'school_settings',
      'problematic_student_dispatches'
    ];
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

// Students sync and fetch

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

    if (records.length === 0) return { success: true, count: 0 };

    const chunks = chunkArray(records, 150);
    await parallelBatchExecution(
      chunks,
      async (chunk) => {
        const { error } = await client.from('students').upsert(chunk, { onConflict: 'nisn' });
        if (error) throw error;
      },
      5
    );

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

// Attendance sync and fetch

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

    const chunks = chunkArray(records, 150);
    await parallelBatchExecution(
      chunks,
      async (chunk) => {
        const { error } = await client.from('attendance').upsert(chunk, { onConflict: 'id' });
        if (error) throw error;
      },
      5
    );

    return { success: true, count: records.length };
  } catch (err: any) {
    console.warn('Supabase attendance sync notice:', err?.message || err);
    return { success: false, count: 0, error: err?.message || 'Gagal menyimpan tabel attendance ke Supabase' };
  }
}

export async function fetchAttendanceFromSupabase(
  startDateOrConfig?: string | SupabaseConfig,
  endDate?: string,
  customConfig?: SupabaseConfig
): Promise<AttendanceRecord[] | null> {
  const config = typeof startDateOrConfig === 'object' ? startDateOrConfig : customConfig;
  const client = getSupabaseClient(config);
  if (!client) return null;
  try {
    let q = client.from('attendance').select('*').order('timestamp', { ascending: false });
    if (typeof startDateOrConfig === 'string' && startDateOrConfig && endDate) {
      q = q.gte('tanggal', startDateOrConfig).lte('tanggal', endDate);
    }
    const { data, error } = await q;
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

// Teachers sync and fetch

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

    if (records.length === 0) return { success: true, count: 0 };

    const chunks = chunkArray(records, 150);
    await parallelBatchExecution(
      chunks,
      async (chunk) => {
        const { error } = await client.from('teachers').upsert(chunk, { onConflict: 'nip' });
        if (error) throw error;
      },
      5
    );

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

// Teacher attendance sync and fetch

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

    const chunks = chunkArray(records, 150);
    await parallelBatchExecution(
      chunks,
      async (chunk) => {
        const { error } = await client.from('teacher_attendance').upsert(chunk, { onConflict: 'id' });
        if (error) throw error;
      },
      5
    );

    return { success: true, count: records.length };
  } catch (err: any) {
    console.warn('Supabase teacher attendance sync notice:', err?.message || err);
    return { success: false, count: 0, error: err?.message || 'Gagal menyimpan tabel teacher_attendance ke Supabase' };
  }
}

export async function fetchTeacherAttendanceFromSupabase(
  startDateOrConfig?: string | SupabaseConfig,
  endDate?: string,
  customConfig?: SupabaseConfig
): Promise<TeacherAttendanceRecord[] | null> {
  const config = typeof startDateOrConfig === 'object' ? startDateOrConfig : customConfig;
  const client = getSupabaseClient(config);
  if (!client) return null;
  try {
    let q = client.from('teacher_attendance').select('*').order('timestamp', { ascending: false });
    if (typeof startDateOrConfig === 'string' && startDateOrConfig && endDate) {
      q = q.gte('tanggal', startDateOrConfig).lte('tanggal', endDate);
    }
    const { data, error } = await q;
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

// Activity logs sync and fetch

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

    const chunks = chunkArray(records, 150);
    await parallelBatchExecution(
      chunks,
      async (chunk) => {
        const { error } = await client.from('activity_logs').upsert(chunk, { onConflict: 'id' });
        if (error) throw error;
      },
      5
    );

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

// ============================================================================
// 1. APP USERS SYNC & CRUD
// ============================================================================

export async function syncUsersToSupabase(
  users: User[],
  customConfig?: SupabaseConfig
): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabaseClient(customConfig);
  if (!client) return { success: false, count: 0, error: 'Klien Supabase tidak aktif' };
  if (users.length === 0) return { success: true, count: 0 };

  try {
    const records = users.map((u) => ({
      uid: u.uid,
      username: (u.username || u.uid).trim().toLowerCase(),
      email: u.email ? u.email.trim() : '',
      name: u.name ? u.name.trim() : 'User',
      role: u.role || 'Guru',
      sub_role: u.subRole || '',
      assigned_class: u.assignedClass || '',
      nip: u.nip || '',
      phone: u.phone || '',
      password: u.password || '',
      status: u.status || 'aktif',
      avatar: u.avatar || '',
      created_at: toValidIsoTimestamp(u.createdAt),
      updated_at: toValidIsoTimestamp(u.updatedAt),
      last_login_at: u.lastLoginAt ? toValidIsoTimestamp(u.lastLoginAt) : null,
      notes: u.notes || '',
    }));

    const chunks = chunkArray(records, 100);
    await parallelBatchExecution(
      chunks,
      async (chunk) => {
        const { error } = await client.from('app_users').upsert(chunk, { onConflict: 'uid' });
        if (error) throw error;
      },
      3
    );

    return { success: true, count: records.length };
  } catch (err: any) {
    console.warn('Supabase syncUsers notice:', err?.message || err);
    return { success: false, count: 0, error: err?.message || 'Gagal menyimpan app_users ke Supabase' };
  }
}

export async function fetchUsersFromSupabase(customConfig?: SupabaseConfig): Promise<User[] | null> {
  const client = getSupabaseClient(customConfig);
  if (!client) return null;
  try {
    const { data, error } = await client.from('app_users').select('*').order('created_at', { ascending: true });
    if (error) {
      console.warn('Supabase users fetch notice:', error.message);
      return null;
    }
    if (!data) return [];
    return data.map((row: any) => ({
      uid: row.uid || row.id,
      username: row.username || row.uid,
      email: row.email || '',
      name: row.name || row.username || 'User',
      role: row.role || 'Guru',
      subRole: row.sub_role || row.subRole,
      assignedClass: row.assigned_class || row.assignedClass || '',
      nip: row.nip || '',
      phone: row.phone || '',
      password: row.password || '',
      status: row.status || 'aktif',
      avatar: row.avatar || '',
      createdAt: row.created_at || row.createdAt || '',
      updatedAt: row.updated_at || row.updatedAt || '',
      lastLoginAt: row.last_login_at || row.lastLoginAt || '',
      notes: row.notes || '',
    }));
  } catch (err: any) {
    console.warn('Supabase fetchUsers error:', err?.message || err);
    return null;
  }
}

export async function saveUserToSupabase(user: User, customConfig?: SupabaseConfig): Promise<boolean> {
  const res = await syncUsersToSupabase([user], customConfig);
  return res.success;
}

export async function deleteUserFromSupabase(uid: string, customConfig?: SupabaseConfig): Promise<boolean> {
  const client = getSupabaseClient(customConfig);
  if (!client || !uid) return false;
  try {
    const { error } = await client.from('app_users').delete().eq('uid', uid);
    return !error;
  } catch {
    return false;
  }
}

// ============================================================================
// 2. SCHOOL SETTINGS SYNC & CRUD
// ============================================================================

export async function saveSettingsToSupabase(
  settings: SchoolSettings,
  customConfig?: SupabaseConfig
): Promise<boolean> {
  const client = getSupabaseClient(customConfig);
  if (!client) return false;
  try {
    const payload = {
      id: 'school_config',
      school_name: settings.schoolName || 'SMAN 15 KEPULAUAN SULA',
      school_npsn: settings.schoolNPSN || '69933068',
      school_logo: settings.schoolLogo || '',
      school_address: settings.schoolAddress || '',
      school_city: settings.schoolCity || '',
      cutoff_time: settings.cutoffTime || '07:15',
      auto_alpa_cutoff_time: settings.autoAlpaCutoffTime || '14:30',
      enable_auto_alpa: settings.enableAutoAlpa ?? true,
      school_days: settings.schoolDays || 6,
      academic_year: settings.academicYear || '2024/2025',
      enable_wa_notif: settings.enableWaNotif ?? false,
      wa_template_hadir: settings.waTemplateHadir || '',
      wa_template_terlambat: settings.waTemplateTerlambat || '',
      wa_template_izin_sakit: settings.waTemplateIzinSakit || '',
      wa_template_alpa: settings.waTemplateAlpa || '',
      wa_template_wali_kelas: settings.waTemplateWaliKelas || '',
      holidays: settings.holidays || [],
      homeroom_assignments: settings.homeroomAssignments || {},
      problem_threshold_alpa: settings.problemThresholdAlpa ?? 2,
      problem_threshold_terlambat: settings.problemThresholdTerlambat ?? 3,
      problem_threshold_min_rate: settings.problemThresholdMinRate ?? 75,
      enable_rfid_reader: settings.enableRfidReader ?? true,
      rfid_reader_mode: settings.rfidReaderMode || 'auto',
      rfid_card_type: settings.rfidCardType || 'Dual',
      rfid_beep_feedback: settings.rfidBeepFeedback ?? true,
      rfid_auto_record: settings.rfidAutoRecord ?? true,
      rfid_allow_unregistered_card_prompt: settings.rfidAllowUnregisteredCardPrompt ?? true,
      updated_at: new Date().toISOString(),
    };
    const { error } = await client.from('school_settings').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase saveSettings notice:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('Supabase saveSettings error:', err?.message || err);
    return false;
  }
}

export async function fetchSettingsFromSupabase(
  customConfig?: SupabaseConfig
): Promise<Partial<SchoolSettings> | null> {
  const client = getSupabaseClient(customConfig);
  if (!client) return null;
  try {
    const { data, error } = await client.from('school_settings').select('*').eq('id', 'school_config').single();
    if (error) {
      return null;
    }
    if (!data) return null;

    const res: Partial<SchoolSettings> = {
      schoolName: data.school_name || data.schoolName,
      schoolNPSN: data.school_npsn || data.schoolNPSN,
      schoolLogo: data.school_logo || data.schoolLogo,
      schoolAddress: data.school_address || data.schoolAddress,
      schoolCity: data.school_city || data.schoolCity,
      cutoffTime: data.cutoff_time || data.cutoffTime,
      autoAlpaCutoffTime: data.auto_alpa_cutoff_time || data.autoAlpaCutoffTime,
      enableAutoAlpa: data.enable_auto_alpa ?? data.enableAutoAlpa,
      schoolDays: data.school_days || data.schoolDays,
      academicYear: data.academic_year || data.academicYear,
      enableWaNotif: data.enable_wa_notif ?? data.enableWaNotif,
      waTemplateHadir: data.wa_template_hadir || data.waTemplateHadir,
      waTemplateTerlambat: data.wa_template_terlambat || data.waTemplateTerlambat,
      waTemplateIzinSakit: data.wa_template_izin_sakit || data.waTemplateIzinSakit,
      waTemplateAlpa: data.wa_template_alpa || data.waTemplateAlpa,
      waTemplateWaliKelas: data.wa_template_wali_kelas || data.waTemplateWaliKelas,
      holidays: Array.isArray(data.holidays) ? data.holidays : (Array.isArray(data.holidays_json) ? data.holidays_json : []),
      homeroomAssignments: data.homeroom_assignments && typeof data.homeroom_assignments === 'object' ? data.homeroom_assignments : {},
      problemThresholdAlpa: data.problem_threshold_alpa ?? data.problemThresholdAlpa,
      problemThresholdTerlambat: data.problem_threshold_terlambat ?? data.problemThresholdTerlambat,
      problemThresholdMinRate: data.problem_threshold_min_rate ?? data.problemThresholdMinRate,
      enableRfidReader: data.enable_rfid_reader ?? data.enableRfidReader,
      rfidReaderMode: data.rfid_reader_mode || data.rfidReaderMode,
      rfidCardType: data.rfid_card_type || data.rfidCardType,
      rfidBeepFeedback: data.rfid_beep_feedback ?? data.rfidBeepFeedback,
      rfidAutoRecord: data.rfid_auto_record ?? data.rfidAutoRecord,
      rfidAllowUnregisteredCardPrompt: data.rfid_allow_unregistered_card_prompt ?? data.rfidAllowUnregisteredCardPrompt,
    };
    return res;
  } catch (err: any) {
    console.warn('Supabase fetchSettings error:', err?.message || err);
    return null;
  }
}

// ============================================================================
// 3. PROBLEMATIC STUDENT DISPATCHES SYNC & CRUD
// ============================================================================

export async function syncDispatchesToSupabase(
  dispatches: ProblematicStudentDispatch[],
  customConfig?: SupabaseConfig
): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabaseClient(customConfig);
  if (!client) return { success: false, count: 0, error: 'Klien Supabase tidak aktif' };
  if (dispatches.length === 0) return { success: true, count: 0 };

  try {
    const records = dispatches.map((d) => ({
      id: d.id,
      student_id: d.studentId || '',
      student_name: d.studentName || 'Siswa',
      nisn: d.nisn || '',
      kelas: d.kelas || '-',
      wali_kelas_name: d.waliKelasName || '',
      wali_kelas_phone: d.waliKelasPhone || '',
      wali_kelas_nip: d.waliKelasNip || '',
      risk_level: d.riskLevel || 'Perhatian',
      alpa_count: d.alpaCount || 0,
      terlambat_count: d.terlambatCount || 0,
      sakit_count: d.sakitCount || 0,
      izin_count: d.izinCount || 0,
      attendance_rate: d.attendanceRate || 0,
      reasons: Array.isArray(d.reasons) ? d.reasons : [],
      notes: d.notes || '',
      ai_recommendation: d.aiRecommendation || '',
      dispatched_at: toValidIsoTimestamp(d.dispatchedAt),
      dispatched_by: d.dispatchedBy || '',
      channel: d.channel || 'Sistem Internal',
      status: d.status || 'Terkirim',
      tindak_lanjut_notes: d.tindakLanjutNotes || '',
      resolved_at: d.resolvedAt ? toValidIsoTimestamp(d.resolvedAt) : null,
    }));

    const chunks = chunkArray(records, 100);
    await parallelBatchExecution(
      chunks,
      async (chunk) => {
        const { error } = await client.from('problematic_student_dispatches').upsert(chunk, { onConflict: 'id' });
        if (error) throw error;
      },
      3
    );

    return { success: true, count: records.length };
  } catch (err: any) {
    console.warn('Supabase syncDispatches notice:', err?.message || err);
    return { success: false, count: 0, error: err?.message || 'Gagal menyimpan dispatches ke Supabase' };
  }
}

export async function fetchDispatchesFromSupabase(
  customConfig?: SupabaseConfig
): Promise<ProblematicStudentDispatch[] | null> {
  const client = getSupabaseClient(customConfig);
  if (!client) return null;
  try {
    const { data, error } = await client.from('problematic_student_dispatches').select('*').order('dispatched_at', { ascending: false });
    if (error) {
      console.warn('Supabase fetchDispatches notice:', error.message);
      return null;
    }
    if (!data) return [];
    return data.map((r: any) => ({
      id: r.id,
      studentId: r.student_id || r.studentId,
      studentName: r.student_name || r.studentName || '',
      nisn: r.nisn || '',
      kelas: r.kelas || '',
      waliKelasName: r.wali_kelas_name || r.waliKelasName || '',
      waliKelasPhone: r.wali_kelas_phone || r.waliKelasPhone,
      waliKelasNip: r.wali_kelas_nip || r.waliKelasNip,
      riskLevel: (r.risk_level || r.riskLevel || 'Perhatian') as any,
      alpaCount: r.alpa_count ?? r.alpaCount ?? 0,
      terlambatCount: r.terlambat_count ?? r.terlambatCount ?? 0,
      sakitCount: r.sakit_count ?? r.sakitCount ?? 0,
      izinCount: r.izin_count ?? r.izinCount ?? 0,
      attendanceRate: r.attendance_rate ?? r.attendanceRate ?? 0,
      reasons: Array.isArray(r.reasons) ? r.reasons : [],
      notes: r.notes || '',
      aiRecommendation: r.ai_recommendation || r.aiRecommendation,
      dispatchedAt: r.dispatched_at || r.dispatchedAt || new Date().toISOString(),
      dispatchedBy: r.dispatched_by || r.dispatchedBy || '',
      channel: (r.channel || 'Sistem Internal') as any,
      status: (r.status || 'Terkirim') as any,
      tindakLanjutNotes: r.tindak_lanjut_notes || r.tindakLanjutNotes,
      resolvedAt: r.resolved_at || r.resolvedAt,
    }));
  } catch (err: any) {
    console.warn('Supabase fetchDispatches error:', err?.message || err);
    return null;
  }
}

export async function saveDispatchToSupabase(
  dispatch: ProblematicStudentDispatch,
  customConfig?: SupabaseConfig
): Promise<boolean> {
  const res = await syncDispatchesToSupabase([dispatch], customConfig);
  return res.success;
}

export async function deleteDispatchFromSupabase(
  id: string,
  customConfig?: SupabaseConfig
): Promise<boolean> {
  const client = getSupabaseClient(customConfig);
  if (!client || !id) return false;
  try {
    const { error } = await client.from('problematic_student_dispatches').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// ============================================================================
// 4. ENTITY SINGLE & MULTIPLE HELPERS
// ============================================================================

export async function saveStudentToSupabase(student: Student, customConfig?: SupabaseConfig): Promise<boolean> {
  const res = await syncStudentsToSupabase([student], customConfig);
  return res.success;
}

export async function saveMultipleStudentsToSupabase(students: Student[], customConfig?: SupabaseConfig): Promise<boolean> {
  const res = await syncStudentsToSupabase(students, customConfig);
  return res.success;
}

export async function saveTeacherToSupabase(teacher: Teacher, customConfig?: SupabaseConfig): Promise<boolean> {
  const res = await syncTeachersToSupabase([teacher], customConfig);
  return res.success;
}

export async function saveMultipleTeachersToSupabase(teachers: Teacher[], customConfig?: SupabaseConfig): Promise<boolean> {
  const res = await syncTeachersToSupabase(teachers, customConfig);
  return res.success;
}

export async function saveAttendanceToSupabase(record: AttendanceRecord, customConfig?: SupabaseConfig): Promise<boolean> {
  const res = await syncAttendanceToSupabase([record], customConfig);
  return res.success;
}

export async function saveMultipleAttendanceToSupabase(records: AttendanceRecord[], customConfig?: SupabaseConfig): Promise<boolean> {
  const res = await syncAttendanceToSupabase(records, customConfig);
  return res.success;
}

export async function saveTeacherAttendanceToSupabase(record: TeacherAttendanceRecord, customConfig?: SupabaseConfig): Promise<boolean> {
  const res = await syncTeacherAttendanceToSupabase([record], customConfig);
  return res.success;
}

export async function saveMultipleTeacherAttendanceToSupabase(records: TeacherAttendanceRecord[], customConfig?: SupabaseConfig): Promise<boolean> {
  const res = await syncTeacherAttendanceToSupabase(records, customConfig);
  return res.success;
}

export async function saveLogToSupabase(log: ActivityLog, customConfig?: SupabaseConfig): Promise<boolean> {
  const res = await syncLogsToSupabase([log], customConfig);
  return res.success;
}

// ============================================================================
// 5. SUPABASE AUTHENTICATION (OAUTH & RESET PASSWORD)
// ============================================================================

export async function signInWithGoogle(customConfig?: SupabaseConfig): Promise<any> {
  const client = getSupabaseClient(customConfig);
  if (!client) {
    throw new Error('Koneksi Supabase belum dikonfigurasi.');
  }
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  });
  if (error) {
    throw error;
  }
  return data;
}

export async function sendPasswordResetLink(
  email: string,
  customConfig?: SupabaseConfig
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient(customConfig);
  if (!client) {
    return { success: false, message: 'Koneksi Supabase belum dikonfigurasi.' };
  }
  try {
    const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}` : undefined,
    });
    if (error) {
      return { success: false, message: error.message };
    }
    return {
      success: true,
      message: `Tautan reset kata sandi telah dikirim ke alamat email ${email}. Silakan periksa kotak masuk email Anda.`,
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Gagal memproses permintaan reset kata sandi.' };
  }
}

// SQL schema generator

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

-- 6. TABEL AKUN PENGGUNA SISTEM (app_users)
CREATE TABLE IF NOT EXISTS public.app_users (
    uid TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    sub_role TEXT,
    assigned_class TEXT,
    nip TEXT,
    phone TEXT,
    password TEXT,
    status TEXT DEFAULT 'aktif',
    avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_app_users_username ON public.app_users(username);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON public.app_users(role);

-- 7. TABEL PENGATURAN SEKOLAH (school_settings)
CREATE TABLE IF NOT EXISTS public.school_settings (
    id TEXT PRIMARY KEY DEFAULT 'school_config',
    school_name TEXT NOT NULL,
    school_npsn TEXT,
    school_logo TEXT,
    school_address TEXT,
    school_city TEXT,
    cutoff_time TEXT NOT NULL DEFAULT '07:15',
    auto_alpa_cutoff_time TEXT DEFAULT '14:30',
    enable_auto_alpa BOOLEAN DEFAULT true,
    school_days INT DEFAULT 6,
    academic_year TEXT DEFAULT '2024/2025',
    enable_wa_notif BOOLEAN DEFAULT false,
    wa_template_hadir TEXT,
    wa_template_terlambat TEXT,
    wa_template_izin_sakit TEXT,
    wa_template_alpa TEXT,
    wa_template_wali_kelas TEXT,
    holidays JSONB DEFAULT '[]'::jsonb,
    homeroom_assignments JSONB DEFAULT '{}'::jsonb,
    problem_threshold_alpa INT DEFAULT 2,
    problem_threshold_terlambat INT DEFAULT 3,
    problem_threshold_min_rate INT DEFAULT 75,
    enable_rfid_reader BOOLEAN DEFAULT true,
    rfid_reader_mode TEXT DEFAULT 'auto',
    rfid_card_type TEXT DEFAULT 'Dual',
    rfid_beep_feedback BOOLEAN DEFAULT true,
    rfid_auto_record BOOLEAN DEFAULT true,
    rfid_allow_unregistered_card_prompt BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABEL DISPOSISI SISWA BERMASALAH (problematic_student_dispatches)
CREATE TABLE IF NOT EXISTS public.problematic_student_dispatches (
    id TEXT PRIMARY KEY,
    student_id TEXT,
    student_name TEXT NOT NULL,
    nisn TEXT NOT NULL,
    kelas TEXT NOT NULL,
    wali_kelas_name TEXT,
    wali_kelas_phone TEXT,
    wali_kelas_nip TEXT,
    risk_level TEXT,
    alpa_count INT DEFAULT 0,
    terlambat_count INT DEFAULT 0,
    sakit_count INT DEFAULT 0,
    izin_count INT DEFAULT 0,
    attendance_rate NUMERIC DEFAULT 0,
    reasons JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    ai_recommendation TEXT,
    dispatched_at TIMESTAMPTZ DEFAULT NOW(),
    dispatched_by TEXT,
    channel TEXT,
    status TEXT DEFAULT 'Terkirim',
    tindak_lanjut_notes TEXT,
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dispatches_nisn ON public.problematic_student_dispatches(nisn);
CREATE INDEX IF NOT EXISTS idx_dispatches_kelas ON public.problematic_student_dispatches(kelas);
CREATE INDEX IF NOT EXISTS idx_dispatches_status ON public.problematic_student_dispatches(status);

-- 9. KEBIJAKAN ROW LEVEL SECURITY (RLS) & HAK AKSES API
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problematic_student_dispatches ENABLE ROW LEVEL SECURITY;

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
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_users' AND policyname = 'Allow all app_users') THEN
        CREATE POLICY "Allow all app_users" ON public.app_users FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'school_settings' AND policyname = 'Allow all school_settings') THEN
        CREATE POLICY "Allow all school_settings" ON public.school_settings FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'problematic_student_dispatches' AND policyname = 'Allow all dispatches') THEN
        CREATE POLICY "Allow all dispatches" ON public.problematic_student_dispatches FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
`;
}

/**
 * Standard PostgreSQL Schema for Self-Hosted PostgreSQL / Cloud SQL (GCP) / Docker
 */
export function getPostgresSelfHostedSchemaSQL(): string {
  return `-- ====================================================================
-- NEXA15 PRESENSI DIGITAL - POSTGRESQL SELF-HOSTED & CLOUD SQL DDL
-- Standalone Standard PostgreSQL Schema (No Supabase dependency)
-- ====================================================================

-- 1. Table: Students (Data Siswa)
CREATE TABLE IF NOT EXISTS students (
    nisn VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    class VARCHAR(50) NOT NULL,
    gender VARCHAR(10) DEFAULT 'L',
    phone VARCHAR(50),
    parent_phone VARCHAR(50),
    id_qr VARCHAR(100),
    status VARCHAR(20) DEFAULT 'aktif',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_students_class ON students(class);
CREATE INDEX IF NOT EXISTS idx_students_id_qr ON students(id_qr);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);

-- 2. Table: Student Attendance (Presensi Siswa)
CREATE TABLE IF NOT EXISTS attendance (
    id VARCHAR(100) PRIMARY KEY,
    tanggal DATE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    nisn VARCHAR(20) NOT NULL REFERENCES students(nisn) ON UPDATE CASCADE ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    class VARCHAR(50) NOT NULL,
    id_qr VARCHAR(100),
    jenis VARCHAR(20) NOT NULL, -- 'Masuk' | 'Pulang'
    status VARCHAR(20) NOT NULL, -- 'Hadir' | 'Terlambat' | 'Izin' | 'Sakit' | 'Alpa'
    petugas VARCHAR(100),
    catatan TEXT,
    terlambat_menit INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attendance_tanggal ON attendance(tanggal);
CREATE INDEX IF NOT EXISTS idx_attendance_nisn ON attendance(nisn);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_jenis ON attendance(jenis);

-- 3. Table: Teachers & Staff (Guru & Tenaga Kependidikan)
CREATE TABLE IF NOT EXISTS teachers (
    nip VARCHAR(30) PRIMARY KEY,
    id VARCHAR(100),
    nama VARCHAR(255) NOT NULL,
    jabatan VARCHAR(100) NOT NULL,
    id_qr VARCHAR(100),
    status VARCHAR(20) DEFAULT 'aktif',
    no_hp VARCHAR(50),
    foto TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_teachers_id_qr ON teachers(id_qr);
CREATE INDEX IF NOT EXISTS idx_teachers_status ON teachers(status);

-- 4. Table: Teacher Attendance (Presensi Guru & GTK)
CREATE TABLE IF NOT EXISTS teacher_attendance (
    id VARCHAR(100) PRIMARY KEY,
    tanggal DATE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    nip VARCHAR(30) NOT NULL REFERENCES teachers(nip) ON UPDATE CASCADE ON DELETE RESTRICT,
    nama VARCHAR(255) NOT NULL,
    jabatan VARCHAR(100) NOT NULL,
    id_qr VARCHAR(100),
    jenis VARCHAR(20) NOT NULL, -- 'Masuk' | 'Pulang'
    status VARCHAR(20) NOT NULL, -- 'Hadir' | 'Terlambat' | 'Izin' | 'Sakit' | 'Alpa' | 'Dinas Luar'
    petugas VARCHAR(100),
    catatan TEXT,
    terlambat_menit INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_teacher_att_tanggal ON teacher_attendance(tanggal);
CREATE INDEX IF NOT EXISTS idx_teacher_att_nip ON teacher_attendance(nip);

-- 5. Table: Activity Logs (Audit Trail & Log Aktivitas)
CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(100) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    user_name VARCHAR(100),
    role VARCHAR(50),
    action VARCHAR(255) NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON activity_logs(timestamp DESC);

-- 6. Table: App Users (Pengguna Sistem NEXA15)
CREATE TABLE IF NOT EXISTS app_users (
    uid VARCHAR(100) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    sub_role VARCHAR(50),
    assigned_class VARCHAR(50),
    nip VARCHAR(50),
    phone VARCHAR(50),
    password VARCHAR(255),
    status VARCHAR(20) DEFAULT 'aktif',
    avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_app_users_username ON app_users(username);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON app_users(role);

-- 7. Table: School Settings (Pengaturan & Konfigurasi Sekolah)
CREATE TABLE IF NOT EXISTS school_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'school_config',
    school_name VARCHAR(255) NOT NULL,
    school_npsn VARCHAR(50),
    school_logo TEXT,
    school_address TEXT,
    school_city VARCHAR(100),
    cutoff_time VARCHAR(10) DEFAULT '07:15',
    auto_alpa_cutoff_time VARCHAR(10) DEFAULT '14:30',
    enable_auto_alpa BOOLEAN DEFAULT true,
    school_days INTEGER DEFAULT 6,
    academic_year VARCHAR(50) DEFAULT '2024/2025',
    enable_wa_notif BOOLEAN DEFAULT false,
    wa_template_hadir TEXT,
    wa_template_terlambat TEXT,
    wa_template_izin_sakit TEXT,
    wa_template_alpa TEXT,
    wa_template_wali_kelas TEXT,
    holidays JSONB DEFAULT '[]'::jsonb,
    homeroom_assignments JSONB DEFAULT '{}'::jsonb,
    problem_threshold_alpa INTEGER DEFAULT 2,
    problem_threshold_terlambat INTEGER DEFAULT 3,
    problem_threshold_min_rate INTEGER DEFAULT 75,
    enable_rfid_reader BOOLEAN DEFAULT true,
    rfid_reader_mode VARCHAR(50) DEFAULT 'auto',
    rfid_card_type VARCHAR(50) DEFAULT 'Dual',
    rfid_beep_feedback BOOLEAN DEFAULT true,
    rfid_auto_record BOOLEAN DEFAULT true,
    rfid_allow_unregistered_card_prompt BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Table: Problematic Student Dispatches (Disposisi Siswa Bermasalah)
CREATE TABLE IF NOT EXISTS problematic_student_dispatches (
    id VARCHAR(100) PRIMARY KEY,
    student_id VARCHAR(100),
    student_name VARCHAR(255) NOT NULL,
    nisn VARCHAR(50) NOT NULL,
    kelas VARCHAR(50) NOT NULL,
    wali_kelas_name VARCHAR(255),
    wali_kelas_phone VARCHAR(50),
    wali_kelas_nip VARCHAR(50),
    risk_level VARCHAR(50),
    alpa_count INTEGER DEFAULT 0,
    terlambat_count INTEGER DEFAULT 0,
    sakit_count INTEGER DEFAULT 0,
    izin_count INTEGER DEFAULT 0,
    attendance_rate NUMERIC DEFAULT 0,
    reasons JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    ai_recommendation TEXT,
    dispatched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    dispatched_by VARCHAR(100),
    channel VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Terkirim',
    tindak_lanjut_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_dispatches_nisn ON problematic_student_dispatches(nisn);
CREATE INDEX IF NOT EXISTS idx_dispatches_status ON problematic_student_dispatches(status);
`;
}

/**
 * Docker Compose snippet for ready-to-run self-hosted PostgreSQL + pgAdmin
 */
export function getDockerComposePostgresYAML(): string {
  return `version: '3.8'

services:
  # 1. PostgreSQL Database Server
  postgres:
    image: postgres:16-alpine
    container_name: nexa15_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: nexa15_presensi
      POSTGRES_USER: nexa_admin
      POSTGRES_PASSWORD: SecretPassword123! # Ganti dengan password kuat
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - nexa_network

  # 2. pgAdmin (Web GUI Management Database)
  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: nexa15_pgadmin
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@nexa15.sch.id
      PGADMIN_DEFAULT_PASSWORD: AdminPassword123!
    ports:
      - "5050:80"
    volumes:
      - pgadmin_data:/var/lib/pgadmin
    depends_on:
      - postgres
    networks:
      - nexa_network

volumes:
  postgres_data:
    driver: local
  pgadmin_data:
    driver: local

networks:
  nexa_network:
    driver: bridge
`;
}

/**
 * Generates an executable SQL Dump (DDL + INSERT statements) from current in-memory store data
 */
export function generateFullSqlBackupDump(
  students: Student[],
  attendance: AttendanceRecord[],
  teachers: Teacher[],
  teacherAttendance: TeacherAttendanceRecord[],
  logs: ActivityLog[],
  schoolSettings?: any
): string {
  const escapeSql = (str: any): string => {
    if (str === null || str === undefined) return 'NULL';
    const s = String(str).replace(/'/g, "''");
    return `'${s}'`;
  };

  const escapeNum = (num: any, def = 0): number => {
    const n = Number(num);
    return isNaN(n) ? def : n;
  };

  let sql = `-- ====================================================================
-- NEXA15 DATABASE BACKUP DUMP (POSTGRESQL / CLOUD SQL COMPATIBLE)
-- Generated: ${new Date().toISOString()}
-- Total Students: ${students.length}
-- Total Attendance: ${attendance.length}
-- Total Teachers: ${teachers.length}
-- Total Teacher Attendance: ${teacherAttendance.length}
-- Total Logs: ${logs.length}
-- ====================================================================

-- 1. SCHEMA DDL CREATION
${getPostgresSelfHostedSchemaSQL()}

-- 2. DATA INSERTIONS
`;

  // Insert Students
  if (students.length > 0) {
    sql += `\n-- 2.1 Students Data (${students.length} rows)\n`;
    students.forEach((s) => {
      sql += `INSERT INTO students (nisn, name, class, gender, phone, parent_phone, id_qr, status) VALUES (${escapeSql(
        s.nisn
      )}, ${escapeSql(s.nama)}, ${escapeSql(s.kelas)}, ${escapeSql('L')}, ${escapeSql(
        ''
      )}, ${escapeSql(s.no_hp_ortu || '')}, ${escapeSql(s.id_qr || s.nisn)}, ${escapeSql(s.status || 'aktif')})
ON CONFLICT (nisn) DO UPDATE SET 
  name = EXCLUDED.name, 
  class = EXCLUDED.class, 
  gender = EXCLUDED.gender, 
  phone = EXCLUDED.phone, 
  parent_phone = EXCLUDED.parent_phone, 
  id_qr = EXCLUDED.id_qr, 
  status = EXCLUDED.status;\n`;
    });
  }

  // Insert Teachers
  if (teachers.length > 0) {
    sql += `\n-- 2.2 Teachers Data (${teachers.length} rows)\n`;
    teachers.forEach((t) => {
      sql += `INSERT INTO teachers (nip, id, nama, jabatan, id_qr, status, no_hp, foto) VALUES (${escapeSql(
        t.nip
      )}, ${escapeSql(t.id || t.nip)}, ${escapeSql(t.nama)}, ${escapeSql(t.jabatan)}, ${escapeSql(
        t.id_qr || t.nip
      )}, ${escapeSql(t.status || 'aktif')}, ${escapeSql(t.no_hp || '')}, ${escapeSql(t.foto || '')})
ON CONFLICT (nip) DO UPDATE SET 
  nama = EXCLUDED.nama, 
  jabatan = EXCLUDED.jabatan, 
  id_qr = EXCLUDED.id_qr, 
  status = EXCLUDED.status, 
  no_hp = EXCLUDED.no_hp;\n`;
    });
  }

  // Insert Student Attendance
  if (attendance.length > 0) {
    sql += `\n-- 2.3 Attendance Records (${attendance.length} rows)\n`;
    attendance.forEach((a) => {
      const ts = toValidIsoTimestamp(a.timestamp, a.tanggal);
      sql += `INSERT INTO attendance (id, tanggal, timestamp, nisn, name, class, id_qr, jenis, status, petugas, catatan, terlambat_menit) VALUES (${escapeSql(
        a.id
      )}, ${escapeSql(a.tanggal)}, '${ts}', ${escapeSql(a.nisn)}, ${escapeSql(a.nama)}, ${escapeSql(
        a.kelas
      )}, ${escapeSql(a.id_qr || a.nisn)}, ${escapeSql(a.jenis)}, ${escapeSql(a.status)}, ${escapeSql(
        a.petugas || ''
      )}, ${escapeSql(a.catatan || '')}, ${escapeNum(a.terlambatMenit, 0)})
ON CONFLICT (id) DO NOTHING;\n`;
    });
  }

  // Insert Teacher Attendance
  if (teacherAttendance.length > 0) {
    sql += `\n-- 2.4 Teacher Attendance Records (${teacherAttendance.length} rows)\n`;
    teacherAttendance.forEach((ta) => {
      const ts = toValidIsoTimestamp(ta.timestamp, ta.tanggal);
      sql += `INSERT INTO teacher_attendance (id, tanggal, timestamp, nip, nama, jabatan, id_qr, jenis, status, petugas, catatan, terlambat_menit) VALUES (${escapeSql(
        ta.id
      )}, ${escapeSql(ta.tanggal)}, '${ts}', ${escapeSql(ta.nip)}, ${escapeSql(ta.nama)}, ${escapeSql(
        ta.jabatan
      )}, ${escapeSql(ta.id_qr || ta.nip)}, ${escapeSql(ta.jenis)}, ${escapeSql(ta.status)}, ${escapeSql(
        ta.petugas || ''
      )}, ${escapeSql(ta.catatan || '')}, ${escapeNum(ta.terlambatMenit, 0)})
ON CONFLICT (id) DO NOTHING;\n`;
    });
  }

  // Insert Logs
  if (logs.length > 0) {
    sql += `\n-- 2.5 Activity Logs (${logs.length} rows)\n`;
    logs.slice(0, 500).forEach((l) => {
      const ts = toValidIsoTimestamp(l.timestamp);
      sql += `INSERT INTO activity_logs (id, timestamp, user_name, role, action, details) VALUES (${escapeSql(
        l.id
      )}, '${ts}', ${escapeSql(l.user || '')}, ${escapeSql(l.role || '')}, ${escapeSql(
        l.action
      )}, ${escapeSql(l.details || '')})
ON CONFLICT (id) DO NOTHING;\n`;
    });
  }

  sql += `\n-- ====================================================================
-- DUMP COMPLETED SUCCESSFULLY
-- ====================================================================\n`;

  return sql;
}

/**
 * Revisi & Hapus Seluruh Presensi Hari Sabtu yang Berstatus ALPA dari Supabase
 */
export async function purgeSaturdayAlpaFromSupabase(customConfig?: SupabaseConfig): Promise<{
  deletedStudents: number;
  deletedTeachers: number;
}> {
  const client = getSupabaseClient(customConfig);
  if (!client) return { deletedStudents: 0, deletedTeachers: 0 };

  let deletedStudents = 0;
  let deletedTeachers = 0;

  const isSat = (dateStr?: string, timestamp?: string): boolean => {
    if (dateStr) {
      const s = String(dateStr).trim();
      if (s.includes('T')) {
        const d = new Date(s);
        if (!isNaN(d.getTime())) return d.getDay() === 6;
      }
      const parts = s.split(/[-/]/);
      if (parts.length === 3) {
        let d: Date | null = null;
        if (parts[0].length === 4) {
          d = new Date(`${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].slice(0, 2).padStart(2, '0')}T00:00:00`);
        } else if (parts[2].length === 4) {
          d = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T00:00:00`);
        }
        if (d && !isNaN(d.getTime())) return d.getDay() === 6;
      }
    }
    if (timestamp) {
      const d = new Date(timestamp);
      if (!isNaN(d.getTime())) return d.getDay() === 6;
    }
    return false;
  };

  try {
    // 1. Student Attendance
    const { data: studentRecords } = await client
      .from('attendance')
      .select('id, tanggal, timestamp, status')
      .eq('status', 'Alpa');

    if (studentRecords && studentRecords.length > 0) {
      const idsToDelete = studentRecords
        .filter((r: any) => isSat(r.tanggal, r.timestamp))
        .map((r: any) => r.id);

      if (idsToDelete.length > 0) {
        for (let i = 0; i < idsToDelete.length; i += 200) {
          const chunk = idsToDelete.slice(i, i + 200);
          await client.from('attendance').delete().in('id', chunk);
        }
        deletedStudents = idsToDelete.length;
      }
    }

    // 2. Teacher Attendance
    const { data: teacherRecords } = await client
      .from('teacher_attendance')
      .select('id, tanggal, timestamp, status')
      .eq('status', 'Alpa');

    if (teacherRecords && teacherRecords.length > 0) {
      const idsToDelete = teacherRecords
        .filter((r: any) => isSat(r.tanggal, r.timestamp))
        .map((r: any) => r.id);

      if (idsToDelete.length > 0) {
        for (let i = 0; i < idsToDelete.length; i += 200) {
          const chunk = idsToDelete.slice(i, i + 200);
          await client.from('teacher_attendance').delete().in('id', chunk);
        }
        deletedTeachers = idsToDelete.length;
      }
    }
  } catch (error) {
    console.warn('purgeSaturdayAlpaFromSupabase warning:', error);
  }

  return { deletedStudents, deletedTeachers };
}



