import dotenv from 'dotenv';
import path from 'path';
import postgres from 'postgres';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is missing in .env.local');
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });

async function runMigration() {
  console.log('🚀 Migrating NEXA15 database schema to Neon Postgres (Single Source of Truth)...');

  // 1. Students Table
  await sql`
    CREATE TABLE IF NOT EXISTS students (
      id VARCHAR(100) PRIMARY KEY,
      nisn VARCHAR(50) UNIQUE NOT NULL,
      nis VARCHAR(50),
      nik VARCHAR(50),
      nama VARCHAR(255) NOT NULL,
      kelas VARCHAR(50) NOT NULL,
      tempat_lahir VARCHAR(100),
      tanggal_lahir VARCHAR(50),
      jenis_kelamin VARCHAR(20),
      agama VARCHAR(50),
      alamat TEXT,
      no_hp_ortu VARCHAR(50),
      foto TEXT,
      rfid_uid VARCHAR(100),
      status VARCHAR(20) DEFAULT 'aktif',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `;
  console.log('✓ Table "students" created/verified.');

  // 2. Attendance Table
  await sql`
    CREATE TABLE IF NOT EXISTS attendance (
      id VARCHAR(150) PRIMARY KEY,
      student_id VARCHAR(100),
      nisn VARCHAR(50) NOT NULL,
      nama VARCHAR(255) NOT NULL,
      kelas VARCHAR(50) NOT NULL,
      tanggal VARCHAR(50) NOT NULL,
      waktu VARCHAR(50) NOT NULL,
      jenis VARCHAR(20) NOT NULL,
      status VARCHAR(50) NOT NULL,
      scan_method VARCHAR(50) DEFAULT 'QR',
      terlambat_menit INTEGER DEFAULT 0,
      manual_notes TEXT,
      is_flagged BOOLEAN DEFAULT FALSE,
      flagged_reason TEXT,
      flagged_by VARCHAR(100),
      flagged_at VARCHAR(50),
      verified_by VARCHAR(100),
      verified_at VARCHAR(50),
      rfid_uid VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `;
  console.log('✓ Table "attendance" created/verified.');

  // 3. Users Table
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      uid VARCHAR(100) PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      email VARCHAR(255),
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      sub_role VARCHAR(50),
      assigned_class VARCHAR(50),
      nip VARCHAR(50),
      phone VARCHAR(50),
      password TEXT,
      status VARCHAR(20) DEFAULT 'aktif',
      avatar TEXT,
      notes TEXT,
      must_change_password BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `;
  console.log('✓ Table "users" created/verified.');

  // 6. Activity Logs Table
  await sql`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id VARCHAR(100) PRIMARY KEY,
      timestamp TIMESTAMPTZ DEFAULT now(),
      user_name VARCHAR(100),
      role VARCHAR(50),
      action VARCHAR(100),
      details TEXT
    );
  `;
  console.log('✓ Table "activity_logs" created/verified.');

  // 7. Settings Table (JSONB format to flexibly store all SchoolSettings)
  await sql`
    CREATE TABLE IF NOT EXISTS school_settings (
      id VARCHAR(50) PRIMARY KEY DEFAULT 'current',
      settings_data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `;
  console.log('✓ Table "school_settings" created/verified.');

  // 8. Dispatches Table
  await sql`
    CREATE TABLE IF NOT EXISTS dispatches (
      id VARCHAR(100) PRIMARY KEY,
      student_id VARCHAR(100),
      student_name VARCHAR(255),
      nisn VARCHAR(50),
      kelas VARCHAR(50),
      wali_kelas_name VARCHAR(255),
      wali_kelas_phone VARCHAR(50),
      risk_level VARCHAR(50),
      alpa_count INTEGER DEFAULT 0,
      terlambat_count INTEGER DEFAULT 0,
      sakit_count INTEGER DEFAULT 0,
      izin_count INTEGER DEFAULT 0,
      attendance_rate NUMERIC DEFAULT 0,
      dispatched_at TIMESTAMPTZ DEFAULT now()
    );
  `;
  console.log('✓ Table "dispatches" created/verified.');

  // Create helpful indexes for fast lookup
  await sql`CREATE INDEX IF NOT EXISTS idx_attendance_tanggal ON attendance(tanggal);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_attendance_nisn ON attendance(nisn);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_students_kelas ON students(kelas);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_teacher_attendance_tanggal ON teacher_attendance(tanggal);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`;

  console.log('\n🎉 ALL TABLES SUCCESSFULLY CREATED IN NEON POSTGRES!');
  await sql.end();
  process.exit(0);
}

runMigration().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
