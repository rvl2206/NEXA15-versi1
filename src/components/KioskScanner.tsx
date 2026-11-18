import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';
import { store, SyncQueueItem } from '../lib/store';
import {
  Flashlight,
  FlashlightOff,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Radio,
  ArrowLeft,
  Sparkles,
  Wifi,
  WifiOff,
  CloudOff,
  Database,
  Send,
  Loader2,
  Sun,
  SunMedium,
  FlipHorizontal,
  Focus,
  Maximize2,
  Minimize2,
  CameraOff,
  Zap,
  BatteryCharging,
  Laptop,
} from 'lucide-react';

interface KioskScannerProps {
  onExitKiosk?: () => void;
  officerName?: string;
}

interface ScanResultBanner {
  type: 'success_on_time' | 'success_late' | 'success_pulang' | 'duplicate' | 'error';
  title: string;
  subtitle: string;
  details?: string;
  timestamp: string;
  nama?: string;
  kelas?: string;
  foto?: string;
}

interface SearchedStudent {
  id: string;
  nisn: string;
  nama: string;
  kelas: string;
  foto?: string;
  rfidUid?: string;
}

// Native Web Audio Synthesizer (Instantaneous 0ms feedback, zero file download)
class KioskAudioBeep {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playSuccess() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1760, this.ctx.currentTime + 0.12); // A6
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.16);
    } catch {}
  }

  playWarning() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.setValueAtTime(330, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.26);
    } catch {}
  }

  playError() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.32);
    } catch {}
  }
}

const audioBeep = new KioskAudioBeep();

// Dedicated Digital Clock component to prevent parent re-renders and camera stutter
const DigitalClock: React.FC = React.memo(() => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jayapura',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      setTime(formatted + ' WIT');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return <p className="text-[10px] text-slate-400 truncate">{time || 'Ambon (WIT)'}</p>;
});

// Platform detection: Web Admin vs Native Mobile (Android APK)
const isNativePlatform = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();
const isMobileDevice =
  isNativePlatform ||
  (typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));

