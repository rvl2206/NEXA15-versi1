const fs = require('fs');
const content = fs.readFileSync('src/components/AttendanceRecap.tsx', 'utf-8');
const lines = content.split('\n');

const startMarker = '{/* Modal Import Data Kehadiran dari Excel */}';
const endMarker = '{/* Print Monthly Report & Student Slip Modal */}';

const startIndex = lines.findIndex(l => l.includes(startMarker));
const endIndex = lines.findIndex(l => l.includes(endMarker));

if (startIndex !== -1 && endIndex !== -1) {
  const newLines = lines.slice(0, startIndex);
  newLines.push('      <ImportAttendanceModal');
  newLines.push('        isOpen={isImportModalOpen}');
  newLines.push('        onClose={() => setIsImportModalOpen(false)}');
  newLines.push('        students={students}');
  newLines.push('        currentOfficer={currentOfficer}');
  newLines.push('        onExecuteImport={handleExecuteImport}');
  newLines.push('      />');
  newLines.push('');
  newLines.push('      ' + lines[endIndex].trim());
  newLines.push(...lines.slice(endIndex + 1));
  
  fs.writeFileSync('src/components/AttendanceRecap.tsx', newLines.join('\n'), 'utf-8');
  console.log('Replaced JSX');
} else {
  console.log('Markers not found', startIndex, endIndex);
}
