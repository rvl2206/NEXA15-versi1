const fs = require('fs');
let content = fs.readFileSync('src/components/SettingsPage.tsx', 'utf8');

// Remove redundant states
content = content.replace(/  const \[newHolidayDate, setNewHolidayDate\] = useState\(''\);\n/g, '');
content = content.replace(/  const \[newHolidayDesc, setNewHolidayDesc\] = useState\(''\);\n/g, '');

// Remove redundant handlers
content = content.replace(/  const handleAddHoliday = \([^\{]*\{[\s\S]*?\n  \};\n/g, '');
content = content.replace(/  const handleDeleteHoliday = \([^\{]*\{[\s\S]*?\n  \};\n/g, '');
content = content.replace(/  const handleClearAllStudents = \([^\{]*\{[\s\S]*?\n  \};\n/g, '');
content = content.replace(/  const handleClearAllDatabase = \([^\{]*\{[\s\S]*?\n  \};\n/g, '');

fs.writeFileSync('src/components/SettingsPage.tsx', content);
console.log("Cleaned SettingsPage.tsx");
