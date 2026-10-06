const fs = require('fs');

const content = fs.readFileSync('src/lib/store.ts', 'utf8');

const regex = /public getProblematicStudentsAnalysis[\s\S]*?if \(options\?\.searchQuery\) {/g;

const replacement = `public getProblematicStudentsAnalysis(options?: {
    kelas?: string;
    bulan?: string;
    minAlpa?: number;
    minTerlambat?: number;
    maxAttendanceRate?: number;
    riskLevel?: string;
    searchQuery?: string;
  }): Array<{
    student: Student;
    waliKelas: { name: string; nip?: string; phone?: string; source: string };
    totalDays: number;
    hadirCount: number;
    terlambatCount: number;
    sakitCount: number;
    izinCount: number;
    alpaCount: number;
    attendanceRate: number;
    riskLevel: 'Tinggi' | 'Sedang' | 'Perhatian';
    reasons: string[];
    datesWithIssues: Array<{ tanggal: string; status: AttendanceStatus; catatan?: string; terlambatMenit?: number }>;
    aiRecommendation: string;
    latestDispatch?: ProblematicStudentDispatch;
  }> {
    const activeStudents = this.students.filter((s) => s.status === 'aktif');
    const isFilteredMonth = Boolean(options?.bulan && options.bulan !== 'Semua');
    const scopedAttendance = isFilteredMonth
      ? this.attendance.filter((a) => a.tanggal.startsWith(options!.bulan!))
      : this.attendance;

    // Only count 'Masuk' dates as valid school days to prevent false implicit absences from just 'Pulang'
    const allUniqueDates = Array.from(new Set(scopedAttendance.filter(a => a.jenis === 'Masuk').map((a) => a.tanggal)));
    
    if (allUniqueDates.length === 0) {
      return [];
    }

    const totalRecordedDays = allUniqueDates.length;

    const minAlpa = options?.minAlpa ?? this.settings.problemThresholdAlpa ?? 2;
    const minTerlambat = options?.minTerlambat ?? this.settings.problemThresholdTerlambat ?? 3;
    const maxAttendanceRate = options?.maxAttendanceRate ?? this.settings.problemThresholdMinRate ?? 75;

    const list: Array<any> = [];

    activeStudents.forEach((student) => {
      if (options?.kelas && options.kelas !== 'Semua Kelas' && options.kelas !== 'Semua' && student.kelas !== options.kelas) {
        return;
      }

      const studentRecords = scopedAttendance.filter((a) => a.nisn === student.nisn && a.jenis === 'Masuk');
      const studentUniqueDates = new Set(studentRecords.map((r) => r.tanggal));
      
      // Calculate missing records as implicit 'Alpa'
      const implicitAlpaCount = Math.max(0, totalRecordedDays - studentUniqueDates.size);

      let hadirCount = 0;
      let terlambatCount = 0;
      let sakitCount = 0;
      let izinCount = 0;
      let alpaCount = implicitAlpaCount;
      const datesWithIssues: Array<{ tanggal: string; status: AttendanceStatus; catatan?: string; terlambatMenit?: number }> = [];

      // Add implicit alpa dates to datesWithIssues
      if (implicitAlpaCount > 0) {
        allUniqueDates.forEach(date => {
          if (!studentUniqueDates.has(date)) {
            datesWithIssues.push({ tanggal: date, status: 'Alpa', catatan: 'Tanpa Keterangan (Tidak Tercatat)' });
          }
        });
      }

      studentRecords.forEach((r) => {
        if (r.status === 'Hadir') {
          hadirCount++;
        } else if (r.status === 'Terlambat') {
          terlambatCount++;
          datesWithIssues.push({ tanggal: r.tanggal, status: r.status, catatan: r.catatan, terlambatMenit: r.terlambatMenit });
        } else if (r.status === 'Sakit') {
          sakitCount++;
          datesWithIssues.push({ tanggal: r.tanggal, status: r.status, catatan: r.catatan });
        } else if (r.status === 'Izin') {
          izinCount++;
          datesWithIssues.push({ tanggal: r.tanggal, status: r.status, catatan: r.catatan });
        } else if (r.status === 'Alpa') {
          alpaCount++;
          datesWithIssues.push({ tanggal: r.tanggal, status: r.status, catatan: r.catatan });
        }
      });

      const totalPresent = hadirCount + terlambatCount;
      const attendanceRate = totalRecordedDays > 0 ? Math.round((totalPresent / totalRecordedDays) * 100) : 100;

      const reasons: string[] = [];

      const hasAlpaProblem = alpaCount >= minAlpa;
      if (hasAlpaProblem) {
        reasons.push(\`Memiliki \${alpaCount} kali Alpa (termasuk yang tidak tercatat).\`);
      }

      const hasTerlambatProblem = terlambatCount >= minTerlambat;
      if (terlambatCount >= minTerlambat + 2) {
        reasons.push(\`Sangat sering terlambat (\${terlambatCount} kali).\`);
      } else if (hasTerlambatProblem) {
        reasons.push(\`Sering terlambat masuk sekolah (\${terlambatCount} kali).\`);
      }

      const hasRateProblem = totalRecordedDays >= 3 && attendanceRate < maxAttendanceRate;
      if (hasRateProblem) {
        if (attendanceRate < maxAttendanceRate - 10) {
          reasons.push(\`Persentase kehadiran sangat kritis (\${attendanceRate}%).\`);
        } else {
          reasons.push(\`Persentase kehadiran di bawah standar minimal (\${attendanceRate}% < \${maxAttendanceRate}%).\`);
        }
      }

      const hasExcessivePermit = (sakitCount + izinCount) >= 5;
      if (hasExcessivePermit) {
        reasons.push(\`Akumulasi izin/sakit sangat tinggi (\${sakitCount} Sakit, \${izinCount} Izin).\`);
      }

      const isProblematic = hasAlpaProblem || hasTerlambatProblem || hasRateProblem || hasExcessivePermit;

      if (isProblematic) {
        let riskLevel: 'Tinggi' | 'Sedang' | 'Perhatian' = 'Sedang';

        if (alpaCount >= Math.max(minAlpa + 1, 3) || terlambatCount >= Math.max(minTerlambat + 2, 6) || (hasRateProblem && attendanceRate < 65)) {
          riskLevel = 'Tinggi';
        } else if (hasAlpaProblem || hasTerlambatProblem || hasRateProblem) {
          riskLevel = 'Sedang';
        } else {
          riskLevel = 'Perhatian';
        }

        if (options?.riskLevel && options.riskLevel !== 'semua' && options.riskLevel !== 'Semua' && riskLevel !== options.riskLevel) {
          return;
        }

        if (options?.searchQuery) {`;

const newContent = content.replace(regex, replacement);

fs.writeFileSync('src/lib/store.ts', newContent, 'utf8');
console.log('Done replacement!');
