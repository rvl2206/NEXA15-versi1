import { StoreContext } from './types';
import { Student } from '../../types';
import { isMatchingNisn, isMatchingRfidUid, isGenericQrCode } from '../constants';

export const studentOps = {
  addStudent: async function(store: StoreContext, studentData: Omit<Student, 'id' | 'createdAt'>): Promise<Student> {
    // Check if student with same NISN already exists to prevent duplicate entry
    const existingIndex = store.students.findIndex((s) => s.nisn && s.nisn === studentData.nisn);
    if (existingIndex !== -1) {
      const existing = store.students[existingIndex];
      const updated: Student = {
        ...existing,
        ...studentData,
      };
      store.students[existingIndex] = updated;
      store.notify();
      store.enqueueSync({ id: updated.id, type: 'student', action: 'upsert', data: updated });
      store.addLog('EDIT_SISWA', `Memperbarui data siswa (mencegah duplikasi NISN): ${updated.nama} (${updated.kelas})`);
      return updated;
    }

    const newId = `std-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newStudent: Student = {
      ...studentData,
      id: newId,
      createdAt: new Date().toISOString(),
    };

    store.students.unshift(newStudent);
    store.notify();

    store.enqueueSync({ id: newStudent.id, type: 'student', action: 'upsert', data: newStudent });
    store.addLog('TAMBAH_SISWA', `Menambahkan siswa baru: ${newStudent.nama} (${newStudent.kelas}) - NISN: ${newStudent.nisn}`);

    return newStudent;
  },

  updateStudent: async function(store: StoreContext, id: string, studentData: Partial<Student>): Promise<boolean> {
    const idx = store.students.findIndex((s) => s.id === id);
    if (idx === -1) return false;

    const updated = { ...store.students[idx], ...studentData };
    store.students[idx] = updated;
    store.notify();

    store.enqueueSync({ id: updated.id, type: 'student', action: 'upsert', data: updated });
    store.addLog('EDIT_SISWA', `Memperbarui data siswa: ${updated.nama} (${updated.kelas})`);

    return true;
  },

  deleteStudent: async function(store: StoreContext, id: string): Promise<boolean> {
    const idx = store.students.findIndex((s) => s.id === id);
    if (idx === -1) return false;

    // Penghapusan Halus (Soft Delete): Hanya ubah status menjadi nonaktif
    const target = store.students[idx];
    const updated = { ...target, status: 'nonaktif' as const };
    store.students[idx] = updated;

    store.notify();

    store.enqueueSync({ id: target.id || id, type: 'student', action: 'upsert', data: updated });
    store.addLog('NONAKTIF_SISWA', `Menonaktifkan siswa: ${target.nama} (${target.kelas}) (Soft Delete).`);
    return true;
  },

  deleteMultipleStudents: async function(store: StoreContext, ids: string[]): Promise<boolean> {
    const idSet = new Set(ids);
    let count = 0;

    store.students = store.students.map((s) => {
      if (idSet.has(s.id)) {
        count++;
        const updated = { ...s, status: 'nonaktif' as const };
        store.enqueueSync({ id: s.id, type: 'student', action: 'upsert', data: updated });
        return updated;
      }
      return s;
    });

    store.notify();
    store.addLog('NONAKTIF_MASSAL_SISWA', `Menonaktifkan ${count} siswa terpilih (Soft Delete).`);
    return true;
  },

  updateMultipleStudents: async function(store: StoreContext, ids: string[], updates: Partial<Student>): Promise<boolean> {
    const idSet = new Set(ids);
    let count = 0;

    store.students = store.students.map((s) => {
      if (idSet.has(s.id)) {
        count++;
        const updated = { ...s, ...updates };
        store.enqueueSync({ id: s.id, type: 'student', action: 'upsert', data: updated });
        return updated;
      }
      return s;
    });

    store.notify();
    store.addLog('UPDATE_MASSAL_SISWA', `Memperbarui data ${count} siswa (Contoh Update: ${JSON.stringify(updates)}).`);
    return true;
  },

  deleteAllStudents: async function(store: StoreContext): Promise<boolean> {
    const count = store.students.length;

    store.students = store.students.map((s) => {
      const updated = { ...s, status: 'nonaktif' as const };
      store.enqueueSync({ id: s.id, type: 'student', action: 'upsert', data: updated });
      return updated;
    });

    store.notify();
    store.addLog('RESET_SISWA', `Menonaktifkan seluruh ${count} data siswa (Soft Delete).`);
    return true;
  },

  importStudents: async function(store: StoreContext, 
    importList: Omit<Student, 'id' | 'createdAt'>[],
    mode: 'append' | 'replace' = 'append'
  ): Promise<boolean> {
    // Eliminasi data ganda di dalam file impor berdasarkan NISN
    const uniqueImportMap = new Map<string, Omit<Student, 'id' | 'createdAt'>>();
    importList.forEach((item) => {
      if (item.nisn) {
        uniqueImportMap.set(item.nisn, item);
      }
    });

    const formatted: Student[] = Array.from(uniqueImportMap.values()).map((s, idx) => ({
      ...s,
      id: `std-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    }));

    if (mode === 'replace') {
      const oldIds = store.students.map((s) => s.id);
      store.students = formatted;
      store.notify();
      oldIds.forEach((id) => {
        store.enqueueSync({ id, type: 'student', action: 'delete' });
      });
      formatted.forEach((s) => {
        store.enqueueSync({ id: s.id, type: 'student', action: 'upsert', data: s });
      });
    } else {
      // Append mode: gabungkan & perbarui NISN yang sama tanpa menduplikasi
      const map = new Map<string, Student>();
      store.students.forEach((s) => map.set(s.nisn, s));
      formatted.forEach((s) => {
        const existing = map.get(s.nisn);
        if (existing) {
          map.set(s.nisn, { ...existing, ...s, id: existing.id });
        } else {
          map.set(s.nisn, s);
        }
      });
      store.students = Array.from(map.values());
      store.notify();
      store.students.forEach((s) => {
        store.enqueueSync({ id: s.id, type: 'student', action: 'upsert', data: s });
      });
    }

    store.addLog('IMPORT_SISWA', `Berhasil mengimpor ${formatted.length} data siswa tanpa duplikasi.`);
    return true;
  },

  getStudentById: function(store: StoreContext, id: string): Student | undefined {
    if (!id) return undefined;
    const cleanId = String(id).trim();
    return store.students.find((s) => s.id === cleanId);
  },

  getStudentByNisn: function(store: StoreContext, nisn: string): Student | undefined {
    if (!nisn) return undefined;
    const cleanNisn = String(nisn).trim();
    return store.students.find((s) => s.nisn && s.nisn.trim() === cleanNisn);
  },

  getStudentByRfidUid: function(store: StoreContext, rfidUid: string): Student | undefined {
    if (!rfidUid) return undefined;
    return store.students.find((s) => s.rfid_uid && isMatchingRfidUid(s.rfid_uid, rfidUid));
  },

  assignRfidToStudent: function(store: StoreContext, studentId: string, rfidUid: string): boolean {
    const student = store.getStudentById(studentId);
    if (!student) return false;
    const cleanUid = String(rfidUid).trim().toUpperCase();

    // Check if another student has this RFID UID
    const existing = store.getStudentByRfidUid(cleanUid);
    if (existing && existing.id !== studentId) {
      existing.rfid_uid = undefined;
      store.enqueueSync({ id: existing.id, type: 'student', action: 'upsert', data: existing });
    }

    student.rfid_uid = cleanUid;
    store.notify();
    store.enqueueSync({ id: student.id, type: 'student', action: 'upsert', data: student });
    store.addLog('ASSIGN_RFID_SISWA', `Menetapkan Kartu RFID [${cleanUid}] ke siswa: ${student.nama} (${student.kelas})`);
    return true;
  },

  /**
   * Pengenalan Akurat & Bebas Tabrakan Identitas Siswa dari Hasil Pindai QR / Barcode / Kartu RFID.
   * Menggunakan pencarian hierarkis berbasis kecocokan eksak (Exact Match) pada RFID UID, NISN, dan ID_QR,
   * serta mem-parsing format terstruktur (NPSN.NISN.NAMA atau JSON) tanpa substring matching longgar
   * sehingga tidak akan ada 2 siswa berbeda yang dianggap orang yang sama.
   */
  findStudentByScannedCode: function(store: StoreContext, scannedText: string): Student | undefined {
    if (!scannedText) return undefined;
    const cleanText = String(scannedText).replace(/[\r\n\t]+/g, '').trim();
    if (!cleanText) return undefined;

    // 0. Exact Match pada UID Kartu RFID / NFC
    const exactRfid = store.students.find(
      (s) => s.rfid_uid && isMatchingRfidUid(s.rfid_uid, cleanText)
    );
    if (exactRfid) return exactRfid;

    // 1. Exact Match pada ID_QR (case-insensitive & trimmed), HANYA jika bukan generic placeholder (misal: "69933068")
    if (!isGenericQrCode(cleanText)) {
      const exactQr = store.students.find(
        (s) => s.id_qr && !isGenericQrCode(s.id_qr) && s.id_qr.trim().toLowerCase() === cleanText.toLowerCase()
      );
      if (exactQr) return exactQr;
    }

    // 2. Exact Match / Digit-Normalized Match pada NISN
    const exactNisn = store.students.find(
      (s) => isMatchingNisn(s.nisn, cleanText)
    );
    if (exactNisn) return exactNisn;

    // 3. Exact Match pada Document ID
    const exactId = store.students.find((s) => s.id === cleanText);
    if (exactId) return exactId;

    // 4. Parsing Format Terstruktur Berpemisah Titik (Contoh: "69933068.3080370790.DADANG BUAMONA" atau "69933068.3080370790")
    if (cleanText.includes('.')) {
      const parts = cleanText.split('.').map((p) => p.trim()).filter(Boolean);
      const schoolNpsn = (store.settings.schoolNPSN || '69933068').trim();

      // Format 3 Bagian atau lebih: NPSN.NISN.NAMA (Contoh: "69933068.3080370790.DADANG BUAMONA")
      if (parts.length >= 3) {
        const potentialNisn = parts[1];
        const parsedName = parts.slice(2).join('.').trim().toLowerCase();

        // 4A. Match by NISN in parts[1] (Prioritas Tertinggi & Akurat)
        if (potentialNisn) {
          const matchByNisn = store.students.find((s) => isMatchingNisn(s.nisn, potentialNisn));
          if (matchByNisn) return matchByNisn;
        }

        // 4B. Match by Name in parts[2...] HANYA jika cocok eksak nama
        if (parsedName) {
          const matchByName = store.students.find((s) => s.nama && s.nama.trim().toLowerCase() === parsedName);
          if (matchByName) return matchByName;
        }
      } else if (parts.length === 2) {
        // Format 2 Bagian: Bisa [NPSN, NISN] atau [NISN, NAMA]
        const isPart0Npsn = parts[0] === schoolNpsn || parts[0] === '69933068';

        if (isPart0Npsn) {
          // parts[0] adalah NPSN -> parts[1] adalah NISN
          const matchByPart1 = store.students.find((s) => isMatchingNisn(s.nisn, parts[1]));
          if (matchByPart1) return matchByPart1;
        } else {
          // parts[0] bukan NPSN -> periksa parts[0] sebagai NISN
          const matchByPart0 = store.students.find((s) => isMatchingNisn(s.nisn, parts[0]));
          if (matchByPart0) return matchByPart0;

          const matchByPart1 = store.students.find((s) => isMatchingNisn(s.nisn, parts[1]));
          if (matchByPart1) return matchByPart1;

          const matchByName1 = store.students.find((s) => s.nama && s.nama.trim().toLowerCase() === parts[1].toLowerCase());
          if (matchByName1) return matchByName1;
        }
      }
    }

    // 5. Parsing Format JSON (Contoh: {"nisn": "3080370790", "id_qr": "..."})
    if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleanText);
        if (parsed.nisn) {
          const s = store.students.find((st) => isMatchingNisn(st.nisn, String(parsed.nisn)));
          if (s) return s;
        }
        if (parsed.id_qr && !isGenericQrCode(String(parsed.id_qr))) {
          const s = store.students.find((st) => st.id_qr && st.id_qr.trim().toLowerCase() === String(parsed.id_qr).trim().toLowerCase());
          if (s) return s;
        }
        if (parsed.id) {
          const s = store.students.find((st) => st.id === String(parsed.id).trim());
          if (s) return s;
        }
      } catch {}
    }

    // 6. Parsing URL Search Params jika format berupa tautan
    if (cleanText.includes('?') || cleanText.includes('&')) {
      try {
        const queryIdx = cleanText.indexOf('?');
        const queryStr = queryIdx !== -1 ? cleanText.substring(queryIdx + 1) : cleanText;
        const params = new URLSearchParams(queryStr);
        const qNisn = params.get('nisn');
        const qIdQr = params.get('id_qr');
        if (qNisn) {
          const matchQuery = store.students.find((s) => isMatchingNisn(s.nisn, qNisn));
          if (matchQuery) return matchQuery;
        }
        if (qIdQr && !isGenericQrCode(qIdQr)) {
          const matchQuery = store.students.find((s) => s.id_qr && s.id_qr.trim().toLowerCase() === qIdQr.trim().toLowerCase());
          if (matchQuery) return matchQuery;
        }
      } catch {}
    }

    // 7. Pencocokan Eksak Nama Lengkap Siswa (Strict Full Exact Match)
    const exactNameMatch = store.students.find(
      (s) => s.nama && s.nama.trim().toLowerCase() === cleanText.toLowerCase()
    );
    if (exactNameMatch) return exactNameMatch;

    return undefined;
  },

  // Teacher data management


};
