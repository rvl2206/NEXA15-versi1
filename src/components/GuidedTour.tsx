import React, { useState, useEffect } from 'react';
import { Joyride, EventData, STATUS, Step } from 'react-joyride';

interface GuidedTourProps {
  run: boolean;
  onFinish: () => void;
  activeTab: string;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({ run, onFinish, activeTab }) => {
  const [steps, setSteps] = useState<Step[]>([]);

  useEffect(() => {
    // We target `.tour-step-...` which exist both in Sidebar (desktop) and BottomNav (mobile).
    // React Joyride will attach to the first visible element it finds matching the selector.
    setSteps([
      {
        target: 'body',
        placement: 'center',
        content: (
          <div className="text-left">
            <h3 className="font-bold text-lg mb-2 text-slate-800">Selamat datang di NEXA15! 👋</h3>
            <p className="text-sm text-slate-600">
              Mari ikuti tur singkat ini untuk memahami fitur-fitur utama aplikasi presensi kami.
            </p>
          </div>
        ),
        skipBeacon: true,
      },
      {
        target: '.tour-step-dashboard',
        content: (
          <div className="text-left">
            <h3 className="font-bold text-base mb-1 text-slate-800">Beranda (Dashboard)</h3>
            <p className="text-xs text-slate-600">
              Di sini Anda bisa melihat ringkasan presensi harian, grafik kehadiran, dan statistik penting lainnya secara real-time.
            </p>
          </div>
        ),
        placement: 'right',
        skipBeacon: true,
      },
      {
        target: '.tour-step-dashboard-summary',
        content: (
          <div className="text-left">
            <h3 className="font-bold text-base mb-1 text-slate-800">Ringkasan & Metrik</h3>
            <p className="text-xs text-slate-600">
              Di sini Anda dapat berpindah antara tab Presensi Siswa, Presensi Guru, Grafik, dan Peringatan Kritis.
            </p>
          </div>
        ),
        placement: 'bottom',
        skipBeacon: true,
      },
      {
        target: '.tour-step-scan',
        content: (
          <div className="text-left">
            <h3 className="font-bold text-base mb-1 text-slate-800">Scanner Absensi QR</h3>
            <p className="text-xs text-slate-600">
              Gunakan menu ini untuk memindai kartu pelajar siswa atau kartu pegawai guru. Scan Masuk di pagi hari dan Scan Pulang saat jam pulang.
            </p>
          </div>
        ),
        placement: 'right',
        skipBeacon: true,
      },
      {
        target: '.tour-step-recap',
        content: (
          <div className="text-left">
            <h3 className="font-bold text-base mb-1 text-slate-800">Log Presensi Siswa</h3>
            <p className="text-xs text-slate-600">
              Anda bisa melihat rekapitulasi data scan, mengubah status kehadiran, atau mengekspor data ke Excel/PDF dari menu ini.
            </p>
          </div>
        ),
        placement: 'right',
        skipBeacon: true,
      },
      {
        target: '.tour-step-students',
        content: (
          <div className="text-left">
            <h3 className="font-bold text-base mb-1 text-slate-800">Database Siswa</h3>
            <p className="text-xs text-slate-600">
              Kelola data master siswa di sini. Anda juga bisa mengimpor data siswa secara massal menggunakan format Excel.
            </p>
          </div>
        ),
        placement: 'right',
        skipBeacon: true,
      },
      {
        target: 'body',
        placement: 'center',
        content: (
          <div className="text-left">
            <h3 className="font-bold text-lg mb-2 text-slate-800">Selesai! 🎉</h3>
            <p className="text-sm text-slate-600">
              Anda sudah siap menggunakan aplikasi NEXA15. Jika butuh bantuan, Anda selalu bisa menghubungi Administrator.
            </p>
          </div>
        ),
        skipBeacon: true,
      },
    ]);
  }, [activeTab]);

  const handleJoyrideCallback = (data: EventData) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      onFinish();
    }
  };

  return (
    <Joyride
      onEvent={handleJoyrideCallback}
      continuous
      run={run}
      scrollToFirstStep
      steps={steps}
      options={{
        zIndex: 10000,
        primaryColor: '#3b82f6',
        backgroundColor: '#ffffff',
        textColor: '#1e293b',
        buttons: ['back', 'skip', 'primary'],
        showProgress: true,
      }}
      styles={{
        buttonPrimary: {
          backgroundColor: '#3b82f6',
          fontSize: '12px',
          padding: '8px 12px',
          borderRadius: '8px',
        },
        buttonBack: {
          color: '#64748b',
          fontSize: '12px',
        },
        buttonSkip: {
          color: '#64748b',
          fontSize: '12px',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
      }}
      locale={{
        back: 'Kembali',
        close: 'Tutup',
        last: 'Selesai',
        next: 'Lanjut',
        skip: 'Lewati',
      }}
    />
  );
};
