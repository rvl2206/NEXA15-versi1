const fs = require('fs');
let content = fs.readFileSync('src/components/SettingsHolidays.tsx', 'utf8');

content = content.replace(/newHolidayName/g, 'newHolidayDesc');
content = content.replace(/newHolidayDate/g, 'newHolidayDate');
content = content.replace(/date:/g, 'tanggal:');
content = content.replace(/name:/g, 'keterangan:');
content = content.replace(/h\.date/g, 'h.tanggal');
content = content.replace(/h\.name/g, 'h.keterangan');

fs.writeFileSync('src/components/SettingsHolidays.tsx', content);
console.log("Replaced fields in SettingsHolidays");
