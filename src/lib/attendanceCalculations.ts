import { Student, AttendanceRecord, AttendanceStatus } from '../types';
import { calculateLateMinutes } from './exportUtils';

export interface StudentMonthlySummary {
  student: Student;
  hadir: number;
  terlambat: number;
  totalTerlambatMenit: number;
  izin: number;
  sakit: number;
  alpa: number;
  totalMasuk: number;
  persentaseHadir: number;
  tanpaAbsenPulang: number;
  tanpaAbsenMasuk: number;
}

export const normalizeToYyyyMmDd = (dateStr?: string): string => {
  if (!dateStr) return '';
  let s = dateStr.trim();
  if (s.includes('T')) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jayapura' });
    }
    s = s.split('T')[0];
  }
  const parts = s.split(/[-/.]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    } else if (parts[2].length === 4) {
      // DD-MM-YYYY
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return s;
};

export const isMatchKelas = (itemClass?: string, targetClass?: string) => {
  if (!targetClass || targetClass === 'Semua') return true;
  if (!itemClass) return false;
  return itemClass.trim().toLowerCase() === targetClass.trim().toLowerCase();
};

export const isMatchTanggal = (r: AttendanceRecord, yyyyMmDd: string) => {
  if (!yyyyMmDd) return true;
  const targetNorm = normalizeToYyyyMmDd(yyyyMmDd);
  const recordNorm = normalizeToYyyyMmDd(r.tanggal);
  if (recordNorm === targetNorm) return true;

  // Check raw substring match for fallback
  if (r.tanggal && (r.tanggal.includes(yyyyMmDd) || yyyyMmDd.includes(r.tanggal))) return true;

  if (r.timestamp) {
    const tsNorm = normalizeToYyyyMmDd(r.timestamp);
    if (tsNorm === targetNorm) return true;
  }
  return false;
};

export const isMatchBulan = (r: AttendanceRecord, yyyyMm: string) => {
  if (!yyyyMm) return true;
  const recordNorm = normalizeToYyyyMmDd(r.tanggal);
  if (recordNorm.startsWith(yyyyMm)) return true;

  if (r.timestamp) {
    const tsNorm = normalizeToYyyyMmDd(r.timestamp);
    if (tsNorm.startsWith(yyyyMm)) return true;
  }
  return false;
};

export const calculateMonthlyStudentSummaries = (
  students: Student[],
  attendance: AttendanceRecord[],
  filterKelas: string,
  filterNama: string,
  filterBulan: string,
  cutoffTime: string
): StudentMonthlySummary[] => {
  const activeStudents = students.filter((s) => {
    const matchKelas = isMatchKelas(s.kelas, filterKelas);
    const matchNama =
      !filterNama ||
      s.nama.toLowerCase().includes(filterNama.toLowerCase()) ||
      s.nisn.includes(filterNama);
    return matchKelas && matchNama;
  });

  const recordsInMonth = attendance.filter((r) => isMatchBulan(r, filterBulan));

  // Get unique dates with active attendance in the selected month
  const uniqueActiveDates = Array.from(
    new Set(
      recordsInMonth
        .map((r) => normalizeToYyyyMmDd(r.tanggal) || normalizeToYyyyMmDd(r.timestamp))
        .filter(Boolean)
    )
  );

  return activeStudents.map((student) => {
    let hadir = 0;
    let terlambat = 0;
    let totalTerlambatMenit = 0;
    let izin = 0;
    let sakit = 0;
    let alpa = 0;
    let tanpaAbsenPulang = 0;
    let tanpaAbsenMasuk = 0;

    if (uniqueActiveDates.length === 0) {
      const studentRecords = recordsInMonth.filter((r) => r.nisn === student.nisn && r.jenis === 'Masuk');
      studentRecords.forEach((r) => {
        if (r.status === 'Hadir') hadir++;
        else if (r.status === 'Terlambat') {
          terlambat++;
          totalTerlambatMenit += calculateLateMinutes(r, cutoffTime);
        } else if (r.status === 'Izin') izin++;
        else if (r.status === 'Sakit') sakit++;
        else if (r.status === 'Alpa') alpa++;
      });
    } else {
      uniqueActiveDates.forEach((dateStr) => {
        const dayRecords = recordsInMonth.filter(
          (r) => r.nisn === student.nisn && (normalizeToYyyyMmDd(r.tanggal) === dateStr || normalizeToYyyyMmDd(r.timestamp) === dateStr)
        );
        const masuk = dayRecords.find((r) => r.jenis === 'Masuk');
        const pulang = dayRecords.find((r) => r.jenis === 'Pulang');

        if (masuk) {
          if (masuk.status === 'Hadir') {
            hadir++;
          } else if (masuk.status === 'Terlambat') {
            terlambat++;
            totalTerlambatMenit += calculateLateMinutes(masuk, cutoffTime);
          } else if (masuk.status === 'Izin') {
            izin++;
          } else if (masuk.status === 'Sakit') {
            sakit++;
          } else if (masuk.status === 'Alpa') {
            alpa++;
          }

          if (!pulang && (masuk.status === 'Hadir' || masuk.status === 'Terlambat')) {
            tanpaAbsenPulang++;
          }
        } else if (pulang) {
          hadir++;
          tanpaAbsenMasuk++;
        } else {
          // No scan on an active attendance day => Automated ALPA
          alpa++;
        }
      });
    }

    const totalMasuk = hadir + terlambat + izin + sakit + alpa;
    const totalHadirAtauTerlambat = hadir + terlambat;
    const totalHari = uniqueActiveDates.length || totalMasuk;
    const persentaseHadir = totalHari > 0 ? Math.round((totalHadirAtauTerlambat / totalHari) * 100) : 100;

    return {
      student,
      hadir,
      terlambat,
      totalTerlambatMenit,
      izin,
      sakit,
      alpa,
      totalMasuk,
      persentaseHadir,
      tanpaAbsenPulang,
      tanpaAbsenMasuk,
    };
  });
};

