import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { store } from '../lib/store';
import {
  Student,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceType,
  Teacher,
  TeacherAttendanceRecord,
  TeacherAttendanceStatus,
} from '../types';
import {
  formatLateDuration,
  getWhatsAppLink,
  generateWhatsAppMessage,
} from '../lib/exportUtils';
import {
  QrCode,
  Calendar,
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
  Briefcase,
  Layers,
  ShieldAlert,
  ShieldCheck,
  LogIn,
  LogOut,
  XCircle,
  Info,
  Radio,
  Wifi,
  WifiOff,
  CreditCard,
  Upload,
  AlertCircle,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Sun,
  Maximize2,
  Focus,
} from 'lucide-react';
import { toast } from '../lib/toast';
import { LupaKartuModal } from './LupaKartuModal';
import { QRScannerModal } from './QRScannerModal';

interface QRScannerProps {
  currentOfficer: string;
}

export type ScanTargetMode = 'siswa' | 'guru' | 'auto';

export interface ScanOutcome {
  success: boolean;
  isDuplicate?: boolean;
  isOffline?: boolean;
  targetMode?: ScanTargetMode;
  scanMethod?: 'QR' | 'RFID' | 'Manual';
  student?: Student;
  teacher?: Teacher;
  record?: AttendanceRecord;
  teacherRecord?: TeacherAttendanceRecord;
  type?: 'Masuk' | 'Pulang';
  status?: AttendanceStatus | TeacherAttendanceStatus;
  message: string;
  scannedCode: string;
  timestamp: string;
}

