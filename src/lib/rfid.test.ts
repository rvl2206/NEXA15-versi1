import { describe, it, expect, beforeEach } from 'vitest';
import { isMatchingRfidUid } from './constants';
import { store } from './store';

describe('RFID Architecture and Functionality Tests', () => {
  describe('isMatchingRfidUid - Protocol & Data Conversion', () => {
    it('matches exact hex UIDs regardless of case, spaces, and colons', () => {
      expect(isMatchingRfidUid('2CA6E47A', '2ca6e47a')).toBe(true);
      expect(isMatchingRfidUid('2C:A6:E4:7A', '2CA6E47A')).toBe(true);
      expect(isMatchingRfidUid('2C-A6-E4-7A', '2ca6e47a')).toBe(true);
      expect(isMatchingRfidUid(' 2C A6 E4 7A ', '2CA6E47A')).toBe(true);
    });

    it('matches 4-byte Mifare Classic hex to decimal Wiegand output', () => {
      // 0x2CA6E47A = 749134970
      expect(isMatchingRfidUid('2CA6E47A', '749134970')).toBe(true);
      expect(isMatchingRfidUid('749134970', '2CA6E47A')).toBe(true);
      // Zero-padded 10-digit decimal from USB barcode/RFID reader: '0749134970'
      expect(isMatchingRfidUid('2CA6E47A', '0749134970')).toBe(true);
      expect(isMatchingRfidUid('0749134970', '2CA6E47A')).toBe(true);
    });

    it('matches 7-byte Mifare Ultralight/NTAG UID via BigInt without precision loss', () => {
      // 7-byte UID: 0x04A1B2C3D4E5F6
      // In decimal: 1303728615908854 (exceeds 32-bit int, fits safely in 64-bit BigInt)
      const hex7Byte = '04A1B2C3D4E5F6';
      const dec7Byte = BigInt('0x' + hex7Byte).toString(); // "1303728615908854"

      expect(isMatchingRfidUid(hex7Byte, dec7Byte)).toBe(true);
      expect(isMatchingRfidUid(dec7Byte, hex7Byte)).toBe(true);
      expect(isMatchingRfidUid('04:A1:B2:C3:D4:E5:F6', dec7Byte)).toBe(true);
    });

    it('rejects mismatched UIDs', () => {
      expect(isMatchingRfidUid('2CA6E47A', '11223344')).toBe(false);
      expect(isMatchingRfidUid('2CA6E47A', '999999999')).toBe(false);
      expect(isMatchingRfidUid(undefined, '2CA6E47A')).toBe(false);
      expect(isMatchingRfidUid('', '2CA6E47A')).toBe(false);
    });
  });

  describe('RFID Binding & Conflict Resolution', () => {
    let student1Id: string;
    let student2Id: string;

    beforeEach(async () => {
      // Clean and populate fresh test entities
      const s1 = await store.addStudent({
        nisn: '1111222233',
        nama: 'Siswa Uji Coba 1',
        kelas: 'XII MIPA 1',
        jenis_kelamin: 'L',
        status: 'aktif',
      });
      student1Id = s1.id;

      const s2 = await store.addStudent({
        nisn: '4444555566',
        nama: 'Siswa Uji Coba 2',
        kelas: 'XII MIPA 2',
        jenis_kelamin: 'P',
        status: 'aktif',
      });
      student2Id = s2.id;
    });

    it('unbounds previous student when reassigning to another student', () => {
      const testRfid = 'D9E0F1A2';

      store.assignRfidToStudent(student1Id, testRfid);
      expect(store.getStudents().find((s) => s.id === student1Id)?.rfid_uid).toBe(testRfid);

      store.assignRfidToStudent(student2Id, testRfid);
      expect(store.getStudents().find((s) => s.id === student1Id)?.rfid_uid).toBeUndefined();
      expect(store.getStudents().find((s) => s.id === student2Id)?.rfid_uid).toBe(testRfid);
    });
  });
});