export interface PairedDailyRecord {
  student: Student;
  masuk?: AttendanceRecord;
  pulang?: AttendanceRecord;
  status: AttendanceStatus;
  lateMinutes: number;
  partialInfo: 'Lengkap' | 'Tanpa Absen Pulang' | 'Tanpa Absen Masuk' | 'Tanpa Absen';
  petugas: string;
}

export const calculateRawPairedDailyRecords = (
  recapMode: string,
  cutoffTime: string,
  students: Student[],
  attendance: AttendanceRecord[],
  filterTanggal: string,
  filterKelas: string,
  filterNama: string
): PairedDailyRecord[] => {
  if (recapMode !== 'harian' && recapMode !== 'semua') return [];

  const activeStudents = students.filter((s) => {
    const matchKelas = isMatchKelas(s.kelas, filterKelas);
    const matchNama =
      !filterNama ||
      s.nama.toLowerCase().includes(filterNama.toLowerCase()) ||
      s.nisn.includes(filterNama);
    return matchKelas && matchNama;
  });

  const dayRecords = attendance.filter((r) => isMatchTanggal(r, filterTanggal));
  const activeStudentNisns = new Set(activeStudents.map((s) => s.nisn).filter(Boolean));

  // 1. Process active registered students
  const paired: PairedDailyRecord[] = activeStudents.map((student) => {
    const studentDayRecords = dayRecords.filter((r) => r.nisn === student.nisn);
    const masuk = studentDayRecords.find((r) => r.jenis === 'Masuk');
    const pulang = studentDayRecords.find((r) => r.jenis === 'Pulang');

    let status: AttendanceStatus = 'Alpa';
    let lateMinutes = 0;
    let partialInfo: 'Lengkap' | 'Tanpa Absen Pulang' | 'Tanpa Absen Masuk' | 'Tanpa Absen' = 'Tanpa Absen';

    if (masuk) {
      status = masuk.status;
      lateMinutes = calculateLateMinutes(masuk, cutoffTime);
      if (!pulang && (status === 'Hadir' || status === 'Terlambat')) {
        partialInfo = 'Tanpa Absen Pulang';
      } else {
        partialInfo = 'Lengkap';
      }
    } else if (pulang) {
      status = 'Hadir';
      partialInfo = 'Tanpa Absen Masuk';
    } else {
      status = 'Alpa';
      partialInfo = 'Tanpa Absen';
    }

    return {
      student,
      masuk,
      pulang,
      status,
      lateMinutes,
      partialInfo,
      petugas: masuk?.petugas || pulang?.petugas || '-',
    };
  });

  // 2. Also account for any attendance records on this date matching the class filter whose student isn't in activeStudents list
  const unlinkedRecords = dayRecords.filter((r) => {
    if (activeStudentNisns.has(r.nisn)) return false;
    const matchKelas = isMatchKelas(r.kelas, filterKelas);
    const matchNama =
      !filterNama ||
      r.nama.toLowerCase().includes(filterNama.toLowerCase()) ||
      r.nisn.includes(filterNama);
    return matchKelas && matchNama;
  });

  const unlinkedNisns: string[] = Array.from(new Set<string>(unlinkedRecords.map((r) => r.nisn).filter(Boolean)));
  unlinkedNisns.forEach((nisn) => {
    const studentDayRecords = unlinkedRecords.filter((r) => r.nisn === nisn);
    const masuk = studentDayRecords.find((r) => r.jenis === 'Masuk');
    const pulang = studentDayRecords.find((r) => r.jenis === 'Pulang');
    const sample = masuk || pulang || studentDayRecords[0];

    const syntheticStudent: Student = {
      id: `unlinked-${nisn}`,
      nisn: nisn,
      nama: sample.nama || `Siswa ${nisn}`,
      kelas: sample.kelas || (filterKelas !== 'Semua' ? filterKelas : 'X'),
      id_qr: sample.id_qr || nisn,
      foto: '',
      status: 'aktif',
    };

    let status: AttendanceStatus = 'Alpa';
    let lateMinutes = 0;
    let partialInfo: 'Lengkap' | 'Tanpa Absen Pulang' | 'Tanpa Absen Masuk' | 'Tanpa Absen' = 'Tanpa Absen';

    if (masuk) {
      status = masuk.status;
      lateMinutes = calculateLateMinutes(masuk, cutoffTime);
      if (!pulang && (status === 'Hadir' || status === 'Terlambat')) {
        partialInfo = 'Tanpa Absen Pulang';
      } else {
        partialInfo = 'Lengkap';
      }
    } else if (pulang) {
      status = 'Hadir';
      partialInfo = 'Tanpa Absen Masuk';
    }

    paired.push({
      student: syntheticStudent,
      masuk,
      pulang,
      status,
      lateMinutes,
      partialInfo,
      petugas: masuk?.petugas || pulang?.petugas || '-',
    });
  });

  return paired;
};
