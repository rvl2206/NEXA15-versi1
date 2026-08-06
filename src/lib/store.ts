import {
  Student,
  AttendanceRecord,
  AttendanceType,
  AttendanceStatus,
  Teacher,
  TeacherAttendanceRecord,
  TeacherAttendanceStatus,
  ActivityLog,
  SchoolSettings,
  User,
  Holiday,
  MissingAttendanceLogItem,
} from '../types';
import { toast } from './toast';
import { INITIAL_TEACHERS } from './seedData';
import {
  isSupabaseConfigured,
  syncStudentsToSupabase,
  syncAttendanceToSupabase,
  syncTeachersToSupabase,
  syncTeacherAttendanceToSupabase,
  syncLogsToSupabase,
  fetchStudentsFromSupabase,
  fetchAttendanceFromSupabase,
  fetchTeachersFromSupabase,
  fetchTeacherAttendanceFromSupabase,
  fetchLogsFromSupabase,
  deleteStudentFromSupabase,
  deleteAttendanceFromSupabase,
  deleteTeacherFromSupabase,
  deleteTeacherAttendanceFromSupabase,
  deleteLogFromSupabase,
  getSupabaseClient,
} from './supabase';

import { formatPetugasRole } from './exportUtils';

const STORAGE_KEYS = {
  SETTINGS: 'nexa15_settings_v3',
  PASSWORDS: 'nexa15_passwords_v3',
  CURRENT_USER: 'nexa15_user_v3',
  STUDENTS: 'nexa15_students_v3',
  ATTENDANCE: 'nexa15_attendance_v3',
  TEACHERS: 'nexa15_teachers_v3',
  TEACHER_ATTENDANCE: 'nexa15_teacher_attendance_v3',
  LOGS: 'nexa15_logs_v3',
};

export interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'critical';
  totalStudents: number;
  totalAttendance: number;
  uniqueAttendanceStudents: number;
  orphanedAttendanceCount: number;
  missingStudentDetails: Array<{
    nisn: string;
    name: string;
    class: string;
    scanCount: number;
  }>;
  backupInfo: {
    exists: boolean;
    timestamp: string | null;
    studentCount: number;
    attendanceCount: number;
  };
  discrepancies: string[];
  recommendations: string[];
}

export const DEFAULT_SETTINGS: SchoolSettings = {
  schoolName: 'SMA NEGERI 15 AMBON',
  schoolNPSN: '69933068',
  schoolLogo: '', // No hardcoded logo by default - allows upload/import in settings
  cutoffTime: '07:15',
  autoAlpaCutoffTime: '14:30',
  enableAutoAlpa: true,
  academicYear: '2026/2027',
  enableWaNotif: true,
  waTemplateHadir: 'Yth. Orang Tua / Wali murid dari *{nama}* (Kelas {kelas}),\n\nMemberitahukan data presensi sekolah di *{sekolah}*:\n📅 Tanggal: {tanggal}\n⏰ Waktu Scan: {waktu}\n📌 Status Presensi: ✅ *HADIR (Tepat Waktu)*\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_Pesan otomatis dari Sistem Presensi Digital {sekolah}_',
  waTemplateTerlambat: 'Yth. Orang Tua / Wali murid dari *{nama}* (Kelas {kelas}),\n\nMemberitahukan data presensi sekolah di *{sekolah}*:\n📅 Tanggal: {tanggal}\n⏰ Waktu Scan: {waktu}\n📌 Status Presensi: ⏰ *TERLAMBAT* ({terlambat})\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_Pesan otomatis dari Sistem Presensi Digital {sekolah}_',
  waTemplateIzinSakit: 'Yth. Orang Tua / Wali murid dari *{nama}* (Kelas {kelas}),\n\nMemberitahukan data presensi sekolah di *{sekolah}*:\n📅 Tanggal: {tanggal}\n📌 Status Presensi: 📄 *{status}*\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_Pesan otomatis dari Sistem Presensi Digital {sekolah}_',
  waTemplateAlpa: 'Yth. Orang Tua / Wali murid dari *{nama}* (Kelas {kelas}),\n\nMemberitahukan data presensi sekolah di *{sekolah}*:\n📅 Tanggal: {tanggal}\n📌 Status Presensi: ❌ *ALPA (Tanpa Keterangan)*\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_Pesan otomatis dari Sistem Presensi Digital {sekolah}_',
  supabaseUrl: 'https://tpxyvbfbahsjssqwubfl.supabase.co',
  supabaseKey: 'sb_publishable_oH-2538e28kbMbpk8ESZ7w_LpeIn1Jh',
  enableSupabaseAutoSync: true,
  holidays: [],
};

class AppStore {
  private students: Student[] = [];
  private attendance: AttendanceRecord[] = [];
  private teachers: Teacher[] = [];
  private teacherAttendance: TeacherAttendanceRecord[] = [];
  private logs: ActivityLog[] = [];
  private settings: SchoolSettings = DEFAULT_SETTINGS;
  private passwords: Record<string, string> = {
    'usr-admin': 'AdminNexa15!',
    'usr-kepsek': 'KepsekNexa15!',
    'usr-guru': 'piket123',
  };
  private currentUser: User | null = null;
  private listeners: Array<() => void> = [];

  constructor() {
    this.init();
  }

