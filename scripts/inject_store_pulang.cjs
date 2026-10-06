const fs = require('fs');
const content = fs.readFileSync('src/lib/store.ts', 'utf-8');

const injection = `
  public recordStudentPulang1430(
    student: Student,
    targetDate: string,
    officerEmail: string
  ): { success: boolean; message: string } {
    const normTarget = this.normalizeToYyyyMmDd(targetDate);
    const timestampPulang = \`\${normTarget}T14:30:00+09:00\`;
    const record: AttendanceRecord = {
      id: crypto.randomUUID(),
      tanggal: normTarget,
      timestamp: timestampPulang,
      nisn: student.nisn,
      nama: student.nama,
      kelas: student.kelas,
      id_qr: student.id_qr || '',
      jenis: 'Pulang',
      status: 'Hadir',
      petugas: officerEmail,
      scan_method: 'Manual',
      catatan: 'Set otomatis 14:30 WIT'
    };
    this.attendance.push(record);
    this.addLog('PRESENSI_MANUAL', \`Set otomatis pulang 14:30 WIT untuk \${student.nama}\`);
    this.triggerSubscribers();
    this.saveToLocalStore();
    return { success: true, message: 'OK' };
  }

  public recordBulkStudentsPulang1430(
    targetDate: string,
    filterKelas = 'Semua',
    officerEmail = 'Admin'
  ): { success: boolean; count: number; message: string } {
    const normTarget = this.normalizeToYyyyMmDd(targetDate);
    const timestampPulang = \`\${normTarget}T14:30:00+09:00\`;
    const dayRecords = this.attendance.filter(a => this.isRecordForDate(a, normTarget));
    
    let count = 0;
    this.students.forEach(student => {
      if (student.status === 'nonaktif') return;
      if (filterKelas !== 'Semua' && student.kelas !== filterKelas) return;
      
      const studentDayRecords = dayRecords.filter(a => a.nisn === student.nisn);
      const hasMasuk = studentDayRecords.some(a => a.jenis === 'Masuk' && a.status === 'Hadir');
      const hasPulang = studentDayRecords.some(a => a.jenis === 'Pulang');
      
      if (hasMasuk && !hasPulang) {
        const record: AttendanceRecord = {
          id: crypto.randomUUID(),
          tanggal: normTarget,
          timestamp: timestampPulang,
          nisn: student.nisn,
          nama: student.nama,
          kelas: student.kelas,
          id_qr: student.id_qr || '',
          jenis: 'Pulang',
          status: 'Hadir',
          petugas: officerEmail,
          scan_method: 'Manual',
          catatan: 'Set otomatis 14:30 WIT'
        };
        this.attendance.push(record);
        count++;
      }
    });

    if (count > 0) {
      this.addLog('PRESENSI_MANUAL', \`Set otomatis pulang 14:30 WIT untuk \${count} siswa\`);
      this.triggerSubscribers();
      this.saveToLocalStore();
    }
    
    return { success: true, count, message: 'OK' };
  }
`;

const replaceTarget = "public recordBulkStudentsAlpa(";
const newContent = content.replace(replaceTarget, injection + '\n  ' + replaceTarget);
fs.writeFileSync('src/lib/store.ts', newContent, 'utf-8');
console.log('Injected store.ts methods');
