import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { evaluateScanEligibility, calculateLateMinutes } from './src/lib/attendanceRules';
import { isMatchingRfidUid } from './src/lib/constants';

// Create test express app mocking the scan logic implemented in server.ts
function createTestApp() {
  const app = express();
  app.use(express.json());

  const mockStudents = [
    {
      id: 'std_001',
      nisn: '0012345678',
      nama: 'Ahmad Fauzi',
      kelas: 'XII MIPA 1',
      rfidUid: 'E2801160',
    },
    {
      id: 'std_002',
      nisn: '0023456789',
      nama: 'Siti Rahma',
      kelas: 'XI IPS 2',
      rfidUid: 'A1B2C3D4',
    },
  ];

  const mockAttendance: any[] = [];
  const mockSettings = {
    cutoffTime: '07:15',
    pulangStartTimeNormal: '13:30',
    pulangStartTimeFriday: '10:00',
  };

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok', message: 'NEXA15 Server is running' });
  });

  app.get('/api/students/search', (req, res) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    if (!q) {
      res.json([]);
      return;
    }
    const results = mockStudents.filter((s) => {
      return (
        s.nama.toLowerCase().includes(q) ||
        s.nisn.toLowerCase().includes(q) ||
        s.kelas.toLowerCase().includes(q)
      );
    });
    res.json(results);
  });

  app.post('/api/scan', (req, res) => {
    const { code, officer, scanMethod, type } = req.body || {};
    if (!code || typeof code !== 'string') {
      res.status(400).json({ success: false, error: 'Kode kartu atau QR tidak boleh kosong.' });
      return;
    }

    const rawCode = code.trim();
    const student = mockStudents.find((s) => {
      if (s.nisn === rawCode || s.id === rawCode) return true;
      if (s.rfidUid && isMatchingRfidUid(s.rfidUid, rawCode)) return true;
      if (rawCode.includes(s.nisn)) return true;
      return false;
    });

    if (!student) {
      res.status(404).json({
        success: false,
        error: 'Data siswa tidak ditemukan untuk kartu atau QR ini.',
        scannedCode: rawCode,
      });
      return;
    }

    const todayStr = '2026-11-12';
    const curHour = 7;
    const curMinute = 10;
    const dayOfWeek = 4; // Thursday

    const todayRecords = mockAttendance.filter(
      (a) => a.nisn === student.nisn && a.tanggal === todayStr
    );

    const eligibility = evaluateScanEligibility(
      todayRecords,
      type || 'Auto',
      curHour,
      curMinute,
      dayOfWeek,
      { normalTime: mockSettings.pulangStartTimeNormal, fridayTime: mockSettings.pulangStartTimeFriday }
    );

    if (!eligibility.allowed) {
      res.status(409).json({
        success: false,
        isDuplicate: true,
        reason: eligibility.reason,
        message: `${student.nama} sudah tercatat presensi ${eligibility.targetJenis} hari ini.`,
      });
      return;
    }

    const targetJenis = eligibility.targetJenis;
    const lateCalc = calculateLateMinutes(curHour, curMinute, mockSettings.cutoffTime);
    const status = lateCalc.isLate ? 'Terlambat' : 'Tepat Waktu';

    const record = {
      id: `att-${student.nisn}-${todayStr}-${targetJenis.toLowerCase()}-${Date.now()}`,
      studentId: student.id,
      nisn: student.nisn,
      nama: student.nama,
      kelas: student.kelas,
      tanggal: todayStr,
      jenis: targetJenis,
      status: status,
      scanMethod: scanMethod || 'QR',
      petugas: officer || 'Petugas Gerbang',
    };

    mockAttendance.push(record);

    res.json({
      success: true,
      student,
      record,
      lateMinutes: lateCalc.lateMinutes,
      status,
      targetJenis,
    });
  });

  return app;
}

describe('Backend API Tests', () => {
  const app = createTestApp();

  it('GET /api/health should return 200 OK', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });

  it('GET /api/students/search should search by name or NISN', async () => {
    const resEmpty = await request(app).get('/api/students/search');
    expect(resEmpty.status).toBe(200);
    expect(resEmpty.body).toEqual([]);

    const resMatch = await request(app).get('/api/students/search?q=ahmad');
    expect(resMatch.status).toBe(200);
    expect(resMatch.body.length).toBe(1);
    expect(resMatch.body[0].nama).toBe('Ahmad Fauzi');
  });

  it('POST /api/scan should reject empty code with 400', async () => {
    const res = await request(app).post('/api/scan').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/scan should return 404 for unknown card/QR', async () => {
    const res = await request(app).post('/api/scan').send({ code: 'UNKNOWN_999' });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/scan should record on-time attendance for valid NISN', async () => {
    const res = await request(app).post('/api/scan').send({
      code: '0012345678',
      officer: 'Pak Guru Piket',
      scanMethod: 'QR',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.student.nama).toBe('Ahmad Fauzi');
    expect(res.body.status).toBe('Tepat Waktu');
    expect(res.body.targetJenis).toBe('Masuk');
  });

  it('POST /api/scan should reject duplicate scans on the same day with 409', async () => {
    const resDup = await request(app).post('/api/scan').send({
      code: '0012345678',
      officer: 'Pak Guru Piket',
    });
    expect(resDup.status).toBe(409);
    expect(resDup.body.isDuplicate).toBe(true);
  });

  it('POST /api/scan should recognize RFID UID', async () => {
    const resRfid = await request(app).post('/api/scan').send({
      code: 'A1B2C3D4',
      scanMethod: 'RFID',
    });
    expect(resRfid.status).toBe(200);
    expect(resRfid.body.student.nama).toBe('Siti Rahma');
  });
});
