const fs = require('fs');

let page = fs.readFileSync('src/components/SettingsPage.tsx', 'utf8');
// Target the exact handlers to remove
page = page.replace(/  const handleAddHoliday = \([\s\S]*?`Berhasil menambahkan hari libur: \$\{newHolidayDesc\}`\);\n  \};\n/, '');
page = page.replace(/  const handleDeleteHoliday = \([\s\S]*?`Berhasil menghapus hari libur "\$\{ket\}"\.`\);\n  \};\n/, '');
page = page.replace(/          \/\/ setHealth\(result\);\n/, '');
page = page.replace(/          setHealth\(result\);\n/, '');

fs.writeFileSync('src/components/SettingsPage.tsx', page);

let holidays = fs.readFileSync('src/components/SettingsHolidays.tsx', 'utf8');
holidays = holidays.replace(/\.date/g, '.tanggal');
holidays = holidays.replace(/\.name/g, '.keterangan');
fs.writeFileSync('src/components/SettingsHolidays.tsx', holidays);

console.log("Fixed handlers and holidays");
