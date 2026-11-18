import { describe, it, expect } from 'vitest';
import {
  findDoubleMasukRecords,
  findClassMismatchRecords,
} from './attendanceRepair';
import type { AttendanceRecord, Student } from '../types';

describe('attendanceRepair utilities', () => {
  it('detects double Masuk scans and identifies earliest record as firstRecord', () => {
    const mockAttendance: Partial<AttendanceRecord>[] = [
      {
        id: 'rec-1',
        nisn: '12345',
        nama: 'Ahmad',
        kelas: 'X',
        tanggal: '2026-11-18',
        jenis: 'Masuk',
        timestamp: '2026-11-18T07:05:00.000Z',
      },
      {
        id: 'rec-2',
        nisn: '12345',
        nama: 'Ahmad',
        kelas: 'X',
        tanggal: '2026-11-18',
        jenis: 'Masuk',
        timestamp: '2026-11-18T07:15:00.000Z', // duplicate later scan
      },
      {
        id: 'rec-3',
        nisn: '67890',
        nama: 'Budi',
        kelas: 'XI',
        tanggal: '2026-11-18',
        jenis: 'Masuk',
        timestamp: '2026-11-18T07:10:00.000Z',
      },
    ];

    const anomalies = findDoubleMasukRecords(mockAttendance as AttendanceRecord[]);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].studentNisn).toBe('12345');
    expect(anomalies[0].firstRecord.id).toBe('rec-1'); // earliest kept
    expect(anomalies[0].duplicateRecords).toHaveLength(1);
    expect(anomalies[0].duplicateRecords[0].id).toBe('rec-2'); // duplicate identified
  });

  it('detects class mismatches between attendance records and student master data', () => {
    const mockStudents: Partial<Student>[] = [
      { nisn: '12345', nama: 'Ahmad', kelas: 'XI' }, // student is in XI
      { nisn: '67890', nama: 'Budi', kelas: 'XII' },
    ];

    const mockAttendance: Partial<AttendanceRecord>[] = [
      {
        id: 'rec-1',
        nisn: '12345',
        nama: 'Ahmad',
        kelas: 'X', // mismatch: record says X, master says XI
        tanggal: '2026-11-18',
        jenis: 'Masuk',
      },
      {
        id: 'rec-2',
        nisn: '67890',
        nama: 'Budi',
        kelas: 'XII', // matched
        tanggal: '2026-11-18',
        jenis: 'Masuk',
      },
    ];

    const mismatches = findClassMismatchRecords(
      mockAttendance as AttendanceRecord[],
      mockStudents as Student[]
    );

    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].recordId).toBe('rec-1');
    expect(mismatches[0].currentAttendanceClass).toBe('X');
    expect(mismatches[0].expectedMasterClass).toBe('XI');
  });

  it('ensures zero data loss when aligning class names', () => {
    const mockStudents: Partial<Student>[] = [
      { nisn: '12345', nama: 'Ahmad', kelas: 'XI' },
    ];

    const mockAttendance: Partial<AttendanceRecord>[] = [
      {
        id: 'rec-1',
        nisn: '12345',
        nama: 'Ahmad',
        kelas: 'X',
        tanggal: '2026-11-18',
        jenis: 'Masuk',
      },
    ];

    const mismatches = findClassMismatchRecords(
      mockAttendance as AttendanceRecord[],
      mockStudents as Student[]
    );

    // Apply alignment
    mismatches.forEach((m) => {
      m.record.kelas = m.expectedMasterClass;
    });

    // Verification: attendance record is preserved, count is 1, class is updated
    expect(mockAttendance).toHaveLength(1);
    expect(mockAttendance[0].kelas).toBe('XI');
    expect(mockAttendance[0].id).toBe('rec-1');
  });
});
