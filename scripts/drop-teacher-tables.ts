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

async function dropTeacherTables() {
  console.log('🗑️ Dropping teacher tables from Neon Postgres...');
  try {
    await sql`DROP TABLE IF EXISTS teacher_attendance CASCADE;`;
    console.log('✓ Dropped table "teacher_attendance" (if existed)');

    await sql`DROP TABLE IF EXISTS teachers CASCADE;`;
    console.log('✓ Dropped table "teachers" (if existed)');

    console.log('✅ Teacher tables successfully dropped from Neon Postgres.');
  } catch (error) {
    console.error('Error dropping teacher tables:', error);
  } finally {
    await sql.end();
  }
}

dropTeacherTables();