export const KioskScanner: React.FC<KioskScannerProps> = ({
  onExitKiosk,
  officerName = 'Petugas Gerbang',
}) => {
  // Mobile app defaults to rear ('environment') camera; Web Admin Panel defaults to front/webcam ('user')
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>(
    isMobileDevice ? 'environment' : 'user'
  );
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [banner, setBanner] = useState<ScanResultBanner | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [recentCount, setRecentCount] = useState<number>(0);

  // Eco Battery Mode: Reduces decoding rate (8 FPS) to prevent laptop battery drain
  const [isEcoMode, setIsEcoMode] = useState<boolean>(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('nexa_kiosk_eco_mode') === 'true';
    }
    return false;
  });

  const toggleEcoMode = useCallback(() => {
    setIsEcoMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('nexa_kiosk_eco_mode', String(next));
      } catch {}
      return next;
    });
  }, []);

  // Multi-tier Web & Mobile Camera Compatibility States
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState<boolean>(true);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return !!document.fullscreenElement;
    }
    return false;
  });

  // Scanner Enhancement: Zoom, Mirroring (Cermin), and Camera Sensor controls
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [isMirrored, setIsMirrored] = useState<boolean>(false);
  const [hasHardwareZoom, setHasHardwareZoom] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [hasContinuousFocus, setHasContinuousFocus] = useState<boolean>(false);

  // Screen Wake Lock (Ensures Kiosk Display Never Sleeps)
  const wakeLockRef = useRef<any>(null);

  const requestWakeLock = useCallback(async () => {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (e) {
        console.warn('Kiosk WakeLock notice:', e);
      }
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      try {
        wakeLockRef.current.release();
      } catch {}
      wakeLockRef.current = null;
    }
  }, []);

  // Online / Offline & Antrean Presensi Offline state
  const [isOnline, setIsOnline] = useState<boolean>(() => store.isOnline());
  const [isForceOffline, setIsForceOffline] = useState<boolean>(() => store.getForceOffline());
  const [offlineQueue, setOfflineQueue] = useState<SyncQueueItem[]>([]);
  const [showQueueModal, setShowQueueModal] = useState<boolean>(false);
  const [isSyncingQueue, setIsSyncingQueue] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Helper to refresh attendance queue items with reference equality check to prevent unnecessary re-renders
  const refreshQueue = useCallback(() => {
    try {
      const q = store.getSyncQueue();
      const attendanceQueue = q.filter((item) => item.type === 'attendance');
      setOfflineQueue((prev) => {
        if (
          prev.length === attendanceQueue.length &&
          prev.every((item, i) => item.id === attendanceQueue[i]?.id)
        ) {
          return prev;
        }
        return attendanceQueue;
      });
    } catch {
      setOfflineQueue([]);
    }
  }, []);

  useEffect(() => {
    refreshQueue();

    const updateConnectivity = async () => {
      const online = await store.checkRealInternetConnection();
      setIsOnline(online);
      refreshQueue();
    };

    updateConnectivity();

    const unsubscribe = store.subscribe(() => {
      refreshQueue();
      setIsOnline(store.isOnline());
      setIsForceOffline(store.getForceOffline());
    });

    // Native Capacitor Network change listener
    let networkListenerHandle: any = null;
    try {
      Network.addListener('networkStatusChange', (status) => {
        const hasNet = status.connected || (status.connectionType && status.connectionType !== 'none');
        if (status.connectionType === 'none') {
          store.setNetworkOnline(false);
        } else if (hasNet) {
          store.setNetworkOnline(true);
        }
        setIsOnline(store.isOnline());
        refreshQueue();
        if (hasNet && !store.getForceOffline()) {
          store.processPendingSyncQueue(true).then((res) => {
            refreshQueue();
            if (res.processedCount > 0) audioBeep.playSuccess();
          });
        }
      }).then((h) => {
        networkListenerHandle = h;
      });
    } catch {}

    const handleOnline = () => {
      store.setNetworkOnline(true);
      setIsOnline(true);
      updateConnectivity();
    };
    const handleOffline = () => {
      store.setNetworkOnline(false);
      setIsOnline(false);
      refreshQueue();
    };
    const handleFocus = () => {
      updateConnectivity();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleFocus);

    // Active heartbeat check every 15 seconds to keep connection state fresh without battery drain
    const interval = setInterval(updateConnectivity, 15000);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleFocus);
      if (networkListenerHandle && typeof networkListenerHandle.remove === 'function') {
        networkListenerHandle.remove();
      }
      clearInterval(interval);
    };
  }, [refreshQueue]);

  const handleManualSyncQueue = async () => {
    if (isSyncingQueue) return;
    setIsSyncingQueue(true);
    setSyncFeedback(null);

    const isNetOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isNetOnline) {
      setIsSyncingQueue(false);
      setSyncFeedback({
        type: 'error',
        message: 'Koneksi internet tidak terdeteksi. Hubungkan ke WiFi / Data Seluler untuk sinkronisasi ke server.',
      });
      return;
    }

    try {
      const res = await store.processPendingSyncQueue(true);
      refreshQueue();
      if (res.success && res.processedCount > 0) {
        audioBeep.playSuccess();
        setSyncFeedback({
          type: 'success',
          message: `Berhasil mengirim ${res.processedCount} data presensi ke server pusat!`,
        });
      } else if (res.remainingCount === 0) {
        setSyncFeedback({
          type: 'info',
          message: 'Semua data presensi sudah tersinkronisasi ke server.',
        });
      } else {
        setSyncFeedback({
          type: 'error',
          message: `Gagal mengirim ${res.remainingCount} data. Periksa koneksi internet Anda.`,
        });
      }
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: err?.message || 'Terjadi kesalahan saat menyinkronkan data ke server.',
      });
    } finally {
      setIsSyncingQueue(false);
    }
  };

  // Lupa Kartu / Manual Search state
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchedStudent[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Hardware RFID Keystroke buffer
  const rfidBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // Scanner ref
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'nexa-kiosk-video-feed';
  const isProcessingRef = useRef<boolean>(false);

  // Post scan directly to store (Client-side SSOT with automatic offline queue & Supabase sync)
  const handleProcessScan = useCallback(
    async (code: string, scanMethod: 'QR' | 'RFID' | 'NFC' | 'Manual' = 'QR') => {
      if (!code || isProcessingRef.current) return;
      isProcessingRef.current = true;
      setIsProcessing(true);
      console.log('[KioskScanner] Berhasil memindai kode:', code, 'Metode:', scanMethod);

      const nowFormatted =
        new Date().toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Jayapura',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }) + ' WIT';

      try {
        const storeResult = store.recordScan(code, undefined, undefined, officerName, 'Auto');

        if (storeResult.success && storeResult.student) {
          audioBeep.playSuccess();
          setRecentCount((prev) => prev + 1);
          refreshQueue();
          const isLate = storeResult.status === 'Terlambat';
          const isPulang = storeResult.type === 'Pulang';
          const isOfflineScan = !store.isOnline() || Boolean(storeResult.isOffline);

          setBanner({
            type: isPulang ? 'success_pulang' : isLate ? 'success_late' : 'success_on_time',
            title: isPulang
              ? (isOfflineScan ? 'PULANG TERCATAT (OFFLINE)' : 'PULANG TERCATAT')
              : isLate
                ? `TERLAMBAT (${storeResult.lateMinutes || 0} Menit)${isOfflineScan ? ' (OFFLINE)' : ''}`
                : (isOfflineScan ? 'MASUK TEPAT WAKTU (OFFLINE)' : 'MASUK TEPAT WAKTU'),
            subtitle: `${storeResult.student.nama} (${storeResult.student.kelas})`,
            details: `NISN: ${storeResult.student.nisn} • Pukul: ${nowFormatted} • Metode: ${scanMethod} • ${isOfflineScan ? 'Disimpan di Antrean Lokal' : 'Tersimpan ke Cloud'}`,
            timestamp: nowFormatted,
            nama: storeResult.student.nama,
            kelas: storeResult.student.kelas,
            foto: storeResult.student.foto,
          });
        } else if (storeResult.isDuplicate) {
          audioBeep.playWarning();
          setBanner({
            type: 'duplicate',
            title: 'SUDAH TERCATAT (DUPLIKAT)',
            subtitle: storeResult.message,
            details: `Waktu: ${nowFormatted} • Metode: ${scanMethod}`,
            timestamp: nowFormatted,
          });
        } else {
          audioBeep.playError();
          setBanner({
            type: 'error',
            title: 'KARTU / KODE TIDAK DIKENAL',
            subtitle: storeResult.message || 'Data kartu/QR tidak terdaftar di sistem NEXA15.',
            details: `Kode: ${code.slice(0, 20)}... • Pukul: ${nowFormatted}`,
            timestamp: nowFormatted,
          });
        }
      } catch (err: any) {
        audioBeep.playError();
        setBanner({
          type: 'error',
          title: 'GAGAL MEMPROSES SCAN',
          subtitle: err?.message || 'Terjadi kesalahan sistem saat memproses presensi.',
          details: `Pukul: ${nowFormatted}`,
          timestamp: nowFormatted,
        });
      } finally {
        refreshQueue();
        // Rearm scanner after 2.0 seconds cooldown without freezing camera video stream
        setTimeout(() => {
          setBanner(null);
          isProcessingRef.current = false;
          setIsProcessing(false);
        }, 2000);
      }
    },
    [officerName, refreshQueue]
  );

  // Tab Visibility Lifecycle: Auto-pause decoding loop when tab is hidden/minimized to eliminate battery drain
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!html5QrCodeRef.current) return;
      if (document.hidden) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.pause(true);
          }
        } catch {}
      } else {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.resume();
          }
        } catch {}
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Torch / Flashlight controller
  const toggleTorch = useCallback(async () => {
    try {
      const videoEl = document.querySelector(`#${scannerContainerId} video`) as HTMLVideoElement | null;
      const stream = videoEl?.srcObject as MediaStream | null;
      const track = stream?.getVideoTracks()[0];
      if (track) {
        const caps: any = track.getCapabilities ? track.getCapabilities() : {};
        if (caps && caps.torch) {
          const nextState = !torchOn;
          await track.applyConstraints({
            advanced: [{ torch: nextState } as any],
          });
          setTorchOn(nextState);
        } else {
          console.info('Kiosk notice: Kamera saat ini tidak memiliki kontrol lampu kilat/senter.');
        }
      }
    } catch (e) {
      console.warn('Torch toggle note:', e);
    }
  }, [scannerContainerId, torchOn]);

  // Hardware RFID Keystroke listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSearchModal) return;

      const now = Date.now();
      if (now - lastKeyTimeRef.current > 150) {
        rfidBufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        const fullScanned = rfidBufferRef.current.trim();
        rfidBufferRef.current = '';
        if (fullScanned.length >= 4) {
          handleProcessScan(fullScanned, 'RFID');
        }
      } else if (e.key.length === 1) {
        rfidBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleProcessScan, showSearchModal]);

  // Web NFC Listener (Supported in Android Chrome)
  useEffect(() => {
    let abortController: AbortController | null = null;

    if ('NDEFReader' in window) {
      try {
        abortController = new AbortController();
        const ndef = new (window as any).NDEFReader();
        ndef
          .scan({ signal: abortController.signal })
          .then(() => {
            ndef.addEventListener('reading', (event: any) => {
              const serialNumber = event.serialNumber;
              if (serialNumber) {
                handleProcessScan(serialNumber, 'NFC');
              }
            });
          })
          .catch(() => {});
      } catch {}
    }

    return () => {
      if (abortController) {
        try {
          abortController.abort();
        } catch {}
      }
    };
  }, [handleProcessScan]);

  // Helper untuk menerapkan transformasi visual (Mirroring dan Zoom) pada elemen video
  const updateVideoTransform = useCallback((mirrored: boolean, zoom: number) => {
    const videoEl = document.querySelector(`#${scannerContainerId} video`) as HTMLVideoElement | null;
    if (videoEl) {
      const parts: string[] = [];
      if (mirrored) parts.push('scaleX(-1)');
      if (zoom > 1.02) parts.push(`scale(${zoom})`);
      videoEl.style.transform = parts.length > 0 ? parts.join(' ') : 'none';
      videoEl.style.transformOrigin = 'center center';
      videoEl.style.transition = 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
    }
  }, [scannerContainerId]);

  // Camera Zoom (Hardware Optical / Sensor Zoom with GPU CSS Scale Fallback)
  const applyZoom = useCallback(async (targetZoom: number) => {
    setZoomLevel(targetZoom);

    // 1. Hardware Zoom on MediaStreamTrack
    try {
      const videoEl = document.querySelector(`#${scannerContainerId} video`) as HTMLVideoElement | null;
      const stream = videoEl?.srcObject as MediaStream | null;
      const track = stream?.getVideoTracks()[0];
      if (track) {
        const caps: any = track.getCapabilities ? track.getCapabilities() : {};
        if (caps && caps.zoom) {
          const minZ = caps.zoom.min || 1;
          const maxZ = caps.zoom.max || 5;
          const clamped = Math.max(minZ, Math.min(maxZ, targetZoom));
          await track.applyConstraints({
            advanced: [{ zoom: clamped } as any],
          });
        }
      }
    } catch (err) {
      console.warn('Hardware zoom constraint note:', err);
    }

    // 2. Hardware-accelerated CSS Zoom fallback on video element
    updateVideoTransform(isMirrored, targetZoom);

    if (targetZoom >= 2.0) {
      toast.info('Mode QR Kecil Aktif (Zoom 2.0x)', 'Fokus diperbesar 2x untuk membaca kartu dengan QR code kecil atau rapat.');
    }
  }, [scannerContainerId, isMirrored, updateVideoTransform]);

  // Toggle Mirroring Kamera (Normal vs Cermin)
  const toggleMirroring = useCallback(() => {
    setIsMirrored((prev) => {
      const next = !prev;
      updateVideoTransform(next, zoomLevel);
      if (next) {
        toast.info('Mode Cermin Aktif', 'Tampilan kamera dibalik secara horizontal (mirrored).');
      } else {
        toast.info('Mode Normal Aktif', 'Tampilan kamera normal tanpa pembalikan (kartu presensi terbaca lurus).');
      }
      return next;
    });
  }, [updateVideoTransform, zoomLevel]);

  // Kalibrasi Penyesuaian Cahaya Otomatis (Auto Light & Continuous Auto Exposure Sensor)
  const triggerAutoLight = useCallback(async () => {
    try {
      const videoEl = document.querySelector(`#${scannerContainerId} video`) as HTMLVideoElement | null;
      const stream = videoEl?.srcObject as MediaStream | null;
      const track = stream?.getVideoTracks()[0];
      if (track && track.getCapabilities) {
        const caps: any = track.getCapabilities();
        const advanced: any = {};
        if (caps.exposureMode && Array.isArray(caps.exposureMode) && caps.exposureMode.includes('continuous')) {
          advanced.exposureMode = 'continuous';
        }
        if (caps.whiteBalanceMode && Array.isArray(caps.whiteBalanceMode) && caps.whiteBalanceMode.includes('continuous')) {
          advanced.whiteBalanceMode = 'continuous';
        }
        if (caps.focusMode && Array.isArray(caps.focusMode) && caps.focusMode.includes('continuous')) {
          advanced.focusMode = 'continuous';
        }
        if (Object.keys(advanced).length > 0) {
          await track.applyConstraints({ advanced: [advanced] });
        }
      }
      toast.success('Auto Cahaya Aktif', 'Sensor kamera otomatis menyesuaikan pencahayaan kartu.');
    } catch {
      toast.info('Auto Cahaya Aktif', 'Sensor kamera memproses pencahayaan dinamis secara otomatis.');
    }
  }, [scannerContainerId]);

  // Kalibrasi Ulang Fokus Lensa (Continuous Autofocus Retrigger)
  const triggerRefocus = useCallback(async () => {
    try {
      const videoEl = document.querySelector(`#${scannerContainerId} video`) as HTMLVideoElement | null;
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
        }
      }
    } catch {}
  }, [scannerContainerId]);

  // Start Camera with Multi-Tier Web & Mobile Camera Fallback & Battery Optimization
  const startCamera = async (targetCamId?: string) => {
    setIsStartingCamera(true);
    setCameraError(null);

    try {
      // 1. Check browser MediaDevices support
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setIsStartingCamera(false);
        setIsCameraActive(false);
        if (typeof window !== 'undefined' && window.isSecureContext === false) {
          setCameraError('Akses kamera diblokir browser karena koneksi HTTP tidak aman. Harap buka aplikasi menggunakan https:// atau http://localhost.');
        } else {
          setCameraError('Browser ini tidak mendukung akses kamera langsung (MediaDevices API tidak tersedia).');
        }
        return;
      }

      // 2. Fetch available camera devices & map friendly labels for Web Admin vs Mobile
      let currentDevices = availableCameras;
      try {
        const fetched = await Html5Qrcode.getCameras();
        if (fetched && fetched.length > 0) {
          currentDevices = fetched.map((d, idx) => {
            let friendlyLabel = d.label || `Kamera ${idx + 1}`;
            if (!isMobileDevice) {
              if (/integrated|built-in|internal|facetime|webcam|bawaan/i.test(d.label)) {
                friendlyLabel = `Kamera Bawaan (${d.label})`;
              } else if (/usb|external/i.test(d.label)) {
                friendlyLabel = `Kamera Eksternal (${d.label})`;
              }
            }
            return {
              id: d.id,
              label: friendlyLabel,
            };
          });
          setAvailableCameras(currentDevices);
        }
      } catch (e) {
        console.warn('Kiosk getCameras note:', e);
      }

      // 3. Ensure DOM element is mounted
      const containerEl = document.getElementById(scannerContainerId);
      if (!containerEl) {
        setIsStartingCamera(false);
        return;
      }

      // 4. Scanning configuration:
      // Setting qrbox focuses the frame directly on the card, preventing ambient room
      // and background lighting from washing out the black-and-white QR code contrast.
      const scanConfig: any = {
        fps: 20,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const boxSize = Math.max(220, Math.floor(minEdge * 0.78));
          return { width: boxSize, height: boxSize };
        },
        disableFlip: true,
      };

      // Helper function to safely attempt starting a camera configuration
      // Cleanly resets instance to prevent Html5Qrcode transition/already-running locks
      let lastErrMsg = '';
      const tryStartConfig = async (cameraConfig: any): Promise<boolean> => {
        try {
          if (html5QrCodeRef.current) {
            try {
              if (html5QrCodeRef.current.isScanning) {
                await html5QrCodeRef.current.stop();
              }
              html5QrCodeRef.current.clear();
            } catch {}
            html5QrCodeRef.current = null;
          }

          const el = document.getElementById(scannerContainerId);
          if (el) el.innerHTML = '';

          // Use reliable pure ZXing engine supporting all standard student card barcode/QR formats
          const qrCode = new Html5Qrcode(scannerContainerId, {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
            ],
            verbose: false,
          });

          await qrCode.start(
            cameraConfig,
            scanConfig,
            (decodedText) => {
              handleProcessScan(decodedText, 'QR');
            },
            () => {}
          );

          html5QrCodeRef.current = qrCode;
          return true;
        } catch (err: any) {
          console.warn('Camera tier attempt note for config:', cameraConfig, err);
          lastErrMsg = err?.message || String(err);
          return false;
        }
      };

      let started = false;

      // Determine preferred camera device ID if available
      let preferredCamId = targetCamId || selectedCameraId;

      if (!preferredCamId && currentDevices.length > 0) {
        if (!isMobileDevice) {
          // On Desktop Admin Panel, auto-select integrated built-in webcam
          const integrated = currentDevices.find((d) =>
            /integrated|built-in|internal|facetime|webcam|bawaan/i.test(d.label)
          );
          if (integrated) {
            preferredCamId = integrated.id;
          } else {
            preferredCamId = currentDevices[0].id;
          }
        } else {
          // On Mobile, auto-select rear/environment camera
          const rear = currentDevices.find((d) =>
            /back|rear|belakang|environment/i.test(d.label)
          );
          if (rear) {
            preferredCamId = rear.id;
          }
        }
      }

      // TIER 1: If specific camera ID is selected or auto-detected (e.g. Kamera Bawaan Laptop)
      if (preferredCamId) {
        started = await tryStartConfig(preferredCamId);
        if (!started) {
          started = await tryStartConfig({
            deviceId: { exact: preferredCamId },
          });
        }
        if (started) {
          setSelectedCameraId(preferredCamId);
        }
      }

      // TIER 2: 720p constraints with facingMode (Battery & CPU friendly, avoids 1080p overheat)
      if (!started) {
        started = await tryStartConfig({
          facingMode: facingMode,
          width: { ideal: 1280, max: 1280, min: 640 },
          height: { ideal: 720, max: 720, min: 480 },
        });
      }

      // TIER 3: Standard resolution with current facingMode
      if (!started) {
        started = await tryStartConfig({ facingMode: facingMode });
      }

      // TIER 4: Opposite facingMode (Crucial for Web/PC/Laptop where 'environment' doesn't exist)
      if (!started) {
        const altFacing = facingMode === 'environment' ? 'user' : 'environment';
        started = await tryStartConfig({ facingMode: altFacing });
        if (started) {
          setFacingMode(altFacing);
        }
      }

      // TIER 5: Fallback to any enumerated camera deviceId
      if (!started && currentDevices.length > 0) {
        for (const dev of currentDevices) {
          started = await tryStartConfig(dev.id);
          if (started) {
            setSelectedCameraId(dev.id);
            break;
          }
        }
      }

      // TIER 6: Blank media track constraints
      if (!started) {
        started = await tryStartConfig({});
      }

      if (started) {
        setIsCameraActive(true);
        setIsStartingCamera(false);
        setCameraError(null);

        // Hardware sensor calibration
        setTimeout(async () => {
          try {
            const videoEl = document.querySelector(`#${scannerContainerId} video`) as HTMLVideoElement | null;
            const stream = videoEl?.srcObject as MediaStream | null;
            const track = stream?.getVideoTracks()[0];
            if (track) {
              const caps: any = track.getCapabilities ? track.getCapabilities() : {};
              if (caps.zoom) setHasHardwareZoom(true);
              if (caps.torch) setHasTorch(true);
              if (caps.focusMode) setHasContinuousFocus(true);

              const advancedConstraints: any = {};
              if (caps.focusMode && Array.isArray(caps.focusMode) && caps.focusMode.includes('continuous')) {
                advancedConstraints.focusMode = 'continuous';
              }
              if (caps.exposureMode && Array.isArray(caps.exposureMode) && caps.exposureMode.includes('continuous')) {
                advancedConstraints.exposureMode = 'continuous';
              }
              if (caps.whiteBalanceMode && Array.isArray(caps.whiteBalanceMode) && caps.whiteBalanceMode.includes('continuous')) {
                advancedConstraints.whiteBalanceMode = 'continuous';
              }
              if (Object.keys(advancedConstraints).length > 0) {
                await track.applyConstraints({ advanced: [advancedConstraints] });
              }

              if (zoomLevel > 1.0) {
                applyZoom(zoomLevel);
              }
            }

            updateVideoTransform(isMirrored, zoomLevel);
          } catch (e) {
            console.warn('Hardware camera calibration note:', e);
          }
        }, 350);
      } else {
        setIsCameraActive(false);
        setIsStartingCamera(false);
        let readableError = 'Kamera tidak dapat diakses atau sedang digunakan oleh aplikasi lain.';
        const errLower = lastErrMsg.toLowerCase();
        if (errLower.includes('permission') || errLower.includes('notallowed')) {
          readableError = 'Izin kamera ditolak oleh browser. Klik ikon gembok/kamera di samping URL browser untuk mengizinkan akses kamera, lalu klik Coba Hubungkan Ulang.';
        } else if (errLower.includes('notfound') || errLower.includes('devicesnotfound')) {
          readableError = 'Tidak ada perangkat kamera / webcam yang terdeteksi di laptop / komputer ini.';
        } else if (errLower.includes('notreadable') || errLower.includes('trackstarterror')) {
          readableError = 'Kamera sedang digunakan oleh aplikasi lain (seperti Zoom, Google Meet, atau scanner lain). Tutup aplikasi tersebut lalu klik Coba Hubungkan Ulang.';
        }
        setCameraError(readableError);
      }
    } catch (e: any) {
      console.warn('Camera startup note:', e);
      setIsCameraActive(false);
      setIsStartingCamera(false);
      setCameraError(e?.message || 'Terjadi kesalahan saat memulai kamera.');
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch {}
      html5QrCodeRef.current = null;
    }
    setTorchOn(false);
    setIsCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode, isEcoMode]);

  // Flip Camera or Cycle Available Cameras
  const toggleFacingMode = () => {
    if (availableCameras.length > 1) {
      const curIndex = availableCameras.findIndex((c) => c.id === selectedCameraId);
      const nextIndex = (curIndex + 1) % availableCameras.length;
      const nextDev = availableCameras[nextIndex];
      setSelectedCameraId(nextDev.id);
      startCamera(nextDev.id);
    } else {
      setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    }
  };

  // Toggle Fullscreen (Dedicated Terminal Mode)
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        }
      }
    } catch (e) {
      console.warn('Fullscreen toggle note:', e);
    }
  };

  // Search Students for Lupa Kartu
  const handleSearchStudents = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/students/search?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const list = await res.json();
        setSearchResults(list);
        return;
      }
    } catch {}

    // Fallback to local store students
    try {
      const all = store.getStudents();
      const qLower = query.trim().toLowerCase();
      const matches = all
        .filter(
          (s) =>
            (s.nama || '').toLowerCase().includes(qLower) ||
            (s.nisn || '').toLowerCase().includes(qLower) ||
            (s.kelas || '').toLowerCase().includes(qLower)
        )
        .slice(0, 20)
        .map((s) => ({
          id: s.id,
          nisn: s.nisn,
          nama: s.nama,
          kelas: s.kelas,
          foto: s.foto,
          rfidUid: s.rfid_uid || (s as any).rfidUid,
        }));
      setSearchResults(matches);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col select-none overflow-hidden font-sans w-screen h-screen w-[100dvw] h-[100dvh]">
      {/* Top Header Bar (Safe area padded) */}
      <header className="px-3 sm:px-4 py-2 pt-[max(env(safe-area-inset-top),0.5rem)] bg-slate-950/98 border-b border-slate-800 flex items-center justify-between shrink-0 z-20 min-h-[3.75rem]">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onExitKiosk && (
            <button
              onClick={onExitKiosk}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 transition-colors shrink-0"
              title="Kembali ke Dashboard Web Admin"
              aria-label="Kembali"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-white text-xs sm:text-sm tracking-wide flex items-center gap-1 truncate">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                NEXA15 KIOSK
              </span>
              {isForceOffline ? (
                <button
                  onClick={() => {
                    setShowQueueModal(true);
                    setSyncFeedback(null);
                  }}
                  className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/25 text-rose-300 border border-rose-500/60 flex items-center gap-1 shrink-0 active:scale-95 transition-all cursor-pointer"
                  title="Mode Paksa Offline Aktif - Klik untuk ubah"
                >
                  <WifiOff className="w-2.5 h-2.5" />
                  PAKSA OFFLINE
                </button>
              ) : !isOnline ? (
                <button
                  onClick={async () => {
                    const online = await store.checkRealInternetConnection();
                    if (online) {
                      setIsOnline(true);
                      refreshQueue();
                    } else {
                      setShowQueueModal(true);
                      setSyncFeedback(null);
                    }
                  }}
                  className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/50 flex items-center gap-1 shrink-0 active:scale-95 transition-all cursor-pointer"
                  title="Aplikasi Offline - Klik untuk cek koneksi atau buka antrean"
                >
                  <WifiOff className="w-2.5 h-2.5" />
                  OFFLINE
                </button>
              ) : offlineQueue.length > 0 ? (
                <button
                  onClick={() => {
                    setShowQueueModal(true);
                    setSyncFeedback(null);
                  }}
                  className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/25 text-amber-300 border border-amber-500/60 flex items-center gap-1 shrink-0 active:scale-95 transition-all cursor-pointer shadow-sm shadow-amber-500/30"
                  title="Ada data offline yang menunggu dikirim"
                >
                  <CloudOff className="w-2.5 h-2.5" />
                  {offlineQueue.length} Antrean
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowQueueModal(true);
                    setSyncFeedback(null);
                  }}
                  className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shrink-0 cursor-pointer active:scale-95"
                  title="Koneksi Online Aktif - Klik untuk opsi mode offline"
                >
                  <Wifi className="w-2.5 h-2.5" />
                  ONLINE
                </button>
              )}
            </div>
            <DigitalClock />
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Eco Mode / Hemat Baterai Toolbar Button */}
          <button
            onClick={toggleEcoMode}
            className={`px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-xl border transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer ${
              isEcoMode
                ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/20'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title={
              isEcoMode
                ? 'Mode Hemat Baterai AKTIF (8 FPS) - Meminimalkan beban CPU & daya baterai laptop'
                : 'Aktifkan Mode Hemat Baterai (Menurunkan frekuensi pemindaian ke 8 FPS untuk menghemat baterai laptop)'
            }
            aria-label="Hemat Baterai"
          >
            <BatteryCharging className={`w-4 h-4 ${isEcoMode ? 'text-emerald-400 animate-pulse' : ''}`} />
            <span className="hidden sm:inline text-xs font-bold">
              {isEcoMode ? 'Hemat Baterai: ON' : 'Hemat Baterai'}
            </span>
          </button>

          {/* Kamera Bawaan / Device Selector for Web Admin */}
          {availableCameras.length > 1 && !isMobileDevice && (
            <div className="hidden lg:flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-xl px-2 py-1 text-xs">
              <Laptop className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <select
                value={selectedCameraId}
                onChange={(e) => {
                  setSelectedCameraId(e.target.value);
                  startCamera(e.target.value);
                }}
                className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer max-w-[150px] truncate"
                title="Pilih Sumber Kamera Kiosk"
              >
                {availableCameras.map((cam) => (
                  <option key={cam.id} value={cam.id} className="bg-slate-900 text-slate-200">
                    {cam.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Antrean Offline Button */}
          <button
            onClick={() => {
              setShowQueueModal(true);
              setSyncFeedback(null);
            }}
            className={`relative p-2 rounded-xl border transition-all active:scale-95 ${
              offlineQueue.length > 0
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Daftar Antrean Presensi Offline"
            aria-label="Antrean Offline"
          >
            <Database className="w-4 h-4" />
            {offlineQueue.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] flex items-center justify-center">
                {offlineQueue.length > 99 ? '99+' : offlineQueue.length}
              </span>
            )}
          </button>

          {/* Torch Button */}
          <button
            onClick={toggleTorch}
            className={`p-2 rounded-xl border transition-all active:scale-95 ${
              torchOn
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Lampu Senter"
            aria-label="Senter"
          >
            {torchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
          </button>

          {/* Flip Camera Button */}
          <button
            onClick={toggleFacingMode}
            className="p-2 rounded-xl bg-slate-800/80 text-slate-400 border border-slate-700 hover:text-slate-200 active:scale-95 transition-colors relative cursor-pointer"
            title={availableCameras.length > 1 ? `Ganti Kamera (${availableCameras.length} terdeteksi)` : "Putar Kamera Depan/Belakang"}
            aria-label="Putar Kamera"
          >
            <RefreshCw className="w-4 h-4" />
            {availableCameras.length > 1 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-cyan-500 text-slate-950 font-black text-[8px] flex items-center justify-center">
                {availableCameras.length}
              </span>
            )}
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className={`p-2 rounded-xl border transition-all active:scale-95 cursor-pointer ${
              isFullscreen
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-500/20'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh (Mode Kiosk Mandiri)'}
            aria-label="Layar Penuh"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Scanner Viewport Area */}
      <div
        onClick={triggerRefocus}
        className="relative flex-1 w-full bg-black flex items-center justify-center overflow-hidden min-h-0 cursor-pointer"
        title="Ketuk layar untuk kalibrasi ulang fokus lensa"
      >
        {/* Scoped CSS enforcing single video viewport & strictly hiding decoding canvas */}
        <style>{`
          #${scannerContainerId} {
            position: relative !important;
            width: 100% !important;
            height: 100% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            overflow: hidden !important;
          }
          #${scannerContainerId} video {
            width: 100% !important;
            height: 100% !important;
            max-width: 100% !important;
            max-height: 100% !important;
            object-fit: contain !important;
            display: block !important;
            margin: 0 auto !important;
          }
          #${scannerContainerId} canvas {
            display: none !important;
            visibility: hidden !important;
            position: absolute !important;
            width: 0 !important;
            height: 0 !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
        `}</style>

        {/* Html5Qrcode video target container */}
        <div id={scannerContainerId} className="w-full h-full flex items-center justify-center" />

        {/* Loading Overlay */}
        {isStartingCamera && !cameraError && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30 pointer-events-none">
            <Loader2 className="w-9 h-9 text-emerald-400 animate-spin" />
            <p className="text-xs text-slate-300 font-bold tracking-wide">Menghubungkan Sensor Kamera Kiosk...</p>
          </div>
        )}

        {/* Camera Error Overlay with Interactive Troubleshooting */}
        {cameraError && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30"
          >
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-3 shadow-lg shadow-rose-500/10">
              <CameraOff className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-white mb-1.5">Kamera Kiosk Tidak Aktif</h3>
            <p className="text-xs text-slate-300 max-w-sm mb-4 leading-relaxed">
              {cameraError}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 max-w-xs">
              <button
                type="button"
                onClick={() => startCamera()}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/30 active:scale-95 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Coba Hubungkan Ulang
              </button>

              {availableCameras.length > 1 && (
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-cyan-400" />
                  Ganti Kamera ({availableCameras.length})
                </button>
              )}
            </div>

            {availableCameras.length > 1 && (
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl">
                <span>Sumber Webcam:</span>
                <select
                  value={selectedCameraId}
                  onChange={(e) => {
                    setSelectedCameraId(e.target.value);
                    startCamera(e.target.value);
                  }}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-400"
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
        )}

        {/* Viewfinder Target Graphic Overlay (Expanded capture area) */}
        {!cameraError && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            <div className="relative w-[min(76vw,76vh,320px)] h-[min(76vw,76vh,320px)] border-2 border-emerald-500/40 rounded-3xl overflow-hidden transition-all duration-300 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
              {/* Corner Indicators */}
              <div className="absolute top-0 left-0 w-7 h-7 sm:w-9 sm:h-9 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl" />
              <div className="absolute top-0 right-0 w-7 h-7 sm:w-9 sm:h-9 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl" />
              <div className="absolute bottom-0 left-0 w-7 h-7 sm:w-9 sm:h-9 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl" />
              <div className="absolute bottom-0 right-0 w-7 h-7 sm:w-9 sm:h-9 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl" />

              {/* Smooth Hardware-Accelerated Laser Scanning Line */}
              <div className="kiosk-laser-line" />
            </div>

            <p className="mt-3 text-[11px] font-bold text-emerald-300 tracking-wide bg-slate-950/85 px-3 py-1 rounded-full border border-emerald-500/30 backdrop-blur-md shadow-lg pointer-events-none">
              {zoomLevel >= 2.0
                ? 'Mode QR Kecil Aktif • Tahan Kartu 20–30 cm'
                : 'Posisikan Kartu di Tengah Kotak Hijau (Jarak 25–40 cm)'}
            </p>
          </div>
        )}

        {/* Floating Instruction Pill */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-900/95 border border-slate-700/80 rounded-full text-[10.5px] font-semibold text-slate-200 flex items-center gap-1.5 shadow-2xl whitespace-nowrap max-w-[90vw] pointer-events-none z-10">
          <Radio className="w-3 h-3 text-emerald-400 shrink-0" />
          <span className="truncate">
            {!isMobileDevice ? 'Kamera Bawaan Aktif • Arahkan Kartu QR / Barcode' : 'Arahkan Kartu Pelajar QR / RFID'}
          </span>
        </div>

        {/* Floating Scanner Enhancement Toolbar (Zoom, Anti-Silau, Hemat Baterai, Senter) */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-11 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2 z-20 max-w-[96vw] pointer-events-auto"
        >
          {/* Zoom Selector (1.0x, 1.5x, 2.0x Mode QR Kecil) */}
          <div className="flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-0.5 shadow-xl">
            <button
              onClick={() => applyZoom(1.0)}
              className={`px-2 py-1 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all active:scale-95 ${
                zoomLevel === 1.0
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Zoom Normal (1.0x)"
            >
              1.0x
            </button>
            <button
              onClick={() => applyZoom(1.5)}
              className={`px-2 py-1 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all active:scale-95 ${
                zoomLevel === 1.5
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Zoom 1.5x (Optimal untuk QR Sedang & Jarak 25 cm)"
            >
              1.5x
            </button>
            <button
              onClick={() => applyZoom(2.0)}
              className={`px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all active:scale-95 ${
                zoomLevel === 2.0
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20 ring-2 ring-emerald-400/40'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Zoom 2.0x (Mode QR Kecil / Rapat)"
            >
              2.0x (QR Kecil)
            </button>
          </div>

          {/* Tombol Toggle Mirroring Kamera (Normal vs Cermin) */}
          <button
            onClick={toggleMirroring}
            className={`px-2.5 py-1 rounded-2xl border text-[10px] sm:text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 shadow-xl cursor-pointer ${
              isMirrored
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-extrabold shadow-cyan-500/30'
                : 'bg-slate-900/90 backdrop-blur-md text-slate-300 border-slate-700/80 hover:text-white'
            }`}
            title="Klik untuk membalik tampilan kamera (Mode Normal / Cermin)"
          >
            <FlipHorizontal className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">{isMirrored ? 'Cermin: ON' : 'Cermin: OFF'}</span>
          </button>

          {/* Indikator / Kalibrasi Auto Cahaya Adaptif */}
          <button
            onClick={triggerAutoLight}
            className="px-2.5 py-1 rounded-2xl border text-[10px] sm:text-[11px] font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-xl cursor-pointer bg-slate-900/90 backdrop-blur-md text-amber-300 border-amber-500/40 hover:bg-slate-800"
            title="Sensor kamera otomatis menyesuaikan pencahayaan dan kontras kartu presensi"
          >
            <SunMedium className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="whitespace-nowrap">Auto Cahaya</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          {/* Mode Hemat Baterai (Eco Mode) */}
          <button
            onClick={toggleEcoMode}
            className={`px-2.5 py-1 rounded-2xl border text-[10px] sm:text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 shadow-xl cursor-pointer ${
              isEcoMode
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-emerald-500/30'
                : 'bg-slate-900/90 backdrop-blur-md text-slate-300 border-slate-700/80 hover:text-white'
            }`}
            title="Mode Hemat Baterai: Menjalankan pemindaian 8 FPS untuk menghemat daya baterai & menjaga laptop tetap dingin"
          >
            <BatteryCharging className="w-3 h-3 shrink-0" />
            <span className="whitespace-nowrap">{isEcoMode ? 'Hemat Baterai ON' : 'Hemat Baterai'}</span>
          </button>

          {/* Senter Quick Button */}
          <button
            onClick={toggleTorch}
            className={`px-2.5 py-1 rounded-2xl border text-[10px] sm:text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 shadow-xl cursor-pointer ${
              torchOn
                ? 'bg-amber-400 text-slate-950 border-amber-300 font-extrabold shadow-amber-400/30'
                : 'bg-slate-900/90 backdrop-blur-md text-slate-300 border-slate-700/80 hover:text-white'
            }`}
            title="Lampu Senter: Aktifkan di tempat redup atau kurang terang (Kamera ponsel)"
          >
            {torchOn ? <Flashlight className="w-3 h-3 text-slate-950 shrink-0" /> : <FlashlightOff className="w-3 h-3 shrink-0" />}
            <span className="whitespace-nowrap">{torchOn ? 'Senter ON' : 'Senter'}</span>
          </button>
        </div>

        {/* Outcome Banner (Responsive bottom placement with solid dark backdrop) */}
        {banner && (
          <div className="absolute bottom-3 inset-x-3 sm:inset-x-6 max-w-md mx-auto z-40 animate-in fade-in slide-in-from-bottom-4 duration-200 pointer-events-none">
            <div
              className={`p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border shadow-2xl ${
                banner.type === 'success_on_time'
                  ? 'bg-emerald-950/98 border-emerald-500/60 text-emerald-100 shadow-emerald-500/20'
                  : banner.type === 'success_late'
                    ? 'bg-amber-950/98 border-amber-500/60 text-amber-100 shadow-amber-500/20'
                    : banner.type === 'success_pulang'
                      ? 'bg-blue-950/98 border-blue-500/60 text-blue-100 shadow-blue-500/20'
                      : banner.type === 'duplicate'
                        ? 'bg-orange-950/98 border-orange-500/60 text-orange-100 shadow-orange-500/20'
                        : 'bg-rose-950/98 border-rose-500/60 text-rose-100 shadow-rose-500/20'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                    banner.type === 'success_on_time'
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : banner.type === 'success_late'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : banner.type === 'success_pulang'
                          ? 'bg-blue-500/20 border-blue-400 text-blue-300'
                          : banner.type === 'duplicate'
                            ? 'bg-orange-500/20 border-orange-400 text-orange-300'
                            : 'bg-rose-500/20 border-rose-400 text-rose-300'
                  }`}
                >
                  {banner.type === 'success_on_time' || banner.type === 'success_pulang' ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : banner.type === 'success_late' ? (
                    <Clock className="w-6 h-6" />
                  ) : banner.type === 'duplicate' ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : (
                    <XCircle className="w-6 h-6" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-xs sm:text-sm font-black tracking-wide uppercase leading-tight">
                    {banner.title}
                  </h3>
                  <p className="text-sm sm:text-base font-bold text-white mt-0.5 truncate">
                    {banner.subtitle}
                  </p>
                  {banner.details && (
                    <p className="text-[10px] sm:text-xs text-slate-300 mt-0.5 truncate opacity-90">
                      {banner.details}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Controls (Safe area padded) */}
      <footer className="px-3 sm:px-4 py-2.5 sm:py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] bg-slate-900/95 border-t border-slate-800/80 flex items-center justify-between gap-2.5 sm:gap-3 shrink-0 z-20">
        <div className="text-[11px] sm:text-xs text-slate-400 min-w-0">
          <p className="font-semibold text-slate-200 truncate">
            Total Scan: <span className="text-emerald-400 font-bold">{recentCount} Siswa</span>
          </p>
          {offlineQueue.length > 0 ? (
            <button
              onClick={() => {
                setShowQueueModal(true);
                setSyncFeedback(null);
              }}
              className="text-[10px] text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <CloudOff className="w-3 h-3 animate-pulse text-amber-400" />
              <span>{offlineQueue.length} data antrean offline</span>
            </button>
          ) : (
            <p className="text-[10px] text-slate-400 truncate max-w-[130px] sm:max-w-none">{officerName}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {offlineQueue.length > 0 && (
            <button
              onClick={() => {
                setShowQueueModal(true);
                setSyncFeedback(null);
              }}
              className="px-3 py-2.5 sm:py-3 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs shadow-md active:scale-95 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Antrean ({offlineQueue.length})</span>
            </button>
          )}

          <button
            onClick={() => {
              setShowSearchModal(true);
              setSearchQuery('');
              setSearchResults([]);
            }}
            className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-xl shadow-blue-600/30 flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer shrink-0"
          >
            <Search className="w-4 h-4" />
            <span>Lupa Kartu</span>
          </button>
        </div>
      </footer>

      {/* Lupa Kartu Search Modal (Bottom Sheet with responsive keyboard height) */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 flex flex-col max-h-[88dvh] pb-[max(env(safe-area-inset-bottom),1rem)] shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                <h3 className="font-bold text-sm sm:text-base text-white">Presensi Siswa (Lupa Kartu)</h3>
              </div>
              <button
                onClick={() => setShowSearchModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 shrink-0">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => handleSearchStudents(e.target.value)}
                placeholder="Ketik Nama atau NISN Siswa..."
                className="w-full px-3.5 py-2.5 sm:py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 text-xs sm:text-sm"
              />
            </div>

            <div className="mt-2.5 flex-1 overflow-y-auto divide-y divide-slate-800 min-h-[180px]">
              {isSearching ? (
                <div className="p-8 text-center text-slate-400 text-xs sm:text-sm">Mencari siswa...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map((std) => (
                  <div
                    key={std.id}
                    className="py-2.5 px-1.5 flex items-center justify-between hover:bg-slate-800/50 rounded-xl transition-colors gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold border border-slate-700 text-xs sm:text-sm shrink-0">
                        {std.nama ? std.nama[0] : 'S'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-white truncate">{std.nama}</p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {std.kelas} • NISN: {std.nisn}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowSearchModal(false);
                        handleProcessScan(std.nisn, 'Manual');
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 shrink-0"
                    >
                      Absen
                    </button>
                  </div>
                ))
              ) : searchQuery.trim() ? (
                <div className="p-8 text-center text-slate-400 text-xs sm:text-sm">
                  Tidak ada siswa ditemukan dengan kata kunci "{searchQuery}".
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Ketik nama atau NISN siswa untuk absensi darurat tanpa kartu.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Daftar Antrean Presensi Offline Modal */}
      {showQueueModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 flex flex-col max-h-[90dvh] pb-[max(env(safe-area-inset-bottom),1rem)] shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Database className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                    Antrean Presensi Offline
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        offlineQueue.length > 0
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {offlineQueue.length} Data
                    </span>
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-400">
                    Data disimpan aman di memori HP dan siap dikirim ke server.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowQueueModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            {/* Network status notice */}
            <div className="mt-3 shrink-0">
              {isForceOffline ? (
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2">
                  <WifiOff className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>
                    <strong>Mode Paksa Offline Aktif.</strong> Sistem sengaja mengalihkan seluruh presensi ke antrean lokal HP.
                  </span>
                </div>
              ) : !isOnline ? (
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2">
                  <WifiOff className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>
                    <strong>HP sedang Offline.</strong> Siswa tetap bisa scan presensi normal. Seluruh data tersimpan aman di HP.
                  </span>
                </div>
              ) : offlineQueue.length > 0 ? (
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Online aktif.</strong> Terdapat {offlineQueue.length} data presensi offline yang siap dikirim ke server.
                  </span>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Semua Data Sinkron.</strong> Seluruh rekaman presensi sudah tersimpan di server database cloud.
                  </span>
                </div>
              )}
            </div>

            {/* Recheck Internet Button when offline */}
            {!isForceOffline && !isOnline && (
              <div className="mt-2 shrink-0">
                <button
                  type="button"
                  onClick={async () => {
                    const online = await store.checkRealInternetConnection();
                    setIsOnline(online);
                    refreshQueue();
                    if (online) {
                      setSyncFeedback({ type: 'success', message: 'Koneksi internet berhasil dipulihkan! Status kembali ONLINE.' });
                    } else {
                      setSyncFeedback({ type: 'error', message: 'Internet belum terdeteksi. Pastikan data seluler atau WiFi aktif di HP.' });
                    }
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-cyan-300 text-xs font-bold border border-cyan-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                  Periksa Ulang Sinyal Internet
                </button>
              </div>
            )}

            {/* Force Offline Control Box */}
            <div className="mt-2.5 p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <p className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                  Simulasi / Paksa Mode Offline
                  {isForceOffline && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40">
                      AKTIF
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                  Aktifkan untuk menguji antrean offline atau jika sinyal gerbang sekolah lemah.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !isForceOffline;
                  setIsForceOffline(next);
                  store.setForceOffline(next);
                  if (next) {
                    store.setNetworkOnline(false);
                    setIsOnline(false);
                  } else {
                    store.checkRealInternetConnection().then((online) => {
                      setIsOnline(online);
                      refreshQueue();
                    });
                  }
                }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer shrink-0 border ${
                  isForceOffline
                    ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600'
                }`}
              >
                {isForceOffline ? 'Matikan' : 'Aktifkan'}
              </button>
            </div>

            {/* Sync Feedback Message */}
            {syncFeedback && (
              <div
                className={`mt-2.5 p-2.5 rounded-xl text-xs flex items-center gap-2 shrink-0 ${
                  syncFeedback.type === 'success'
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-200'
                    : syncFeedback.type === 'error'
                      ? 'bg-rose-500/20 border border-rose-500/40 text-rose-200'
                      : 'bg-blue-500/20 border border-blue-500/40 text-blue-200'
                }`}
              >
                {syncFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : syncFeedback.type === 'error' ? (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                )}
                <span className="flex-1">{syncFeedback.message}</span>
              </div>
            )}

            {/* List of offline queue records */}
            <div className="mt-3 flex-1 overflow-y-auto divide-y divide-slate-800 min-h-[180px] max-h-[48dvh] pr-1">
              {offlineQueue.length === 0 ? (
                <div className="py-10 px-4 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-white">Antrean Kosong</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Tidak ada presensi tertunda. Semua scan telah tersinkronisasi ke server pusat.
                  </p>
                </div>
              ) : (
                offlineQueue.map((item, idx) => {
                  const data = item.data || {};
                  const isPulang = data.jenis === 'Pulang';
                  const isLate = data.status === 'Terlambat';
                  const lateMnt = data.terlambatMenit || 0;
                  const timeFormatted = data.timestamp
                    ? new Date(data.timestamp).toLocaleTimeString('id-ID', {
                        timeZone: 'Asia/Jayapura',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      }) + ' WIT'
                    : new Date(item.timestamp).toLocaleTimeString('id-ID', {
                        timeZone: 'Asia/Jayapura',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      }) + ' WIT';

                  return (
                    <div
                      key={item.id || idx}
                      className="py-2.5 px-1.5 flex items-center justify-between hover:bg-slate-800/40 rounded-xl transition-colors gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs shrink-0">
                          {data.nama ? data.nama.charAt(0).toUpperCase() : idx + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-white truncate">
                            {data.nama || 'Siswa'}
                          </p>
                          <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                            {data.kelas || '-'} • NISN: {data.nisn || '-'}
                          </p>
                          <p className="text-[9px] text-slate-400 mt-0.5">
                            Pukul: <span className="text-slate-300">{timeFormatted}</span> • Metode:{' '}
                            <span className="text-slate-300">{data.scan_method || 'QR'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            isPulang
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                              : isLate
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          }`}
                        >
                          {isPulang ? 'Pulang' : isLate ? `Terlambat (${lateMnt}m)` : 'Tepat Waktu'}
                        </span>
                        <span className="text-[9px] text-amber-400 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                          Menunggu Server
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
              <button
                onClick={() => setShowQueueModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs font-semibold transition-colors"
              >
                Tutup
              </button>

              <button
                onClick={handleManualSyncQueue}
                disabled={isSyncingQueue || offlineQueue.length === 0}
                className={`px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer ${
                  offlineQueue.length === 0
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : isSyncingQueue
                      ? 'bg-emerald-700 text-white cursor-wait'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30'
                }`}
              >
                {isSyncingQueue ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyinkronkan...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {offlineQueue.length > 0
                        ? `Kirim ${offlineQueue.length} Data ke Server`
                        : 'Semua Data Terkirim'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
