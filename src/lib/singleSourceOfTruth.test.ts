import { describe, it, expect } from 'vitest';
import { INITIAL_USERS } from './constants';
import { INITIAL_TEACHERS } from './seedData';
import { store } from './store';

describe('Single Source of Truth (SSOT) & Seed Data Elimination', () => {
  it('INITIAL_USERS contains only essential operational accounts (admin & scanner kiosk)', () => {
    expect(INITIAL_USERS.length).toBe(2);
    
    const adminUser = INITIAL_USERS.find((u) => u.uid === 'usr-admin');
    expect(adminUser).toBeDefined();
    expect(adminUser?.username).toBe('admin');
    expect(adminUser?.role).toBe('Admin');

    const scannerUser = INITIAL_USERS.find((u) => u.uid === 'usr-scanner-station');
    expect(scannerUser).toBeDefined();
    expect(scannerUser?.username).toBe('scanner');

    // Verify dummy users are completely removed from seed definitions
    const dummyPiket = INITIAL_USERS.find((u) => u.uid === 'usr-piket' || u.username === 'guru_piket');
    const dummyKepsek = INITIAL_USERS.find((u) => u.uid === 'usr-kepsek' || u.username === 'kepsek');
    const dummyWali = INITIAL_USERS.find((u) => u.uid === 'usr-wali-x1' || u.username === 'wali_x1');

    expect(dummyPiket).toBeUndefined();
    expect(dummyKepsek).toBeUndefined();
    expect(dummyWali).toBeUndefined();
  });

  it('INITIAL_TEACHERS is completely empty (no hardcoded fake teachers)', () => {
    expect(INITIAL_TEACHERS).toEqual([]);
    expect(INITIAL_TEACHERS.length).toBe(0);
  });

  it('Operational accounts (admin and scanner station) are protected from accidental deletion', async () => {
    const adminRes = await store.deleteUser('usr-admin');
    expect(adminRes.success).toBe(false);
    expect(adminRes.message).toContain('dilindungi');

    const scannerRes = await store.deleteUser('usr-scanner-station');
    expect(scannerRes.success).toBe(false);
    expect(scannerRes.message).toContain('dilindungi');
  });

  it('store.getUsers() does not contain legacy dummy seed accounts', () => {
    const users = store.getUsers();
    const dummyUids = ['usr-piket', 'usr-kepsek', 'usr-wali-x1'];
    
    dummyUids.forEach((uid) => {
      expect(users.some((u) => u.uid === uid)).toBe(false);
    });
  });

  it('store.getTeachers() does not contain dummy tch-01 to tch-12 teachers', () => {
    const teachers = store.getTeachers();
    const dummyTeacherIds = [
      'tch-01', 'tch-02', 'tch-03', 'tch-04', 'tch-05', 'tch-06',
      'tch-07', 'tch-08', 'tch-09', 'tch-10', 'tch-11', 'tch-12'
    ];

    dummyTeacherIds.forEach((id) => {
      expect(teachers.some((t) => t.id === id)).toBe(false);
    });
  });
});
