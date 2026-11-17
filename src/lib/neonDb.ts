import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

if (typeof process !== 'undefined' && process.env) {
  try {
    dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
    dotenv.config({ path: path.resolve(process.cwd(), '.env') });
  } catch {
    // Ignore in browser
  }
}

let sqlInstance: postgres.Sql | null = null;

export function getNeonSql(): postgres.Sql | null {
  if (sqlInstance) return sqlInstance;

  const url = process.env.DATABASE_URL;
  if (!url) {
    return null;
  }

  sqlInstance = postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: 'require',
  });

  return sqlInstance;
}

export function isNeonConnected(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

// -----------------------------------------------------------------------------
// STUDENTS OPS
// -----------------------------------------------------------------------------
export async function getStudentsFromNeon(): Promise<any[]> {
  const sql = getNeonSql();
  if (!sql) return [];
  const rows = await sql`
    SELECT 
      id, nisn, nis, nik, nama, kelas, tempat_lahir, tanggal_lahir,
      jenis_kelamin, agama, alamat, no_hp_ortu, foto, rfid_uid, status,
      created_at as "createdAt"
    FROM students
    ORDER BY nama ASC;
  `;
  return rows;
}

export async function upsertStudentsToNeon(students: any[]): Promise<void> {
  const sql = getNeonSql();
  if (!sql || students.length === 0) return;

  for (const s of students) {
    if (!s || !s.nisn) continue;
    const id = s.id || `std_${s.nisn}`;
    await sql`
      INSERT INTO students (
        id, nisn, nis, nik, nama, kelas, tempat_lahir, tanggal_lahir,
        jenis_kelamin, agama, alamat, no_hp_ortu, foto, rfid_uid, status
      ) VALUES (
        ${id}, ${s.nisn}, ${s.nis || s.nisn}, ${s.nik || null}, ${s.nama || ''},
        ${s.kelas || ''}, ${s.tempat_lahir || s.tempatLahir || null},
        ${s.tanggal_lahir || s.tanggalLahir || null},
        ${s.jenis_kelamin || s.jenisKelamin || null},
        ${s.agama || null}, ${s.alamat || null}, ${s.no_hp_ortu || s.noHpOrtu || null},
        ${s.foto || null}, ${s.rfid_uid || s.rfidUid || null},
        ${s.status || 'aktif'}
      )
      ON CONFLICT (nisn) DO UPDATE SET
        id = EXCLUDED.id,
        nis = EXCLUDED.nis,
        nik = EXCLUDED.nik,
        nama = EXCLUDED.nama,
        kelas = EXCLUDED.kelas,
        tempat_lahir = EXCLUDED.tempat_lahir,
        tanggal_lahir = EXCLUDED.tanggal_lahir,
        jenis_kelamin = EXCLUDED.jenis_kelamin,
        agama = EXCLUDED.agama,
        alamat = EXCLUDED.alamat,
        no_hp_ortu = EXCLUDED.no_hp_ortu,
        foto = EXCLUDED.foto,
        rfid_uid = EXCLUDED.rfid_uid,
        status = EXCLUDED.status,
        updated_at = now();
    `;
  }
}

export async function deleteStudentFromNeon(id: string): Promise<void> {
  const sql = getNeonSql();
  if (!sql) return;
  await sql`DELETE FROM students WHERE id = ${id} OR nisn = ${id};`;
}

// -----------------------------------------------------------------------------
// ATTENDANCE OPS
// -----------------------------------------------------------------------------
export async function getAttendanceFromNeon(): Promise<any[]> {
  const sql = getNeonSql();
  if (!sql) return [];
  const rows = await sql`
    SELECT 
      id, student_id as "studentId", nisn, nama, kelas, tanggal, waktu,
      jenis, status, scan_method as "scanMethod", terlambat_menit as "terlambatMenit",
      manual_notes as "manualNotes", is_flagged as "isFlagged", flagged_reason as "flaggedReason",
      flagged_by as "flaggedBy", flagged_at as "flaggedAt", verified_by as "verifiedBy",
      verified_at as "verifiedAt", rfid_uid as "rfidUid", created_at as "createdAt"
    FROM attendance
    ORDER BY created_at DESC;
  `;
  return rows;
}

export async function upsertAttendanceToNeon(attendanceList: any[]): Promise<void> {
  const sql = getNeonSql();
  if (!sql || attendanceList.length === 0) return;

  for (const a of attendanceList) {
    if (!a || !a.id) continue;
    await sql`
      INSERT INTO attendance (
        id, student_id, nisn, nama, kelas, tanggal, waktu, jenis, status,
        scan_method, terlambat_menit, manual_notes, is_flagged, flagged_reason,
        flagged_by, flagged_at, verified_by, verified_at, rfid_uid
      ) VALUES (
        ${a.id}, ${a.studentId || a.student_id || null}, ${a.nisn || ''},
        ${a.nama || ''}, ${a.kelas || ''}, ${a.tanggal || ''}, ${a.waktu || ''},
        ${a.jenis || 'Masuk'}, ${a.status || 'Hadir'},
        ${a.scanMethod || a.scan_method || 'QR'},
        ${a.terlambatMenit ?? a.terlambat_menit ?? 0},
        ${a.manualNotes || a.manual_notes || null},
        ${Boolean(a.isFlagged || a.is_flagged)},
        ${a.flaggedReason || a.flagged_reason || null},
        ${a.flaggedBy || a.flagged_by || null},
        ${a.flaggedAt || a.flagged_at || null},
        ${a.verifiedBy || a.verified_by || null},
        ${a.verifiedAt || a.verified_at || null},
        ${a.rfidUid || a.rfid_uid || null}
      )
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        waktu = EXCLUDED.waktu,
        terlambat_menit = EXCLUDED.terlambat_menit,
        manual_notes = EXCLUDED.manual_notes,
        is_flagged = EXCLUDED.is_flagged,
        flagged_reason = EXCLUDED.flagged_reason,
        verified_by = EXCLUDED.verified_by,
        verified_at = EXCLUDED.verified_at;
    `;
  }
}

export async function deleteAttendanceFromNeon(id: string): Promise<void> {
  const sql = getNeonSql();
  if (!sql) return;
  await sql`DELETE FROM attendance WHERE id = ${id};`;
}

// -----------------------------------------------------------------------------
// SETTINGS OPS
// -----------------------------------------------------------------------------
export async function getSettingsFromNeon(): Promise<any | null> {
  const sql = getNeonSql();
  if (!sql) return null;
  const rows = await sql`
    SELECT settings_data FROM school_settings WHERE id = 'current';
  `;
  return rows[0]?.settings_data || null;
}

export async function saveSettingsToNeon(settings: any): Promise<void> {
  const sql = getNeonSql();
  if (!sql || !settings) return;
  await sql`
    INSERT INTO school_settings (id, settings_data)
    VALUES ('current', ${sql.json(settings)})
    ON CONFLICT (id) DO UPDATE SET
      settings_data = EXCLUDED.settings_data,
      updated_at = now();
  `;
}

// -----------------------------------------------------------------------------
// USERS OPS
// -----------------------------------------------------------------------------
export async function getUsersFromNeon(): Promise<any[]> {
  const sql = getNeonSql();
  if (!sql) return [];
  const rows = await sql`
    SELECT 
      uid, username, email, name, role, sub_role as "subRole",
      assigned_class as "assignedClass", nip, phone, password, status,
      avatar, notes, must_change_password as "mustChangePassword",
      created_at as "createdAt", updated_at as "updatedAt"
    FROM users
    ORDER BY name ASC;
  `;
  return rows;
}

export async function upsertUserToNeon(user: any): Promise<void> {
  const sql = getNeonSql();
  if (!sql || !user || !user.username) return;
  const uid = user.uid || `usr_${user.username}`;
  await sql`
    INSERT INTO users (
      uid, username, email, name, role, sub_role, assigned_class,
      nip, phone, password, status, avatar, notes, must_change_password
    ) VALUES (
      ${uid}, ${user.username}, ${user.email || null}, ${user.name || user.username},
      ${user.role || 'Guru'}, ${user.subRole || user.sub_role || null},
      ${user.assignedClass || user.assigned_class || null},
      ${user.nip || null}, ${user.phone || null}, ${user.password || null},
      ${user.status || 'aktif'}, ${user.avatar || null}, ${user.notes || null},
      ${Boolean(user.mustChangePassword || user.must_change_password)}
    )
    ON CONFLICT (username) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      role = EXCLUDED.role,
      sub_role = EXCLUDED.sub_role,
      assigned_class = EXCLUDED.assigned_class,
      nip = EXCLUDED.nip,
      phone = EXCLUDED.phone,
      password = COALESCE(EXCLUDED.password, users.password),
      status = EXCLUDED.status,
      avatar = EXCLUDED.avatar,
      notes = EXCLUDED.notes,
      must_change_password = EXCLUDED.must_change_password,
      updated_at = now();
  `;
}

// -----------------------------------------------------------------------------
// ACTIVITY LOGS OPS
// -----------------------------------------------------------------------------
export async function getLogsFromNeon(): Promise<any[]> {
  const sql = getNeonSql();
  if (!sql) return [];
  const rows = await sql`
    SELECT id, timestamp, user_name as "user", role, action, details
    FROM activity_logs
    ORDER BY timestamp DESC
    LIMIT 500;
  `;
  return rows;
}

export async function insertLogToNeon(log: any): Promise<void> {
  const sql = getNeonSql();
  if (!sql || !log) return;
  const id = log.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  await sql`
    INSERT INTO activity_logs (id, user_name, role, action, details)
    VALUES (
      ${id}, ${log.user || log.user_name || 'System'}, ${log.role || 'System'},
      ${log.action || 'ACTIVITY'}, ${log.details || ''}
    )
    ON CONFLICT (id) DO NOTHING;
  `;
}
