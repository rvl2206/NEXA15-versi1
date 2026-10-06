const fs = require('fs');
let content = fs.readFileSync('src/components/AttendanceRecap.tsx', 'utf-8');

// 1. Add import
if (!content.includes('import { ManualInputModal } from ')) {
  content = content.replace(
    'import { PrintReportModal } from \'./PrintReportModal\';',
    'import { PrintReportModal } from \'./PrintReportModal\';\nimport { ManualInputModal } from \'./ManualInputModal\';'
  );
}

// 2. Remove manualForm state
content = content.replace(
  /  const \[manualForm, setManualForm\] = useState\(\{[\s\S]*?  \}\);\n/g,
  ''
);

// 3. Replace handleManualSubmit
content = content.replace(
  /  const handleManualSubmit = \(e: React.FormEvent\) => \{[\s\S]*?    setIsManualModalOpen\(false\);\n  \};\n/g,
  `  const handleManualSubmit = (studentNisn: string, jenis: AttendanceType, status: AttendanceStatus, catatan: string) => {
    const student = students.find((s) => s.nisn === studentNisn);
    if (!student) {
      toast.error('Siswa Tidak Ditemukan', 'Silakan pilih siswa yang valid dari daftar.');
      return;
    }

    store.addAttendanceRecord({
      studentId: student.id,
      studentName: student.nama,
      kelas: student.kelas,
      jenis: jenis,
      status: status,
      petugas: currentOfficer,
      catatan: catatan,
    });

    toast.success('Presensi Dicatat', \`Presensi \${status} untuk \${student.nama} (\${jenis}) berhasil dicatat.\`);
    setIsManualModalOpen(false);
  };\n`
);

// 4. Replace Modal JSX
const startMarker = '{/* Manual Input Modal */}';
const endMarker = '{/* Modal Import Data Kehadiran dari Excel */}';

const lines = content.split('\n');
let start = lines.findIndex(l => l.includes(startMarker));
let end = lines.findIndex(l => l.includes(endMarker));

if (start !== -1 && end !== -1) {
  const newLines = lines.slice(0, start);
  newLines.push('      <ManualInputModal');
  newLines.push('        isOpen={isManualModalOpen}');
  newLines.push('        onClose={() => setIsManualModalOpen(false)}');
  newLines.push('        students={students}');
  newLines.push('        onSubmit={handleManualSubmit}');
  newLines.push('      />');
  newLines.push('');
  newLines.push('      ' + endMarker);
  newLines.push(...lines.slice(end + 1));
  fs.writeFileSync('src/components/AttendanceRecap.tsx', newLines.join('\n'), 'utf-8');
  console.log('Replaced manual input modal');
} else {
  console.log('Could not find modal bounds');
  fs.writeFileSync('src/components/AttendanceRecap.tsx', content, 'utf-8');
}
