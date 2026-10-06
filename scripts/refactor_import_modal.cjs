const fs = require('fs');
let content = fs.readFileSync('src/components/AttendanceRecap.tsx', 'utf-8');

// 1. Add import
if (!content.includes('import { ImportAttendanceModal } from ')) {
  content = content.replace(
    'import { ManualInputModal } from \'./ManualInputModal\';',
    'import { ManualInputModal } from \'./ManualInputModal\';\nimport { ImportAttendanceModal } from \'./ImportAttendanceModal\';'
  );
}

// 2. Remove states
content = content.replace(/  const \[importFile, setImportFile\] = useState.*?;\n/g, '');
content = content.replace(/  const \[importPreview, setImportPreview\] = useState.*?;\n/g, '');
content = content.replace(/  const \[importErrors, setImportErrors\] = useState.*?;\n/g, '');
content = content.replace(/  const \[importTotalRows, setImportTotalRows\] = useState.*?;\n/g, '');
content = content.replace(/  const \[isParsing, setIsParsing\] = useState.*?;\n/g, '');
content = content.replace(/  const \[importMode, setImportMode\] = useState.*?;\n/g, '');

// 3. Replace handleExecuteImport
content = content.replace(
  /  const handleExecuteImport = \(\) => \{[\s\S]*?    setImportErrors\(\[\]\);\n  \};\n/g,
  `  const handleExecuteImport = (records: Omit<AttendanceRecord, 'id'>[], mode: 'append' | 'replace') => {
    store.importAttendanceRecords(records, mode);
    setIsImportModalOpen(false);
  };\n`
);

// 4. Remove resetImportModal
content = content.replace(
  /  const resetImportModal = \(\) => \{[\s\S]*?    setIsImportModalOpen\(false\);\n  \};\n/g,
  ''
);

// 5. Replace handleFileUpload - wait, where was it?
content = content.replace(
  /  const handleFileUpload = async \(e: React.ChangeEvent<HTMLInputElement>\) => \{[\s\S]*?    \}\n  \};\n/g,
  ''
);

// 6. Replace Modal JSX
const startMarker = '{/* Modal Import Data Kehadiran dari Excel */}';
const endMarker = '{/* Modal Koreksi Absensi */}';

const lines = content.split('\n');
let start = lines.findIndex(l => l.includes(startMarker));
let end = lines.findIndex(l => l.includes(endMarker)) - 1; // back up to closing tag

if (start !== -1 && end !== -1) {
  const newLines = lines.slice(0, start);
  newLines.push('      <ImportAttendanceModal');
  newLines.push('        isOpen={isImportModalOpen}');
  newLines.push('        onClose={() => setIsImportModalOpen(false)}');
  newLines.push('        students={students}');
  newLines.push('        currentOfficer={currentOfficer}');
  newLines.push('        onExecuteImport={handleExecuteImport}');
  newLines.push('      />');
  newLines.push('');
  newLines.push('      ' + endMarker);
  // because end points to before endMarker
  newLines.push(...lines.slice(end + 2)); 
  fs.writeFileSync('src/components/AttendanceRecap.tsx', newLines.join('\n'), 'utf-8');
  console.log('Replaced import modal');
} else {
  console.log('Could not find modal bounds', start, end);
  fs.writeFileSync('src/components/AttendanceRecap.tsx', content, 'utf-8');
}
