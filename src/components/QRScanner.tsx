import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { store } from '../lib/store';
import { Student, AttendanceRecord, AttendanceStatus } from '../types';
import { formatLateDuration, getWhatsAppLink, generateWhatsAppMessage } from '../lib/exportUtils';
import {
  QrCode,
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Clock,
  RefreshCw,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  GraduationCap,
  User,
  MessageCircle,
  Zap,
  Sliders,
  ListCheck,
  History,
  Smartphone,
  Check,
  Barcode,
} from 'lucide-react';

interface QRScannerProps {
  currentOfficer: string;
}

interface ScanOutcome {
  success: boolean;
  student?: Student;
  record?: AttendanceRecord;
  type?: 'Masuk' | 'Pulang';
  status?: AttendanceStatus;
  message: string;
  scannedCode: string;
  timestamp: string;
}

export const QRScanner: React.FC<QRScannerProps> = ({ currentOfficer }) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<ScanOutcome | null>(null);

  // Scan Feed / History for current session
  const [scanFeed, setScanFeed] = useState<ScanOutcome[]>([]);

  // Performance & Queue Options
  const [rapidQueueMode, setRapidQueueMode] = useState<boolean>(true); // Mode Antrean Cepat (no blocking modal)
  const [debounceSeconds, setDebounceSeconds] = useState<number>(3); // 3 seconds per same QR code
  const [scanFps, setScanFps] = useState<number>(15); // 15 FPS: Sweet spot for instant decode without CPU bottleneck
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [modalDuration, setModalDuration] = useState<number>(2); // Auto-close modal duration if modal is on

  // Camera Devices
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [scanFlash, setScanFlash] = useState<boolean>(false);

  const [countdown, setCountdown] = useState<number>(2);
  const [lastScannedQR, setLastScannedQR] = useState<string>('');
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [selectedStudentForQR, setSelectedStudentForQR] = useState<string>('');
  const [manualInput, setManualInput] = useState('');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const recentScanTimesRef = useRef<Map<string, number>>(new Map());

  // Countdown timer for modal when modal is active
  useEffect(() => {
    let timer: NodeJS.Timeout;
    let interval: NodeJS.Timeout;

    if (showModal && !rapidQueueMode) {
      setCountdown(modalDuration);
      interval = setInterval(() => {
        setCountdown((prev) => Math.max(0, prev - 1));
      }, 1000);

      timer = setTimeout(() => {
        setShowModal(false);
      }, modalDuration * 1000);
    }

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [showModal, modalDuration, rapidQueueMode]);

  // Load student list & fetch cameras
  useEffect(() => {
    setStudentsList(store.getStudents());
    store.fetchFromServer();
    const unsubscribe = store.subscribe(() => {
      setStudentsList(store.getStudents());
    });

    fetchAvailableCameras();

    return () => {
      unsubscribe();
      stopCamera();
    };
  }, []);

  // Listen for USB/Bluetooth Hardware Barcode & QR Scanner Gun (Keyboard Wedge Mode)
  useEffect(() => {
    let buffer = '';
    let timeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }

      if (e.key === 'Enter') {
        if (buffer.trim().length >= 3) {
          processScannedCode(buffer.trim());
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          buffer = '';
        }, 200);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
    };
  }, [debounceSeconds, rapidQueueMode, currentOfficer]);

  const fetchAvailableCameras = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        const formatted = devices.map((d) => ({
          id: d.id,
          label: d.label || `Kamera ${d.id.substring(0, 6)}`,
        }));
        setAvailableCameras(formatted);

        // Auto select rear camera
        const backCam = formatted.find(
          (c) =>
            c.label.toLowerCase().includes('back') ||
            c.label.toLowerCase().includes('rear') ||
            c.label.toLowerCase().includes('environment') ||
            c.label.toLowerCase().includes('0')
        ) || formatted[0];

        setSelectedCameraId(backCam.id);
      }
    } catch (e) {
      console.log('Failed to enumerate video devices:', e);
    }
  };

  const playSuccessSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Double upbeat chime: C5 (523.25Hz) -> G5 (783.99Hz)
      const notes = [523.25, 783.99];
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.07);

        gain.gain.setValueAtTime(0, now + index * 0.07);
        gain.gain.linearRampToValueAtTime(0.25, now + index * 0.07 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.07 + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.07);
        osc.stop(now + index * 0.07 + 0.22);
      });
    } catch (e) {
      console.log('Audio playback error:', e);
    }
  };

  const playErrorSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const freqs = [220, 165];
      freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + index * 0.1);

        gain.gain.setValueAtTime(0, now + index * 0.1);
        gain.gain.linearRampToValueAtTime(0.2, now + index * 0.1 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.1 + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.1);
        osc.stop(now + index * 0.1 + 0.2);
      });
    } catch (e) {
      console.log('Audio playback error:', e);
    }
  };

  const processScannedCode = (decodedText: string) => {
    if (!decodedText || !decodedText.trim()) return;

    const raw = decodedText.trim();
    const now = Date.now();

    // 1. Same-QR debounce check (prevent scanning same student twice in debounceSeconds)
    const lastTime = recentScanTimesRef.current.get(raw);
    if (lastTime && now - lastTime < debounceSeconds * 1000) {
      return;
    }

    // 2. Atomic frame processing lock (prevents duplicate triggers in same 200ms frame burst)
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    recentScanTimesRef.current.set(raw, now);
    setLastScannedQR(raw);

    // Visual flash effect
    setScanFlash(true);
    setTimeout(() => setScanFlash(false), 300);

    // Record scan in store
    const result = store.recordScan(raw, raw, raw, currentOfficer);

    if (result.success) {
      playSuccessSound();
    } else {
      playErrorSound();
    }

    const timeStr =
      new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Jayapura',
      }) + ' WIT';

    const outcome: ScanOutcome = {
      success: result.success,
      student: result.student,
      record: result.record,
      type: result.type,
      status: result.status,
      message: result.message,
      scannedCode: raw,
      timestamp: timeStr,
    };

    setScanResult(outcome);

    // Add to session live feed
    setScanFeed((prev) => [outcome, ...prev].slice(0, 30));

    // Open modal only if not in Rapid Queue Mode
    if (!rapidQueueMode) {
      setShowModal(true);
    }

    // Reset processing lock rapidly (200ms) so NEXT student in queue can be scanned instantly!
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 200);
  };

  const handleConnectQRToStudent = (codeToConnect: string, studentId: string) => {
    if (!codeToConnect || !studentId) return;

    store.updateStudent(studentId, { id_qr: codeToConnect });
    const result = store.recordScan(codeToConnect, codeToConnect, codeToConnect, currentOfficer);

    if (result.success) {
      playSuccessSound();
    } else {
      playErrorSound();
    }

    const timeStr =
      new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Jayapura',
      }) + ' WIT';

    const outcome: ScanOutcome = {
      success: result.success,
      student: result.student,
      record: result.record,
      type: result.type,
      status: result.status,
      message: result.message,
      scannedCode: codeToConnect,
      timestamp: timeStr,
    };

    setScanResult(outcome);
    setScanFeed((prev) => [outcome, ...prev].slice(0, 30));
    setSelectedStudentForQR('');
  };

  const startCamera = async (camIdOverride?: string) => {
    try {
      await stopCamera();
      setIsCameraActive(true);
      setScanResult(null);

      // Brief DOM mount pause
      await new Promise((resolve) => setTimeout(resolve, 150));

      const targetCamId = camIdOverride || selectedCameraId;

      const html5QrCode = new Html5Qrcode('reader', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true, // Native C++ BarcodeDetector API for instant hardware decode
        },
      });
      scannerRef.current = html5QrCode;

      const config = {
        fps: scanFps, // 15 FPS: Smooth decoding without JS thread CPU throttling
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const boxSize = Math.max(Math.floor(minEdge * 0.85), 220);
          return { width: boxSize, height: boxSize };
        },
        aspectRatio: 1.0,
        disableFlip: false,
        videoConstraints: targetCamId
          ? { deviceId: { exact: targetCamId } }
          : {
              facingMode: 'environment',
              width: { min: 640, ideal: 1280, max: 1920 },
              height: { min: 480, ideal: 720, max: 1080 },
            },
      };

      const cameraSource = targetCamId ? targetCamId : { facingMode: 'environment' };

      await html5QrCode.start(
        cameraSource,
        config,
        (decodedText) => processScannedCode(decodedText),
        () => {}
      );
    } catch (err: any) {
      console.error('Camera Start Error:', err);
      try {
        if (scannerRef.current) {
          await scannerRef.current.start(
            { facingMode: 'user' },
            { fps: scanFps, qrbox: { width: 240, height: 240 } },
            (decodedText) => processScannedCode(decodedText),
            () => {}
          );
        }
      } catch (fallbackErr) {
        setIsCameraActive(false);
        alert('Gagal mengaktifkan kamera. Mohon pastikan izin akses kamera diizinkan di browser HP/Laptop.');
      }
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (err) {
        console.error('Failed to stop camera:', err);
      }
    }
    setIsCameraActive(false);
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !isCameraActive) return;
    try {
      const state = !torchOn;
      await (scannerRef.current as any).applyVideoConstraints({
        advanced: [{ torch: state }],
      });
      setTorchOn(state);
    } catch (e) {
      console.log('Torch is not supported on this device/camera.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-blue-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs uppercase tracking-wider mb-1 flex-wrap">
              <QrCode className="w-4 h-4 text-cyan-400" />
              <span>Modul Scanner Ultra Fast QR</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Instant Dual Mode ({studentsList.length} Siswa Terdaftar)
              </span>
            </div>
            <h2 className="text-xl font-black">Pemindai QR Code Absensi Siswa</h2>
            <p className="text-xs text-blue-200/90 mt-1 max-w-2xl">
              Optimasi kamera langsung untuk antrean masuk siswa. Cukup dekatkan QR Code ID / Kartu Siswa ke lensa kamera HP/Laptop.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Switcher Button */}
            <button
              onClick={() => setRapidQueueMode(!rapidQueueMode)}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all border ${
                rapidQueueMode
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-slate-700'
              }`}
              title="Toggle Mode Antrean Cepat (Presensi Kontinu Tanpa Pop-up Modal)"
            >
              <Zap className={`w-4 h-4 ${rapidQueueMode ? 'fill-slate-950 animate-bounce' : ''}`} />
              <span>{rapidQueueMode ? 'Mode Antrean Cepat (Aktif)' : 'Mode Antrean Cepat (Mati)'}</span>
            </button>

            {!isCameraActive ? (
              <button
                onClick={() => startCamera()}
                className="px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-cyan-400/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Buka Kamera</span>
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-600/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <CameraOff className="w-4 h-4" />
                <span>Matikan Kamera</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Camera View Area */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-between transition-colors">
          <div className="w-full flex items-center justify-between mb-3 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Frame Pemindai Kamera</span>
            </span>

            {/* Camera selector if multiple cameras exist */}
            {availableCameras.length > 1 && (
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedCameraId}
                  onChange={(e) => {
                    setSelectedCameraId(e.target.value);
                    if (isCameraActive) {
                      startCamera(e.target.value);
                    }
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-white"
                >
                  {availableCameras.map((cam) => (
                    <option key={cam.id} value={cam.id}>
                      {cam.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Video Container Box */}
          <div
            className={`w-full max-w-md aspect-square bg-slate-950 rounded-2xl border-2 overflow-hidden relative flex items-center justify-center shadow-inner transition-all ${
              scanFlash
                ? 'border-emerald-400 ring-4 ring-emerald-400/30'
                : 'border-dashed border-slate-700'
            }`}
          >
            {/* Target element for html5-qrcode */}
            <div id="reader" className="w-full h-full"></div>

            {/* Flash / Scan feedback indicator ring */}
            {scanFlash && (
              <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none animate-ping z-20" />
            )}

            {!isCameraActive && (
              <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center text-center p-6 space-y-3 z-10">
                <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-cyan-400 border border-blue-500/30 flex items-center justify-center shadow-md">
                  <QrCode className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">Kamera Siap Diaktifkan</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Klik tombol di bawah untuk membuka pemindaian kamera secara langsung.
                  </p>
                </div>
                <button
                  onClick={() => startCamera()}
                  className="mt-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Mulai Scan Kamera Now</span>
                </button>
              </div>
            )}
          </div>

          {/* Camera Settings & Tuning Bar */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 w-full px-1 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all flex items-center gap-1.5 border ${
                  soundEnabled
                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800'
                    : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                }`}
                title="Suara Bip/Nada Indikator Absensi"
              >
                {soundEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Suara Beep (On)</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                    <span>Suara (Mute)</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-1 text-[11px] bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <Clock className="w-3 h-3 text-slate-400" />
                <span className="font-medium text-slate-500 dark:text-slate-400">Jeda Anti-Ganda:</span>
                <select
                  value={debounceSeconds}
                  onChange={(e) => setDebounceSeconds(Number(e.target.value))}
                  className="bg-transparent font-bold text-blue-600 dark:text-blue-400 focus:outline-none"
                  title="Jeda waktu (detik) untuk mencegah siswa yang sama ter-scan berulang kali"
                >
                  <option value={1}>1s</option>
                  <option value={2}>2s</option>
                  <option value={3}>3s (Saran)</option>
                  <option value={5}>5s</option>
                  <option value={10}>10s</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">FPS Frame:</span>
              {[10, 15, 20].map((fps) => (
                <button
                  key={fps}
                  type="button"
                  onClick={() => {
                    setScanFps(fps);
                    if (isCameraActive) startCamera();
                  }}
                  className={`px-2 py-0.5 text-[10px] font-extrabold rounded-lg border transition-all ${
                    scanFps === fps
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                  title={`${fps} Frame Per Second`}
                >
                  {fps} FPS
                </button>
              ))}
            </div>
          </div>

          {/* Hardware Scanner & Manual Test Box */}
          <div className="w-full mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Barcode className="w-3.5 h-3.5 text-indigo-500" />
                <span>Input Manual / Scanner Gun USB</span>
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold lowercase">
                *scanner gun siap
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualInput.trim()) {
                  processScannedCode(manualInput.trim());
                  setManualInput('');
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Ketik NISN, Kode QR, atau Nama Siswa lalu tekan Enter..."
                className="flex-1 px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all whitespace-nowrap cursor-pointer"
              >
                Proses
              </button>
            </form>
          </div>
        </div>

        {/* Realtime Output Panel & Session Stream */}
        <div className="lg:col-span-5 space-y-4">
          {/* Latest Scan Result Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-500" />
                <span>Hasil Scan Terakhir</span>
              </span>
              {scanResult && (
                <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                  {scanResult.timestamp}
                </span>
              )}
            </h3>

            {scanResult ? (
              <div
                className={`rounded-2xl p-4 border flex flex-col justify-between transition-all ${
                  scanResult.success
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                    : 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                    {scanResult.success ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    )}
                    <div>
                      <h4 className="font-extrabold text-sm uppercase tracking-tight">
                        {scanResult.success ? 'ABSENSI BERHASIL' : 'PERHATIAN ABSENSI'}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
                        {scanResult.message}
                      </p>
                    </div>
                  </div>

                  {scanResult.student && (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-500 dark:text-slate-400">Nama Siswa:</span>
                        <span className="font-extrabold text-slate-900 dark:text-white uppercase">
                          {scanResult.student.nama}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-500 dark:text-slate-400">Kelas / NISN:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {scanResult.student.kelas} • <span className="font-mono">{scanResult.student.nisn}</span>
                        </span>
                      </div>

                      {scanResult.type && (
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-slate-500 dark:text-slate-400">Status & Jenis:</span>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-black text-[10px] px-2 py-0.5 rounded-full ${
                                scanResult.type === 'Masuk'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                  : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                              }`}
                            >
                              {scanResult.type.toUpperCase()}
                            </span>
                            {scanResult.status && (
                              <span
                                className={`font-black text-[10px] px-2 py-0.5 rounded-full ${
                                  scanResult.status === 'Hadir'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
                                }`}
                              >
                                {scanResult.status.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {scanResult.record?.terlambatMenit && scanResult.record.terlambatMenit > 0 ? (
                        <div className="flex justify-between items-center py-1 bg-amber-100/80 dark:bg-amber-900/40 px-2 rounded-lg border border-amber-300 dark:border-amber-700">
                          <span className="text-amber-800 dark:text-amber-300 font-bold">Terlambat:</span>
                          <span className="font-extrabold text-amber-950 dark:text-amber-200">
                            {formatLateDuration(scanResult.record.terlambatMenit)}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Send WhatsApp Notification Option */}
                {scanResult.student && (
                  <button
                    onClick={() => {
                      const s = scanResult.student!;
                      let phone = s.no_hp_ortu;
                      if (!phone) {
                        phone = prompt(`Masukkan No WhatsApp OrtU/Siswa ${s.nama}:`, '08123456789') || undefined;
                        if (phone && phone.trim()) {
                          store.updateStudent(s.id, { no_hp_ortu: phone.trim() });
                          s.no_hp_ortu = phone.trim();
                        }
                      }
                      if (phone) {
                        const schoolSettings = store.getSettings();
                        let template: string | undefined;
                        if (scanResult.status === 'Hadir') template = schoolSettings.waTemplateHadir;
                        else if (scanResult.status === 'Terlambat') template = schoolSettings.waTemplateTerlambat;

                        const schoolName = schoolSettings.schoolName || 'SMA NEGERI 15 AMBON';
                        const waMsg = generateWhatsAppMessage(s, scanResult.record, schoolName, template);
                        const waUrl = getWhatsAppLink(phone, waMsg);
                        window.open(waUrl, '_blank');
                      }
                    }}
                    className="mt-3 w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Kirim WA OrtU ({scanResult.student.no_hp_ortu || 'Input No HP'})</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center text-slate-400 dark:text-slate-500 space-y-1">
                <QrCode className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="font-bold text-xs text-slate-600 dark:text-slate-300">Arahkan QR ke Kamera</p>
                <p className="text-[10px] text-slate-400">Hasil absensi akan otomatis diperbarui secara instant di sini.</p>
              </div>
            )}
          </div>

          {/* Session Stream / Live Feed List */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-blue-500" />
                <span>Riwayat Scan Sesi Ini ({scanFeed.length})</span>
              </span>

              {scanFeed.length > 0 && (
                <button
                  onClick={() => setScanFeed([])}
                  className="text-[10px] text-slate-400 hover:text-red-500 font-bold"
                >
                  Bersihkan
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {scanFeed.length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-4 italic">
                  Belum ada riwayat scan pada sesi ini.
                </p>
              ) : (
                scanFeed.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all ${
                      item.success
                        ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                        : 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      {item.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      )}
                      <div className="truncate">
                        <span className="font-extrabold text-slate-900 dark:text-white truncate block">
                          {item.student ? item.student.nama : item.scannedCode}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                          {item.student ? `${item.student.kelas} • ${item.student.nisn}` : item.message}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
                        {item.timestamp.split(' ')[0]}
                      </span>
                      {item.status && (
                        <span
                          className={`inline-block text-[9px] font-black px-1.5 py-0.2 rounded ${
                            item.status === 'Hadir'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          {item.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pop-Up Modal Notifikasi (Optional, only used when Rapid Queue Mode is disabled) */}
      {showModal && scanResult && !rapidQueueMode && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
            {/* Header Banner */}
            <div
              className={`p-6 text-white relative overflow-hidden text-center ${
                scanResult.success
                  ? 'bg-gradient-to-br from-emerald-600 via-teal-600 to-green-700'
                  : 'bg-gradient-to-br from-amber-600 via-orange-600 to-red-700'
              }`}
            >
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex justify-center mb-2">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg">
                  {scanResult.success ? (
                    <CheckCircle2 className="w-10 h-10 text-white" />
                  ) : (
                    <AlertTriangle className="w-10 h-10 text-amber-200" />
                  )}
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-xs font-extrabold uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{scanResult.success ? 'PRESENSI BERHASIL' : 'PERHATIAN ABSENSI'}</span>
              </div>

              <h3 className="text-xl font-black uppercase tracking-tight">
                {scanResult.success ? 'SCAN QR SUCCESS' : 'NOTIFIKASI SYSTEM'}
              </h3>
              <p className="text-xs text-white/90 font-medium mt-1">{scanResult.message}</p>
            </div>

            {/* Body Details */}
            <div className="p-6 space-y-4">
              {scanResult.student ? (
                <>
                  <div className="text-center pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">
                      Nama Siswa
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      {scanResult.student.nama}
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50/80 dark:bg-blue-950/50 p-3 rounded-2xl border border-blue-200/80 dark:border-blue-800/60 text-center">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-0.5">
                        NISN
                      </span>
                      <span className="font-mono text-sm font-black text-slate-900 dark:text-white">
                        {scanResult.student.nisn}
                      </span>
                    </div>

                    <div className="bg-emerald-50/80 dark:bg-emerald-950/50 p-3 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 text-center">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-0.5">
                        Kelas
                      </span>
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        {scanResult.student.kelas}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-3 text-center">
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-left space-y-2">
                    <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Hubungkan Kode QR ke Siswa
                    </label>
                    <select
                      value={selectedStudentForQR}
                      onChange={(e) => setSelectedStudentForQR(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl font-medium"
                    >
                      <option value="">-- Pilih Nama Siswa --</option>
                      {studentsList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nama} ({s.kelas} - NISN: {s.nisn})
                        </option>
                      ))}
                    </select>
                    <button
                      disabled={!selectedStudentForQR}
                      onClick={() =>
                        handleConnectQRToStudent(
                          scanResult.scannedCode || lastScannedQR,
                          selectedStudentForQR
                        )
                      }
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-extrabold text-xs rounded-xl shadow cursor-pointer"
                    >
                      Hubungkan & Simpan Absensi
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowModal(false)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-2xl shadow-lg transition-all cursor-pointer"
              >
                Tutup & Lanjutkan ({countdown}s)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
