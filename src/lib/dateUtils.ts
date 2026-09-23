/**
 * NEXA15 Pure Date & Time Utilities
 * Timezone Canonical: WIT (Asia/Jayapura, UTC+09:00)
 * Date Format Canonical: YYYY-MM-DD
 */

/**
 * Mengembalikan tanggal hari ini dalam format DD-MM-YYYY sesuai timezone Asia/Jayapura (WIT)
 */
export function getTodayFormatted(): string {
  const today = new Date();
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jayapura',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return formatter.format(today).replace(/\//g, '-');
}

/**
 * Mengembalikan tanggal hari ini dalam format kanonikal YYYY-MM-DD sesuai timezone Asia/Jayapura (WIT)
 */
export function getTodayYyyyMmDd(): string {
  const today = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jayapura',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(today);
}

/**
 * Memformat string timestamp ISO 8601 ke string waktu jam:menit WIT (contoh: "07:15 WIT")
 */
export function formatRecordTimeWIT(isoString?: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return (
      d.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jayapura',
        hour12: false,
      }) + ' WIT'
    );
  } catch {
    return '';
  }
}

/**
 * Melakukan normalisasi berbagai format input tanggal (ISO string, YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY)
 * menjadi format kanonikal standar YYYY-MM-DD.
 */
export function normalizeToYyyyMmDd(dateStr?: string | null): string {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  if (str.includes('T')) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jayapura' });
    }
    const datePart = str.split('T')[0];
    if (datePart.split('-')[0].length === 4) return datePart;
  }
  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].slice(0, 2).padStart(2, '0')}`;
    }
    if (parts[2]?.length === 4) {
      const [d, m, y] = parts;
      return `${y.slice(0, 4)}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
    }
  }
  return str;
}

/**
 * Membangun ISO string timestamp dengan zona waktu WIT (+09:00) dari tanggal dan jam
 */
export function buildIsoTimestamp(tanggalYyyyMmDd: string, jamHhMm: string): string {
  const normDate = normalizeToYyyyMmDd(tanggalYyyyMmDd) || getTodayYyyyMmDd();
  const timeClean = (jamHhMm || '07:00').trim();
  const parts = timeClean.split(':');
  const h = (parseInt(parts[0], 10) || 0).toString().padStart(2, '0');
  const m = (parseInt(parts[1], 10) || 0).toString().padStart(2, '0');
  const s = parts[2] ? (parseInt(parts[2], 10) || 0).toString().padStart(2, '0') : '00';

  // Sekolah berlokasi di Ambon (Zona Waktu WIT / Asia/Jayapura, UTC+09:00)
  const dateWithTz = `${normDate}T${h}:${m}:${s}+09:00`;
  const d = new Date(dateWithTz);
  if (!isNaN(d.getTime())) {
    return d.toISOString();
  }
  return new Date().toISOString();
}

/**
 * Memeriksa apakah sebuah record presensi (siswa atau guru) berada pada tanggal target tertentu
 */
export function isRecordForDate(
  record?: { tanggal?: string; timestamp?: string } | null,
  targetYyyyMmDd?: string | null
): boolean {
  if (!record || !targetYyyyMmDd) return false;
  const targetNorm = normalizeToYyyyMmDd(targetYyyyMmDd);

  if (record.tanggal) {
    const recordNorm = normalizeToYyyyMmDd(record.tanggal);
    if (recordNorm === targetNorm) return true;
    if (record.tanggal.includes(targetYyyyMmDd) || targetYyyyMmDd.includes(record.tanggal)) return true;
  }

  if (record.timestamp) {
    const tsNorm = normalizeToYyyyMmDd(record.timestamp);
    if (tsNorm === targetNorm) return true;
  }

  return false;
}

/**
 * Memeriksa apakah record presensi terjadi pada hari ini (WIT)
 */
export function isRecordForToday(record?: { tanggal?: string; timestamp?: string } | null): boolean {
  return isRecordForDate(record, getTodayYyyyMmDd());
}

/**
 * Memeriksa apakah record presensi terjadi pada hari Sabtu
 */
export function isRecordOnSaturday(record: { tanggal?: string; timestamp?: string }): boolean {
  if (record.tanggal) {
    const s = String(record.tanggal).trim();
    if (s.includes('T')) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.getDay() === 6;
    }
    const parts = s.split(/[-/]/);
    if (parts.length === 3) {
      let d: Date | null = null;
      if (parts[0].length === 4) {
        d = new Date(`${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].slice(0, 2).padStart(2, '0')}T00:00:00`);
      } else if (parts[2].length === 4) {
        d = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T00:00:00`);
      }
      if (d && !isNaN(d.getTime())) return d.getDay() === 6;
    }
  }
  if (record.timestamp) {
    const d = new Date(record.timestamp);
    if (!isNaN(d.getTime())) return d.getDay() === 6;
  }
  return false;
}
