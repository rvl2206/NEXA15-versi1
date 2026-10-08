import sys

with open(r'c:\Users\Administrator\.gemini\antigravity-ide\scratch\NEXA15-versi1\src\components\AttendanceRecap.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

import_str = """import {
  StudentMonthlySummary,
  PairedDailyRecord,
  normalizeToYyyyMmDd,
  isMatchKelas,
  isMatchTanggal,
  isMatchBulan,
  calculateMonthlyStudentSummaries,
  calculateRawPairedDailyRecords
} from '../lib/attendanceCalculations';
"""
lines.insert(4, import_str)

idx_interface = next(i for i, l in enumerate(lines) if "interface StudentMonthlySummary {" in l)
idx_interface_end = next(i for i in range(idx_interface, len(lines)) if lines[i].startswith("}"))
del lines[idx_interface:idx_interface_end+1]

idx_isMatchKelas = next(i for i, l in enumerate(lines) if "const isMatchKelas = (itemClass?: string" in l)
idx_listUnique = next(i for i, l in enumerate(lines) if "// List of unique available dates" in l)
del lines[idx_isMatchKelas:idx_listUnique]

idx_monthly = next(i for i, l in enumerate(lines) if "const monthlyStudentSummaries: StudentMonthlySummary[] = React.useMemo(() => {" in l)
idx_monthly_end = next(i for i in range(idx_monthly, len(lines)) if "}, [students, attendance, filterBulan, filterKelas, filterNama]);" in l)

monthly_replacement = """  const monthlyStudentSummaries: StudentMonthlySummary[] = React.useMemo(() => {
    const cutoffTime = store.getSettings().cutoffTime || '07:15';
    return calculateMonthlyStudentSummaries(students, attendance, filterKelas, filterNama, filterBulan, cutoffTime);
  }, [students, attendance, filterBulan, filterKelas, filterNama]);\n"""
lines[idx_monthly:idx_monthly_end+1] = [monthly_replacement]

idx_raw = next(i for i, l in enumerate(lines) if "const rawPairedDailyRecords = React.useMemo(() => {" in l)
idx_raw_end = next(i for i in range(idx_raw, len(lines)) if "}, [students, attendance, filterTanggal, filterKelas, filterNama, recapMode]);" in l)

raw_replacement = """  const rawPairedDailyRecords: PairedDailyRecord[] = React.useMemo(() => {
    const cutoffTime = store.getSettings().cutoffTime || '07:15';
    return calculateRawPairedDailyRecords(recapMode, cutoffTime, students, attendance, filterTanggal, filterKelas, filterNama);
  }, [students, attendance, filterTanggal, filterKelas, filterNama, recapMode]);\n"""
lines[idx_raw:idx_raw_end+1] = [raw_replacement]

with open(r'c:\Users\Administrator\.gemini\antigravity-ide\scratch\NEXA15-versi1\src\components\AttendanceRecap.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
