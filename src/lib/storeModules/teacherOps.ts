import { StoreContext } from './types';
import { Teacher, Student } from '../../types';
import { isMatchingNip, isMatchingRfidUid, isGenericQrCode } from '../constants';

export const teacherOps = {
  getTeachers: function(store: StoreContext): Teacher[] {
    return [...store.teachers];
  },

  getTeacherByNip: function(store: StoreContext, nip: string): Teacher | undefined {
    if (!nip) return undefined;
    const clean = String(nip).trim();
    return store.teachers.find((t) => isMatchingNip(t.nip, clean));
  },

  getTeacherById: function(store: StoreContext, id: string): Teacher | undefined {
    if (!id) return undefined;
    const cleanId = String(id).trim();
    return store.teachers.find((t) => t.id === cleanId);
  },

  getTeacherByRfidUid: function(store: StoreContext, rfidUid: string): Teacher | undefined {
    if (!rfidUid) return undefined;
    return store.teachers.find((t) => t.rfid_uid && isMatchingRfidUid(t.rfid_uid, rfidUid));
  },

  assignRfidToTeacher: function(store: StoreContext, teacherId: string, rfidUid: string): boolean {
    const teacher = store.getTeacherById(teacherId);
    if (!teacher) return false;
    const cleanUid = String(rfidUid).trim().toUpperCase();

    const existing = store.getTeacherByRfidUid(cleanUid);
    if (existing && existing.id !== teacherId) {
      existing.rfid_uid = undefined;
      store.enqueueSync({ id: existing.id, type: 'teacher', action: 'upsert', data: existing });
    }

    teacher.rfid_uid = cleanUid;
    store.notify();
    store.enqueueSync({ id: teacher.id, type: 'teacher', action: 'upsert', data: teacher });
    store.addLog('ASSIGN_RFID_GURU', `Menetapkan Kartu RFID [${cleanUid}] ke Guru: ${teacher.nama} (${teacher.jabatan})`);
    return true;
  },

  findByRfidUid: function(store: StoreContext, rfidUid: string): {
    type: 'siswa' | 'guru';
    student?: Student;
    teacher?: Teacher;
  } | undefined {
    if (!rfidUid) return undefined;
    const clean = String(rfidUid).trim();
    const student = store.getStudentByRfidUid(clean);
    if (student) return { type: 'siswa', student };
    const teacher = store.getTeacherByRfidUid(clean);
    if (teacher) return { type: 'guru', teacher };
    return undefined;
  },

  findPersonByRfidOrCode: function(store: StoreContext, codeOrUid: string): {
    type: 'siswa' | 'guru';
    student?: Student;
    teacher?: Teacher;
  } | undefined {
    if (!codeOrUid) return undefined;
    const student = store.findStudentByScannedCode(codeOrUid);
    if (student) return { type: 'siswa', student };
    const teacher = store.findTeacherByScannedCode(codeOrUid);
    if (teacher) return { type: 'guru', teacher };
    return undefined;
  },

  /**
   * Pengenalan Akurat Guru & Staf dari Hasil Pindai QR / Barcode / Kartu RFID
   */
  findTeacherByScannedCode: function(store: StoreContext, scannedText: string): Teacher | undefined {
    if (!scannedText) return undefined;
    const cleanText = String(scannedText).replace(/[\r\n\t]+/g, '').trim();
    if (!cleanText) return undefined;

    // 0. Exact Match pada UID Kartu RFID / NFC
    const exactRfid = store.teachers.find(
      (t) => t.rfid_uid && isMatchingRfidUid(t.rfid_uid, cleanText)
    );
    if (exactRfid) return exactRfid;

    // 1. Exact Match pada ID_QR (Hanya jika bukan generic placeholder)
    if (!isGenericQrCode(cleanText)) {
      const exactQr = store.teachers.find(
        (t) => t.id_qr && !isGenericQrCode(t.id_qr) && t.id_qr.trim().toLowerCase() === cleanText.toLowerCase()
      );
      if (exactQr) return exactQr;
    }

    // 2. Exact Match pada NIP
    const exactNip = store.teachers.find(
      (t) => isMatchingNip(t.nip, cleanText)
    );
    if (exactNip) return exactNip;

    // 3. Exact Match pada Document ID
    const exactId = store.teachers.find((t) => t.id === cleanText);
    if (exactId) return exactId;

    // 4. Parsing Format Terstruktur Titik (Contoh: "69933068.198501012010011001" atau "69933068.198501012010011001.NAMA")
    if (cleanText.includes('.')) {
      const parts = cleanText.split('.').map((p) => p.trim()).filter(Boolean);
      const schoolNpsn = (store.settings.schoolNPSN || '69933068').trim();

      if (parts.length >= 3) {
        const potentialNip = parts[1];
        const parsedName = parts.slice(2).join('.').trim().toLowerCase();

        if (potentialNip) {
          const matchByNip = store.teachers.find((t) => isMatchingNip(t.nip, potentialNip));
          if (matchByNip) return matchByNip;
        }

        if (parsedName) {
          const matchByName = store.teachers.find((t) => t.nama && t.nama.trim().toLowerCase() === parsedName);
          if (matchByName) return matchByName;
        }
      } else if (parts.length === 2) {
        const isPart0Npsn = parts[0] === schoolNpsn || parts[0] === '69933068';
        if (isPart0Npsn) {
          const matchByPart1 = store.teachers.find((t) => isMatchingNip(t.nip, parts[1]));
          if (matchByPart1) return matchByPart1;
        } else {
          const matchByPart0 = store.teachers.find((t) => isMatchingNip(t.nip, parts[0]));
          if (matchByPart0) return matchByPart0;

          const matchByPart1 = store.teachers.find((t) => isMatchingNip(t.nip, parts[1]));
          if (matchByPart1) return matchByPart1;

          const matchByName = store.teachers.find((t) => t.nama && t.nama.trim().toLowerCase() === parts[1].toLowerCase());
          if (matchByName) return matchByName;
        }
      }
    }

    // 5. Parsing Format JSON
    if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleanText);
        if (parsed.nip) {
          const t = store.teachers.find((th) => isMatchingNip(th.nip, String(parsed.nip)));
          if (t) return t;
        }
        if (parsed.id_qr && !isGenericQrCode(String(parsed.id_qr))) {
          const t = store.teachers.find((th) => th.id_qr && th.id_qr.trim().toLowerCase() === String(parsed.id_qr).trim().toLowerCase());
          if (t) return t;
        }
        if (parsed.id) {
          const t = store.teachers.find((th) => th.id === String(parsed.id).trim());
          if (t) return t;
        }
      } catch {}
    }

    // 6. Strict Exact Full Name Match
    const exactNameMatch = store.teachers.find(
      (t) => t.nama && t.nama.trim().toLowerCase() === cleanText.toLowerCase()
    );
    if (exactNameMatch) return exactNameMatch;

    return undefined;
  },

  addTeacher: async function(store: StoreContext, teacherData: Omit<Teacher, 'id' | 'createdAt'>): Promise<Teacher> {
    const cleanNip = String(teacherData.nip || '').trim();
    const existingIndex = store.teachers.findIndex((t) => t.nip && t.nip === cleanNip);
    
    if (existingIndex !== -1) {
      const existing = store.teachers[existingIndex];
      const updated: Teacher = {
        ...existing,
        ...teacherData,
        nip: cleanNip,
        id_qr: teacherData.id_qr || `69933068.${cleanNip}`,
      };
      store.teachers[existingIndex] = updated;
      store.notify();
      store.enqueueSync({ id: updated.id, type: 'teacher', action: 'upsert', data: updated });
      store.addLog('EDIT_GURU', `Memperbarui data guru (mencegah duplikasi NIP): ${updated.nama} - NIP: ${updated.nip}`);
      return updated;
    }

    const newId = `tch-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newTeacher: Teacher = {
      ...teacherData,
      id: newId,
      nip: cleanNip,
      id_qr: teacherData.id_qr || `69933068.${cleanNip}`,
      createdAt: new Date().toISOString(),
    };

    store.teachers.unshift(newTeacher);
    store.notify();
    store.enqueueSync({ id: newTeacher.id, type: 'teacher', action: 'upsert', data: newTeacher });
    store.addLog('TAMBAH_GURU', `Menambahkan guru baru: ${newTeacher.nama} (${newTeacher.jabatan}) - NIP: ${newTeacher.nip}`);
    return newTeacher;
  },

  updateTeacher: async function(store: StoreContext, id: string, teacherData: Partial<Teacher>): Promise<boolean> {
    const idx = store.teachers.findIndex((t) => t.id === id);
    if (idx === -1) return false;

    const updated = { ...store.teachers[idx], ...teacherData };
    if (teacherData.nip && !teacherData.id_qr) {
      updated.id_qr = `69933068.${teacherData.nip.trim()}`;
    }
    store.teachers[idx] = updated;
    store.notify();
    store.enqueueSync({ id: updated.id, type: 'teacher', action: 'upsert', data: updated });
    store.addLog('EDIT_GURU', `Memperbarui data guru: ${updated.nama} (${updated.jabatan})`);
    return true;
  },

  deleteTeacher: async function(store: StoreContext, id: string): Promise<boolean> {
    const idx = store.teachers.findIndex((t) => t.id === id);
    if (idx === -1) return false;

    // Penghapusan Halus (Soft Delete): Hanya ubah status menjadi Nonaktif
    const target = store.teachers[idx];
    const updated = { ...target, status_kepegawaian: 'Nonaktif' as const };
    store.teachers[idx] = updated;

    store.notify();

    store.enqueueSync({ id: target.id || id, type: 'teacher', action: 'upsert', data: updated });
    store.addLog('NONAKTIF_GURU', `Menonaktifkan guru: ${target.nama} (${target.jabatan}) NIP: ${target.nip} (Soft Delete)`);
    return true;
  },

  deleteMultipleTeachers: async function(store: StoreContext, ids: string[]): Promise<boolean> {
    const idSet = new Set(ids);
    let count = 0;

    store.teachers = store.teachers.map((t) => {
      if (idSet.has(t.id)) {
        count++;
        const updated = { ...t, status_kepegawaian: 'Nonaktif' as const };
        store.enqueueSync({ id: t.id, type: 'teacher', action: 'upsert', data: updated });
        return updated;
      }
      return t;
    });

    store.notify();
    store.addLog('NONAKTIF_MASSAL_GURU', `Menonaktifkan ${count} data guru terpilih (Soft Delete).`);
    return true;
  },

  deleteAllTeachers: async function(store: StoreContext): Promise<boolean> {
    const count = store.teachers.length;

    store.teachers = store.teachers.map((t) => {
      const updated = { ...t, status_kepegawaian: 'Nonaktif' as const };
      store.enqueueSync({ id: t.id, type: 'teacher', action: 'upsert', data: updated });
      return updated;
    });

    store.notify();
    store.addLog('RESET_GURU', `Menonaktifkan seluruh ${count} data guru (Soft Delete).`);
    return true;
  },

  importTeachers: async function(store: StoreContext, 
    importList: Omit<Teacher, 'id' | 'createdAt'>[],
    mode: 'append' | 'replace' = 'append'
  ): Promise<boolean> {
    const uniqueImportMap = new Map<string, Omit<Teacher, 'id' | 'createdAt'>>();
    importList.forEach((item) => {
      const cleanNip = String(item.nip || '').trim();
      if (cleanNip) {
        uniqueImportMap.set(cleanNip, {
          ...item,
          nip: cleanNip,
          id_qr: item.id_qr || `69933068.${cleanNip}`,
        });
      }
    });

    const formatted: Teacher[] = Array.from(uniqueImportMap.values()).map((t, idx) => ({
      ...t,
      id: `tch-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    }));

    if (mode === 'replace') {
      const oldIds = store.teachers.map((t) => t.id);
      store.teachers = formatted;
      store.notify();
      oldIds.forEach((id) => {
        store.enqueueSync({ id, type: 'teacher', action: 'delete' });
      });
      formatted.forEach((t) => {
        store.enqueueSync({ id: t.id, type: 'teacher', action: 'upsert', data: t });
      });
    } else {
      const map = new Map<string, Teacher>();
      store.teachers.forEach((t) => map.set(t.nip, t));
      formatted.forEach((t) => {
        const existing = map.get(t.nip);
        if (existing) {
          map.set(t.nip, { ...existing, ...t, id: existing.id });
        } else {
          map.set(t.nip, t);
        }
      });
      store.teachers = Array.from(map.values());
      store.notify();
      store.teachers.forEach((t) => {
        store.enqueueSync({ id: t.id, type: 'teacher', action: 'upsert', data: t });
      });
    }

    store.addLog('IMPORT_GURU', `Berhasil mengimpor ${formatted.length} data guru tanpa duplikasi.`);
    return true;
  },

  // Teacher attendance management


};
