const fs = require('fs');
let content = fs.readFileSync('src/components/SettingsPage.tsx', 'utf8');

// Remove handleAddHoliday
content = content.replace(/  const handleAddHoliday = \(e: React\.FormEvent\) => \{[\s\S]*?toast\.success\('Hari Libur Ditambahkan', `Berhasil menambahkan hari libur: \$\{newHolidayDesc\}`\);\n  \};\n/, '');

// Remove handleDeleteHoliday
content = content.replace(/  const handleDeleteHoliday = \(id: string, ket: string\) => \{[\s\S]*?toast\.success\('Hari Libur Dihapus', `Berhasil menghapus hari libur "\$\{ket\}"\.`\);\n  \};\n/, '');

// Remove setHealth error
content = content.replace(/          setHealth\(result\);/, '          // setHealth(result);');

fs.writeFileSync('src/components/SettingsPage.tsx', content);
console.log("Cleaned SettingsPage.tsx handlers");
