const fs = require('fs');
let content = fs.readFileSync('src/components/SettingsPage.tsx', 'utf8');

// Remove handleAddHoliday completely
const startAddHoliday = content.indexOf('const handleAddHoliday =');
if (startAddHoliday !== -1) {
  const endAddHoliday = content.indexOf('};', startAddHoliday) + 2;
  content = content.substring(0, startAddHoliday) + content.substring(endAddHoliday);
}

// Remove handleDeleteHoliday completely
const startDeleteHoliday = content.indexOf('const handleDeleteHoliday =');
if (startDeleteHoliday !== -1) {
  const endDeleteHoliday = content.indexOf('};', startDeleteHoliday) + 2;
  content = content.substring(0, startDeleteHoliday) + content.substring(endDeleteHoliday);
}

// Remove handleClearAllStudents completely
const startClearStudents = content.indexOf('const handleClearAllStudents =');
if (startClearStudents !== -1) {
  const endClearStudents = content.indexOf('};', startClearStudents) + 2;
  content = content.substring(0, startClearStudents) + content.substring(endClearStudents);
}

// Remove handleClearAllDatabase completely
const startClearDb = content.indexOf('const handleClearAllDatabase =');
if (startClearDb !== -1) {
  const endClearDb = content.indexOf('};', startClearDb) + 2;
  content = content.substring(0, startClearDb) + content.substring(endClearDb);
}

fs.writeFileSync('src/components/SettingsPage.tsx', content);
console.log("Functions removed.");
