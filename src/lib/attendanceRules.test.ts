import { describe, it, expect } from 'vitest';
import { calculateLateMinutes, generateDeterministicAutoAlpaId } from './attendanceRules';

describe('attendanceRules - Domain Logic', () => {
  it('correctly handles cutoff time at hour:00 (e.g. 07:00)', () => {
    // Cutoff 07:00 -> Student arrives at 07:05 (late by 5 mins)
    const resultLate = calculateLateMinutes(7, 5, '07:00');
    expect(resultLate.isLate).toBe(true);
    expect(resultLate.lateMinutes).toBe(5);

    // Cutoff 07:00 -> Student arrives at 07:00 (on time)
    const resultOnTime = calculateLateMinutes(7, 0, '07:00');
    expect(resultOnTime.isLate).toBe(false);
    expect(resultOnTime.lateMinutes).toBe(0);

    // Cutoff 07:00 -> Student arrives at 06:55 (on time)
    const resultEarly = calculateLateMinutes(6, 55, '07:00');
    expect(resultEarly.isLate).toBe(false);
    expect(resultEarly.lateMinutes).toBe(0);
  });

  it('correctly handles standard cutoff 07:15', () => {
    const resultLate = calculateLateMinutes(7, 20, '07:15');
    expect(resultLate.isLate).toBe(true);
    expect(resultLate.lateMinutes).toBe(5);

    const resultExact = calculateLateMinutes(7, 15, '07:15');
    expect(resultExact.isLate).toBe(false);
    expect(resultExact.lateMinutes).toBe(0);
  });

  it('generates deterministic auto-alpa IDs', () => {
    const id = generateDeterministicAutoAlpaId('1234567890', '2026-11-06');
    expect(id).toBe('att-autoalpa-1234567890-2026-11-06');
  });
});

