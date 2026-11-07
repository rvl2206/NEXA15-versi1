const fs = require('fs');

let s = fs.readFileSync('src/components/StudentManagement.tsx', 'utf8');
s = s.replace(/<td colSpan={[^>]+>\s*<div className="[^>]+>.*Tidak ada data.*<\/div>\s*<\/td>/gs, '<td colSpan={7} className="p-4"><EmptyStateWidget title="Data Siswa Kosong" message="Tidak ada data siswa yang cocok dengan filter pencarian." /></td>');
if(s.includes('EmptyStateWidget') && !s.includes('import { EmptyStateWidget }')) {
  s = s.replace('import { SchoolLogo } from \'./SchoolLogo\';', 'import { SchoolLogo } from \'./SchoolLogo\';\nimport { EmptyStateWidget } from \'./EmptyStateWidget\';');
}
fs.writeFileSync('src/components/StudentManagement.tsx', s);

let t = fs.readFileSync('src/components/TeacherManagement.tsx', 'utf8');
t = t.replace(/<td colSpan={[^>]+>\s*<div className="[^>]+>.*Tidak ada data.*<\/div>\s*<\/td>/gs, '<td colSpan={6} className="p-4"><EmptyStateWidget title="Data Guru Kosong" message="Tidak ada data guru yang cocok dengan filter pencarian." /></td>');
if(t.includes('EmptyStateWidget') && !t.includes('import { EmptyStateWidget }')) {
  t = t.replace('import { SchoolLogo } from \'./SchoolLogo\';', 'import { SchoolLogo } from \'./SchoolLogo\';\nimport { EmptyStateWidget } from \'./EmptyStateWidget\';');
}
fs.writeFileSync('src/components/TeacherManagement.tsx', t);
