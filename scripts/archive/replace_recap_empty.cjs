const fs = require('fs');

let t = fs.readFileSync('src/components/TeacherAttendanceRecap.tsx', 'utf8');

const regex = /<td colSpan=\{12\} className="p-8 text-center text-slate-400">\s*<UserCheck className="w-8 h-8 mx-auto mb-2 opacity-40" \/>\s*<p className="font-medium">Tidak ada rekaman presensi guru yang sesuai dengan filter.<\/p>\s*<\/td>/;

t = t.replace(regex, '<td colSpan={12} className="p-4"><EmptyStateWidget title="Data Kehadiran Kosong" message="Tidak ada rekaman presensi guru yang sesuai dengan filter." /></td>');

if(t.includes('EmptyStateWidget') && !t.includes('import { EmptyStateWidget }')) {
  t = t.replace("import { SchoolLogo } from './SchoolLogo';", "import { SchoolLogo } from './SchoolLogo';\nimport { EmptyStateWidget } from './EmptyStateWidget';");
}

fs.writeFileSync('src/components/TeacherAttendanceRecap.tsx', t);
console.log("TeacherAttendanceRecap Empty State updated.");
