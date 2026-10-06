const fs = require('fs');
let content = fs.readFileSync('SettingsPage_old.tsx', 'utf8');

const startIdx = content.indexOf('{/* Manajemen Hari Libur Sekolah */}');
const endIdx = content.indexOf('{/* RFID & NFC Hardware Diagnostics Card */}');

const jsx = content.substring(startIdx, endIdx);

let holidaysState = "";
holidaysState += "  const [newHolidayName, setNewHolidayName] = useState('');\n";
holidaysState += "  const [newHolidayDate, setNewHolidayDate] = useState('');\n";

const handlerStr = `  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName || !newHolidayDate) return;
    
    // Periksa duplikasi tanggal
    if (settings.holidays.some(h => h.date === newHolidayDate)) {
      toast.error('Tanggal Duplikat', 'Sudah ada hari libur pada tanggal tersebut.');
      return;
    }

    const newHoliday = {
      id: crypto.randomUUID(),
      name: newHolidayName,
      date: newHolidayDate
    };

    const newSettings = {
      ...settings,
      holidays: [...settings.holidays, newHoliday].sort((a, b) => a.date.localeCompare(b.date))
    };

    setSettings(newSettings);
    store.updateSettings(newSettings);
    
    setNewHolidayName('');
    setNewHolidayDate('');
    toast.success('Hari Libur Ditambahkan', \`\${newHolidayName} berhasil ditambahkan ke daftar hari libur.\`);
  };

  const handleDeleteHoliday = (id: string) => {
    const holidayToDelete = settings.holidays.find(h => h.id === id);
    const newSettings = {
      ...settings,
      holidays: settings.holidays.filter(h => h.id !== id)
    };
    setSettings(newSettings);
    store.updateSettings(newSettings);
    if (holidayToDelete) {
      toast.info('Hari Libur Dihapus', \`\${holidayToDelete.name} telah dihapus.\`);
    }
  };`;

const component = `import React, { useState } from 'react';
import { Calendar as CalendarIcon, Save, Trash2, PartyPopper } from 'lucide-react';
import { SchoolSettings } from '../types';
import { store } from '../lib/store';
import { toast } from '../lib/toast';
import { formatDateWithDay } from '../lib/dateUtils';

interface Props {
  settings: SchoolSettings;
  setSettings: (s: SchoolSettings) => void;
}

export const SettingsHolidays: React.FC<Props> = ({ settings, setSettings }) => {
${holidaysState}
${handlerStr}

  return (
    <>
      ${jsx}
    </>
  );
};
`;

fs.writeFileSync('src/components/SettingsHolidays.tsx', component);
console.log("Extracted SettingsHolidays!");
