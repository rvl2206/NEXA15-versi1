import express from "express";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import {
  getStudentsFromNeon,
  upsertStudentsToNeon,
  deleteStudentFromNeon,
  getAttendanceFromNeon,
  upsertAttendanceToNeon,
  deleteAttendanceFromNeon,
  getSettingsFromNeon,
  saveSettingsToNeon,
  getLogsFromNeon,
  insertLogToNeon,
  getUsersFromNeon,
  upsertUserToNeon,
  isNeonConnected,
} from "./src/lib/neonDb";
import { evaluateScanEligibility, calculateLateMinutes } from "./src/lib/attendanceRules";
import { isMatchingRfidUid } from "./src/lib/constants";

// Load environment variables (.env.local has precedence)
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Enable CORS for mobile and web requests
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

// Protect mutating API endpoints against unauthorized calls / CSRF
const API_SECRET = process.env.API_SECRET || process.env.ADMIN_KEY;

app.use("/api", (req, res, next) => {
  // Allow read operations and health/status checks
  if (req.method === "GET" || req.method === "OPTIONS") {
    return next();
  }

  // Allow scan endpoint from gate scanner stations
  if (req.path === "/scan" || req.path === "/scan/") {
    return next();
  }

  // Strictly enforce Bearer token if configured
  if (API_SECRET) {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${API_SECRET}`) {
      res.status(401).json({ error: "Unauthorized: Invalid or missing API secret" });
      return;
    }
  } else if (process.env.NODE_ENV === "production") {
    // In production, strictly reject mutating API endpoints when API_SECRET is unset
    res.status(403).json({
      error: "Forbidden: API_SECRET must be configured in environment variables to allow mutating operations in production."
    });
    return;
  }
  next();
});

interface ServerDatabase {
  students: any[];
  attendance: any[];
  logs: any[];
  users: any[];
  settings: Record<string, any> | null;
  passwords: Record<string, any> | null;
}

let serverData: ServerDatabase = {
  students: [],
  attendance: [],
  logs: [],
  users: [],
  settings: null,
  passwords: null,
};

// No file-based storage: Neon Postgres is the Single Source of Truth
function saveServerData() {
  // In-memory state kept active for low-latency API reads; writes go directly to Neon Postgres
}

// Initialize server database with Neon Postgres as Single Source of Truth
async function initServerDatabase() {
  if (isNeonConnected()) {
    try {
      console.log("⚡ Connecting to Neon Postgres as Single Source of Truth...");
      const [remoteStudents, remoteAttendance, remoteSettings, remoteUsers] = await Promise.all([
        getStudentsFromNeon().catch(() => []),
        getAttendanceFromNeon().catch(() => []),
        getSettingsFromNeon().catch(() => null),
        getUsersFromNeon().catch(() => []),
      ]);

      if (remoteStudents && remoteStudents.length > 0) {
        serverData.students = remoteStudents;
      }
      if (remoteAttendance && remoteAttendance.length > 0) {
        serverData.attendance = remoteAttendance;
      }
      if (remoteSettings) {
        serverData.settings = remoteSettings;
      }
      if (remoteUsers && remoteUsers.length > 0) {
        serverData.users = remoteUsers;
      }

      console.log(`✓ Neon Postgres loaded: ${serverData.students.length} students, ${serverData.attendance.length} attendance records, ${serverData.users.length} users.`);
    } catch (err) {
      console.error("Neon Postgres initialization error:", err);
    }
  } else {
    console.warn("⚠️ Neon DATABASE_URL is not set.");
  }
}

// Health Check API
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    appName: "NEXA15",
    database: isNeonConnected() ? "Neon Postgres (Single Source of Truth)" : "In-Memory",
    neonConnected: isNeonConnected(),
    timestamp: new Date().toISOString(),
  });
});

// Database Status Endpoint (Single Source of Truth)
app.get("/api/database/status", (_req, res) => {
  res.json({
    type: "Neon Postgres",
    status: isNeonConnected() ? "connected" : "disconnected",
    isSingleSourceOfTruth: true,
    tables: [
      "students",
      "attendance",
      "users",
      "school_settings",
      "activity_logs",
      "dispatches",
      "live_notes",
    ],
    studentCount: serverData.students.length,
    attendanceCount: serverData.attendance.length,
    userCount: serverData.users.length,
  });
});

// Legacy Supabase Status Endpoint (Redirects info to Neon SSOT)
app.get("/api/supabase/status", (_req, res) => {
  res.json({
    configured: false,
    message: "NEXA15 uses Neon Postgres as the Single Source of Truth.",
    neonActive: isNeonConnected(),
    tables: ["students", "attendance", "activity_logs", "users", "school_settings"],
  });
});

// Attendance API
app.get("/api/attendance", (_req, res) => {
  res.json(serverData.attendance || []);
});

app.post("/api/attendance", (req, res) => {
  const record = req.body;
  if (!record || !record.id) {
    res.status(400).json({ error: "Invalid attendance record" });
    return;
  }
  const idx = serverData.attendance.findIndex((a) => a.id === record.id);
  if (idx !== -1) {
    serverData.attendance[idx] = { ...serverData.attendance[idx], ...record };
  } else {
    serverData.attendance.unshift(record);
  }
  saveServerData();
  if (isNeonConnected()) {
    upsertAttendanceToNeon([record]).catch((e) => console.error("Neon attendance save error:", e));
  }
  res.json({ success: true, count: serverData.attendance.length });
});

app.post("/api/attendance/sync", (req, res) => {
  const { attendance, mode } = req.body;
  if (!Array.isArray(attendance)) {
    res.status(400).json({ error: "attendance must be an array" });
    return;
  }

  if (mode === "replace") {
    serverData.attendance = attendance;
  } else {
    const map = new Map<string, any>();
    serverData.attendance.forEach((r) => map.set(r.id, r));
    attendance.forEach((r) => {
      if (r && r.id) {
        map.set(r.id, r);
      }
    });
    serverData.attendance = Array.from(map.values());
  }

  saveServerData();
  if (isNeonConnected()) {
    upsertAttendanceToNeon(serverData.attendance).catch((e) => console.error("Neon attendance sync error:", e));
  }
  res.json({ success: true, count: serverData.attendance.length });
});

app.post("/api/attendance/delete-multiple", (req, res) => {
  const { ids } = req.body;
  if (Array.isArray(ids)) {
    const set = new Set(ids);
    serverData.attendance = serverData.attendance.filter((a) => !set.has(a.id));
    saveServerData();
    if (isNeonConnected()) {
      Promise.all(ids.map((id) => deleteAttendanceFromNeon(id))).catch((e) => console.error("Neon delete error:", e));
    }
  }
  res.json({ success: true, count: serverData.attendance.length });
});

app.delete("/api/attendance/:id", (req, res) => {
  const { id } = req.params;
  serverData.attendance = serverData.attendance.filter((a) => a.id !== id);
  saveServerData();
  if (isNeonConnected()) {
    deleteAttendanceFromNeon(id).catch((e) => console.error("Neon delete error:", e));
  }
  res.json({ success: true });
});

app.post("/api/attendance/clear", (_req, res) => {
  serverData.attendance = [];
  saveServerData();
  res.json({ success: true });
});

// Fast Gate Scanner Attendance API (Mobile & Kiosk Endpoint)
app.post("/api/scan", (req, res) => {
  const { code, officer, scanMethod, type } = req.body || {};
  if (!code || typeof code !== "string") {
    res.status(400).json({ success: false, error: "Kode kartu atau QR tidak boleh kosong." });
    return;
  }

  const rawCode = code.trim();
  // Find student in memory cache (serverData.students)
  const student = serverData.students.find((s) => {
    if (s.nisn && String(s.nisn).trim() === rawCode) return true;
    if (s.id && String(s.id).trim() === rawCode) return true;
    if (s.rfidUid && isMatchingRfidUid(s.rfidUid, rawCode)) return true;
    if (s.rfid_uid && isMatchingRfidUid(s.rfid_uid, rawCode)) return true;
    if (s.nisn && rawCode.includes(s.nisn)) return true;
    return false;
  });

  if (!student) {
    res.status(404).json({
      success: false,
      error: "Data siswa tidak ditemukan untuk kartu atau QR ini.",
      scannedCode: rawCode,
    });
    return;
  }

  // Calculate Ambon Time (WIT: UTC+9)
  const now = new Date();
  const formatterDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jayapura",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayStr = formatterDate.format(now); // YYYY-MM-DD

  const formatterTime = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jayapura",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const timeStr = formatterTime.format(now) + " WIT";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jayapura",
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
    hour12: false,
  }).formatToParts(now);

  const curHour = parseInt(parts.find((p) => p.type === "hour")?.value || "7", 10);
  const curMinute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
  const dayName = parts.find((p) => p.type === "weekday")?.value || "Mon";
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dayOfWeek = dayMap[dayName] ?? 1;

  // Settings from Neon
  const settings = (serverData.settings as any) || {};
  const cutoffTime = settings.cutoffTime || "07:15";
  const pulangNormal = settings.pulangStartTimeNormal || "13:30";
  const pulangFriday = settings.pulangStartTimeFriday || "10:00";

  // Find today's attendance records for this student
  const todayRecords = serverData.attendance.filter((a) => {
    return (a.nisn === student.nisn || a.studentId === student.id) && a.tanggal === todayStr;
  });

  const forcedType = type === "Masuk" || type === "Pulang" ? type : "Auto";
  const eligibility = evaluateScanEligibility(
    todayRecords,
    forcedType,
    curHour,
    curMinute,
    dayOfWeek,
    { normalTime: pulangNormal, fridayTime: pulangFriday }
  );

  if (!eligibility.allowed) {
    let duplicateMsg = "Presensi sudah tercatat hari ini.";
    if (eligibility.reason === "BOTH_COMPLETED") {
      duplicateMsg = `${student.nama} sudah menyelesaikan presensi Masuk dan Pulang hari ini.`;
    } else if (eligibility.reason === "ALREADY_MASUK") {
      duplicateMsg = `${student.nama} sudah tercatat presensi Masuk hari ini.`;
    } else if (eligibility.reason === "ALREADY_PULANG") {
      duplicateMsg = `${student.nama} sudah tercatat presensi Pulang hari ini.`;
    }

    res.status(409).json({
      success: false,
      isDuplicate: true,
      reason: eligibility.reason,
      message: duplicateMsg,
      student: {
        id: student.id,
        nisn: student.nisn,
        nama: student.nama,
        kelas: student.kelas,
        foto: student.foto,
      },
      conflictingRecord: eligibility.conflictingRecord,
    });
    return;
  }

  // Calculate late
  const targetJenis = eligibility.targetJenis;
  let status = "Hadir";
  let lateMinutes = 0;

  if (targetJenis === "Masuk") {
    const lateCalc = calculateLateMinutes(curHour, curMinute, cutoffTime);
    if (lateCalc.isLate) {
      status = "Terlambat";
      lateMinutes = lateCalc.lateMinutes;
    } else {
      status = "Tepat Waktu";
    }
  } else {
    status = "Tepat Waktu";
  }

  const recordId = `att-${student.nisn}-${todayStr}-${targetJenis.toLowerCase()}-${Date.now()}`;
  const newRecord = {
    id: recordId,
    studentId: student.id,
    nisn: student.nisn,
    nama: student.nama,
    kelas: student.kelas,
    tanggal: todayStr,
    waktu: timeStr,
    timestamp: now.toISOString(),
    jenis: targetJenis,
    status: status,
    scanMethod: scanMethod || "QR",
    terlambatMenit: lateMinutes,
    manualNotes: lateMinutes > 0 ? `Terlambat ${lateMinutes} menit (Batas ${cutoffTime} WIT)` : undefined,
    petugas: officer || "Petugas Gerbang",
    rfidUid: student.rfidUid || student.rfid_uid || (scanMethod === "RFID" || scanMethod === "NFC" ? rawCode : null),
  };

  serverData.attendance.unshift(newRecord);
  saveServerData();

  if (isNeonConnected()) {
    upsertAttendanceToNeon([newRecord]).catch((e) => console.error("Neon attendance insert error:", e));
    insertLogToNeon({
      id: `log-${Date.now()}`,
      action: "SCAN_PRESENSI",
      details: `Presensi ${targetJenis} (${status}) siswa ${student.nama} (${student.kelas}) via ${scanMethod || "QR"}.`,
      user: officer || "Gate Scanner",
      role: "Petugas Gerbang",
      timestamp: now.toISOString(),
    }).catch(() => {});
  }

  res.json({
    success: true,
    message: `Presensi ${targetJenis} Berhasil: ${status}`,
    student: {
      id: student.id,
      nisn: student.nisn,
      nama: student.nama,
      kelas: student.kelas,
      foto: student.foto,
    },
    record: newRecord,
    lateMinutes,
    targetJenis,
    status,
  });
});

// Students API
app.get("/api/students", (_req, res) => {
  res.json(serverData.students || []);
});

// Lightweight Quick Student Search (For Mobile Lupa Kartu / Manual Search)
app.get("/api/students/search", (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  if (!q) {
    res.json([]);
    return;
  }
  const results = serverData.students
    .filter((s) => {
      const nama = String(s.nama || "").toLowerCase();
      const nisn = String(s.nisn || "").toLowerCase();
      const kelas = String(s.kelas || "").toLowerCase();
      return nama.includes(q) || nisn.includes(q) || kelas.includes(q);
    })
    .slice(0, 20)
    .map((s) => ({
      id: s.id,
      nisn: s.nisn,
      nama: s.nama,
      kelas: s.kelas,
      foto: s.foto,
      rfidUid: s.rfidUid || s.rfid_uid,
    }));
  res.json(results);
});

app.post("/api/students/sync", (req, res) => {
  const { students, mode } = req.body;
  if (!Array.isArray(students)) {
    res.status(400).json({ error: "students must be an array" });
    return;
  }

  if (mode === "replace") {
    serverData.students = students;
  } else {
    const map = new Map<string, any>();
    serverData.students.forEach((s) => {
      if (s.id) map.set(s.id, s);
      if (s.nisn) map.set("nisn-" + s.nisn, s);
    });
    students.forEach((s) => {
      if (!s) return;
      const key = s.id || (s.nisn ? "nisn-" + s.nisn : null);
      if (key) {
        map.set(key, s);
      }
    });
    serverData.students = Array.from(map.values());
  }

  saveServerData();
  if (isNeonConnected()) {
    upsertStudentsToNeon(serverData.students).catch((e) => console.error("Neon students sync error:", e));
  }
  res.json({ success: true, count: serverData.students.length });
});

app.delete("/api/students/:id", (req, res) => {
  const { id } = req.params;
  serverData.students = serverData.students.filter((s) => s.id !== id && s.nisn !== id);
  saveServerData();
  if (isNeonConnected()) {
    deleteStudentFromNeon(id).catch((e) => console.error("Neon student delete error:", e));
  }
  res.json({ success: true });
});

app.post("/api/students/clear", (_req, res) => {
  serverData.students = [];
  saveServerData();
  res.json({ success: true });
});

// Clear All Database (Requires explicit administrative confirmation header)
app.post("/api/database/clear-all", (req, res) => {
  const confirmHeader = req.headers["x-confirm-database-wipe"];
  if (confirmHeader !== "CONFIRM_PERMANENT_WIPE") {
    res.status(403).json({
      error: "Tindakan ditolak: Diperlukan header 'x-confirm-database-wipe: CONFIRM_PERMANENT_WIPE' untuk mengosongkan seluruh database.",
    });
    return;
  }

  serverData = {
    students: [],
    attendance: [],
    logs: [],
    users: [],
    settings: null,
    passwords: null,
  };
  saveServerData();
  res.json({ success: true, message: "Database server berhasil dikosongkan secara terkonfirmasi." });
});

// Logs API
app.get("/api/logs", (_req, res) => {
  res.json(serverData.logs || []);
});

app.post("/api/logs", (req, res) => {
  const log = req.body;
  if (log && log.id) {
    serverData.logs.unshift(log);
    if (serverData.logs.length > 1000) {
      serverData.logs = serverData.logs.slice(0, 1000);
    }
    saveServerData();
  }
  res.json({ success: true, count: serverData.logs.length });
});

app.post("/api/logs/sync", (req, res) => {
  const { logs, mode } = req.body;
  if (!Array.isArray(logs)) {
    res.status(400).json({ error: "logs must be an array" });
    return;
  }

  if (mode === "replace") {
    serverData.logs = logs;
  } else {
    const map = new Map<string, any>();
    serverData.logs.forEach((l) => map.set(l.id, l));
    logs.forEach((l) => {
      if (l && l.id) map.set(l.id, l);
    });
    serverData.logs = Array.from(map.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  saveServerData();
  res.json({ success: true, count: serverData.logs.length });
});

app.delete("/api/logs/:id", (req, res) => {
  const { id } = req.params;
  serverData.logs = serverData.logs.filter((l) => l.id !== id);
  saveServerData();
  res.json({ success: true });
});

app.post("/api/logs/clear", (_req, res) => {
  serverData.logs = [];
  saveServerData();
  res.json({ success: true });
});

// Settings API
app.get("/api/settings", (_req, res) => {
  res.json(serverData.settings || null);
});

app.post("/api/settings", (req, res) => {
  const settings = req.body;
  if (settings) {
    serverData.settings = settings;
    saveServerData();
    if (isNeonConnected()) {
      saveSettingsToNeon(settings).catch((e) => console.error("Neon settings save error:", e));
    }
  }
  res.json({ success: true });
});

// Users API
app.get("/api/users", (_req, res) => {
  res.json(serverData.users || []);
});

app.post("/api/users/sync", (req, res) => {
  const { users } = req.body;
  if (!Array.isArray(users)) {
    res.status(400).json({ error: "users must be an array" });
    return;
  }
  serverData.users = users;
  saveServerData();
  if (isNeonConnected()) {
    Promise.all(users.map((u) => upsertUserToNeon(u))).catch((e) => console.error("Neon users sync error:", e));
  }
  res.json({ success: true, count: serverData.users.length });
});

async function startServer() {
  await initServerDatabase();
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

export default app;
