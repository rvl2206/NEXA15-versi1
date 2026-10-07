import React, { useState, useEffect } from 'react';
import { User, SchoolSettings } from '../types';
import {
  Menu,
  QrCode,
  LogOut,
  BookOpen,
  Clock,
  ShieldCheck,
  UserCheck,
  School,
  Sun,
  Moon,
  Wifi,
  WifiOff,
  KeyRound,
  CloudUpload,
  RefreshCw,
  PanelLeftOpen,
  HelpCircle,
} from 'lucide-react';
import { SchoolLogo } from './SchoolLogo';
import { store } from '../lib/store';
import { toast } from '../lib/toast';

interface NavbarProps {
  currentUser: User | null;
  onLogout: () => void;
  settings: SchoolSettings;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onToggleMobileSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
  onStartTour?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  settings,
  activeTab,
  setActiveTab,
  onToggleMobileSidebar,
  isMobileSidebarOpen,
  onStartTour,
}) => {
  const [time, setTime] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(store.getOfflineQueueCount());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = store.subscribe(() => {
      setOfflineQueueCount(store.getOfflineQueueCount());
    });

    const updateClock = () => {
      const now = new Date();
      setTime(
        now.toLocaleDateString('id-ID', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          timeZone: 'Asia/Jayapura',
        }) +
          ' | ' +
          now.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'Asia/Jayapura',
          }) +
          ' WIT'
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const handleForceSync = async () => {
    if (offlineQueueCount > 0) {
      window.dispatchEvent(new CustomEvent('open-unsynced-modal'));
    }
    setIsSyncing(true);
    try {
      const res = await store.syncAllPendingToDatabase(true);
      const remaining = store.getOfflineQueueCount();
      setOfflineQueueCount(remaining);
      if (res.success) {
        toast.success('Sinkronisasi Sukses', res.message);
      } else {
        toast.warning('Sinkronisasi Parsial', res.message);
      }
    } catch (err: any) {
      toast.error('Gagal Sinkronisasi', err?.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsSyncing(false);
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'Admin':
        return (
          <span className="bg-amber-400/20 text-amber-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-amber-400/30 flex items-center gap-1 shadow-xs">
            <ShieldCheck className="w-3 h-3 text-amber-400" /> Admin
          </span>
        );
      case 'Guru':
        return (
          <span className="bg-emerald-400/20 text-emerald-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1 shadow-xs">
            <UserCheck className="w-3 h-3 text-emerald-400" /> Guru Piket
          </span>
        );
      case 'Kepala Sekolah':
        return (
          <span className="bg-purple-400/20 text-purple-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-purple-400/30 flex items-center gap-1 shadow-xs">
            <School className="w-3 h-3 text-purple-400" /> KepSek
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl text-white shadow-lg border-b border-slate-800/80 sticky top-0 z-30 transition-colors w-full max-w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-1.5 sm:gap-2">
          {/* Brand Logo & Mobile Sidebar Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Prominent Mobile Hamburger / Sidebar Menu Button */}
            {onToggleMobileSidebar && (
              <button
                type="button"
                onClick={onToggleMobileSidebar}
                className="md:hidden p-2 sm:px-2.5 sm:py-2 text-cyan-300 hover:text-white bg-slate-800/90 hover:bg-slate-700/90 border border-cyan-500/40 rounded-xl transition-all shadow-xs flex items-center gap-1.5 font-black text-xs cursor-pointer btn-press"
                title="Buka Menu Sidebar"
                aria-label="Buka Menu Sidebar"
              >
                <Menu className="w-5 h-5 text-cyan-400" />
                <span className="hidden xs:inline text-[11px] font-extrabold tracking-wide uppercase">Menu</span>
              </button>
            )}

            {/* Brand Logo & Name */}
            <div
              className="flex items-center gap-2 sm:gap-3 cursor-pointer group shrink-0"
              onClick={() => setActiveTab('dashboard')}
            >
              <div className="relative shrink-0">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full blur-xs opacity-40 group-hover:opacity-80 transition duration-200"></div>
                <SchoolLogo className="w-8 h-8 sm:w-10 sm:h-10 relative drop-shadow-md transition-transform group-hover:scale-105" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1 sm:gap-2">
                  <h1 className="font-extrabold text-base sm:text-xl tracking-wider text-white flex items-center gap-1">
                    <span className="text-white font-black">
                      NEXA15
                    </span>
                  </h1>
                  <span className="hidden xl:inline-block px-2 py-0.5 text-[10px] font-extrabold bg-blue-500/20 text-cyan-300 rounded-md border border-cyan-400/30">
                    SMART SCHOOL
                  </span>
                </div>
                <p className="text-[9px] sm:text-[11px] font-medium text-slate-400 hidden sm:block tracking-wide truncate max-w-[200px] lg:max-w-none">
                  SMA Negeri 15 Ambon Digital Presence
                </p>
              </div>
            </div>
          </div>

          {/* Realtime Clock & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Realtime Clock (Desktop only) */}
            <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-medium text-slate-400 tabular-nums">
              <Clock className="w-3.5 h-3.5 text-cyan-400 opacity-70" />
              <span>{time}</span>
            </div>

            <div className="h-4 w-px bg-white/10 hidden xl:block mx-1"></div>

            {/* Sync & Network Status */}
            <div className="flex items-center gap-0.5 sm:gap-1">
               {/* Online Indicator Dot */}
              <div
                className="flex items-center justify-center w-7 h-7 rounded-full"
                title={isOnline ? 'Sistem terhubung ke server (Online)' : 'Mode Offline'}
              >
                <span className="relative flex h-2 w-2">
                  {isOnline ? (
                     <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                     </>
                  ) : (
                     <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                     </>
                  )}
                </span>
              </div>

              {/* Sync Button */}
              <button
                onClick={handleForceSync}
                disabled={isSyncing}
                className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-all cursor-pointer btn-press ${
                  isSyncing
                    ? 'text-cyan-400 bg-cyan-500/10'
                    : offlineQueueCount > 0
                    ? 'text-rose-400 bg-rose-500/10 hover:bg-rose-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title={offlineQueueCount > 0 ? `PERINGATAN: Ada ${offlineQueueCount} data belum terkirim! Klik untuk sync.` : 'Sinkronisasi data'}
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {offlineQueueCount > 0 && !isSyncing && (
                  <span className="absolute top-0 right-0 -mt-0.5 -mr-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-slate-900 shadow-md">
                    {offlineQueueCount}
                  </span>
                )}
              </button>
            </div>



            {/* Quick AI Button */}
            {currentUser && (
              <button
                onClick={onStartTour}
                className="hidden md:flex items-center justify-center w-8 h-8 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-full transition-all cursor-pointer btn-press"
                title="Panduan"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            )}

            {/* User Profile / Role & Critical Actions */}
            {currentUser && (
              <div className="flex items-center gap-3 pl-3 sm:pl-4 border-l border-white/10 shrink-0 ml-1">
                <div className="hidden md:flex flex-col items-end">
                  <div className="text-sm font-bold text-white leading-none truncate max-w-[120px]">
                    {currentUser.name.split(' ').slice(0, 2).join(' ')}
                  </div>
                  <div className="text-[10px] font-medium text-slate-400 mt-1.5 uppercase tracking-widest">{currentUser.role}</div>
                </div>

                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/5 shadow-inner">
                    <button
                    onClick={() => setActiveTab('settings')}
                    className="flex items-center justify-center w-8 h-8 text-amber-400/80 hover:text-amber-300 hover:bg-amber-400/20 rounded-full transition-all cursor-pointer btn-press"
                    title="Pengaturan"
                    >
                    <KeyRound className="w-4 h-4" />
                    </button>

                    <button
                    onClick={onLogout}
                    className="flex items-center justify-center w-8 h-8 text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/20 rounded-full transition-all cursor-pointer btn-press"
                    title="Keluar"
                    >
                    <LogOut className="w-4 h-4 pl-0.5" />
                    </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

