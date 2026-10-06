const fs = require('fs');
const content = fs.readFileSync('src/components/AttendanceRecap.tsx', 'utf-8');
const lines = content.split('\n');

const startMarker = '{/* Print Monthly Report & Student Slip Modal */}';
const endMarker = '<AttendanceRecoveryModal';

const startIndex = lines.findIndex(l => l.includes(startMarker));
const endIndex = lines.findIndex(l => l.includes(endMarker));

if (startIndex !== -1 && endIndex !== -1) {
  const newLines = lines.slice(0, startIndex);
  newLines.push('      <PrintReportModal');
  newLines.push('        isOpen={isPrintModalOpen}');
  newLines.push('        onClose={() => setIsPrintModalOpen(false)}');
  newLines.push('        students={students}');
  newLines.push('        monthlyStudentSummaries={monthlyStudentSummaries}');
  newLines.push('        printStudentSlip={printStudentSlip}');
  newLines.push('        setPrintStudentSlip={setPrintStudentSlip}');
  newLines.push('        printWaliKelasName={printWaliKelasName}');
  newLines.push('        setPrintWaliKelasName={setPrintWaliKelasName}');
  newLines.push('        filterBulan={filterBulan}');
  newLines.push('        filterKelas={filterKelas}');
  newLines.push('        todayISO={todayISO}');
  newLines.push('        formatIndoMonth={formatIndoMonth}');
  newLines.push('        formatIndoDate={formatIndoDate}');
  newLines.push('        currentOfficer={currentOfficer}');
  newLines.push('      />');
  newLines.push('');
  newLines.push('      ' + lines[endIndex].trim());
  newLines.push(...lines.slice(endIndex + 1));
  
  fs.writeFileSync('src/components/AttendanceRecap.tsx', newLines.join('\n'), 'utf-8');
  console.log('Replaced PrintReportModal JSX');
} else {
  console.log('Markers not found', startIndex, endIndex);
}
