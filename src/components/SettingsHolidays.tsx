import React, { useState } from 'react';
import { Calendar as CalendarIcon, Save, Trash2, PartyPopper } from 'lucide-react';
import { SchoolSettings } from '../types';
import { store } from '../lib/store';
import { toast } from '../lib/toast';


interface Props {
  settings: SchoolSettings;
  setSettings: (s: SchoolSettings) => void;
}

export const SettingsHolidays: React.FC<Props> = ({ settings, setSettings }) => {
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

  const [newHolidayDesc, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayDesc || !newHolidayDate) return;
    
    // Periksa duplikasi tanggal
    if (settings.holidays.some(h => h.tanggal === newHolidayDate)) {
      toast.error('Tanggal Duplikat', 'Sudah ada hari libur pada tanggal tersebut.');
      return;
    }

    const newHoliday = {
      id: crypto.randomUUID(),
      keterangan: newHolidayDesc,
      tanggal: newHolidayDate
    };

    const newSettings = {
      ...settings,
      holidays: [...settings.holidays, newHoliday].sort((a, b) => a.tanggal.localeCompare(b.tanggal))
    };

    setSettings(newSettings);
    store.updateSettings(newSettings);
    
    setNewHolidayName('');
    setNewHolidayDate('');
    toast.success('Hari Libur Ditambahkan', `${newHolidayDesc} berhasil ditambahkan ke daftar hari libur.`);
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
      toast.info('Hari Libur Dihapus', `${holidayToDelete.keterangan} telah dihapus.`);
    }
  };

  return (
    <>
      
    </>
  );
};