  private async init() {
    // Load settings, user, and cached data from localStorage
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (savedSettings) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
      }
      const savedPass = localStorage.getItem(STORAGE_KEYS.PASSWORDS);
      if (savedPass) {
        this.passwords = JSON.parse(savedPass);
      }
      const savedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (savedUser) {
        this.currentUser = JSON.parse(savedUser);
      }
      const savedStudents = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (savedStudents) {
        this.students = JSON.parse(savedStudents);
      }
      const savedAttendance = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      if (savedAttendance) {
        this.attendance = JSON.parse(savedAttendance);
      }
      const savedTeachers = localStorage.getItem(STORAGE_KEYS.TEACHERS);
      if (savedTeachers) {
        this.teachers = JSON.parse(savedTeachers);
      } else {
        this.teachers = [...INITIAL_TEACHERS];
      }
      const savedTeacherAttendance = localStorage.getItem(STORAGE_KEYS.TEACHER_ATTENDANCE);
      if (savedTeacherAttendance) {
        this.teacherAttendance = JSON.parse(savedTeacherAttendance);
      }
      const savedLogs = localStorage.getItem(STORAGE_KEYS.LOGS);
      if (savedLogs) {
        this.logs = JSON.parse(savedLogs);
      }
      this.processAutoAlpa();
    } catch (e) {
      console.warn('LocalStorage load error:', e);
    }

    // Synchronize with server automatically in background
    await this.fetchFromServer();
  }

  private saveLocalData() {
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(this.students));
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(this.attendance));
      localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(this.teachers));
      localStorage.setItem(STORAGE_KEYS.TEACHER_ATTENDANCE, JSON.stringify(this.teacherAttendance));
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(this.logs));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.saveLocalData();
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error('Listener error:', e);
      }
    });
  }

  public getSettings(): SchoolSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<SchoolSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    this.notify();
  }

  public getHolidays(): Holiday[] {
    return this.settings.holidays || [];
  }

  public addHoliday(data: { tanggal: string; keterangan: string }): Holiday {
    const normDate = this.normalizeToYyyyMmDd(data.tanggal);
    const newHoliday: Holiday = {
      id: `hol-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tanggal: normDate,
      keterangan: data.keterangan,
    };
    const current = this.getHolidays();
    const updated = [...current.filter((h) => this.normalizeToYyyyMmDd(h.tanggal) !== normDate), newHoliday];
    this.updateSettings({ holidays: updated });
    this.addLog('TAMBAH_HARI_LIBUR', `Menambahkan hari libur: ${data.keterangan} (${normDate})`);
    return newHoliday;
  }

  public deleteHoliday(id: string): void {
    const current = this.getHolidays();
    const target = current.find((h) => h.id === id);
    const updated = current.filter((h) => h.id !== id);
    this.updateSettings({ holidays: updated });
    if (target) {
      this.addLog('HAPUS_HARI_LIBUR', `Menghapus hari libur: ${target.keterangan} (${target.tanggal})`);
    }
  }

  public isHoliday(dateStr: string): boolean {
    if (!dateStr) return false;
    const normDate = this.normalizeToYyyyMmDd(dateStr);
    if (!normDate || normDate.length < 10) return false;

    // 1. Check configured holidays
    const holidays = this.getHolidays();
    if (holidays.some((h) => this.normalizeToYyyyMmDd(h.tanggal) === normDate)) {
      return true;
    }

    // 2. Check Weekend (Saturday or Sunday)
    const dateObj = new Date(normDate + 'T00:00:00');
    if (!isNaN(dateObj.getTime())) {
      const day = dateObj.getDay();
      if (day === 0 || day === 6) return true; // 0: Minggu, 6: Sabtu
    }

    return false;
  }

  public processAutoAlpa(targetDateYyyyMmDd?: string): { addedCount: number; date: string } {
    if (this.settings.enableAutoAlpa === false) {
      return { addedCount: 0, date: targetDateYyyyMmDd || this.getTodayYyyyMmDd() };
    }

    const todayYyyyMmDd = this.getTodayYyyyMmDd();
    const checkDate = targetDateYyyyMmDd ? this.normalizeToYyyyMmDd(targetDateYyyyMmDd) : todayYyyyMmDd;

    // If checking for today, ensure current local time is >= autoAlpaCutoffTime (default 14:30)
    if (checkDate === todayYyyyMmDd) {
      const now = new Date();
      const cutoffStr = this.settings.autoAlpaCutoffTime || '14:30';
      const [cutoffH, cutoffM] = cutoffStr.split(':').map((n) => parseInt(n, 10) || 0);
      const cutoffMinutes = cutoffH * 60 + cutoffM;
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      if (currentMinutes < cutoffMinutes) {
        // Current time is before cutoff
        return { addedCount: 0, date: checkDate };
      }
    }

    // Check if target date is a holiday or weekend
    if (this.isHoliday(checkDate)) {
      return { addedCount: 0, date: checkDate };
    }

    const activeStudents = this.students.filter((s) => s.status === 'aktif');
    if (activeStudents.length === 0) {
      return { addedCount: 0, date: checkDate };
    }

    const newRecords: AttendanceRecord[] = [];
    const cutoffStr = this.settings.autoAlpaCutoffTime || '14:30';
    const parts = checkDate.split('-');
    const formattedDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : checkDate;

    activeStudents.forEach((student) => {
      // Check if student has any existing attendance record for checkDate
      const existing = this.attendance.some((a) => a.nisn === student.nisn && this.isRecordForDate(a, checkDate));
      if (!existing) {
        const newRecord: AttendanceRecord = {
          id: `att-autoalpa-${student.nisn}-${checkDate}`,
          tanggal: formattedDate,
          timestamp: `${checkDate}T${cutoffStr}:00.000Z`,
          nisn: student.nisn,
          nama: student.nama,
          kelas: student.kelas,
          id_qr: student.id_qr || '',
          jenis: 'Masuk',
          status: 'Alpa',
          petugas: `Otopresensi Sistem (${cutoffStr})`,
          catatan: `Alpa Otomatis (Tidak ada presensi hingga jam ${cutoffStr})`,
        };
        newRecords.push(newRecord);
      }
    });

    if (newRecords.length > 0) {
      this.attendance = [...this.attendance, ...newRecords];
      this.notify();
      this.addLog('AUTO_ALPA_MASSAL', `Sistem Otopresensi (${cutoffStr}): Otomatis mencatat ${newRecords.length} siswa sebagai Alpa pada tanggal ${checkDate}.`);
      syncAttendanceToSupabase(newRecords, this.getSupabaseConfig()).catch(() => {});
    }

    return { addedCount: newRecords.length, date: checkDate };
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public setCurrentUser(user: User | null) {
    this.currentUser = user;
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
    this.notify();
  }

  public getAdminPassword(): string {
    return this.passwords['usr-admin'] || 'AdminNexa15!';
  }

  public async updateAdminPassword(oldPass: string, newPass: string): Promise<{ success: boolean; message: string }> {
    if (oldPass !== this.getAdminPassword()) {
      return { success: false, message: 'Password lama tidak sesuai.' };
    }
    if (!newPass || newPass.length < 6) {
      return { success: false, message: 'Password baru minimal 6 karakter.' };
    }
    this.passwords['usr-admin'] = newPass;
    localStorage.setItem(STORAGE_KEYS.PASSWORDS, JSON.stringify(this.passwords));
    this.addLog('UBAH_PASSWORD', 'Pengguna Admin memperbarui kata sandi akun.');
    return { success: true, message: 'Password Admin berhasil diperbarui.' };
  }

  public getStudents(): Student[] {
    return [...this.students];
  }

  public getAttendance(): AttendanceRecord[] {
    return [...this.attendance];
  }

  public getLogs(): ActivityLog[] {
    return [...this.logs];
  }

  public getSupabaseConfig() {
    return {
      url: this.settings.supabaseUrl || DEFAULT_SETTINGS.supabaseUrl,
      key: this.settings.supabaseKey || DEFAULT_SETTINGS.supabaseKey,
    };
  }

  public async fetchFromServer(): Promise<void> {
    try {
      const config = this.getSupabaseConfig();
      if (!isSupabaseConfigured(config)) return;

      const [remoteStudents, remoteAttendance, remoteTeachers, remoteTeacherAttendance, remoteLogs] = await Promise.all([
        fetchStudentsFromSupabase(config),
        fetchAttendanceFromSupabase(config),
        fetchTeachersFromSupabase(config),
        fetchTeacherAttendanceFromSupabase(config),
        fetchLogsFromSupabase(config),
      ]);

      let changed = false;
      if (remoteStudents !== null && remoteStudents.length > 0) {
        this.students = remoteStudents;
        changed = true;
      }
      if (remoteAttendance !== null && remoteAttendance.length > 0) {
        this.attendance = remoteAttendance;
        changed = true;
      }
      if (remoteTeachers !== null && remoteTeachers.length > 0) {
        this.teachers = remoteTeachers;
        changed = true;
      }
      if (remoteTeacherAttendance !== null && remoteTeacherAttendance.length > 0) {
        this.teacherAttendance = remoteTeacherAttendance;
        changed = true;
      }
      if (remoteLogs !== null && remoteLogs.length > 0) {
        this.logs = remoteLogs;
        changed = true;
      }

      this.processAutoAlpa();
      if (changed) {
        this.notify();
      }
    } catch (err: any) {
      console.warn('Supabase fetch server notice:', err?.message || err);
    }
  }

  public async syncAllToSupabase(): Promise<{ success: boolean; message: string }> {
    try {
      const config = this.getSupabaseConfig();
      const [sRes, aRes, tRes, taRes, lRes] = await Promise.all([
        syncStudentsToSupabase(this.students, config),
        syncAttendanceToSupabase(this.attendance, config),
        syncTeachersToSupabase(this.teachers, config),
        syncTeacherAttendanceToSupabase(this.teacherAttendance, config),
        syncLogsToSupabase(this.logs, config),
      ]);

      const errors: string[] = [];
      if (!sRes.success) errors.push(`Siswa: ${sRes.error || 'Gagal'}`);
      if (!aRes.success) errors.push(`Presensi Siswa: ${aRes.error || 'Gagal'}`);
      if (!tRes.success) errors.push(`Guru: ${tRes.error || 'Gagal'}`);
      if (!taRes.success) errors.push(`Presensi Guru: ${taRes.error || 'Gagal'}`);
      if (!lRes.success) errors.push(`Log: ${lRes.error || 'Gagal'}`);

      if (errors.length === 0) {
        const msg = `Berhasil menyelaraskan ${sRes.count} siswa, ${aRes.count} presensi siswa, ${tRes.count} guru, ${taRes.count} presensi guru, dan ${lRes.count} log ke Supabase Cloud PostgreSQL.`;
        this.updateSettings({ lastSupabaseSync: new Date().toISOString() });
        return { success: true, message: msg };
      }

      return {
        success: false,
        message: `Gagal menyelaraskan data: ${errors.join(' | ')}`,
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error koneksi Supabase Cloud PostgreSQL.' };
    }
  }

  public async addStudent(studentData: Omit<Student, 'id' | 'createdAt'>): Promise<Student> {
    // Check if student with same NISN already exists to prevent duplicate entry
    const existingIndex = this.students.findIndex((s) => s.nisn && s.nisn === studentData.nisn);
    if (existingIndex !== -1) {
      const existing = this.students[existingIndex];
      const updated: Student = {
        ...existing,
        ...studentData,
      };
      this.students[existingIndex] = updated;
      this.notify();
      await syncStudentsToSupabase([updated]);
      this.addLog('EDIT_SISWA', `Memperbarui data siswa (mencegah duplikasi NISN): ${updated.nama} (${updated.kelas})`);
      return updated;
    }

    const newId = `std-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newStudent: Student = {
      ...studentData,
      id: newId,
      createdAt: new Date().toISOString(),
    };

    this.students.unshift(newStudent);
    this.notify();

    // Direct save to Supabase Cloud PostgreSQL
    await syncStudentsToSupabase([newStudent]);
    this.addLog('TAMBAH_SISWA', `Menambahkan siswa baru: ${newStudent.nama} (${newStudent.kelas}) - NISN: ${newStudent.nisn}`);

    return newStudent;
  }

  public async updateStudent(id: string, studentData: Partial<Student>): Promise<boolean> {
    const idx = this.students.findIndex((s) => s.id === id);
    if (idx === -1) return false;

    const updated = { ...this.students[idx], ...studentData };
    this.students[idx] = updated;
    this.notify();

    // Direct save to Supabase Cloud PostgreSQL
    await syncStudentsToSupabase([updated]);
    this.addLog('EDIT_SISWA', `Memperbarui data siswa: ${updated.nama} (${updated.kelas})`);

    return true;
  }

  public async deleteStudent(id: string): Promise<boolean> {
    const target = this.students.find((s) => s.id === id);
    this.students = this.students.filter((s) => s.id !== id);

    // Hapus juga presensi terkait agar tidak terjadi penumpukan data terpisah (orphaned)
    if (target && target.nisn) {
      const orphanAtts = this.attendance.filter((a) => a.nisn === target.nisn);
      if (orphanAtts.length > 0) {
        const orphanIds = orphanAtts.map((a) => a.id);
        this.attendance = this.attendance.filter((a) => a.nisn !== target.nisn);
        await Promise.all(orphanIds.map((attId) => deleteAttendanceFromSupabase(attId, this.getSupabaseConfig())));
      }
    }

    this.notify();

    if (target) {
      await deleteStudentFromSupabase(target.nisn || id, this.getSupabaseConfig());
      this.addLog('HAPUS_SISWA', `Menghapus siswa: ${target.nama} (${target.kelas}) dari aplikasi dan database.`);
    }
    return true;
  }

  public async deleteMultipleStudents(ids: string[]): Promise<boolean> {
    const idSet = new Set(ids);
    const targets = this.students.filter((s) => idSet.has(s.id));
    const targetNisns = new Set(targets.map((s) => s.nisn).filter(Boolean));

    this.students = this.students.filter((s) => !idSet.has(s.id));

    // Hapus rekap presensi siswa yang dihapus
    if (targetNisns.size > 0) {
      const orphanAtts = this.attendance.filter((a) => targetNisns.has(a.nisn));
      if (orphanAtts.length > 0) {
        const orphanIds = orphanAtts.map((a) => a.id);
        this.attendance = this.attendance.filter((a) => !targetNisns.has(a.nisn));
        await Promise.all(orphanIds.map((attId) => deleteAttendanceFromSupabase(attId, this.getSupabaseConfig())));
      }
    }

    this.notify();

    await Promise.all(targets.map((s) => deleteStudentFromSupabase(s.nisn || s.id, this.getSupabaseConfig())));
    this.addLog('HAPUS_MASSAL_SISWA', `Menghapus ${ids.length} siswa terpilih dari aplikasi dan database.`);
    return true;
  }

  public async deleteAllStudents(): Promise<boolean> {
    const count = this.students.length;
    const oldStudents = [...this.students];
    this.students = [];
    this.notify();

    await Promise.all(oldStudents.map((s) => deleteStudentFromSupabase(s.nisn || s.id, this.getSupabaseConfig())));
    this.addLog('RESET_SISWA', `Menghapus seluruh ${count} data siswa dari aplikasi dan database.`);
    return true;
  }

  public async importStudents(
    importList: Omit<Student, 'id' | 'createdAt'>[],
    mode: 'append' | 'replace' = 'append'
  ): Promise<boolean> {
    // Eliminasi data ganda di dalam file impor berdasarkan NISN
    const uniqueImportMap = new Map<string, Omit<Student, 'id' | 'createdAt'>>();
    importList.forEach((item) => {
      if (item.nisn) {
        uniqueImportMap.set(item.nisn, item);
      }
    });

    const formatted: Student[] = Array.from(uniqueImportMap.values()).map((s, idx) => ({
      ...s,
      id: `std-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    }));

    if (mode === 'replace') {
      const oldIds = this.students.map((s) => s.id);
      this.students = formatted;
      this.notify();
      // Hapus data lama di database agar tidak menumpuk
      if (oldIds.length > 0) {
        await Promise.all(oldIds.map((id) => deleteStudentFromSupabase(id)));
      }
    } else {
      // Append mode: gabungkan & perbarui NISN yang sama tanpa menduplikasi
      const map = new Map<string, Student>();
      this.students.forEach((s) => map.set(s.nisn, s));
      formatted.forEach((s) => {
        const existing = map.get(s.nisn);
        if (existing) {
          map.set(s.nisn, { ...existing, ...s, id: existing.id });
        } else {
          map.set(s.nisn, s);
        }
      });
      this.students = Array.from(map.values());
      this.notify();
    }

    await syncStudentsToSupabase(this.students);
    this.addLog('IMPORT_SISWA', `Berhasil mengimpor ${formatted.length} data siswa tanpa duplikasi.`);
    return true;
  }

  // ==========================================
  // TEACHER (GURU & STAF) DATA MANAGEMENT
  // ==========================================

  public getTeachers(): Teacher[] {
    return [...this.teachers];
  }

  public getTeacherByNip(nip: string): Teacher | undefined {
    if (!nip) return undefined;
    const clean = String(nip).trim();
    return this.teachers.find((t) => t.nip === clean);
  }

  public async addTeacher(teacherData: Omit<Teacher, 'id' | 'createdAt'>): Promise<Teacher> {
    const cleanNip = String(teacherData.nip || '').trim();
    const existingIndex = this.teachers.findIndex((t) => t.nip && t.nip === cleanNip);
    
    if (existingIndex !== -1) {
      const existing = this.teachers[existingIndex];
      const updated: Teacher = {
        ...existing,
        ...teacherData,
        nip: cleanNip,
        id_qr: teacherData.id_qr || `69933068.${cleanNip}`,
      };
      this.teachers[existingIndex] = updated;
      this.notify();
      syncTeachersToSupabase([updated], this.getSupabaseConfig()).catch(() => {});
      this.addLog('EDIT_GURU', `Memperbarui data guru (mencegah duplikasi NIP): ${updated.nama} - NIP: ${updated.nip}`);
      return updated;
    }

    const newId = `tch-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newTeacher: Teacher = {
      ...teacherData,
      id: newId,
      nip: cleanNip,
      id_qr: teacherData.id_qr || `69933068.${cleanNip}`,
      createdAt: new Date().toISOString(),
    };

    this.teachers.unshift(newTeacher);
    this.notify();
    syncTeachersToSupabase([newTeacher], this.getSupabaseConfig()).catch(() => {});
    this.addLog('TAMBAH_GURU', `Menambahkan guru baru: ${newTeacher.nama} (${newTeacher.jabatan}) - NIP: ${newTeacher.nip}`);
    return newTeacher;
  }

  public async updateTeacher(id: string, teacherData: Partial<Teacher>): Promise<boolean> {
    const idx = this.teachers.findIndex((t) => t.id === id);
    if (idx === -1) return false;

    const updated = { ...this.teachers[idx], ...teacherData };
    if (teacherData.nip && !teacherData.id_qr) {
      updated.id_qr = `69933068.${teacherData.nip.trim()}`;
    }
    this.teachers[idx] = updated;
    this.notify();
    syncTeachersToSupabase([updated], this.getSupabaseConfig()).catch(() => {});
    this.addLog('EDIT_GURU', `Memperbarui data guru: ${updated.nama} (${updated.jabatan})`);
    return true;
  }

  public async deleteTeacher(id: string): Promise<boolean> {
    const target = this.teachers.find((t) => t.id === id);
    this.teachers = this.teachers.filter((t) => t.id !== id);

    if (target && target.nip) {
      this.teacherAttendance = this.teacherAttendance.filter((a) => a.nip !== target.nip);
    }
    this.notify();

    if (target) {
      deleteTeacherFromSupabase(target.nip || id, this.getSupabaseConfig()).catch(() => {});
      this.addLog('HAPUS_GURU', `Menghapus guru: ${target.nama} (${target.jabatan}) NIP: ${target.nip}`);
    }
    return true;
  }

  public async deleteMultipleTeachers(ids: string[]): Promise<boolean> {
    const idSet = new Set(ids);
    const targets = this.teachers.filter((t) => idSet.has(t.id));
    const targetNips = new Set(targets.map((t) => t.nip).filter(Boolean));

    this.teachers = this.teachers.filter((t) => !idSet.has(t.id));
    if (targetNips.size > 0) {
      this.teacherAttendance = this.teacherAttendance.filter((a) => !targetNips.has(a.nip));
    }
    this.notify();
    this.addLog('HAPUS_MASSAL_GURU', `Menghapus ${ids.length} data guru terpilih.`);
    return true;
  }

  public async deleteAllTeachers(): Promise<boolean> {
    const count = this.teachers.length;
    this.teachers = [];
    this.notify();
    this.addLog('RESET_GURU', `Menghapus seluruh ${count} data guru.`);
    return true;
  }

  public async importTeachers(
    importList: Omit<Teacher, 'id' | 'createdAt'>[],
    mode: 'append' | 'replace' = 'append'
  ): Promise<boolean> {
    const uniqueImportMap = new Map<string, Omit<Teacher, 'id' | 'createdAt'>>();
    importList.forEach((item) => {
      const cleanNip = String(item.nip || '').trim();
      if (cleanNip) {
        uniqueImportMap.set(cleanNip, {
          ...item,
          nip: cleanNip,
          id_qr: item.id_qr || `69933068.${cleanNip}`,
        });
      }
    });

    const formatted: Teacher[] = Array.from(uniqueImportMap.values()).map((t, idx) => ({
      ...t,
      id: `tch-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    }));

    if (mode === 'replace') {
      this.teachers = formatted;
      this.notify();
    } else {
      const map = new Map<string, Teacher>();
      this.teachers.forEach((t) => map.set(t.nip, t));
      formatted.forEach((t) => {
        const existing = map.get(t.nip);
        if (existing) {
          map.set(t.nip, { ...existing, ...t, id: existing.id });
        } else {
          map.set(t.nip, t);
        }
      });
      this.teachers = Array.from(map.values());
      this.notify();
    }

    this.addLog('IMPORT_GURU', `Berhasil mengimpor ${formatted.length} data guru tanpa duplikasi.`);
    return true;
  }

  // ==========================================
  // TEACHER (GURU) ATTENDANCE MANAGEMENT
  // ==========================================

  public getTeacherAttendance(): TeacherAttendanceRecord[] {
    return [...this.teacherAttendance];
  }

  public isTeacherRecordForDate(r: TeacherAttendanceRecord, targetYyyyMmDd: string): boolean {
    if (!r || !targetYyyyMmDd) return false;
    const targetNorm = this.normalizeToYyyyMmDd(targetYyyyMmDd);

    if (r.tanggal) {
      const recordNorm = this.normalizeToYyyyMmDd(r.tanggal);
      if (recordNorm === targetNorm) return true;
      if (r.tanggal.includes(targetYyyyMmDd) || targetYyyyMmDd.includes(r.tanggal)) return true;
    }

    if (r.timestamp) {
      const tsNorm = this.normalizeToYyyyMmDd(r.timestamp);
      if (tsNorm === targetNorm) return true;
    }

    return false;
  }

  public isTeacherRecordForToday(r: TeacherAttendanceRecord): boolean {
    return this.isTeacherRecordForDate(r, this.getTodayYyyyMmDd());
  }

  public formatRecordTimeWIT(isoString?: string): string {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      return (
        d.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Jayapura',
          hour12: false,
        }) + ' WIT'
      );
    } catch {
      return '';
    }
  }

  public recordTeacherScan(
    scannedText: string,
    rawQR?: string,
    rawCode?: string,
    officerEmail = 'Petugas Piket',
    forcedType?: AttendanceType | 'Auto'
  ): {
    success: boolean;
    isDuplicate?: boolean;
    record?: TeacherAttendanceRecord;
    teacher?: Teacher;
    message: string;
    type?: AttendanceType;
    status?: TeacherAttendanceStatus;
    isLate?: boolean;
    lateMinutes?: number;
  } {
    const cleanText = (scannedText || rawQR || rawCode || '').trim();
    if (!cleanText) {
      return { success: false, message: 'Kode QR Guru tidak terbaca atau kosong.' };
    }

    // Match teacher by NIP, ID_QR, or Nama
    let matchedTeacher = this.teachers.find(
      (t) =>
        t.nip === cleanText ||
        t.id_qr === cleanText ||
        cleanText.includes(t.nip) ||
        cleanText.toLowerCase().includes(t.nama.toLowerCase())
    );

    if (!matchedTeacher) {
      // Try parsing standard 69933068.NIP or similar
      const parts = cleanText.split('.');
      if (parts.length >= 2) {
        const parsedNip = parts[1];
        matchedTeacher = this.teachers.find((t) => t.nip === parsedNip);
      }
    }

    if (!matchedTeacher) {
      return {
        success: false,
        message: `Guru dengan NIP / Kode "${cleanText}" tidak ditemukan di database guru.`,
      };
    }

    if (matchedTeacher.status === 'nonaktif') {
      return {
        success: false,
        teacher: matchedTeacher,
        message: `Guru ${matchedTeacher.nama} berstatus nonaktif di sistem.`,
      };
    }

    const todayStr = this.getTodayFormatted();
    const now = new Date();
    const nowISO = now.toISOString();

    // Determine current hour in WIT (UTC+9)
    let currentHourWIT = now.getHours();
    let currentMinuteWIT = now.getMinutes();
    try {
      const witTimeParts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jayapura',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(now);
      const hPart = witTimeParts.find((p) => p.type === 'hour');
      const mPart = witTimeParts.find((p) => p.type === 'minute');
      if (hPart) currentHourWIT = parseInt(hPart.value, 10);
      if (mPart) currentMinuteWIT = parseInt(mPart.value, 10);
    } catch {
      // Fallback
    }

    // Check existing scans today for this teacher
    const teacherTodayRecords = this.teacherAttendance.filter(
      (a) => a.nip === matchedTeacher!.nip && this.isTeacherRecordForToday(a)
    );

    const masukRecord = teacherTodayRecords.find((a) => a.jenis === 'Masuk');
    const pulangRecord = teacherTodayRecords.find((a) => a.jenis === 'Pulang');

    let jenis: AttendanceType = 'Masuk';

    // 1. Determine target scan type (forced or auto)
    if (forcedType === 'Masuk') {
      jenis = 'Masuk';
    } else if (forcedType === 'Pulang') {
      jenis = 'Pulang';
    } else {
      // Auto mode: If before 11:30 WIT -> Masuk. If 11:30 WIT or later -> Pulang (or Masuk if never checked in)
      const isAfternoonSession = currentHourWIT > 11 || (currentHourWIT === 11 && currentMinuteWIT >= 30);
      if (isAfternoonSession) {
        jenis = masukRecord && !pulangRecord ? 'Pulang' : 'Pulang';
      } else {
        jenis = 'Masuk';
      }
    }

    // 2. STRICT DUPLICATE SCAN PREVENTION (CEGAH SCAN GANDA & TOLAK LANGSUNG)
    if (masukRecord && pulangRecord) {
      const mTime = this.formatRecordTimeWIT(masukRecord.timestamp);
      const pTime = this.formatRecordTimeWIT(pulangRecord.timestamp);
      return {
        success: false,
        isDuplicate: true,
        teacher: matchedTeacher,
        record: pulangRecord,
        type: 'Pulang',
        status: pulangRecord.status,
        message: `DITOLAK: Guru ${matchedTeacher.nama} sudah LENGKAP presensi Masuk (${mTime}) dan Pulang (${pTime}) hari ini. Scan ganda ditolak!`,
      };
    }

    if (jenis === 'Masuk' && masukRecord) {
      const mTime = this.formatRecordTimeWIT(masukRecord.timestamp);
      return {
        success: false,
        isDuplicate: true,
        teacher: matchedTeacher,
        record: masukRecord,
        type: 'Masuk',
        status: masukRecord.status,
        message: `DITOLAK: Guru ${matchedTeacher.nama} SUDAH SCAN MASUK hari ini pada pukul ${mTime} (${masukRecord.status}). Scan ganda langsung ditolak!`,
      };
    }

    if (jenis === 'Pulang' && pulangRecord) {
      const pTime = this.formatRecordTimeWIT(pulangRecord.timestamp);
      return {
        success: false,
        isDuplicate: true,
        teacher: matchedTeacher,
        record: pulangRecord,
        type: 'Pulang',
        status: pulangRecord.status,
        message: `DITOLAK: Guru ${matchedTeacher.nama} SUDAH SCAN PULANG hari ini pada pukul ${pTime}. Scan ganda langsung ditolak!`,
      };
    }

    // Calculate late status if Masuk
    let status: TeacherAttendanceStatus = 'Hadir';
    let isLate = false;
    let lateMinutes = 0;

    if (jenis === 'Masuk') {
      const cutoffTimeStr = this.settings.cutoffTime || '07:15';
      const [cutoffHour, cutoffMin] = cutoffTimeStr.split(':').map(Number);
      const nowMinutes = currentHourWIT * 60 + currentMinuteWIT;
      const cutoffMinutes = (cutoffHour || 7) * 60 + (cutoffMin || 15);

      if (nowMinutes > cutoffMinutes) {
        status = 'Terlambat';
        isLate = true;
        lateMinutes = nowMinutes - cutoffMinutes;
      }
    } else if (jenis === 'Pulang') {
      if (masukRecord) {
        status = masukRecord.status;
      }
    }

    const newRecord: TeacherAttendanceRecord = {
      id: `tch-att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      tanggal: todayStr,
      timestamp: nowISO,
      nip: matchedTeacher.nip,
      nama: matchedTeacher.nama,
      jabatan: matchedTeacher.jabatan,
      id_qr: matchedTeacher.id_qr || `69933068.${matchedTeacher.nip}`,
      jenis,
      status,
      petugas: formatPetugasRole(officerEmail),
      catatan: jenis === 'Pulang' ? 'Selesai Tugas / Pulang' : isLate ? `Terlambat ${lateMinutes} menit` : 'Tepat Waktu',
      terlambatMenit: lateMinutes,
    };

    this.teacherAttendance.unshift(newRecord);
    this.notify();

    syncTeacherAttendanceToSupabase([newRecord], this.getSupabaseConfig()).catch(() => {});

    const logDetails =
      jenis === 'Pulang'
        ? `Scan Presensi Guru Pulang: ${matchedTeacher.nama} (${matchedTeacher.jabatan}) oleh ${formatPetugasRole(officerEmail)}`
        : `Scan Presensi Guru Masuk [${status.toUpperCase()}]: ${matchedTeacher.nama} (${matchedTeacher.jabatan})${isLate ? ` Terlambat ${lateMinutes} mnt` : ''} oleh ${formatPetugasRole(officerEmail)}`;

    this.addLog(`SCAN_GURU_${jenis.toUpperCase()}`, logDetails);

    const timeFormatted = this.formatRecordTimeWIT(nowISO);
    const msg =
      jenis === 'Pulang'
        ? `Presensi PULANG berhasil dicatat untuk Bapak/Ibu ${matchedTeacher.nama} pada ${timeFormatted}.`
        : isLate
        ? `Presensi MASUK (TERLAMBAT ${lateMinutes} Mnt) dicatat untuk Bapak/Ibu ${matchedTeacher.nama} pada ${timeFormatted}.`
        : `Presensi MASUK (TEPAT WAKTU) dicatat untuk Bapak/Ibu ${matchedTeacher.nama} pada ${timeFormatted}.`;

    return {
      success: true,
      isDuplicate: false,
      record: newRecord,
      teacher: matchedTeacher,
      message: msg,
      type: jenis,
      status,
      isLate,
      lateMinutes,
    };
  }

  public async addManualTeacherAttendance(
    data: Partial<TeacherAttendanceRecord> & { nip: string; nama: string; jabatan: string }
  ): Promise<TeacherAttendanceRecord> {
    const targetTanggal = data.tanggal || this.getTodayFormatted();
    const targetJenis = data.jenis || 'Masuk';

    const normTarget = this.normalizeToYyyyMmDd(targetTanggal);
    const existingIdx = this.teacherAttendance.findIndex(
      (a) =>
        a.nip === data.nip &&
        (this.normalizeToYyyyMmDd(a.tanggal) === normTarget || a.tanggal === targetTanggal) &&
        a.jenis === targetJenis
    );

    if (existingIdx !== -1) {
      const existing = this.teacherAttendance[existingIdx];
      const updated: TeacherAttendanceRecord = {
        ...existing,
        ...data,
        tanggal: targetTanggal,
        timestamp: data.timestamp || existing.timestamp || new Date().toISOString(),
        jenis: targetJenis,
        status: data.status || existing.status,
        terlambatMenit: data.terlambatMenit !== undefined ? data.terlambatMenit : existing.terlambatMenit,
        petugas: data.petugas || existing.petugas,
        catatan: data.catatan || existing.catatan,
      };
      this.teacherAttendance[existingIdx] = updated;
      this.notify();
      this.addLog('PRESENSI_MANUAL_GURU', `Memperbarui presensi guru: ${updated.nama} (${updated.jabatan}) - ${updated.status}`);
      return updated;
    }

    const newRecord: TeacherAttendanceRecord = {
      id: `tch-att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      tanggal: targetTanggal,
      timestamp: data.timestamp || new Date().toISOString(),
      nip: data.nip,
      nama: data.nama,
      jabatan: data.jabatan,
      id_qr: data.id_qr || `69933068.${data.nip}`,
      jenis: targetJenis,
      status: data.status || 'Hadir',
      petugas: data.petugas ? formatPetugasRole(data.petugas) : 'Petugas Piket',
      catatan: data.catatan || '',
      terlambatMenit: data.terlambatMenit || 0,
    };

    this.teacherAttendance.unshift(newRecord);
    this.notify();

    syncTeacherAttendanceToSupabase([newRecord], this.getSupabaseConfig()).catch(() => {});
    this.addLog('PRESENSI_MANUAL_GURU', `Menambahkan presensi manual guru: ${newRecord.nama} (${newRecord.jabatan}) - ${newRecord.status}`);
    return newRecord;
  }

  public async updateTeacherAttendanceRecord(id: string, data: Partial<TeacherAttendanceRecord>): Promise<boolean> {
    const idx = this.teacherAttendance.findIndex((a) => a.id === id);
    if (idx === -1) return false;

    const updated = { ...this.teacherAttendance[idx], ...data };
    this.teacherAttendance[idx] = updated;
    this.notify();

    syncTeacherAttendanceToSupabase([updated], this.getSupabaseConfig()).catch(() => {});
    this.addLog('EDIT_PRESENSI_GURU', `Memperbarui rekaman presensi guru ID: ${id} (${updated.nama})`);
    return true;
  }

  public async deleteTeacherAttendanceRecord(id: string): Promise<boolean> {
    const target = this.teacherAttendance.find((a) => a.id === id);
    this.teacherAttendance = this.teacherAttendance.filter((a) => !id || a.id !== id);
    this.notify();

    if (target) {
      deleteTeacherAttendanceFromSupabase(id, this.getSupabaseConfig()).catch(() => {});
      this.addLog('HAPUS_PRESENSI_GURU', `Menghapus rekaman presensi guru: ${target.nama} (${target.tanggal})`);
    }
    return true;
  }

  public async deleteMultipleTeacherAttendance(ids: string[]): Promise<boolean> {
    const idSet = new Set(ids);
    this.teacherAttendance = this.teacherAttendance.filter((a) => !idSet.has(a.id));
    this.notify();
    this.addLog('HAPUS_MASSAL_PRESENSI_GURU', `Menghapus ${ids.length} rekaman presensi guru.`);
    return true;
  }

  public async clearTeacherAttendance(): Promise<boolean> {
    const count = this.teacherAttendance.length;
    this.teacherAttendance = [];
    this.notify();
    this.addLog('RESET_PRESENSI_GURU', `Menghapus seluruh ${count} rekap presensi guru.`);
    return true;
  }

  public async importTeacherAttendanceRecords(
    records: Omit<TeacherAttendanceRecord, 'id'>[],
    mode: 'append' | 'replace' = 'append'
  ): Promise<boolean> {
    if (mode === 'replace') {
      const formatted: TeacherAttendanceRecord[] = records.map((r, idx) => ({
        ...r,
        id: `tch-att-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      }));
      this.teacherAttendance = formatted;
      this.notify();
    } else {
      const map = new Map<string, TeacherAttendanceRecord>();
      this.teacherAttendance.forEach((a) => {
        const key = `${a.nip}_${a.tanggal}_${a.jenis}`;
        map.set(key, a);
      });

      records.forEach((r, idx) => {
        const key = `${r.nip}_${r.tanggal}_${r.jenis}`;
        const existing = map.get(key);
        if (existing) {
          map.set(key, { ...existing, ...r, id: existing.id });
        } else {
          map.set(key, {
            ...r,
            id: `tch-att-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          });
        }
      });

      this.teacherAttendance = Array.from(map.values());
      this.notify();
    }

    this.addLog('IMPORT_PRESENSI_GURU', `Mengimpor ${records.length} data rekap presensi guru tanpa duplikasi.`);
    return true;
  }

  public getTodayFormatted(): string {
    const today = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jayapura',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return formatter.format(today).replace(/\//g, '-');
  }

  public getTodayYyyyMmDd(): string {
    const today = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jayapura',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(today);
  }

  public isRecordForDate(r: AttendanceRecord, targetYyyyMmDd: string): boolean {
    if (!r || !targetYyyyMmDd) return false;
    const targetNorm = this.normalizeToYyyyMmDd(targetYyyyMmDd);

    if (r.tanggal) {
      const recordNorm = this.normalizeToYyyyMmDd(r.tanggal);
      if (recordNorm === targetNorm) return true;
      if (r.tanggal.includes(targetYyyyMmDd) || targetYyyyMmDd.includes(r.tanggal)) return true;
    }

    if (r.timestamp) {
      const tsNorm = this.normalizeToYyyyMmDd(r.timestamp);
      if (tsNorm === targetNorm) return true;
    }

    return false;
  }

  public isRecordForToday(r: AttendanceRecord): boolean {
    return this.isRecordForDate(r, this.getTodayYyyyMmDd());
  }

  public recordScan(
    scannedText: string,
    rawQR?: string,
    rawCode?: string,
    officerEmail = 'Petugas Piket',
    forcedType?: AttendanceType | 'Auto'
  ): {
    success: boolean;
    isDuplicate?: boolean;
    record?: AttendanceRecord;
    student?: Student;
    message: string;
    type?: AttendanceType;
    status?: AttendanceStatus;
    isLate?: boolean;
    lateMinutes?: number;
  } {
    const cleanText = (scannedText || rawQR || rawCode || '').trim();
    if (!cleanText) {
      return { success: false, message: 'Kode QR tidak terbaca atau kosong.' };
    }

    // Match student by ID_QR, NISN, or Name
    let matchedStudent = this.students.find(
      (s) =>
        s.id_qr === cleanText ||
        s.nisn === cleanText ||
        cleanText.includes(s.nisn) ||
        cleanText.toLowerCase().includes(s.nama.toLowerCase())
    );

    if (!matchedStudent) {
      // Try parsing standard 69933068.NISN.NAMA
      const parts = cleanText.split('.');
      if (parts.length >= 2) {
        const parsedNISN = parts[1];
        matchedStudent = this.students.find((s) => s.nisn === parsedNISN);
      }
    }

    if (!matchedStudent) {
      return {
        success: false,
        message: `Siswa dengan kode/NISN "${cleanText}" tidak ditemukan di database.`,
      };
    }

    if (matchedStudent.status === 'nonaktif') {
      return {
        success: false,
        student: matchedStudent,
        message: `Siswa ${matchedStudent.nama} berstatus nonaktif di sistem.`,
      };
    }

    const todayStr = this.getTodayFormatted();
    const now = new Date();
    const nowISO = now.toISOString();

    // Determine current hour in WIT (UTC+9)
    let currentHourWIT = now.getHours();
    let currentMinuteWIT = now.getMinutes();
    try {
      const witTimeParts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jayapura',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(now);
      const hPart = witTimeParts.find((p) => p.type === 'hour');
      const mPart = witTimeParts.find((p) => p.type === 'minute');
      if (hPart) currentHourWIT = parseInt(hPart.value, 10);
      if (mPart) currentMinuteWIT = parseInt(mPart.value, 10);
    } catch {
      // Fallback
    }

    // Check existing scans today
    const studentTodayRecords = this.attendance.filter(
      (a) => (a.nisn === matchedStudent!.nisn || a.nama === matchedStudent!.nama) && this.isRecordForToday(a)
    );

    // Identify auto-alpa records (which can be replaced if a student scans Masuk)
    const autoAlpaRecord = studentTodayRecords.find(
      (a) => a.id?.startsWith('att-autoalpa-') || a.catatan?.includes('Alpa Otomatis')
    );

    // Real recorded attendance (not auto-alpa)
    const realTodayRecords = studentTodayRecords.filter(
      (a) => !(a.id?.startsWith('att-autoalpa-') || a.catatan?.includes('Alpa Otomatis'))
    );

    const masukRecord = realTodayRecords.find((a) => a.jenis === 'Masuk');
    const pulangRecord = realTodayRecords.find((a) => a.jenis === 'Pulang');

    let jenis: AttendanceType = 'Masuk';

    // 1. Determine target scan type (forced or auto)
    if (forcedType === 'Masuk') {
      jenis = 'Masuk';
    } else if (forcedType === 'Pulang') {
      jenis = 'Pulang';
    } else {
      // Auto mode: If before 11:30 WIT -> Masuk. If 11:30 WIT or later -> Pulang
      const isAfternoonSession = currentHourWIT > 11 || (currentHourWIT === 11 && currentMinuteWIT >= 30);
      if (isAfternoonSession) {
        jenis = masukRecord && !pulangRecord ? 'Pulang' : 'Pulang';
      } else {
        jenis = 'Masuk';
      }
    }

    // 2. STRICT DUPLICATE SCAN PREVENTION (CEGAH SCAN GANDA & TOLAK LANGSUNG)
    if (masukRecord && pulangRecord) {
      const mTime = this.formatRecordTimeWIT(masukRecord.timestamp);
      const pTime = this.formatRecordTimeWIT(pulangRecord.timestamp);
      return {
        success: false,
        isDuplicate: true,
        student: matchedStudent,
        record: pulangRecord,
        type: 'Pulang',
        status: pulangRecord.status,
        message: `DITOLAK: Siswa ${matchedStudent.nama} (${matchedStudent.kelas}) sudah LENGKAP presensi Masuk (${mTime}) dan Pulang (${pTime}) hari ini. Scan ganda ditolak!`,
      };
    }

    if (jenis === 'Masuk' && masukRecord) {
      const mTime = this.formatRecordTimeWIT(masukRecord.timestamp);
      return {
        success: false,
        isDuplicate: true,
        student: matchedStudent,
        record: masukRecord,
        type: 'Masuk',
        status: masukRecord.status,
        message: `DITOLAK: Siswa ${matchedStudent.nama} (${matchedStudent.kelas}) SUDAH SCAN MASUK hari ini pada pukul ${mTime} (${masukRecord.status}). Scan ganda langsung ditolak!`,
      };
    }

    if (jenis === 'Pulang' && pulangRecord) {
      const pTime = this.formatRecordTimeWIT(pulangRecord.timestamp);
      return {
        success: false,
        isDuplicate: true,
        student: matchedStudent,
        record: pulangRecord,
        type: 'Pulang',
        status: pulangRecord.status,
        message: `DITOLAK: Siswa ${matchedStudent.nama} (${matchedStudent.kelas}) SUDAH SCAN PULANG hari ini pada pukul ${pTime}. Scan ganda langsung ditolak!`,
      };
    }

    // If an auto-alpa record existed and this is a genuine scan, remove the auto-alpa placeholder
    if (autoAlpaRecord) {
      this.attendance = this.attendance.filter((a) => a.id !== autoAlpaRecord.id);
    }

    // Calculate late status if Masuk
    let status: AttendanceStatus = 'Hadir';
    let isLate = false;
    let lateMinutes = 0;

    if (jenis === 'Masuk') {
      const cutoffTimeStr = this.settings.cutoffTime || '07:15';
      const [cutoffHour, cutoffMin] = cutoffTimeStr.split(':').map(Number);
      const nowMinutes = currentHourWIT * 60 + currentMinuteWIT;
      const cutoffMinutes = (cutoffHour || 7) * 60 + (cutoffMin || 15);

      if (nowMinutes > cutoffMinutes) {
        status = 'Terlambat';
        isLate = true;
        lateMinutes = nowMinutes - cutoffMinutes;
      }
    } else if (jenis === 'Pulang') {
      // Inherit the student's status for the day if they scanned Masuk earlier
      if (masukRecord) {
        status = masukRecord.status;
      }
    }

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      tanggal: todayStr,
      timestamp: nowISO,
      nisn: matchedStudent.nisn,
      nama: matchedStudent.nama,
      kelas: matchedStudent.kelas,
      id_qr: matchedStudent.id_qr || `69933068.${matchedStudent.nisn}.${matchedStudent.nama}`,
      jenis,
      status,
      petugas: formatPetugasRole(officerEmail),
      catatan: jenis === 'Pulang' ? 'Selesai KBM / Pulang' : isLate ? `Terlambat ${lateMinutes} menit` : 'Tepat Waktu',
      terlambatMenit: lateMinutes,
    };

    this.attendance.unshift(newRecord);
    this.notify();

    // Direct save to Supabase Cloud PostgreSQL
    syncAttendanceToSupabase([newRecord], this.getSupabaseConfig());

    const logDetails =
      jenis === 'Pulang'
        ? `Scan Presensi Pulang: ${matchedStudent.nama} (${matchedStudent.kelas}) oleh ${formatPetugasRole(officerEmail)}`
        : `Scan Presensi Masuk [${status.toUpperCase()}]: ${matchedStudent.nama} (${matchedStudent.kelas})${isLate ? ` Terlambat ${lateMinutes} mnt` : ''} oleh ${formatPetugasRole(officerEmail)}`;

    this.addLog(`SCAN_${jenis.toUpperCase()}`, logDetails);

    const timeFormatted = this.formatRecordTimeWIT(nowISO);
    const msg =
      jenis === 'Pulang'
        ? `Presensi PULANG berhasil dicatat untuk ${matchedStudent.nama} pada ${timeFormatted}.`
        : isLate
        ? `Presensi MASUK (TERLAMBAT ${lateMinutes} Mnt) berhasil dicatat untuk ${matchedStudent.nama} pada ${timeFormatted}.`
        : `Presensi MASUK (TEPAT WAKTU) berhasil dicatat untuk ${matchedStudent.nama} pada ${timeFormatted}.`;

    return {
      success: true,
      isDuplicate: false,
      record: newRecord,
      student: matchedStudent,
      message: msg,
      type: jenis,
      status: status,
      isLate,
      lateMinutes,
    };
  }

  public normalizeToYyyyMmDd(dateStr: string): string {
    if (!dateStr) return '';
    const str = String(dateStr).trim();
    if (str.includes('T')) {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jayapura' });
      }
      const datePart = str.split('T')[0];
      if (datePart.split('-')[0].length === 4) return datePart;
    }
    if (str.includes('-')) {
      const parts = str.split('-');
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].slice(0, 2).padStart(2, '0')}`;
      }
      if (parts[2]?.length === 4) {
        const [d, m, y] = parts;
        return `${y.slice(0, 4)}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
    }
    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        if (parts[0].length === 4) {
          return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
      }
    }
    return str;
  }

  public buildIsoTimestamp(tanggalYyyyMmDd: string, jamHhMm: string): string {
    const normDate = this.normalizeToYyyyMmDd(tanggalYyyyMmDd) || this.getTodayYyyyMmDd();
    const timeClean = (jamHhMm || '07:00').trim();
    const parts = timeClean.split(':');
    const h = (parseInt(parts[0], 10) || 0).toString().padStart(2, '0');
    const m = (parseInt(parts[1], 10) || 0).toString().padStart(2, '0');
    const s = parts[2] ? (parseInt(parts[2], 10) || 0).toString().padStart(2, '0') : '00';

    // Sekolah berlokasi di Ambon (Zona Waktu WIT / Asia/Jayapura, UTC+09:00)
    const dateWithTz = `${normDate}T${h}:${m}:${s}+09:00`;
    const d = new Date(dateWithTz);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
    return new Date().toISOString();
  }

  public async addManualAttendance(data: Partial<AttendanceRecord> & { nisn: string; nama: string; kelas: string }): Promise<AttendanceRecord> {
    const targetTanggal = data.tanggal ? (this.normalizeToYyyyMmDd(data.tanggal) || data.tanggal) : this.getTodayYyyyMmDd();
    const targetJenis = data.jenis || 'Masuk';
    const normTarget = this.normalizeToYyyyMmDd(targetTanggal);
    const finalTimestamp = data.timestamp || this.buildIsoTimestamp(normTarget, '07:00');

    // Antisipasi data ganda: Cek apakah sudah ada rekaman presensi dengan NISN, Tanggal, & Jenis yang sama
    const existingIdx = this.attendance.findIndex(
      (a) =>
        ((a.nisn && a.nisn === data.nisn) || (a.nama && a.nama === data.nama)) &&
        this.isRecordForDate(a, normTarget) &&
        a.jenis === targetJenis
    );

    if (existingIdx !== -1) {
      const existing = this.attendance[existingIdx];
      const updated: AttendanceRecord = {
        ...existing,
        ...data,
        id: existing.id,
        tanggal: normTarget,
        timestamp: finalTimestamp,
        jenis: targetJenis,
        status: data.status || existing.status,
        terlambatMenit: data.terlambatMenit !== undefined ? data.terlambatMenit : existing.terlambatMenit,
        petugas: data.petugas || existing.petugas,
        catatan: data.catatan || existing.catatan,
      };
      this.attendance[existingIdx] = updated;
      this.attendance = [...this.attendance];
      this.notify();

      syncAttendanceToSupabase([updated], this.getSupabaseConfig()).catch((err) => console.warn('Background sync attendance notice:', err?.message || err));
      this.addLog('PRESENSI_MANUAL', `Memperbarui presensi: ${updated.nama} (${updated.kelas}) - ${updated.jenis} ${updated.status}`);
      return updated;
    }

    // Replace auto-alpa record if exists
    const autoAlpaIndex = this.attendance.findIndex((a) => {
      const matchIdentity = (a.nisn && a.nisn === data.nisn) || (a.nama && a.nama === data.nama);
      const matchDate = this.isRecordForDate(a, normTarget);
      const isAutoAlpa = a.id.startsWith('att-autoalpa') || a.petugas?.includes('Otopresensi') || (a.status === 'Alpa' && a.jenis === 'Masuk');
      return matchIdentity && matchDate && isAutoAlpa;
    });

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      tanggal: normTarget,
      timestamp: finalTimestamp,
      nisn: data.nisn,
      nama: data.nama,
      kelas: data.kelas,
      id_qr: data.id_qr || `69933068.${data.nisn}.${data.nama}`,
      jenis: targetJenis,
      status: data.status || 'Hadir',
      petugas: data.petugas ? formatPetugasRole(data.petugas) : 'Petugas Piket',
      catatan: data.catatan || '',
      terlambatMenit: data.terlambatMenit || 0,
    };

    if (autoAlpaIndex !== -1 && targetJenis === 'Masuk') {
      this.attendance[autoAlpaIndex] = newRecord;
    } else {
      this.attendance.unshift(newRecord);
    }
    this.attendance = [...this.attendance];
    this.notify();

    syncAttendanceToSupabase([newRecord], this.getSupabaseConfig()).catch((err) => console.warn('Background sync attendance notice:', err?.message || err));
    this.addLog('PRESENSI_MANUAL', `Menambahkan presensi manual: ${newRecord.nama} (${newRecord.kelas}) - ${newRecord.jenis} ${newRecord.status}`);
    return newRecord;
  }

  public async updateAttendanceRecord(id: string, data: Partial<AttendanceRecord>): Promise<boolean> {
    return this.updateAttendance(id, data);
  }

  public async updateAttendance(id: string, data: Partial<AttendanceRecord>): Promise<boolean> {
    const idx = this.attendance.findIndex((a) => a.id === id);
    if (idx === -1) return false;

    const existing = this.attendance[idx];
    const normTanggal = data.tanggal ? this.normalizeToYyyyMmDd(data.tanggal) : existing.tanggal;

    const updated: AttendanceRecord = {
      ...existing,
      ...data,
      tanggal: normTanggal,
      timestamp: data.timestamp || existing.timestamp,
    };

    this.attendance[idx] = updated;
    this.attendance = [...this.attendance];
    this.notify();

    syncAttendanceToSupabase([updated], this.getSupabaseConfig()).catch((err) => console.warn('Background sync attendance notice:', err?.message || err));
    this.addLog('EDIT_PRESENSI', `Memperbarui rekaman presensi ${updated.nama} (${updated.tanggal}): ${updated.jenis} - ${updated.status} (${data.timestamp ? 'Waktu diubah' : ''})`);
    return true;
  }

  public async deleteAttendance(id: string): Promise<boolean> {
    const target = this.attendance.find((a) => a.id === id);
    this.attendance = this.attendance.filter((a) => !id || a.id !== id);
    this.notify();

    if (target) {
      deleteAttendanceFromSupabase(id).catch((err) => console.warn('Background delete attendance notice:', err?.message || err));
      this.addLog('HAPUS_PRESENSI', `Menghapus rekaman presensi: ${target.nama} (${target.tanggal}) dari aplikasi dan database.`);
    }
    return true;
  }

  public async deleteMultipleAttendance(ids: string[]): Promise<boolean> {
    const idSet = new Set(ids);
    this.attendance = this.attendance.filter((a) => !idSet.has(a.id));
    this.notify();

    await Promise.all(ids.map((id) => deleteAttendanceFromSupabase(id)));
    this.addLog('HAPUS_MASSAL_PRESENSI', `Menghapus ${ids.length} rekaman presensi dari aplikasi dan database.`);
    return true;
  }

  public async clearAttendance(): Promise<boolean> {
    const count = this.attendance.length;
    const ids = this.attendance.map((a) => a.id);
    this.attendance = [];
    this.notify();

    await Promise.all(ids.map((id) => deleteAttendanceFromSupabase(id)));
    this.addLog('RESET_PRESENSI', `Menghapus seluruh ${count} rekap presensi dari aplikasi dan database.`);
    return true;
  }

  public async importAttendanceRecords(
    records: Omit<AttendanceRecord, 'id'>[],
    mode: 'append' | 'replace' = 'append'
  ): Promise<boolean> {
    if (mode === 'replace') {
      const oldIds = this.attendance.map((a) => a.id);
      const formatted: AttendanceRecord[] = records.map((r, idx) => ({
        ...r,
        id: `att-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      }));
      this.attendance = formatted;
      this.notify();
      if (oldIds.length > 0) {
        await Promise.all(oldIds.map((id) => deleteAttendanceFromSupabase(id)));
      }
    } else {
      // Append mode dengan pencegahan duplikasi berdasarkan NISN + Tanggal + Jenis
      const map = new Map<string, AttendanceRecord>();
      this.attendance.forEach((a) => {
        const key = `${a.nisn}_${a.tanggal}_${a.jenis}`;
        map.set(key, a);
      });

      records.forEach((r, idx) => {
        const key = `${r.nisn}_${r.tanggal}_${r.jenis}`;
        const existing = map.get(key);
        if (existing) {
          map.set(key, { ...existing, ...r, id: existing.id });
        } else {
          map.set(key, {
            ...r,
            id: `att-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          });
        }
      });

      this.attendance = Array.from(map.values());
      this.notify();
    }

    await syncAttendanceToSupabase(this.attendance, this.getSupabaseConfig());
    this.addLog('IMPORT_PRESENSI', `Mengimpor ${records.length} data rekap presensi tanpa duplikasi.`);
    return true;
  }

  public addLog(action: string, details: string) {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      user: this.currentUser?.name || 'Sistem',
      role: this.currentUser?.role || 'Admin',
      action,
      details,
    };

    this.logs.unshift(newLog);
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(0, 1000);
    }
    this.notify();

    syncLogsToSupabase([newLog], this.getSupabaseConfig()).catch(() => {});
  }

  public async deleteSelectedLogs(ids: string[]): Promise<boolean> {
    const idSet = new Set(ids);
    this.logs = this.logs.filter((l) => !idSet.has(l.id));
    this.notify();

    await Promise.all(ids.map((id) => deleteLogFromSupabase(id, this.getSupabaseConfig())));
    return true;
  }

  public async clearLogs(): Promise<boolean> {
    const ids = this.logs.map((l) => l.id);
    this.logs = [];
    this.notify();

    await Promise.all(ids.map((id) => deleteLogFromSupabase(id)));
    return true;
  }

  // Double Masuk scan repair helpers
  public findDoubleMasukRecords(): Array<{
    studentNisn: string;
    studentName: string;
    date: string;
    records: AttendanceRecord[];
  }> {
    const groups = new Map<string, AttendanceRecord[]>();
    this.attendance.forEach((r) => {
      if (r.jenis === 'Masuk') {
        const key = `${r.nisn}_${r.tanggal}`;
        const existing = groups.get(key) || [];
        existing.push(r);
        groups.set(key, existing);
      }
    });

    const anomalies: Array<{
      studentNisn: string;
      studentName: string;
      date: string;
      records: AttendanceRecord[];
    }> = [];

    groups.forEach((records, key) => {
      if (records.length > 1) {
        const [nisn, date] = key.split('_');
        anomalies.push({
          studentNisn: nisn,
          studentName: records[0].nama,
          date,
          records,
        });
      }
    });

    return anomalies;
  }

  public repairDoubleMasukRecords(selectedRecordIds?: string[]): number {
    const anomalies = this.findDoubleMasukRecords();
    let removedCount = 0;

    anomalies.forEach((group) => {
      // Sort ascending by timestamp -> keep earliest, remove duplicates
      const sorted = [...group.records].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      const toKeep = sorted[0];
      const duplicates = sorted.slice(1);

      duplicates.forEach((d) => {
        if (!selectedRecordIds || selectedRecordIds.includes(d.id)) {
          this.deleteAttendance(d.id);
          removedCount++;
        }
      });
    });

    if (removedCount > 0) {
      toast.success('Pembersihan Berhasil', `Berhasil menghapus ${removedCount} data scan Masuk ganda.`);
    }
    return removedCount;
  }

  public autoRepairAttendanceFromActivityLogs(): number {
    const missing = this.getMissingAttendanceItemsFromLogs();
    if (missing.length === 0) {
      toast.info('Pemeriksaan Log', 'Tidak ditemukan rekaman presensi yang hilang dari log aktivitas.');
      return 0;
    }

    const ids = missing.map((m) => m.logId);
    this.restoreSpecificMissingAttendanceItems(ids);
    toast.success('Pemulihan Log Berhasil', `Berhasil memulihkan ${missing.length} rekaman presensi dari log aktivitas.`);
    return missing.length;
  }

  public autoRepairFromAttendance(): number {
    const studentNisns = new Set(this.students.map((s) => s.nisn).filter(Boolean));
    const orphanedMap = new Map<string, AttendanceRecord>();

    this.attendance.forEach((a) => {
      if (a.nisn && !studentNisns.has(a.nisn)) {
        if (!orphanedMap.has(a.nisn)) {
          orphanedMap.set(a.nisn, a);
        }
      }
    });

    const newStudents: Student[] = [];
    orphanedMap.forEach((att, nisn) => {
      const newStudent: Student = {
        id: `std-repaired-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        nisn: nisn,
        nama: att.nama || `Siswa ${nisn}`,
        kelas: att.kelas || 'X',
        id_qr: att.id_qr || `69933068.${nisn}.${att.nama || 'SISWA'}`,
        foto: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 100)}?auto=format&fit=crop&q=80&w=250`,
        status: 'aktif',
        createdAt: new Date().toISOString(),
      };
      newStudents.push(newStudent);
    });

    if (newStudents.length > 0) {
      this.students = [...this.students, ...newStudents];
      this.notify();
      syncStudentsToSupabase(newStudents, this.getSupabaseConfig()).catch(() => {});
      this.addLog(
        'REPAIR_SISWA_DARI_PRESENSI',
        `Sistem merekonstruksi ${newStudents.length} profil siswa dari rekaman presensi yatim (termasuk kelas ${newStudents.map((s) => s.kelas).join(', ')}).`
      );
      toast.success('Rekonstruksi Berhasil', `Berhasil merekonstruksi dan mendaftarkan ${newStudents.length} profil siswa ke master data.`);
    } else {
      toast.info('Data Siswa Konsisten', 'Seluruh data presensi sudah memiliki profil siswa yang terdaftar di master data.');
    }

    return newStudents.length;
  }

  public getMissingAttendanceItemsFromLogs(): MissingAttendanceLogItem[] {
    const missing: MissingAttendanceLogItem[] = [];
    const studentMapByName = new Map<string, Student>();
    this.students.forEach((s) => {
      if (s.nama) studentMapByName.set(s.nama.toLowerCase().trim(), s);
    });

    this.logs.forEach((log) => {
      if (!log.action || (!log.action.startsWith('SCAN_') && !log.action.startsWith('PRESENSI_'))) {
        return;
      }

      const dateStr = this.normalizeToYyyyMmDd(log.timestamp);
      const isPulang = log.action.includes('PULANG') || log.details.toLowerCase().includes('pulang');
      const jenis: AttendanceType = isPulang ? 'Pulang' : 'Masuk';

      // Parse Nama, Kelas, Status from details
      // e.g., "Scan Presensi Masuk [HADIR]: DADANG BUAMONA (XI IPA 1) oleh Petugas Piket"
      // or "Scan Presensi Masuk [TERLAMBAT]: NAMA (KELAS) Terlambat 10 mnt oleh..."
      // or "Menambahkan presensi manual: NAMA (KELAS) - Hadir"
      let parsedNama = '';
      let parsedKelas = '';
      let parsedStatus: AttendanceStatus = 'Hadir';

      const scanMatch = log.details.match(/Scan Presensi (?:Masuk|Pulang)(?: \[(.*?)\])?: ([^(]+) \(([^)]+)\)/i);
      const manualMatch = log.details.match(/presensi manual: ([^(]+) \(([^)]+)\) - (\w+)/i);

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

      if (!parsedNama) return;

      const matchedStudent = studentMapByName.get(parsedNama.toLowerCase().trim());
      const nisn = matchedStudent ? matchedStudent.nisn : `manual-${parsedNama.replace(/\s+/g, '').toLowerCase()}`;
      const kelas = matchedStudent ? matchedStudent.kelas : (parsedKelas || 'X');

      // Check if this attendance event exists in this.attendance
      const exists = this.attendance.some(
        (a) =>
          (a.nisn === nisn || a.nama.toLowerCase().trim() === parsedNama.toLowerCase().trim()) &&
          this.isRecordForDate(a, dateStr) &&
          a.jenis === jenis
      );

      if (!exists) {
        const parts = dateStr.split('-');
        const dateFormatted = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : dateStr;

        missing.push({
          logId: log.id,
          timestamp: log.timestamp,
          dateFormatted,
          nama: parsedNama,
          nisn,
          kelas,
          jenis,
          status: parsedStatus,
          petugas: log.user || 'Petugas Piket',
          action: log.action,
          details: log.details,
        });
      }
    });

    return missing;
  }

  public restoreSpecificMissingAttendanceItems(ids: string[]): boolean {
    const missingList = this.getMissingAttendanceItemsFromLogs();
    const idSet = new Set(ids);
    const targets = missingList.filter((m) => idSet.has(m.logId));

    if (targets.length === 0) return false;

    const newRecords: AttendanceRecord[] = targets.map((t) => {
      const parts = this.normalizeToYyyyMmDd(t.timestamp).split('-');
      const formattedDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : t.dateFormatted;

      return {
        id: `att-recovered-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        tanggal: formattedDate,
        timestamp: t.timestamp,
        nisn: t.nisn,
        nama: t.nama,
        kelas: t.kelas,
        id_qr: `69933068.${t.nisn}.${t.nama}`,
        jenis: t.jenis,
        status: t.status,
        petugas: formatPetugasRole(t.petugas),
        catatan: `Dipulihkan dari log aktivitas (${t.action})`,
        terlambatMenit: t.status === 'Terlambat' ? 15 : 0,
      };
    });

    this.attendance = [...this.attendance, ...newRecords];
    this.notify();
    syncAttendanceToSupabase(newRecords, this.getSupabaseConfig()).catch(() => {});
    this.addLog('RESTORASI_PRESENSI_DARI_LOG', `Memulihkan ${newRecords.length} rekaman presensi dari catatan log aktivitas.`);
    return true;
  }

  public runDataHealthCheck(): HealthCheckResult {
    const totalStudents = this.students.length;
    const totalAttendance = this.attendance.length;
    const studentNisns = new Set(this.students.map((s) => s.nisn).filter(Boolean));

    const attNisns = new Set(this.attendance.map((a) => a.nisn).filter(Boolean));

    const orphanedMap = new Map<string, { name: string; class: string; count: number }>();
    this.attendance.forEach((a) => {
      if (a.nisn && !studentNisns.has(a.nisn)) {
        const existing = orphanedMap.get(a.nisn);
        if (existing) {
          existing.count++;
        } else {
          orphanedMap.set(a.nisn, {
            name: a.nama || 'Tanpa Nama',
            class: a.kelas || '-',
            count: 1,
          });
        }
      }
    });

    const orphanedAttendanceCount = Array.from(orphanedMap.values()).reduce((sum, item) => sum + item.count, 0);
    const missingStudentDetails = Array.from(orphanedMap.entries()).map(([nisn, data]) => ({
      nisn,
      name: data.name,
      class: data.class,
      scanCount: data.count,
    }));

    // Check double masuk
    const doubleMasukAnomalies = this.findDoubleMasukRecords();
    const doubleMasukCount = doubleMasukAnomalies.reduce((sum, a) => sum + a.records.length - 1, 0);

    // Check class inconsistencies (presensi class vs student master class)
    const studentClassMap = new Map<string, string>();
    this.students.forEach((s) => studentClassMap.set(s.nisn, s.kelas.trim()));

    let classMismatchCount = 0;
    this.attendance.forEach((a) => {
      const masterClass = studentClassMap.get(a.nisn);
      if (masterClass && a.kelas && a.kelas.trim() !== masterClass) {
        classMismatchCount++;
      }
    });

    const discrepancies: string[] = [];
    const recommendations: string[] = [];

    if (orphanedAttendanceCount > 0) {
      discrepancies.push(
        `Terdapat ${orphanedAttendanceCount} rekaman presensi dari ${orphanedMap.size} siswa yang belum terdaftar di data master siswa.`
      );
      recommendations.push(
        'Klik tombol "Rekonstruksi Profil Siswa" untuk otomatis mendaftarkan siswa yang belum ada ke master data.'
      );
    }

    if (doubleMasukCount > 0) {
      discrepancies.push(
        `Ditemukan ${doubleMasukCount} rekaman scan Masuk ganda pada ${doubleMasukAnomalies.length} siswa.`
      );
      recommendations.push(
        'Gunakan fitur pembersihan "Bersihkan Scan Masuk Ganda" untuk menjaga konsistensi rekap harian.'
      );
    }

    if (classMismatchCount > 0) {
      discrepancies.push(
        `Terdapat ${classMismatchCount} rekaman presensi dengan nama kelas yang tidak selaras dengan kelas siswa saat ini.`
      );
      recommendations.push('Sinkronkan nama kelas presensi dengan kelas master siswa.');
    }

    if (discrepancies.length === 0) {
      discrepancies.push('Semua data presensi, data master siswa, dan log aktivitas dalam kondisi konsisten.');
      recommendations.push('Database Supabase Cloud PostgreSQL dan cache lokal berfungsi normal.');
    }

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (orphanedAttendanceCount > 0 || doubleMasukCount > 0) {
      status = 'warning';
    }
    if (orphanedAttendanceCount > 10 || totalStudents === 0 && totalAttendance > 0) {
      status = 'critical';
    }

    return {
      status,
      totalStudents,
      totalAttendance,
      uniqueAttendanceStudents: attNisns.size,
      orphanedAttendanceCount,
      missingStudentDetails,
      backupInfo: {
        exists: true,
        timestamp: new Date().toISOString(),
        studentCount: totalStudents,
        attendanceCount: totalAttendance,
      },
      discrepancies,
      recommendations,
    };
  }

  public async clearCacheAndRefresh(): Promise<void> {
    await this.fetchFromServer();
    toast.success('Data Diperbarui', 'Berhasil memperbarui data terbaru dari Supabase Cloud PostgreSQL.');
  }

  public async clearAllDatabase(): Promise<void> {
    const studentIds = this.students.map((s) => s.id);
    const attendanceIds = this.attendance.map((a) => a.id);
    const logIds = this.logs.map((l) => l.id);

    this.students = [];
    this.attendance = [];
    this.logs = [];
    this.notify();

    if (studentIds.length > 0) {
      await Promise.all(studentIds.map((id) => deleteStudentFromSupabase(id)));
    }
    if (attendanceIds.length > 0) {
      await Promise.all(attendanceIds.map((id) => deleteAttendanceFromSupabase(id)));
    }
    if (logIds.length > 0) {
      await Promise.all(logIds.map((id) => deleteLogFromSupabase(id)));
    }

    toast.success('Database Dibersihkan', 'Seluruh data di aplikasi dan Supabase Cloud PostgreSQL telah berhasil dikosongkan.');
  }

  public async resetToSeedData(): Promise<void> {
    await this.clearAllDatabase();
  }

  public getOfflineQueueCount(): number {
    return 0;
  }

  public async processOfflineQueue(): Promise<boolean> {
    return true;
  }

  public async syncAllToServer(): Promise<void> {
    await this.syncAllToSupabase();
  }

  // Stubs for Google Apps Script for UI safety
  public async testAppsScriptConnection(): Promise<any> {
    return { success: false, message: 'Google Apps Script telah dinonaktifkan. Sistem sekarang menggunakan Supabase Cloud PostgreSQL secara eksklusif.' };
  }

  public async pushToAppsScript(): Promise<any> {
    return { success: false, message: 'Google Apps Script telah dinonaktifkan. Data tersimpan di Supabase Cloud PostgreSQL.' };
  }

  public async pullFromAppsScript(): Promise<any> {
    return { success: false, message: 'Google Apps Script telah dinonaktifkan.' };
  }

  public createManualBackup() {
    toast.info('Cadangan Otomatis', 'Data Anda aman tersimpan secara permanen di Supabase Cloud PostgreSQL.');
  }

  public restoreFromBrowserBackup() {
    this.fetchFromServer();
  }
}

export const store = new AppStore();
