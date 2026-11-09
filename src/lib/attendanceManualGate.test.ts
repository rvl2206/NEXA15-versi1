import { describe, it, expect, beforeEach } from 'vitest';
import { calculateRawPairedDailyRecords } from './attendanceCalculations';
import { store } from './store';
import { Student, AttendanceRecord } from '../types';

describe('Manual Gate Attendance & Auto-Alpa Deactivation (Tahap 1-7)', () => {
  const mockStudents: Student[] = [
    {
      id: 's1',
      nisn: '1001',
      nama: 'Siswa Satu (Tepat Waktu Lengkap)',
      kelas: 'X-1',
      status: 'aktif',
    },
    {
      id: 's2',
      nisn: '1002',
      nama: 'Siswa Dua (Tepat Waktu Tanpa Pulang)',
      kelas: 'X-1',
      status: 'aktif',
    },
    {
      id: 's3',
      nisn: '1003',
      nama: 'Siswa Tiga (Terlambat Lengkap)',
      kelas: 'X-1',
      status: 'aktif',
    },
    {
      id: 's4',
      nisn: '1004',
      nama: 'Siswa Empat (Terlambat Tanpa Pulang)',
      kelas: 'X-1',
      status: 'aktif',
    },
    {
      id: 's5',
      nisn: '1005',
      nama: 'Siswa Lima (Pulang Saja)',
      kelas: 'X-1',
      status: 'aktif',
    },
    {
      id: 's6',
      nisn: '1006',
      nama: 'Siswa Enam (Tidak Ada Scan)',
      kelas: 'X-1',
      status: 'aktif',
    },
  ];

  const targetDate = '2026-11-10';

  beforeEach(() => {
    // Reset store internal state
    store.students = [...mockStudents];
    store.attendance = [];
    store.syncQueue = [];
    store.updateSettings({
      cutoffTime: '07:15',
      enableAutoAlpa: false,
    });
  });

  it('Skenario 1: Masuk tepat waktu + Pulang -> Hadir & Lengkap', () => {
    const records: AttendanceRecord[] = [
      {
        id: 'rec-1m',
        tanggal: targetDate,
        timestamp: `${targetDate}T07:05:00+09:00`,
        nisn: '1001',
        nama: 'Siswa Satu (Tepat Waktu Lengkap)',
        kelas: 'X-1',
        jenis: 'Masuk',
        status: 'Hadir',
      },
      {
        id: 'rec-1p',
        tanggal: targetDate,
        timestamp: `${targetDate}T14:00:00+09:00`,
        nisn: '1001',
        nama: 'Siswa Satu (Tepat Waktu Lengkap)',
        kelas: 'X-1',
        jenis: 'Pulang',
        status: 'Hadir',
      },
    ];

    const paired = calculateRawPairedDailyRecords('harian', '07:15', mockStudents, records, targetDate, 'X-1', '');
    const s1 = paired.find((p) => p.student.nisn === '1001');

    expect(s1).toBeDefined();
    expect(s1?.status).toBe('Hadir');
    expect(s1?.partialInfo).toBe('Lengkap');
    expect(s1?.lateMinutes).toBe(0);
    expect(s1?.masuk).toBeDefined();
    expect(s1?.pulang).toBeDefined();
  });

  it('Skenario 2: Masuk tepat waktu tanpa Pulang -> Hadir & Tanpa Absen Pulang (Bukan Alpa)', () => {
    const records: AttendanceRecord[] = [
      {
        id: 'rec-2m',
        tanggal: targetDate,
        timestamp: `${targetDate}T07:10:00+09:00`,
        nisn: '1002',
        nama: 'Siswa Dua (Tepat Waktu Tanpa Pulang)',
        kelas: 'X-1',
        jenis: 'Masuk',
        status: 'Hadir',
      },
    ];

    const paired = calculateRawPairedDailyRecords('harian', '07:15', mockStudents, records, targetDate, 'X-1', '');
    const s2 = paired.find((p) => p.student.nisn === '1002');

    expect(s2).toBeDefined();
    expect(s2?.status).toBe('Hadir');
    expect(s2?.partialInfo).toBe('Tanpa Absen Pulang');
    expect(s2?.masuk).toBeDefined();
    expect(s2?.pulang).toBeUndefined();
  });

  it('Skenario 3: Masuk terlambat + Pulang -> Terlambat & Lengkap', () => {
    const records: AttendanceRecord[] = [
      {
        id: 'rec-3m',
        tanggal: targetDate,
        timestamp: `${targetDate}T07:30:00+09:00`,
        nisn: '1003',
        nama: 'Siswa Tiga (Terlambat Lengkap)',
        kelas: 'X-1',
        jenis: 'Masuk',
        status: 'Terlambat',
        terlambatMenit: 15,
      },
      {
        id: 'rec-3p',
        tanggal: targetDate,
        timestamp: `${targetDate}T14:00:00+09:00`,
        nisn: '1003',
        nama: 'Siswa Tiga (Terlambat Lengkap)',
        kelas: 'X-1',
        jenis: 'Pulang',
        status: 'Terlambat',
      },
    ];

    const paired = calculateRawPairedDailyRecords('harian', '07:15', mockStudents, records, targetDate, 'X-1', '');
    const s3 = paired.find((p) => p.student.nisn === '1003');

    expect(s3).toBeDefined();
    expect(s3?.status).toBe('Terlambat');
    expect(s3?.partialInfo).toBe('Lengkap');
    expect(s3?.lateMinutes).toBe(15);
  });

  it('Skenario 4: Masuk terlambat tanpa Pulang -> Terlambat & Tanpa Absen Pulang (Bukan Alpa)', () => {
    const records: AttendanceRecord[] = [
      {
        id: 'rec-4m',
        tanggal: targetDate,
        timestamp: `${targetDate}T07:25:00+09:00`,
        nisn: '1004',
        nama: 'Siswa Empat (Terlambat Tanpa Pulang)',
        kelas: 'X-1',
        jenis: 'Masuk',
        status: 'Terlambat',
        terlambatMenit: 10,
      },
    ];

    const paired = calculateRawPairedDailyRecords('harian', '07:15', mockStudents, records, targetDate, 'X-1', '');
    const s4 = paired.find((p) => p.student.nisn === '1004');

    expect(s4).toBeDefined();
    expect(s4?.status).toBe('Terlambat');
    expect(s4?.partialInfo).toBe('Tanpa Absen Pulang');
    expect(s4?.lateMinutes).toBe(10);
  });

  it('Skenario 5: Pulang saja (tanpa scan masuk) -> Hadir & Tanpa Absen Masuk / Perlu Verifikasi (Bukan Alpa)', () => {
    const records: AttendanceRecord[] = [
      {
        id: 'rec-5p',
        tanggal: targetDate,
        timestamp: `${targetDate}T14:05:00+09:00`,
        nisn: '1005',
        nama: 'Siswa Lima (Pulang Saja)',
        kelas: 'X-1',
        jenis: 'Pulang',
        status: 'Hadir',
      },
    ];

    const paired = calculateRawPairedDailyRecords('harian', '07:15', mockStudents, records, targetDate, 'X-1', '');
    const s5 = paired.find((p) => p.student.nisn === '1005');

    expect(s5).toBeDefined();
    expect(s5?.status).toBe('Hadir');
    expect(s5?.partialInfo).toBe('Tanpa Absen Masuk / Perlu Verifikasi');
    expect(s5?.masuk).toBeUndefined();
    expect(s5?.pulang).toBeDefined();
  });

  it('Skenario 6: Hanya siswa tanpa kedua scan yang ditetapkan Alpa saat Tutup Gerbang dijalankan', () => {
    // Siapkan presensi untuk siswa 1 - 5
    store.attendance = [
      // Siswa 1: Masuk + Pulang
      { id: '1m', tanggal: targetDate, timestamp: `${targetDate}T07:00:00+09:00`, nisn: '1001', nama: 'S1', kelas: 'X-1', jenis: 'Masuk', status: 'Hadir' },
      { id: '1p', tanggal: targetDate, timestamp: `${targetDate}T14:00:00+09:00`, nisn: '1001', nama: 'S1', kelas: 'X-1', jenis: 'Pulang', status: 'Hadir' },
      // Siswa 2: Masuk saja
      { id: '2m', tanggal: targetDate, timestamp: `${targetDate}T07:10:00+09:00`, nisn: '1002', nama: 'S2', kelas: 'X-1', jenis: 'Masuk', status: 'Hadir' },
      // Siswa 3: Masuk terlambat + Pulang
      { id: '3m', tanggal: targetDate, timestamp: `${targetDate}T07:30:00+09:00`, nisn: '1003', nama: 'S3', kelas: 'X-1', jenis: 'Masuk', status: 'Terlambat' },
      { id: '3p', tanggal: targetDate, timestamp: `${targetDate}T14:00:00+09:00`, nisn: '1003', nama: 'S3', kelas: 'X-1', jenis: 'Pulang', status: 'Terlambat' },
      // Siswa 4: Masuk terlambat saja
      { id: '4m', tanggal: targetDate, timestamp: `${targetDate}T07:25:00+09:00`, nisn: '1004', nama: 'S4', kelas: 'X-1', jenis: 'Masuk', status: 'Terlambat' },
      // Siswa 5: Pulang saja
      { id: '5p', tanggal: targetDate, timestamp: `${targetDate}T14:05:00+09:00`, nisn: '1005', nama: 'S5', kelas: 'X-1', jenis: 'Pulang', status: 'Hadir' },
      // Siswa 6: Tidak ada scan sama sekali
    ];

    // Cek kandidat calon Alpa sebelum konfirmasi (Tahap 4)
    const candidates = store.getCandidatesForCloseGate(targetDate, 'X-1');
    expect(candidates.length).toBe(1);
    expect(candidates[0].nisn).toBe('1006');

    // Eksekusi Tutup Gerbang
    const result = store.recordBulkStudentsAlpa(targetDate, 'X-1', 'Guru Piket');
    expect(result.success).toBe(true);
    expect(result.count).toBe(1);
    expect(result.updatedStudents[0].nisn).toBe('1006');

    // Pastikan siswa 6 tercatat Alpa dengan catatan Tutup Gerbang
    const rec6 = store.attendance.find((a) => a.nisn === '1006' && a.tanggal === targetDate);
    expect(rec6).toBeDefined();
    expect(rec6?.status).toBe('Alpa');
    expect(rec6?.catatan).toContain('Tutup Gerbang');

    // Pastikan siswa 2 (Masuk saja) dan siswa 5 (Pulang saja) TIDAK memiliki record Alpa
    const rec2Alpa = store.attendance.find((a) => a.nisn === '1002' && a.status === 'Alpa');
    const rec5Alpa = store.attendance.find((a) => a.nisn === '1005' && a.status === 'Alpa');
    expect(rec2Alpa).toBeUndefined();
    expect(rec5Alpa).toBeUndefined();
  });

  it('Skenario 7: Scan terlambat tersinkron setelah Tutup Gerbang -> Alpa otomatis dihapus/tergantikan tanpa data ganda', () => {
    // Siswa 6 awalnya diberi Alpa oleh Tutup Gerbang
    store.attendance = [
      {
        id: 'att-autoalpa-1006-test',
        tanggal: targetDate,
        timestamp: `${targetDate}T08:00:00+09:00`,
        nisn: '1006',
        nama: 'Siswa Enam (Tidak Ada Scan)',
        kelas: 'X-1',
        jenis: 'Masuk',
        status: 'Alpa',
        catatan: 'Tutup Gerbang (Tanpa Keterangan)',
      },
    ];

    expect(store.attendance.length).toBe(1);

    // Siswa 6 kemudian tiba terlambat atau scan tersinkron belakangan
    const lateRecord: AttendanceRecord = {
      id: 'rec-late-6',
      tanggal: targetDate,
      timestamp: `${targetDate}T08:15:00+09:00`,
      nisn: '1006',
      nama: 'Siswa Enam (Tidak Ada Scan)',
      kelas: 'X-1',
      jenis: 'Masuk',
      status: 'Terlambat',
      terlambatMenit: 60,
    };

    store.attendance.push(lateRecord);
    store.reconcileAttendanceWithLateScans();

    // Rekaman Alpa Tutup Gerbang harus terhapus, hanya menyisakan rekaman Terlambat asli
    const studentRecords = store.attendance.filter((a) => a.nisn === '1006');
    expect(studentRecords.length).toBe(1);
    expect(studentRecords[0].id).toBe('rec-late-6');
    expect(studentRecords[0].status).toBe('Terlambat');

    // Antrean sinkronisasi harus mencatat penghapusan record Alpa lama
    const deletedInQueue = store.syncQueue.find((q) => q.id === 'att-autoalpa-1006-test' && q.action === 'delete');
    expect(deletedInQueue).toBeDefined();
  });

  it('Skenario 8: Deteksi antrean sinkronisasi offline sebelum Tutup Gerbang', () => {
    // Tambahkan item antrean offline
    store.enqueueSync({
      id: 'offline-rec-1',
      type: 'attendance',
      action: 'upsert',
      data: { id: 'offline-rec-1', nisn: '1006', status: 'Hadir' },
    });

    const queueCount = store.getOfflineQueueCount();
    expect(queueCount).toBeGreaterThan(0);
  });

  it('Auto-Alpa otomatis tidak berjalan sendiri saat proses dimulai', () => {
    // Panggilan processAutoAlpa tidak menambahkan Alpa otomatis secara mandiri
    const res = store.processAutoAlpa(targetDate);
    expect(res.addedCount).toBe(0);
  });
});
