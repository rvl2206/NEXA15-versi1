const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src', 'components', 'AttendanceRecap.tsx');
let content = fs.readFileSync(targetFile, 'utf-8');
let lines = content.split('\n');

const importStr = `import {
  StudentMonthlySummary,
  PairedDailyRecord,
  normalizeToYyyyMmDd,
  isMatchKelas,
  isMatchTanggal,
  isMatchBulan,
  calculateMonthlyStudentSummaries,
  calculateRawPairedDailyRecords
} from '../lib/attendanceCalculations';`;
lines.splice(4, 0, importStr);

const idxInterface = lines.findIndex(l => l.includes('interface StudentMonthlySummary {'));
const idxInterfaceEnd = lines.findIndex((l, i) => i >= idxInterface && l.startsWith('}'));
lines.splice(idxInterface, idxInterfaceEnd - idxInterface + 1);

const idxIsMatchKelas = lines.findIndex(l => l.includes('const isMatchKelas = (itemClass?: string'));
const idxListUnique = lines.findIndex((l, i) => i > idxIsMatchKelas && l.includes('// List of unique available dates'));
lines.splice(idxIsMatchKelas, idxListUnique - idxIsMatchKelas);

const idxMonthly = lines.findIndex(l => l.includes('const monthlyStudentSummaries: StudentMonthlySummary[] = React.useMemo(() => {'));
const idxMonthlyEnd = lines.findIndex((l, i) => i >= idxMonthly && l.includes('}, [students, attendance, filterBulan, filterKelas, filterNama]);'));
const monthlyReplacement = `  const monthlyStudentSummaries: StudentMonthlySummary[] = React.useMemo(() => {
    const cutoffTime = store.getSettings().cutoffTime || '07:15';
    return calculateMonthlyStudentSummaries(students, attendance, filterKelas, filterNama, filterBulan, cutoffTime);
  }, [students, attendance, filterBulan, filterKelas, filterNama]);`;
lines.splice(idxMonthly, idxMonthlyEnd - idxMonthly + 1, monthlyReplacement);

const idxRaw = lines.findIndex(l => l.includes('const rawPairedDailyRecords = React.useMemo(() => {'));
const idxRawEnd = lines.findIndex((l, i) => i >= idxRaw && l.includes('}, [students, attendance, filterTanggal, filterKelas, filterNama, recapMode]);'));
const rawReplacement = `  const rawPairedDailyRecords: PairedDailyRecord[] = React.useMemo(() => {
    const cutoffTime = store.getSettings().cutoffTime || '07:15';
    return calculateRawPairedDailyRecords(recapMode, cutoffTime, students, attendance, filterTanggal, filterKelas, filterNama);
  }, [students, attendance, filterTanggal, filterKelas, filterNama, recapMode]);`;
lines.splice(idxRaw, idxRawEnd - idxRaw + 1, rawReplacement);

fs.writeFileSync(targetFile, lines.join('\n'), 'utf-8');
console.log('Refactoring complete!');