export const QRScanner: React.FC<QRScannerProps> = ({ currentOfficer }) => {
  const [scanTargetMode, setScanTargetMode] = useState<ScanTargetMode>('siswa');
  const [scanTypeMode, setScanTypeMode] = useState<'Auto' | 'Masuk' | 'Pulang'>('Auto');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<ScanOutcome | null>(null);

  // Web NFC Support (for Android Chrome / NFC Devices)
  const [hasNfcSupport, setHasNfcSupport] = useState<boolean>(false);
  const [isNfcActive, setIsNfcActive] = useState<boolean>(false);
  const nfcAbortControllerRef = useRef<AbortController | null>(null);

  // Network Status State
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(store.getOfflineQueueCount());
  const [isCheckingConnection, setIsCheckingConnection] = useState<boolean>(false);

  // Scan Feed / History for current session
  const [scanFeed, setScanFeed] = useState<ScanOutcome[]>([]);

  // Performance & Queue Options - Mode Scan Massal starts DISABLED so popup info shows for 3 seconds
  const [rapidQueueMode, setRapidQueueMode] = useState<boolean>(false); // Mode Antrean Cepat (false by default)
  const [debounceSeconds, setDebounceSeconds] = useState<number>(3); // 3 seconds debounce per same QR
  const [scanFps, setScanFps] = useState<number>(12); // 12 FPS: Optimal Sweet Spot (Zero frame queue latency, instantaneous response)
  const [qrOnlyMode, setQrOnlyMode] = useState<boolean>(true); // Mode QR Murni: 4x lebih cepat karena tidak membebani CPU dengan barcode 1D
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [modalDuration, setModalDuration] = useState<number>(3); // Durasi popup 3 detik

  // Camera Devices
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [scanFlash, setScanFlash] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCheckingCamera, setIsCheckingCamera] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Solusi QR Kecil & Kamera Presisi Cepat
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [isSmallQrMode, setIsSmallQrMode] = useState<boolean>(false);
  const [hasHardwareZoom, setHasHardwareZoom] = useState<boolean>(false);
  const [hasContinuousFocus, setHasContinuousFocus] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [scanResolution, setScanResolution] = useState<'fast' | 'hd' | 'fullhd' | 'auto'>('fast');
  const [showQrTips, setShowQrTips] = useState<boolean>(false);

  const [lastScannedQR, setLastScannedQR] = useState<string>('');
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [teachersList, setTeachersList] = useState<Teacher[]>([]);
  const [selectedStudentForQR, setSelectedStudentForQR] = useState<string>('');
  const [selectedTeacherForQR, setSelectedTeacherForQR] = useState<string>('');
  const [manualInput, setManualInput] = useState('');
  const [showLupaKartuModal, setShowLupaKartuModal] = useState<boolean>(false);
  const [todayLupaKartuCount, setTodayLupaKartuCount] = useState<number>(() => store.getTodayLupaKartuList().total);
  const [scheduleStatus, setScheduleStatus] = useState(() => store.getTodayScheduleStatus());

  useEffect(() => {
    const updateSchedule = () => setScheduleStatus(store.getTodayScheduleStatus());
    updateSchedule();
    const interval = setInterval(updateSchedule, 30000);
    const unsub = store.subscribe(updateSchedule);
    return () => {
      clearInterval(interval);
      unsub();
    };
  }, []);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const recentScanTimesRef = useRef<Map<string, number>>(new Map());

  const handleLupaKartuRecorded = (result: {
    success: boolean;
    student?: Student;
    teacher?: Teacher;
    record?: AttendanceRecord;
    teacherRecord?: TeacherAttendanceRecord;
    type?: AttendanceType;
    status?: AttendanceStatus | TeacherAttendanceStatus;
    message: string;
    isDuplicate?: boolean;
    isLate?: boolean;
    lateMinutes?: number;
  }) => {
    const targetName = result.student?.nama || result.teacher?.nama || 'Siswa/Guru';
    const outcome: ScanOutcome = {
      success: result.success,
      isDuplicate: result.isDuplicate,
      targetMode: result.student ? 'siswa' : 'guru',
      scanMethod: 'Manual',
      student: result.student,
      teacher: result.teacher,
      record: result.record,
      teacherRecord: result.teacherRecord,
      type: (result.type as 'Masuk' | 'Pulang') || 'Masuk',
      status: result.status,
      message: result.message,
      scannedCode: result.student?.nisn || result.teacher?.nip || 'MANUAL-LUPA-KARTU',
      timestamp: new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    };

    setScanResult(outcome);
    setScanFeed((prev) => [outcome, ...prev].slice(0, 30));

    if (soundEnabled) {
      if (result.success) {
        playSuccessSound();
        playVoiceFeedback(targetName, (result.status as string) || 'Hadir', true);
      } else {
        playErrorSound();
      }
    }

    if (modalDuration > 0 && !rapidQueueMode) {
      setShowModal(true);
    }
  };


  // Load student & teacher list & fetch cameras & setup network listeners
  useEffect(() => {
    setStudentsList(store.getStudents());
    setTeachersList(store.getTeachers());
    store.fetchFromServer();

    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Koneksi Internet Pulih', 'Perangkat kembali online. Menyinkronkan data tertunda ke Database Cloud...', 4000);
      store.syncAllPendingToDatabase(true).then((res) => {
        if (res.processedCount > 0) {
          toast.success('Sinkronisasi Otomatis Sukses', `${res.processedCount} data scan berhasil terekam ke database Cloud.`);
        }
      }).catch(() => {});
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Koneksi Internet Terputus', 'Perangkat beralih ke Mode Offline. Scan presensi akan disimpan secara lokal.', 6000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = store.subscribe(() => {
      setStudentsList(store.getStudents());
      setTeachersList(store.getTeachers());
      setOfflineQueueCount(store.getOfflineQueueCount());
      setTodayLupaKartuCount(store.getTodayLupaKartuList().total);
    });

    fetchAvailableCameras();

    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      setHasNfcSupport(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (nfcAbortControllerRef.current) {
        nfcAbortControllerRef.current.abort();
        nfcAbortControllerRef.current = null;
      }
      unsubscribe();
      stopCamera();
    };
  }, []);

  const toggleWebNfc = async () => {
    if (!hasNfcSupport) {
      toast.info(
        'NFC Tidak Didukung',
        'Browser atau perangkat ini tidak mendukung Web NFC API. Anda tetap dapat menggunakan USB RFID Reader (Plug & Play) atau Kamera.'
      );
      return;
    }

    if (isNfcActive) {
      if (nfcAbortControllerRef.current) {
        nfcAbortControllerRef.current.abort();
        nfcAbortControllerRef.current = null;
      }
      setIsNfcActive(false);
      toast.info('NFC Dinonaktifkan', 'Sensor NFC perangkat dimatikan.');
      return;
    }

    try {
      const NDEFReaderClass = (window as any).NDEFReader;
      const ndef = new NDEFReaderClass();
      const ctrl = new AbortController();
      nfcAbortControllerRef.current = ctrl;

      await ndef.scan({ signal: ctrl.signal });
      setIsNfcActive(true);
      toast.success(
        'Sensor NFC Aktif!',
        'Tempelkan kartu RFID/NFC (Mifare/e-KTP/Tag) ke bagian belakang perangkat.'
      );

      ndef.addEventListener('reading', (event: any) => {
        const serialNumber = event.serialNumber;
        if (serialNumber) {
          const cleanSerial = serialNumber.replace(/[\s:-]+/g, '').toUpperCase();
          processScannedCode(cleanSerial);
        }
      });

      ndef.addEventListener('readingerror', () => {
        toast.error('Gagal Baca NFC', 'Kartu NFC tidak terbaca dengan jelas. Silakan tap ulang.');
      });
    } catch (err: any) {
      console.error('NFC error:', err);
      setIsNfcActive(false);
      toast.error('Izin NFC Ditolak / Tidak Aktif', err.message || 'Pastikan NFC diaktifkan di setelan HP.');
    }
  };

  const handleManualCheckConnection = async () => {
    setIsCheckingConnection(true);
    const onlineState = typeof navigator !== 'undefined' ? navigator.onLine : true;
    setIsOnline(onlineState);
    if (onlineState) {
      await store.fetchFromServer();
      toast.success('Koneksi Cloud Normal', 'Perangkat terhubung dengan database Supabase Cloud PostgreSQL.');
    } else {
      toast.warning('Koneksi Masih Terputus', 'Perangkat masih offline. Hasil scan tetap disimpan secara aman di cache lokal.');
    }
    setIsCheckingConnection(false);
  };

  // Listen for USB/Bluetooth Hardware Barcode & QR Scanner Gun
  useEffect(() => {
    let buffer = '';
    let timeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
      ) {
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
  }, [debounceSeconds, rapidQueueMode, currentOfficer, scanTargetMode, scanTypeMode]);

  const fetchAvailableCameras = async () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
        return;
      }
      const devices = await Html5Qrcode.getCameras().catch(() => []);
      if (devices && devices.length > 0) {
        const formatted = devices.map((d) => ({
          id: d.id,
          label: d.label || `Kamera ${d.id.substring(0, 6)}`,
        }));
        setAvailableCameras(formatted);

        // Auto select rear camera
        const backCam =
          formatted.find(
            (c) =>
              c.label.toLowerCase().includes('back') ||
              c.label.toLowerCase().includes('rear') ||
              c.label.toLowerCase().includes('environment') ||
              c.label.toLowerCase().includes('0')
          ) || formatted[0];

        setSelectedCameraId(backCam.id);
      }
    } catch (e) {
      console.warn('Note: Video devices not enumerated:', e);
    }
  };

  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  };

  const playSuccessSound = () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
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
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Unmistakable rejection / duplicate warning buzz
      const freqs = [220, 165];
      freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + index * 0.1);

        gain.gain.setValueAtTime(0, now + index * 0.1);
        gain.gain.linearRampToValueAtTime(0.25, now + index * 0.1 + 0.01);
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

  const playVoiceFeedback = (name: string, status: string, isSuccess: boolean) => {
    if (!soundEnabled) return;
    // Asynchronous non-blocking TTS to avoid main thread camera stutter
    setTimeout(() => {
      try {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          
          let text = '';
          if (isSuccess) {
             const firstName = name.split(' ')[0];
             if (status === 'Terlambat') {
               text = `Hadir terlambat, ${firstName}`;
             } else {
               text = `Terima kasih, ${firstName}`;
             }
          } else {
             text = `Maaf, presensi gagal`;
          }
          
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'id-ID';
          utterance.rate = 1.15; 
          window.speechSynthesis.speak(utterance);
        }
      } catch (e) {
        console.log('TTS Error', e);
      }
    }, 20);
  };

  const processScannedCode = (decodedText: string) => {
    if (!decodedText || !decodedText.trim()) return;

    const raw = decodedText.trim();
    const now = Date.now();

    // 1. Same-QR debounce check
    const lastTime = recentScanTimesRef.current.get(raw);
    if (lastTime && now - lastTime < debounceSeconds * 1000) {
      toast.warning('Terlalu Cepat!', 'Data ini baru saja dipindai beberapa detik yang lalu. Mohon tunggu sesaat.');
      return;
    }

    // Keep map bounded to prevent memory growth
    if (recentScanTimesRef.current.size > 200) {
      const cutoff = now - 60000;
      for (const [key, t] of recentScanTimesRef.current.entries()) {
        if (t < cutoff) recentScanTimesRef.current.delete(key);
      }
    }

    // 2. Atomic frame processing lock
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      recentScanTimesRef.current.set(raw, now);
      setLastScannedQR(raw);

      const currentlyOffline = !isOnline || (typeof navigator !== 'undefined' && !navigator.onLine);

      // Visual flash effect
      setScanFlash(true);
      setTimeout(() => setScanFlash(false), 200);

      const timeStr =
        new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Asia/Jayapura',
        }) + ' WIT';

      // Smart target resolution: check if target explicitly matches student or teacher
      let effectiveTarget: ScanTargetMode = scanTargetMode;
      if (scanTargetMode === 'auto') {
        const match = store.findPersonByRfidOrCode(raw);
        if (match) {
          effectiveTarget = match.type === 'guru' ? 'guru' : 'siswa';
        } else {
          effectiveTarget = 'siswa';
        }
      } else if (scanTargetMode === 'siswa') {
        const studentMatch = store.findStudentByScannedCode(raw);
        if (!studentMatch) {
          const teacherMatch = store.findTeacherByScannedCode(raw);
          if (teacherMatch) {
            effectiveTarget = 'guru';
          }
        }
      } else if (scanTargetMode === 'guru') {
        const teacherMatch = store.findTeacherByScannedCode(raw);
        if (!teacherMatch) {
          const studentMatch = store.findStudentByScannedCode(raw);
          if (studentMatch) {
            effectiveTarget = 'siswa';
          }
        }
      }

      if (effectiveTarget === 'guru') {
        // Record scan in teacher attendance store with scan type mode
        const result = store.recordTeacherScan(raw, raw, raw, currentOfficer, scanTypeMode);

        if (result.success) {
          playSuccessSound();
          if (result.teacher?.nama) playVoiceFeedback(result.teacher.nama, result.status || '', true);
        } else {
          playErrorSound();
          playVoiceFeedback('', '', false);
        }

        const isRfid = result.record?.scan_method === 'RFID' || (result.teacher?.rfid_uid && raw.toUpperCase().includes(result.teacher.rfid_uid.toUpperCase()));

        const outcome: ScanOutcome = {
          success: result.success,
          isDuplicate: result.isDuplicate,
          isOffline: currentlyOffline,
          targetMode: 'guru',
          scanMethod: isRfid ? 'RFID' : 'QR',
          teacher: result.teacher,
          teacherRecord: result.record,
          type: result.type,
          status: result.status,
          message: result.message,
          scannedCode: raw,
          timestamp: timeStr,
        };

        setScanResult(outcome);
        setScanFeed((prev) => [outcome, ...prev].slice(0, 30));

        if (!rapidQueueMode) {
          setShowModal(true);
        }
      } else {
        // Record scan in student attendance store with scan type mode
        const result = store.recordScan(raw, raw, raw, currentOfficer, scanTypeMode);

        if (result.success) {
          playSuccessSound();
          if (result.student?.nama) playVoiceFeedback(result.student.nama, result.status || '', true);
        } else {
          playErrorSound();
          playVoiceFeedback('', '', false);
        }

        const isRfid = result.record?.scan_method === 'RFID' || (result.student?.rfid_uid && raw.toUpperCase().includes(result.student.rfid_uid.toUpperCase()));

        const outcome: ScanOutcome = {
          success: result.success,
          isDuplicate: result.isDuplicate,
          isOffline: currentlyOffline,
          targetMode: 'siswa',
          scanMethod: isRfid ? 'RFID' : 'QR',
          student: result.student,
          record: result.record,
          type: result.type,
          status: result.status,
          message: result.message,
          scannedCode: raw,
          timestamp: timeStr,
        };

        setScanResult(outcome);
        setScanFeed((prev) => [outcome, ...prev].slice(0, 30));

        if (!rapidQueueMode) {
          setShowModal(true);
        }
      }
    } finally {
      // Rapid lock release to ensure zero skipped frames in queue
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 150);
    }
  };

  const handleAssignRfidToStudent = (rfidUid: string, studentId: string) => {
    if (!rfidUid || !studentId) return;
    const success = store.assignRfidToStudent(studentId, rfidUid);
    if (success) {
      toast.success('Kartu RFID Ditaungkan', 'Kartu RFID berhasil ditautkan ke siswa. Memproses absensi...');
      processScannedCode(rfidUid);
    }
  };

  const handleAssignRfidToTeacher = (rfidUid: string, teacherId: string) => {
    if (!rfidUid || !teacherId) return;
    const success = store.assignRfidToTeacher(teacherId, rfidUid);
    if (success) {
      toast.success('Kartu RFID Ditautkan', 'Kartu RFID berhasil ditautkan ke guru. Memproses absensi...');
      processScannedCode(rfidUid);
    }
  };

  const handleConnectQRToStudent = (codeToConnect: string, studentId: string) => {
    if (!codeToConnect || !studentId) return;

    store.updateStudent(studentId, { id_qr: codeToConnect });
    const result = store.recordScan(codeToConnect, codeToConnect, codeToConnect, currentOfficer);

    const currentlyOffline = !isOnline || (typeof navigator !== 'undefined' && !navigator.onLine);

    if (result.success) {
      playSuccessSound();
      if (result.student?.nama) playVoiceFeedback(result.student.nama, result.status || '', true);
    } else {
      playErrorSound();
      playVoiceFeedback('', '', false);
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
      isOffline: currentlyOffline,
      targetMode: 'siswa',
      scanMethod: 'QR',
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

  const handleConnectQRToTeacher = (codeToConnect: string, teacherId: string) => {
    if (!codeToConnect || !teacherId) return;

    store.updateTeacher(teacherId, { id_qr: codeToConnect });
    const result = store.recordTeacherScan(
      codeToConnect,
      codeToConnect,
      codeToConnect,
      currentOfficer
    );

    const currentlyOffline = !isOnline || (typeof navigator !== 'undefined' && !navigator.onLine);

    if (result.success) {
      playSuccessSound();
      if (result.teacher?.nama) playVoiceFeedback(result.teacher.nama, result.status || '', true);
    } else {
      playErrorSound();
      playVoiceFeedback('', '', false);
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
      isOffline: currentlyOffline,
      targetMode: 'guru',
      scanMethod: 'QR',
      teacher: result.teacher,
      teacherRecord: result.record,
      type: result.type,
      status: result.status,
      message: result.message,
      scannedCode: codeToConnect,
      timestamp: timeStr,
    };

    setScanResult(outcome);
    setScanFeed((prev) => [outcome, ...prev].slice(0, 30));
    setSelectedTeacherForQR('');
  };

  const applyZoom = async (targetZoom: number, activeTrack?: MediaStreamTrack) => {
    setZoomLevel(targetZoom);

    // 1. Hardware Zoom on MediaStreamTrack
    try {
      let track = activeTrack;
      if (!track) {
        const videoEl = document.querySelector('#reader video') as HTMLVideoElement | null;
        const stream = videoEl?.srcObject as MediaStream | null;
        track = stream?.getVideoTracks()[0];
      }
      if (track) {
        const caps: any = track.getCapabilities ? track.getCapabilities() : {};
        if (caps && caps.zoom) {
          const minZ = caps.zoom.min || 1;
          const maxZ = caps.zoom.max || 4;
          const clamped = Math.max(minZ, Math.min(maxZ, targetZoom));
          await track.applyConstraints({
            advanced: [{ zoom: clamped } as any],
          });
        }
      }
    } catch (err) {
      console.warn('Hardware zoom note:', err);
    }

    // 2. Universal Digital CSS Zoom on #reader video
    const videoEl = document.querySelector('#reader video') as HTMLVideoElement | null;
    if (videoEl) {
      videoEl.style.transform = targetZoom > 1.02 ? `scale(${targetZoom})` : 'none';
      videoEl.style.transformOrigin = 'center center';
      videoEl.style.transition = 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
    }
  };

  const toggleTorch = async () => {
    try {
      const videoEl = document.querySelector('#reader video') as HTMLVideoElement | null;
      const stream = videoEl?.srcObject as MediaStream | null;
      const track = stream?.getVideoTracks()[0];
      if (track) {
        const nextState = !isTorchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState } as any],
        });
        setIsTorchOn(nextState);
        if (nextState) {
          toast.info('Lampu Kilat Menyala', 'Membantu pembacaan kode QR di tempat kurang cahaya.');
        } else {
          toast.info('Lampu Kilat Dimatikan');
        }
      }
    } catch (e) {
      toast.warning('Lampu Kilat Tidak Tersedia', 'Perangkat ini tidak mendukung kontrol lampu senter.');
    }
  };

  const toggleSmallQrMode = async () => {
    const nextMode = !isSmallQrMode;
    setIsSmallQrMode(nextMode);
    if (nextMode) {
      await applyZoom(2.0);
      toast.success(
        'Mode QR Kecil Aktif (Zoom 2.0x)',
        'Kamera otomatis diperbesar 2x. Posisikan kartu pada jarak 15-20 cm dari lensa agar fokus tajam & cepat terbaca.',
        5000
      );
    } else {
      await applyZoom(1.0);
      toast.info('Mode Normal (1.0x)', 'Zoom kamera dikembalikan ke posisi standar.');
    }
  };

  const triggerAutoFocus = async () => {
    try {
      const videoEl = document.querySelector('#reader video') as HTMLVideoElement | null;
      const stream = videoEl?.srcObject as MediaStream | null;
      const track = stream?.getVideoTracks()[0];
      if (track) {
        const caps: any = track.getCapabilities ? track.getCapabilities() : {};
        if (caps && caps.focusMode && Array.isArray(caps.focusMode)) {
          if (caps.focusMode.includes('continuous')) {
            await track.applyConstraints({
              advanced: [{ focusMode: 'continuous' } as any],
            });
          } else if (caps.focusMode.includes('single-shot')) {
            await track.applyConstraints({
              advanced: [{ focusMode: 'single-shot' } as any],
            });
          }
          toast.success('Fokus Diperbarui', 'Lensa kamera telah dikalibrasi ulang untuk ketajaman optimal.');
          return;
        }
      }
      toast.info('Fokus Otomatis Aktif', 'Sensor kamera memproses fokus otomatis secara kontinu.');
    } catch {
      toast.info('Fokus Otomatis Aktif', 'Sensor kamera memproses fokus otomatis secara kontinu.');
    }
  };

  const startCamera = async (camIdOverride?: string) => {
    setIsCheckingCamera(true);
    setCameraError(null);

    try {
      await stopCamera();
      setScanResult(null);

      // Verify browser support for mediaDevices
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const errorMsg = 'Browser ini tidak mendukung akses kamera langsung (MediaDevices API tidak tersedia).';
        setCameraError(errorMsg);
        setIsCameraActive(false);
        setIsCheckingCamera(false);
        toast.warning('Kamera Tidak Didukung', errorMsg, 5000);
        return;
      }

      // Check available devices
      let currentDevices: Array<{ id: string; label: string }> = availableCameras;
      if (currentDevices.length === 0) {
        try {
          const fetched = await Html5Qrcode.getCameras();
          if (fetched && fetched.length > 0) {
            currentDevices = fetched.map((d) => ({
              id: d.id,
              label: d.label || `Kamera ${d.id.substring(0, 6)}`,
            }));
            setAvailableCameras(currentDevices);
          }
        } catch {
          // getCameras might throw if no devices or permissions
        }
      }

      // Brief DOM mount pause
      await new Promise((resolve) => setTimeout(resolve, 150));

      const readerEl = document.getElementById('reader');
      if (!readerEl) {
        setIsCheckingCamera(false);
        return;
      }

      const formatsToSupport = qrOnlyMode
        ? [Html5QrcodeSupportedFormats.QR_CODE]
        : [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
          ];

      const html5QrCode = new Html5Qrcode('reader', {
        formatsToSupport,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      const getResConstraints = () => {
        if (scanResolution === 'fast') {
          return { width: { ideal: 800 }, height: { ideal: 600 } };
        }
        if (scanResolution === 'fullhd') {
          return { width: { ideal: 1920 }, height: { ideal: 1080 } };
        }
        if (scanResolution === 'hd') {
          return { width: { ideal: 1280 }, height: { ideal: 720 } };
        }
        return {};
      };

      const config = {
        fps: scanFps,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const factor = isSmallQrMode ? 0.85 : 0.75;
          const edgeSize = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * factor);
          return { width: edgeSize, height: edgeSize };
        },
        aspectRatio: 1.0,
        disableFlip: false,
        videoConstraints: {
          ...getResConstraints(),
          facingMode: 'environment',
          focusMode: { ideal: 'continuous' } as any,
        },
      };

      const targetCamId =
        camIdOverride || selectedCameraId || (currentDevices.length > 0 ? currentDevices[0].id : '');

      let started = false;
      let lastErr: any = null;

      // Tier 1: Target camera ID if available
      if (targetCamId) {
        try {
          await html5QrCode.start(
            targetCamId,
            config,
            (decodedText) => processScannedCode(decodedText),
            () => {}
          );
          started = true;
          setSelectedCameraId(targetCamId);
        } catch (e: any) {
          lastErr = e;
          console.warn('Camera start with targetCamId failed, attempting fallback:', e?.message || e);
        }
      }

      // Tier 2: Rear / environment camera
      if (!started) {
        try {
          await html5QrCode.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => processScannedCode(decodedText),
            () => {}
          );
          started = true;
        } catch (e: any) {
          lastErr = e;
          console.warn('Camera start with facingMode environment failed, trying user camera:', e?.message || e);
        }
      }

      // Tier 3: Front / user webcam
      if (!started) {
        try {
          await html5QrCode.start(
            { facingMode: 'user' },
            config,
            (decodedText) => processScannedCode(decodedText),
            () => {}
          );
          started = true;
        } catch (e: any) {
          lastErr = e;
          console.warn('Camera start with facingMode user failed:', e?.message || e);
        }
      }

      // Tier 4: Try any detected camera device ID
      if (!started && currentDevices.length > 0) {
        try {
          await html5QrCode.start(
            currentDevices[0].id,
            config,
            (decodedText) => processScannedCode(decodedText),
            () => {}
          );
          started = true;
          setSelectedCameraId(currentDevices[0].id);
        } catch (e: any) {
          lastErr = e;
        }
      }

      if (started) {
        setIsCameraActive(true);
        setCameraError(null);

        // Inspect hardware capabilities (zoom & torch) and re-apply current zoom
        setTimeout(() => {
          try {
            const videoEl = document.querySelector('#reader video') as HTMLVideoElement | null;
            const stream = videoEl?.srcObject as MediaStream | null;
            const track = stream?.getVideoTracks()[0];
            if (track) {
              const caps: any = track.getCapabilities ? track.getCapabilities() : {};
              if (caps && caps.zoom) {
                setHasHardwareZoom(true);
              } else {
                setHasHardwareZoom(false);
              }
              if (caps && caps.torch) {
                setHasTorch(true);
              } else {
                setHasTorch(false);
              }
              if (caps && caps.focusMode) {
                setHasContinuousFocus(true);
              } else {
                setHasContinuousFocus(false);
              }

              const targetZ = isSmallQrMode && zoomLevel === 1.0 ? 2.0 : zoomLevel;
              if (targetZ > 1.0) {
                applyZoom(targetZ, track);
              }
            }
          } catch (e) {
            console.warn('Track capabilities check error:', e);
          }
        }, 350);
      } else {
        throw lastErr || new Error('Tidak ada kamera yang dapat diakses');
      }
    } catch (err: any) {
      console.warn('Camera activation note (device not found or access denied):', err?.message || err);
      setIsCameraActive(false);

      const errMsg = err?.message || String(err || '');
      let friendlyMessage = 'Kamera tidak dapat diakses atau tidak merespons.';

      if (
        errMsg.includes('NotFound') ||
        err?.name === 'NotFoundError' ||
        errMsg.includes('Requested device not found') ||
        errMsg.includes('no camera') ||
        errMsg.includes('DevicesNotFoundError')
      ) {
        friendlyMessage =
          'Kamera tidak ditemukan pada perangkat ini. Pastikan webcam terhubung atau gunakan scanner USB / input manual NISN/NIP.';
      } else if (
        errMsg.includes('NotAllowed') ||
        err?.name === 'NotAllowedError' ||
        errMsg.includes('Permission')
      ) {
        friendlyMessage = 'Akses kamera ditolak. Silakan berikan izin kamera pada peramban (browser) Anda.';
      } else if (
        errMsg.includes('NotReadable') ||
        err?.name === 'NotReadableError' ||
        errMsg.includes('busy')
      ) {
        friendlyMessage = 'Kamera sedang digunakan oleh program atau aplikasi lain. Tutup aplikasi tersebut dan coba lagi.';
      }

      setCameraError(friendlyMessage);
      toast.warning('Kamera Tidak Ditemukan / Nonaktif', friendlyMessage, 6000);
    } finally {
      setIsCheckingCamera(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Scanner stop note:', e);
      }
    }
    scannerRef.current = null;
    setIsCameraActive(false);
    setIsTorchOn(false);

    // Reset CSS zoom transform
    const videoEl = document.querySelector('#reader video') as HTMLVideoElement | null;
    if (videoEl) {
      videoEl.style.transform = 'none';
    }
  };

  const handleScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.info('Memproses Gambar...', 'Mendeteksi QR Code dari gambar yang diunggah.');
      let html5QrCode = scannerRef.current;
      if (!html5QrCode) {
        html5QrCode = new Html5Qrcode('reader', {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
      }
      const decodedText = await html5QrCode.scanFile(file, true);
      if (decodedText) {
        processScannedCode(decodedText);
        toast.success('QR Code Berhasil Terbaca!', `Kode: ${decodedText}`);
      }
    } catch (err: any) {
      console.warn('QR file scan error:', err);
      toast.error('Gagal Membaca QR dari File', 'Pastikan gambar mengandung QR code yang jelas dan tidak buram.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSendWhatsApp = (student: Student, record?: AttendanceRecord, status?: string) => {
    let phone = student.no_hp_ortu;
    if (!phone) {
      phone = prompt(`Masukkan No WhatsApp OrtU/Siswa ${student.nama}:`, '08123456789') || undefined;
      if (phone && phone.trim()) {
        store.updateStudent(student.id, { no_hp_ortu: phone.trim() });
        student.no_hp_ortu = phone.trim();
      }
    }
    if (phone) {
      const schoolSettings = store.getSettings();
      let template: string | undefined;
      if (status === 'Hadir') template = schoolSettings.waTemplateHadir;
      else if (status === 'Terlambat') template = schoolSettings.waTemplateTerlambat;

      const schoolName = schoolSettings.schoolName || 'SMA NEGERI 15 AMBON';
      const waMsg = generateWhatsAppMessage(student, record, schoolName, template);
      const waUrl = getWhatsAppLink(phone, waMsg);
      window.open(waUrl, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Switcher & Scan Configuration Banner */}
      <div className="backdrop-blur-xl bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden space-y-4">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={`p-2.5 rounded-xl ${
                scanTargetMode === 'guru'
                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                  : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
              }`}
            >
              {scanTargetMode === 'guru' ? (
                <Briefcase className="w-6 h-6" />
              ) : (
                <GraduationCap className="w-6 h-6" />
              )}
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white tracking-wide">
                  Scanner Presensi NEXA15
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3" />
                  Anti Scan Ganda Aktif
                </span>
                {isOnline ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <Wifi className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Database Cloud Online</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-500/40 animate-pulse">
                    <WifiOff className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    <span>Mode Offline (Internet Terputus)</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {scanTargetMode === 'guru'
                  ? 'Mode target: Presensi Guru & Pegawai (Scan Kartu NIP / QR)'
                  : 'Mode target: Presensi Siswa Sekolah (Scan Kartu NISN / QR)'}
              </p>
            </div>
          </div>

          {/* Segmented Switcher for Target (Siswa vs Guru) */}
          <div className="relative z-10 flex items-center gap-1.5 bg-slate-900/50 p-1.5 rounded-xl border border-white/5 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => {
                setScanTargetMode('siswa');
                setScanResult(null);
              }}
              className={`flex-1 lg:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                scanTargetMode === 'siswa'
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Presensi Siswa</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setScanTargetMode('guru');
                setScanResult(null);
              }}
              className={`flex-1 lg:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                scanTargetMode === 'guru'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Presensi Guru & Staf</span>
            </button>

            {/* Dedicated Lupa Kartu Button for Picket & Admin */}
            <button
              type="button"
              id="btn-lupa-kartu-piket"
              onClick={() => setShowLupaKartuModal(true)}
              className="flex-1 lg:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-extrabold rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-sm hover:shadow-md transition-all cursor-pointer whitespace-nowrap active:scale-95"
              title="Buka Formulir Presensi Siswa/Guru Lupa Kartu (Piket & Admin)"
            >
              <CreditCard className="w-4 h-4 text-amber-100" />
              <span>Lupa Kartu (Piket)</span>
              {todayLupaKartuCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/30 text-white text-[10px] font-black rounded-full border border-white/40">
                  {todayLupaKartuCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Prominent Unsynced Scan Data Warning */}
        {offlineQueueCount > 0 && (
          <div className="bg-gradient-to-r from-amber-500/20 via-rose-500/15 to-amber-500/20 border-2 border-amber-500/80 dark:border-amber-500 rounded-2xl p-4 shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-amber-500 to-rose-600 text-white rounded-xl shadow-sm flex-shrink-0 animate-pulse">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-xs sm:text-sm text-rose-700 dark:text-rose-300 uppercase tracking-wide flex items-center gap-1.5">
                      <span>PERINGATAN: {offlineQueueCount} DATA SCAN BELUM TERKIRIM KE DATABASE</span>
                    </h3>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700">
                      Antisipasi Data Hilang
                    </span>
                  </div>
                  <p className="text-xs text-white dark:text-slate-200 mt-1 leading-relaxed">
                    Data scan presensi ini tersimpan di memori lokal dan <b>belum terekam ke Database Cloud</b>. Segera klik tombol <b>Kirim ke Database</b> agar rekapitulasi presensi tidak hilang saat berpindah perangkat atau browser ditutup.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-end sm:self-center flex-shrink-0">
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-unsynced-modal'))}
                  className="px-3.5 py-2 text-xs font-black bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700 hover:bg-rose-50 dark:hover:bg-slate-700 active:scale-95 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span>Buka Popup Petugas</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await store.syncAllPendingToDatabase(true);
                    if (res.success) {
                      toast.success('Pengiriman Berhasil', res.message);
                    } else {
                      toast.warning('Pengiriman Tertunda', res.message);
                    }
                  }}
                  className="px-4 py-2 text-xs font-black bg-gradient-to-r from-amber-600 via-rose-600 to-rose-700 hover:from-amber-700 hover:to-rose-800 active:scale-95 text-white rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Kirim ke Server ({offlineQueueCount})</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Prominent Network Offline Warning Banner */}
        {!isOnline && (
          <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border-2 border-amber-400/80 dark:border-amber-600/80 rounded-2xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl border border-amber-500/30 flex-shrink-0 animate-pulse">
                  <WifiOff className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-xs sm:text-sm text-amber-950 dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>Peringatan: Koneksi Internet Terputus (Mode Offline Aktif)</span>
                    </h3>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-400/25 text-amber-900 dark:text-amber-200 border border-amber-400/50">
                      Presensi Disimpan di Cache Lokal
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 dark:text-slate-300 mt-1 leading-relaxed">
                    Aplikasi presensi mengandalkan koneksi database remote Supabase Cloud PostgreSQL. Karena internet terputus, Anda tetap dapat melakukan scan QR - data akan disimpan sementara di memori lokal browser dan otomatis disinkronkan ke server cloud saat internet terhubung kembali.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                <button
                  type="button"
                  onClick={handleManualCheckConnection}
                  disabled={isCheckingConnection}
                  className="px-3.5 py-2 text-xs font-extrabold bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Cek apakah koneksi internet sudah aktif kembali"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingConnection ? 'animate-spin' : ''}`} />
                  <span>{isCheckingConnection ? 'Memeriksa...' : 'Cek Status Jaringan'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Banner Status Hari & Aturan Jam Presensi (Senin-Kamis vs Jumat) */}
        <div className={`p-4 rounded-3xl border transition-all ${
          scheduleStatus.isFriday
            ? 'bg-emerald-500/10 border-emerald-500/20'
            : scheduleStatus.isWeekend
            ? 'bg-slate-800/50 border-slate-700/50'
            : 'bg-blue-500/10 border-blue-500/20'
        }`}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl shrink-0 ${
                scheduleStatus.isFriday
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : scheduleStatus.isWeekend
                  ? 'bg-slate-700 text-slate-300'
                  : 'bg-blue-500/20 text-blue-400'
              }`}>
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs sm:text-sm font-black text-white">
                    {scheduleStatus.statusTitle}
                  </h4>
                  <span className={`px-2 py-0.5 text-[10px] font-black rounded-full border ${
                    scheduleStatus.isFriday
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                      : scheduleStatus.isWeekend
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-200 dark:text-slate-300 border-white/20'
                      : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                  }`}>
                    {scheduleStatus.statusBadge}
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
                    scheduleStatus.currentSession === 'Pulang'
                      ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                      : scheduleStatus.currentSession === 'Masuk'
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                      : 'bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl text-slate-400'
                  }`}>
                    Sesi Aktif: {scheduleStatus.currentSession === 'Pulang' ? '🔔 Absen Pulang' : scheduleStatus.currentSession === 'Masuk' ? '⏰ Absen Masuk' : '🌴 Hari Libur'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {scheduleStatus.statusDescription}
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400 flex-wrap">
                  <span>⏰ <b>Batas Masuk:</b> {store.getSettings().cutoffTime || '07:15'} WIT</span>
                  <span>•</span>
                  <span>🚪 <b>Mulai Pulang:</b> Jam {scheduleStatus.pulangStartTime} WIT ke atas</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scan Type & Queue Mode Control Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-white/5 dark:border-slate-800 text-xs">
          {/* Scan Type Selector (Otomatis / Masuk / Pulang) */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>Sesi Presensi:</span>
            </span>
            <div className="inline-flex rounded-xl bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl p-1 border border-white/10">
              <button
                type="button"
                onClick={() => setScanTypeMode('Auto')}
                className={`px-3 py-1 text-[11px] font-extrabold rounded-lg transition-all ${
                  scanTypeMode === 'Auto'
                    ? 'bg-[#0b1121]/95 backdrop-blur-2xl border border-white/10 shadow-2xl text-blue-700 dark:text-blue-400 shadow-sm border border-white/10'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={`Otomatis tentukan Masuk/Pulang: Hari Jumat mulai jam ${scheduleStatus.pulangStartTime} WIT, hari biasa mulai ${store.getSettings().pulangStartTimeNormal || '13:30'} WIT`}
              >
                Otomatis ({scheduleStatus.currentSession})
              </button>
              <button
                type="button"
                onClick={() => setScanTypeMode('Masuk')}
                className={`px-3 py-1 text-[11px] font-extrabold rounded-lg flex items-center gap-1 transition-all ${
                  scanTypeMode === 'Masuk'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Paksa hanya rekam presensi Masuk"
              >
                <LogIn className="w-3 h-3" />
                <span>Masuk Saja</span>
              </button>
              <button
                type="button"
                onClick={() => setScanTypeMode('Pulang')}
                className={`px-3 py-1 text-[11px] font-extrabold rounded-lg flex items-center gap-1 transition-all ${
                  scanTypeMode === 'Pulang'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Paksa hanya rekam presensi Pulang"
              >
                <LogOut className="w-3 h-3" />
                <span>Pulang Saja</span>
              </button>
            </div>
          </div>

          {/* Mode Scan Massal / Popup Mode Toggle */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={() => setRapidQueueMode(!rapidQueueMode)}
              className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-2 border shadow-sm ${
                !rapidQueueMode
                  ? 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800 ring-2 ring-blue-400/20'
                  : 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800'
              }`}
              title="Klik untuk beralih antara Mode Popup Detail (3 Detik) dan Mode Scan Massal (Cepat)"
            >
              {!rapidQueueMode ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                  <span>Mode Standar (Popup 3 Detik)</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Mode Scan Massal (Cepat / Non-Popup)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Camera & Scanner Panel */}
        <div className="lg:col-span-7 backdrop-blur-xl bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden flex flex-col items-center justify-between">
          {/* Header Controls */}
          <div className="w-full flex items-center justify-between pb-3 border-b border-white/5 dark:border-slate-800 mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isCameraActive ? 'bg-emerald-400' : 'bg-slate-300'
                  }`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${
                    isCameraActive ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                ></span>
              </span>
              <span className="text-xs font-extrabold text-white uppercase tracking-wider">
                {isCameraActive ? 'Kamera Aktif & Siap Scan' : 'Kamera Siaga (Off)'}
              </span>
              {isOnline ? (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  <Wifi className="w-3 h-3" />
                  <span>Cloud Online</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-700 animate-pulse">
                  <WifiOff className="w-3 h-3" />
                  <span>Offline Mode</span>
                </span>
              )}
            </div>

            {/* Camera Controls & Selector */}
            <div className="flex items-center gap-2">
              {availableCameras.length > 1 && (
                <select
                  value={selectedCameraId}
                  onChange={(e) => {
                    setSelectedCameraId(e.target.value);
                    if (isCameraActive) {
                      startCamera(e.target.value);
                    }
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold border border-white/10 rounded-lg dark:bg-slate-800 dark:text-white"
                >
                  {availableCameras.map((cam) => (
                    <option key={cam.id} value={cam.id}>
                      {cam.label}
                    </option>
                  ))}
                </select>
              )}

              {isCameraActive && (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-3 py-1 bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold text-xs rounded-lg border border-rose-200 dark:border-rose-800 flex items-center gap-1 hover:bg-rose-200 transition-colors"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>Matikan</span>
                </button>
              )}
            </div>
          </div>

          {/* Video Container Box */}
          <div
            className={`w-full max-w-md aspect-square bg-slate-950/60 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] overflow-hidden relative flex items-center justify-center transition-all ${
              scanFlash
                ? 'border-emerald-400 ring-4 ring-emerald-400/30 shadow-[inset_0_0_40px_rgba(16,185,129,0.2)]'
                : 'shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]'
            }`}
          >
            {/* Target element for html5-qrcode */}
            <div id="reader" className="w-full h-full"></div>

            {/* Premium Animated Crosshair / Scanner Frame */}
            {isCameraActive && !isSmallQrMode && (
              <div className="absolute inset-8 sm:inset-12 pointer-events-none z-10">
                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400/80 dark:border-blue-500/80 rounded-tl-2xl animate-pulse"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400/80 dark:border-blue-500/80 rounded-tr-2xl animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400/80 dark:border-blue-500/80 rounded-bl-2xl animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400/80 dark:border-blue-500/80 rounded-br-2xl animate-pulse"></div>
                
                {/* Subtle Inner Frame */}
                <div className="absolute inset-0 border border-white/10 rounded-2xl shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]"></div>
              </div>
            )}

            {/* Active Scanning Laser Line Overlay */}
            {isCameraActive && (
              <div className="scanner-laser-line" />
            )}

            {/* Small QR Mode / Zoom Viewfinder Reticle Indicator */}
            {isCameraActive && isSmallQrMode && (
              <div className="absolute inset-6 sm:inset-8 border-2 border-dashed border-amber-400/80 rounded-2xl pointer-events-none z-10 flex flex-col justify-between p-2 shadow-inner">
                <div className="flex justify-between items-center text-[10px] font-black text-amber-300">
                  <span className="bg-slate-950/80 px-2 py-0.5 rounded backdrop-blur-sm border border-amber-500/40 shadow-sm">
                    MACRO ZOOM {zoomLevel.toFixed(1)}X
                  </span>
                  <span className="bg-slate-950/80 px-2 py-0.5 rounded backdrop-blur-sm border border-amber-500/40 shadow-sm">
                    HD SCAN
                  </span>
                </div>
                <div className="self-center bg-slate-950/85 px-3 py-1.5 rounded-xl text-[10px] font-bold text-amber-200 border border-amber-500/40 backdrop-blur-sm shadow-xl">
                  Jarak Kartu Ideal: 15-20 cm
                </div>
              </div>
            )}

            {/* Viewfinder Floating Top Badge (Small QR Mode active) */}
            {isCameraActive && (isSmallQrMode || zoomLevel > 1.05) && (
              <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between pointer-events-none">
                <span className="bg-amber-500 text-slate-950 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-lg animate-pulse">
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>Mode QR Kecil ({zoomLevel.toFixed(1)}x)</span>
                </span>
                <span className="bg-slate-950/80 text-amber-200 px-2 py-0.5 rounded-lg text-[10px] font-bold border border-amber-500/40 backdrop-blur-sm shadow">
                  Fokus Cepat Aktif
                </span>
              </div>
            )}

            {/* Viewfinder Floating Bottom Control HUD */}
            {isCameraActive && (
              <div className="absolute bottom-3 inset-x-3 z-20 flex items-center justify-between gap-1.5 p-1.5 bg-slate-950/85 backdrop-blur-md rounded-xl border border-white/10 shadow-xl">
                {/* Zoom Quick Select Chips */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-extrabold text-slate-400 pl-1 flex items-center gap-0.5">
                    <ZoomIn className="w-3 h-3 text-amber-400" />
                    <span className="hidden sm:inline">Zoom:</span>
                  </span>
                  {[1.0, 1.5, 2.0, 2.5].map((z) => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => applyZoom(z)}
                      className={`px-2 py-0.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                        Math.abs(zoomLevel - z) < 0.05
                          ? 'bg-amber-400 text-slate-950 shadow-sm font-black'
                          : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                      }`}
                      title={`Zoom ${z.toFixed(1)}x`}
                    >
                      {z.toFixed(1)}x
                    </button>
                  ))}
                </div>

                {/* Torch / Flashlight & Small QR Toggle */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={triggerAutoFocus}
                    className="p-1.5 rounded-lg text-xs transition-colors cursor-pointer bg-slate-800 text-sky-400 hover:bg-slate-700 border border-sky-500/30"
                    title="Kunci / Segarkan Fokus Kamera Otomatis"
                  >
                    <Focus className="w-3.5 h-3.5" />
                  </button>
                  {hasTorch && (
                    <button
                      type="button"
                      onClick={toggleTorch}
                      className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                        isTorchOn
                          ? 'bg-amber-400 text-slate-950 font-bold shadow'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                      title={isTorchOn ? 'Matikan Lampu Kilat' : 'Nyalakan Lampu Kilat Kamera (Senter)'}
                    >
                      <Sun className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={toggleSmallQrMode}
                    className={`px-2 py-1 text-[10px] font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                      isSmallQrMode
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                        : 'bg-slate-800 text-amber-300 hover:bg-slate-700 border border-amber-500/30'
                    }`}
                    title="Aktifkan/Nonaktifkan pembesar kamera untuk QR berukuran kecil"
                  >
                    <Zap className="w-3 h-3 text-amber-300" />
                    <span>{isSmallQrMode ? 'QR Kecil: ON' : 'QR Kecil'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Offline Viewfinder Warning Overlay Badge */}
            {!isOnline && isCameraActive && (
              <div className="absolute top-3 inset-x-3 z-30 pointer-events-none">
                <div className="bg-amber-950/90 text-amber-200 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-500/60 shadow-lg flex items-center justify-center gap-2 text-center text-[11px] font-extrabold tracking-wide animate-pulse">
                  <WifiOff className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>MODE OFFLINE: KONEKSI TERPUTUS • SCAN DISIMPAN LOKAL</span>
                </div>
              </div>
            )}

            {/* Flash / Scan feedback indicator ring */}
            {scanFlash && (
              <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none animate-ping z-20" />
            )}

            {!isCameraActive && (
              <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 space-y-3 z-10 overflow-y-auto">
                <div className="w-14 h-14 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 text-cyan-400 border border-white/10 flex items-center justify-center shadow-md flex-shrink-0">
                  {cameraError ? (
                    <CameraOff className="w-7 h-7 text-amber-400" />
                  ) : (
                    <QrCode className="w-7 h-7 text-emerald-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm sm:text-base">
                    {cameraError ? 'Kamera Tidak Terdeteksi / Siaga' : 'Kamera Siap Diaktifkan'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-sm leading-relaxed">
                    {cameraError ||
                      'Klik tombol di bawah untuk membuka pemindaian kamera secara langsung.'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    disabled={isCheckingCamera}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {isCheckingCamera ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                    <span>{cameraError ? 'Coba Hubungkan Kamera' : 'Mulai Scan Kamera Now'}</span>
                  </button>
                  <label className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 hover:border-cyan-500/40 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer">
                    <Upload className="w-4 h-4 text-cyan-400" />
                    <span>Unggah Gambar QR</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleScanFile}
                      className="hidden"
                    />
                  </label>
                </div>
                {cameraError && (
                  <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                    💡 <span className="font-semibold text-slate-300">Alternatif Cepat:</span> Gunakan input manual NISN/NIP atau alat scanner barcode/RFID USB pada kotak di bawah.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Camera Settings & Tuning Bar */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 w-full px-1 text-xs text-white/50 pt-2 border-t border-white/10">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all flex items-center gap-1.5 border ${
                  soundEnabled
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    : 'bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 text-slate-400 border-white/10 hover:bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/10'
                }`}
                title="Suara Bip/Nada Indikator Absensi"
              >
                {soundEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>Suara Beep (On)</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                    <span>Suara (Mute)</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-1 text-[11px] bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 px-2.5 py-1 rounded-xl border border-white/10">
                <Clock className="w-3 h-3 text-slate-400" />
                <span className="font-medium text-slate-400">
                  Durasi Popup:
                </span>
                <select
                  value={modalDuration}
                  onChange={(e) => setModalDuration(Number(e.target.value))}
                  className="bg-transparent font-bold text-blue-400 focus:outline-none [&>option]:bg-slate-900 [&>option]:text-white"
                  title="Durasi waktu tampilan popup informasi hasil scan"
                >
                  <option value={2}>2 Detik</option>
                  <option value={3}>3 Detik (Default)</option>
                  <option value={4}>4 Detik</option>
                  <option value={5}>5 Detik</option>
                </select>
              </div>

              <div className="flex items-center gap-1 text-[11px] bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 px-2.5 py-1 rounded-xl border border-white/10">
                <ShieldAlert className="w-3 h-3 text-slate-400" />
                <span className="font-medium text-slate-400">
                  Jeda Anti-Ganda:
                </span>
                <select
                  value={debounceSeconds}
                  onChange={(e) => setDebounceSeconds(Number(e.target.value))}
                  className="bg-transparent font-bold text-blue-400 focus:outline-none [&>option]:bg-slate-900 [&>option]:text-white"
                  title="Jeda waktu (detik) untuk mencegah kode QR yang sama ter-scan berulang kali"
                >
                  <option value={1}>1s</option>
                  <option value={2}>2s</option>
                  <option value={3}>3s (Saran)</option>
                  <option value={5}>5s</option>
                  <option value={10}>10s</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* QR-Only Mode Toggle for Max Speed */}
              <button
                type="button"
                onClick={() => {
                  const nextVal = !qrOnlyMode;
                  setQrOnlyMode(nextVal);
                  toast.info(
                    nextVal ? 'Mode QR Murni Aktif' : 'Mode Multi-Barcode Aktif',
                    nextVal
                      ? 'Algoritma barcode 1D dinonaktifkan untuk respon baca kilat.'
                      : 'Mendukung QR Code dan Barcode 1D (Code 128, 39, EAN).'
                  );
                  if (isCameraActive) {
                    setTimeout(() => startCamera(), 100);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all flex items-center gap-1.5 border btn-press ${
                  qrOnlyMode
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 text-slate-400 border-white/10 hover:bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/10'
                }`}
                title="Fokus decode hanya pada QR Code sehingga menghemat 70% beban CPU"
              >
                <Zap className={`w-3.5 h-3.5 ${qrOnlyMode ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{qrOnlyMode ? 'QR Murni (Kilat)' : 'Multi-Barcode (1D+QR)'}</span>
              </button>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400">
                  FPS Frame:
                </span>
                {[10, 12, 15, 20].map((fps) => (
                  <button
                    key={fps}
                    type="button"
                    onClick={() => {
                      setScanFps(fps);
                      if (isCameraActive) startCamera();
                    }}
                    className={`px-2 py-0.5 text-[10px] font-extrabold rounded-lg border transition-all btn-press ${
                      scanFps === fps
                        ? 'bg-blue-500 text-white border-blue-500 shadow-xs'
                        : 'bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 text-slate-300 border-white/10 hover:bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/10'
                    }`}
                    title={fps === 12 ? '12 FPS: Optimal tanpa lag antrean buffer' : `${fps} Frame Per Second`}
                  >
                    {fps} {fps === 12 ? '★' : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Solusi Scan Cepat & Pembesar QR Kecil (Macro Zoom HD & Native Engine) */}
          <div className="w-full mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-50/80 via-orange-50/50 to-amber-50/80 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md flex-shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white dark:text-slate-100">
                      Solusi Scan Cepat & QR Kecil
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                      Macro HD Engine
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Solusi agar QR fisik kecil (kartu pelajar/pegawai) terbaca seketika tanpa perlu menempelkan kartu terlalu dekat.
                  </p>
                </div>
              </div>

              {/* 1-Click Toggle Mode QR Kecil */}
              <button
                type="button"
                id="btn-toggle-small-qr-mode"
                onClick={toggleSmallQrMode}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-sm btn-press ${
                  isSmallQrMode
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white ring-2 ring-amber-400/50 shadow-md'
                    : 'bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl text-slate-200 border border-white/10 hover:border-amber-400'
                }`}
              >
                <ZoomIn className={`w-4 h-4 ${isSmallQrMode ? 'text-white' : 'text-amber-500'}`} />
                <span>{isSmallQrMode ? 'Mode QR Kecil (AKTIF 2.0x)' : 'Aktifkan Mode QR Kecil'}</span>
              </button>
            </div>

            {/* Interactive Zoom Controls & Settings */}
            <div className="pt-2.5 border-t border-amber-200/60 dark:border-amber-800/40 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Zoom Presets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <span className="flex items-center gap-1">
                    <ZoomIn className="w-3.5 h-3.5 text-amber-500" />
                    <span>Tingkat Zoom Kamera:</span>
                  </span>
                  <span className="font-extrabold text-amber-600 dark:text-amber-400">
                    {zoomLevel.toFixed(1)}x {zoomLevel >= 2.0 ? '• Optimal QR Kecil' : '• Normal'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[1.0, 1.5, 2.0, 2.5, 3.0].map((z) => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => applyZoom(z)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black border transition-all cursor-pointer btn-press ${
                        Math.abs(zoomLevel - z) < 0.05
                          ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                          : 'bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl text-slate-300 border-white/10 hover:bg-amber-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {z.toFixed(1)}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution & Engine Status */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <span className="flex items-center gap-1">
                    <Maximize2 className="w-3.5 h-3.5 text-blue-500" />
                    <span>Resolusi Sensor:</span>
                  </span>
                  <select
                    value={scanResolution}
                    onChange={(e) => {
                      const newRes = e.target.value as 'fast' | 'hd' | 'fullhd' | 'auto';
                      setScanResolution(newRes);
                      if (isCameraActive) startCamera(undefined);
                    }}
                    className="px-2 py-0.5 text-[11px] font-extrabold rounded-md border border-white/10 bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl dark:text-white"
                  >
                    <option value="fast">Instan 800x600 (Paling Ringan & Cepat)</option>
                    <option value="hd">HD 720p (Standar)</option>
                    <option value="fullhd">Full HD 1080p</option>
                    <option value="auto">Auto Resolusi</option>
                  </select>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>Akselerasi BarcodeDetector Aktif</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowQrTips(!showQrTips)}
                    className="text-amber-700 dark:text-amber-400 font-extrabold hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Info className="w-3 h-3" />
                    <span>{showQrTips ? 'Tutup Tips' : 'Tips Scan Cepat'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Explanatory Guide Box (Tips QR Kecil) */}
            {showQrTips && (
              <div className="p-3 rounded-xl bg-[#0b1121]/95 backdrop-blur-2xl border border-white/10 shadow-2xl border border-amber-200 dark:border-amber-800 text-[11px] text-slate-300 space-y-2 animate-fadeIn">
                <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-amber-500" />
                  <span>Petunjuk Agar QR Code Kecil Terbaca Kilat (0.1 Detik):</span>
                </div>
                <ul className="space-y-1.5 text-slate-400 list-disc list-inside">
                  <li>
                    <strong className="text-white dark:text-slate-200">Gunakan Zoom 2.0x (Macro):</strong> QR code yang kecil jangan didekatkan terlalu dekat (&lt;10 cm) karena lensa webcam akan blur/buram akibat melewati titik fokus terdekat. Dengan Zoom 2.0x, QR code langsung tampak besar dan tajam dari jarak aman.
                  </li>
                  <li>
                    <strong className="text-white dark:text-slate-200">Jaga Jarak 15 - 20 cm:</strong> Ini adalah jarak optimal di mana sensor kamera dapat menangkap detail garis QR hitam-putih dengan kontras maksimal.
                  </li>
                  <li>
                    <strong className="text-white dark:text-slate-200">Hindari Pantulan Lampu (Glare):</strong> Jika kartu siswa dilaminasi plastik berkilau, miringkan kartu sedikit 15° agar pantulan cahaya lampu ruangan tidak menutupi pola QR.
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Hardware Scanner, USB RFID Reader & Web NFC Card */}
          <div className="w-full mt-4 pt-3 border-t border-white/5 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider flex-wrap gap-2">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                <span>Reader RFID USB, Web NFC & Barcode Scanner</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  <CreditCard className="w-3 h-3" />
                  <span>USB RFID Plug & Play Aktif</span>
                </span>
                {hasNfcSupport && (
                  <button
                    type="button"
                    onClick={toggleWebNfc}
                    className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border transition-all cursor-pointer ${
                      isNfcActive
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm animate-pulse'
                        : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800 hover:bg-indigo-100'
                    }`}
                    title="Aktifkan sensor Web NFC perangkat (misal: HP Android)"
                  >
                    <Radio className="w-3 h-3" />
                    <span>{isNfcActive ? 'NFC Sensor Aktif' : 'NFC HP Siaga'}</span>
                  </button>
                )}
              </div>
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
              <div className="relative flex-1">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder={
                    scanTargetMode === 'guru'
                      ? 'Tempelkan Kartu RFID / Ketik NIP / Nama Guru lalu Enter...'
                      : 'Tempelkan Kartu RFID / Ketik NISN / Nama Siswa lalu Enter...'
                  }
                  className="w-full pl-8 pr-3 py-2 text-xs border border-white/10 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-600"
                />
                <CreditCard className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5"
              >
                <span>Proses Scan</span>
              </button>
            </form>

            {/* Quick helper for Lupa Kartu */}
            <div className="mt-2.5 pt-2 border-t border-white/5 dark:border-slate-800/80 flex items-center justify-between gap-2 flex-wrap text-[11px]">
              <span className="text-slate-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span>Siswa atau Guru tidak membawa kartu fisik?</span>
              </span>
              <button
                type="button"
                onClick={() => setShowLupaKartuModal(true)}
                className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 underline decoration-amber-400 underline-offset-2 cursor-pointer"
              >
                <span>Buka Presensi Lupa Kartu</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Realtime Output Panel & Session Stream */}
        <div className="lg:col-span-5 space-y-4">
          {/* Latest Scan Result Card */}
          <div className="backdrop-blur-xl bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden">
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider mb-3 pb-2 border-b border-white/10 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>
                  Hasil Scan Terakhir ({scanTargetMode === 'guru' ? 'Guru' : 'Siswa'})
                </span>
              </span>
              {scanResult && (
                <span className="text-[10px] font-mono bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl text-slate-300 px-2 py-0.5 rounded">
                  {scanResult.timestamp}
                </span>
              )}
            </h3>

            {scanResult ? (
              <div
                className={`rounded-2xl p-4 border flex flex-col justify-between transition-all ${
                  scanResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : scanResult.isDuplicate
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2.5 mb-3 pb-2 border-b border-white/10/60 dark:border-slate-800">
                    {scanResult.success ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    ) : scanResult.isDuplicate ? (
                      <ShieldAlert className="w-6 h-6 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-extrabold text-sm uppercase tracking-tight">
                          {scanResult.success
                            ? 'ABSENSI BERHASIL'
                            : scanResult.isDuplicate
                            ? 'SCAN GANDA DITOLAK'
                            : 'SCAN DITOLAK'}
                        </h4>
                        {scanResult.isDuplicate && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 bg-rose-600 text-white rounded uppercase tracking-wider">
                            Duplikat Dicegah
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 leading-snug mt-0.5">
                        {scanResult.message}
                      </p>
                    </div>
                  </div>

                  {/* Teacher Result */}
                  {scanResult.teacher && (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-400">Nama Guru:</span>
                        <span className="font-extrabold text-white uppercase">
                          {scanResult.teacher.nama}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-400">NIP / Jabatan:</span>
                        <span className="font-semibold text-white dark:text-slate-200">
                          <span className="font-mono font-bold text-sky-800 dark:text-sky-300">
                            {scanResult.teacher.nip}
                          </span>{' '}
                          • {scanResult.teacher.jabatan}
                        </span>
                      </div>

                      {scanResult.type && (
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-slate-400">
                            Status & Jenis:
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
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
                            <span
                              className={`font-extrabold text-[9px] px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 border ${
                                scanResult.scanMethod === 'RFID'
                                  ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                                  : 'bg-white/5 backdrop-blur-xl border border-white/10/10 border border-white/10 text-slate-200 dark:bg-slate-800 dark:text-slate-300 border-white/10'
                              }`}
                            >
                              {scanResult.scanMethod === 'RFID' ? (
                                <>
                                  <CreditCard className="w-2.5 h-2.5" />
                                  <span>RFID Card</span>
                                </>
                              ) : (
                                <>
                                  <QrCode className="w-2.5 h-2.5" />
                                  <span>QR Code</span>
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      )}

                      {scanResult.teacherRecord?.terlambatMenit &&
                      scanResult.teacherRecord.terlambatMenit > 0 ? (
                        <div className="flex justify-between items-center py-1 bg-amber-100/80 dark:bg-amber-900/40 px-2 rounded-lg border border-amber-300 dark:border-amber-700">
                          <span className="text-amber-800 dark:text-amber-300 font-bold">
                            Terlambat:
                          </span>
                          <span className="font-extrabold text-amber-950 dark:text-amber-200">
                            +{scanResult.teacherRecord.terlambatMenit} Menit
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Student Result */}
                  {scanResult.student && (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-400">Nama Siswa:</span>
                        <span className="font-extrabold text-white uppercase">
                          {scanResult.student.nama}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-400">Kelas / NISN:</span>
                        <span className="font-semibold text-white dark:text-slate-200">
                          {scanResult.student.kelas} •{' '}
                          <span className="font-mono">{scanResult.student.nisn}</span>
                        </span>
                      </div>

                      {scanResult.type && (
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-slate-400">
                            Status & Jenis:
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
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
                            <span
                              className={`font-extrabold text-[9px] px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 border ${
                                scanResult.scanMethod === 'RFID'
                                  ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                                  : scanResult.scanMethod === 'Manual'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                  : 'bg-white/5 backdrop-blur-xl border border-white/10/10 border border-white/10 text-slate-200 dark:bg-slate-800 dark:text-slate-300 border-white/10'
                              }`}
                            >
                              {scanResult.scanMethod === 'RFID' ? (
                                <>
                                  <CreditCard className="w-2.5 h-2.5" />
                                  <span>RFID Card</span>
                                </>
                              ) : scanResult.scanMethod === 'Manual' ? (
                                <>
                                  <AlertCircle className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                                  <span>Lupa Kartu (Piket)</span>
                                </>
                              ) : (
                                <>
                                  <QrCode className="w-2.5 h-2.5" />
                                  <span>QR Code</span>
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Display note or reason if available */}
                      {scanResult.record?.catatan && (
                        <div className="text-[11px] bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                          <span className="font-bold">Keterangan: </span>
                          <span>{scanResult.record.catatan}</span>
                        </div>
                      )}

                      {scanResult.record?.terlambatMenit &&
                      scanResult.record.terlambatMenit > 0 ? (
                        <div className="flex justify-between items-center py-1 bg-amber-100/80 dark:bg-amber-900/40 px-2 rounded-lg border border-amber-300 dark:border-amber-700">
                          <span className="text-amber-800 dark:text-amber-300 font-bold">
                            Terlambat:
                          </span>
                          <span className="font-extrabold text-amber-950 dark:text-amber-200">
                            {formatLateDuration(scanResult.record.terlambatMenit)}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Network sync indicator in result card */}
                {scanResult.isOffline ? (
                  <div className="mt-3 p-2.5 bg-amber-100/90 dark:bg-amber-950/70 rounded-xl border border-amber-300 dark:border-amber-700/80 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2">
                    <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black text-[10px] uppercase tracking-wider block">Mode Offline: Disimpan di Cache Lokal</span>
                      <span className="text-[11px] text-slate-200 dark:text-slate-300">
                        Koneksi internet terputus. Presensi diamankan di memori lokal dan akan disinkronkan otomatis ke database cloud saat online.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2.5 text-[10px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1 font-bold">
                    <Wifi className="w-3 h-3 text-emerald-500" />
                    <span>Tersinkronisasi langsung dengan Database Cloud Supabase PostgreSQL</span>
                  </div>
                )}

                {/* Send WhatsApp Notification Option for Students */}
                {scanResult.student && scanResult.success && (
                  <button
                    onClick={() => handleSendWhatsApp(scanResult.student!, scanResult.record, scanResult.status)}
                    className="mt-3 w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Kirim WA OrtU ({scanResult.student.no_hp_ortu || 'Input No HP'})</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="py-8 border-2 border-dashed border-white/20 rounded-2xl text-center text-slate-400 space-y-1">
                <QrCode className="w-8 h-8 mx-auto text-white/30" />
                <p className="font-bold text-xs text-white/70">
                  {scanTargetMode === 'guru'
                    ? 'Arahkan Kartu NIP Guru ke Kamera'
                    : 'Arahkan QR Siswa ke Kamera'}
                </p>
                <p className="text-[10px] text-white/40">
                  Hasil absensi akan otomatis diperbarui secara instant di sini.
                </p>
              </div>
            )}
          </div>

          {/* Session Stream / Live Feed List */}
          <div className="backdrop-blur-xl bg-white/5 backdrop-blur-xl border border-white/10/5 backdrop-blur-xl border border-white/10/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-white/10">
              <span className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-blue-400" />
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
                    className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-2 transition-all backdrop-blur-xl shadow-sm ${
                      item.success
                        ? 'bg-emerald-500/10 border-emerald-500/20 shadow-[inset_0_0_15px_rgba(16,185,129,0.05)]'
                        : item.isDuplicate
                        ? 'bg-rose-500/10 border-rose-500/20 shadow-[inset_0_0_15px_rgba(244,63,94,0.05)]'
                        : 'bg-amber-500/10 border-amber-500/20 shadow-[inset_0_0_15px_rgba(245,158,11,0.05)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      {item.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : item.isDuplicate ? (
                        <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      )}
                      <div className="truncate">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-white truncate block">
                            {item.teacher
                              ? item.teacher.nama
                              : item.student
                              ? item.student.nama
                              : item.scannedCode}
                          </span>
                          {item.isOffline && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                              <WifiOff className="w-2.5 h-2.5" />
                              <span>Lokal</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-white/50 block truncate">
                          {item.teacher
                            ? `NIP: ${item.teacher.nip} • ${item.teacher.jabatan}`
                            : item.student
                            ? `${item.student.kelas} • ${item.student.nisn}`
                            : item.message}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="font-mono text-[10px] font-bold text-white/50 block">
                        {item.timestamp.split(' ')[0]}
                      </span>
                      {item.status ? (
                        <span
                          className={`inline-block text-[9px] font-black px-1.5 py-0.2 rounded ${
                            item.status === 'Hadir'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {item.status}
                        </span>
                      ) : item.isDuplicate ? (
                        <span className="inline-block text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300">
                          Ditolak
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <QRScannerModal
        scanResult={scanResult}
        isOpen={showModal && !rapidQueueMode}
        onClose={() => setShowModal(false)}
        modalDuration={modalDuration}
        scanTargetMode={scanTargetMode}
        selectedStudentForQR={selectedStudentForQR}
        setSelectedStudentForQR={setSelectedStudentForQR}
        studentsList={studentsList}
        selectedTeacherForQR={selectedTeacherForQR}
        setSelectedTeacherForQR={setSelectedTeacherForQR}
        teachersList={teachersList}
        handleAssignRfidToStudent={handleAssignRfidToStudent}
        handleConnectQRToStudent={handleConnectQRToStudent}
        handleAssignRfidToTeacher={handleAssignRfidToTeacher}
        handleConnectQRToTeacher={handleConnectQRToTeacher}
        lastScannedQR={lastScannedQR}
      />

      {/* Modal Presensi Lupa Kartu untuk Piket & Admin */}
      <LupaKartuModal
        isOpen={showLupaKartuModal}
        onClose={() => setShowLupaKartuModal(false)}
        currentOfficer={currentOfficer}
        initialTarget={scanTargetMode === 'guru' ? 'guru' : 'siswa'}
        onAttendanceRecorded={handleLupaKartuRecorded}
      />
    </div>
  );
};
