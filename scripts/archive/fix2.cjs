const fs = require('fs');
let content = fs.readFileSync('src/components/SettingsHolidays.tsx', 'utf8');

// Remove the import of formatDateWithDay
content = content.replace(/import \{ formatDateWithDay \} from '\.\.\/lib\/dateUtils';/, '');

// Insert the implementation inside SettingsHolidays
const func = `
const formatDateWithDay = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(d);
  } catch (e) {
    return dateStr;
  }
};
`;

content = content.replace(/export const SettingsHolidays: React\.FC<Props> = \(\{ settings, setSettings \}\) => \{/, `export const SettingsHolidays: React.FC<Props> = ({ settings, setSettings }) => {` + func);

fs.writeFileSync('src/components/SettingsHolidays.tsx', content);
console.log("Added formatDateWithDay");
