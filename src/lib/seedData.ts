import { Student, AttendanceRecord, Teacher } from '../types';
import { MASTER_STUDENTS_DATA } from './masterStudentData';

export const INITIAL_STUDENTS: Student[] = MASTER_STUDENTS_DATA.map((s, idx) => ({
  ...s,
  id: `std-official-${String(idx + 1).padStart(3, '0')}`,
  createdAt: '2026-01-01T08:00:00.000Z',
}));

export const INITIAL_TEACHERS: Teacher[] = [];

export function generateSeedAttendance(): AttendanceRecord[] {
  return [];
}
