import React, { useState, useEffect } from 'react';
import { User, SchoolSettings } from '../types';
import { QrCode, LogOut, Sparkles, BookOpen, Clock, ShieldCheck, UserCheck, School, Sun, Moon, Wifi, WifiOff, KeyRound, CloudUpload, RefreshCw } from 'lucide-react';
import { SchoolLogo } from './SchoolLogo';
import { store } from '../lib/store';
import { toast } from '../lib/toast';

interface NavbarProps {
  currentUser: User | null;
  onLogout: () => void;
  onOpenSetupGuide: () => void;
  settings: SchoolSettings;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  onOpenSetupGuide,
  settings,
  activeTab,
  setActiveTab,
  theme = 'light',
  onToggleTheme,
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
    setIsSyncing(true);
    await store.processOfflineQueue();
    await store.fetchFromServer();
    await store.syncAllToServer();
    setOfflineQueueCount(store.getOfflineQueueCount());
    setIsSyncing(false);
    toast.success('Data presensi & siswa berhasil disinkronkan dengan Database Cloud & Server!');
  };


  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'Admin':
        return <span className="bg-amber-400/20 text-amber-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-amber-400/30 flex items-center gap-1 shadow-xs"><ShieldCheck className="w-3 h-3 text-amber-400" /> Admin</span>;
      case 'Guru':
        return <span className="bg-emerald-400/20 text-emerald-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1 shadow-xs"><UserCheck className="w-3 h-3 text-emerald-400" /> Guru Piket</span>;
      case 'Kepala Sekolah':
        return <span className="bg-purple-400/20 text-purple-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-purple-400/30 flex items-center gap-1 shadow-xs"><School className="w-3 h-3 text-purple-400" /> KepSek</span>;
      default:
        return null;
    }
  };

  return (
    <header className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl text-white shadow-lg border-b border-slate-800/80 sticky top-0 z-30 transition-colors w-full max-w-full">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2 sm:gap-3 cursor-pointer group shrink-0" onClick={() => setActiveTab('dashboard')}>
            <div className="relative shrink-0">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full blur-xs opacity-40 group-hover:opacity-80 transition duration-200"></div>
              <SchoolLogo className="w-8 h-8 sm:w-10 sm:h-10 relative drop-shadow-md transition-transform group-hover:scale-105" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="font-extrabold text-base sm:text-xl tracking-wider text-white flex items-center gap-1">
                  <span className="bg-gradient-to-r from-cyan-300 via-sky-200 to-blue-400 bg-clip-text text-transparent drop-shadow-xs font-black">NEXA15</span>
                </h1>
                <span className="hidden xl:inline-block px-2 py-0.5 text-[10px] font-extrabold bg-blue-500/20 text-cyan-300 rounded-md border border-cyan-400/30">
                  SMART SCHOOL
                </span>
              </div>
              <p className="text-[9px] sm:text-[11px] font-medium text-slate-400 hidden sm:block tracking-wide">
                SMA Negeri 15 Ambon Digital Presence
              </p>
            </div>
          </div>

          {/* Realtime Clock & Actions */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Online / Offline Network & Background Sync Indicators */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              <div
                className={`flex items-center gap-1 text-[10px] sm:text-xs px-2 py-1 rounded-lg sm:rounded-xl border font-bold transition-all ${
                  isOnline
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    : 'bg-amber-500/20 text-amber-200 border-amber-400/40 animate-pulse'
                }`}
                title={
                  isOnline
                    ? 'Sistem terhubung ke server (Online Sync Active)'
                    : 'Mode Offline: Semua data scan tersimpan otomatis di perangkat.'
                }
              >
                {isOnline ? (
                  <>
                    <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-400"></span>
                    </span>
                    <Wifi className="w-3 h-3 text-emerald-400 hidden sm:inline" />
                    <span className="text-[10px] sm:text-[11px] font-bold">Online</span>
                  </>
                ) : (
                  <>
                    <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-amber-400"></span>
                    </span>
                    <WifiOff className="w-3 h-3 text-amber-300 hidden sm:inline" />
                    <span className="text-[10px] sm:text-[11px] font-bold">Offline</span>
                  </>
                )}
              </div>

              {/* Sync Button (Always Available) */}
              <button
                onClick={handleForceSync}
                disabled={isSyncing}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer border shadow-xs ${
                  isSyncing
                    ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40 animate-pulse'
                    : offlineQueueCount > 0
                    ? 'bg-amber-500/30 hover:bg-amber-500/40 text-amber-100 border-amber-400/60 animate-bounce'
                    : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border-slate-700'
                }`}
                title="Klik untuk menyinkronkan data presensi & siswa ke Server & Cloud"
              >
                <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isSyncing ? 'animate-spin text-cyan-300' : 'text-sky-300'}`} />
                <span className="text-[10px] sm:text-[11px] hidden xs:inline">
                  {isSyncing
                    ? 'Sync...'
                    : offlineQueueCount > 0
                    ? `Sync (${offlineQueueCount})`
                    : 'Sync'}
                </span>
              </button>
            </div>

            {/* Realtime Clock */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/80 font-mono shadow-xs">
              <Clock className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>{time}</span>
            </div>

            {/* Global Dark Mode Theme Toggle */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="p-1.5 sm:p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 rounded-lg sm:rounded-xl transition-all shadow-xs flex items-center gap-1 text-xs font-semibold cursor-pointer"
                title={theme === 'dark' ? 'Ganti ke Mode Terang (Light Mode)' : 'Ganti ke Mode Gelap (Dark Mode)'}
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 animate-spin-slow" />
                    <span className="hidden lg:inline text-amber-200 text-[11px]">Terang</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-300" />
                    <span className="hidden lg:inline text-cyan-100 text-[11px]">Gelap</span>
                  </>
                )}
              </button>
            )}

            {/* Quick Setup Guide Button */}
            <button
              onClick={onOpenSetupGuide}
              className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs bg-slate-800/80 hover:bg-slate-700/80 text-cyan-200 border border-slate-700/80 rounded-lg sm:rounded-xl transition-all font-medium cursor-pointer flex items-center gap-1"
              title="Petunjuk Penggunaan & Arsitektur Developer"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline text-[11px]">Panduan</span>
            </button>

            {/* Quick AI Button */}
            {currentUser && (
              <button
                onClick={() => setActiveTab('ai-analysis')}
                className={`p-1.5 sm:px-2.5 sm:py-1.5 text-xs rounded-lg sm:rounded-xl border transition-all font-semibold cursor-pointer flex items-center gap-1 ${
                  activeTab === 'ai-analysis'
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                    : 'bg-slate-800/80 text-amber-200 border-amber-400/30 hover:bg-slate-700/80'
                }`}
                title="Analisis AI Gemini"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden md:inline text-[11px]">Analisis AI</span>
              </button>
            )}

            {/* User Profile / Role */}
            {currentUser && (
              <div className="flex items-center gap-1 sm:gap-2 pl-1 sm:pl-2 border-l border-slate-800">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-bold text-white leading-tight">{currentUser.name}</div>
                  <div className="mt-0.5">{getRoleBadge(currentUser.role)}</div>
                </div>

                <button
                  onClick={() => setActiveTab('settings')}
                  className="p-1.5 sm:p-2 text-amber-300 hover:text-white bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 rounded-lg sm:rounded-xl transition-all cursor-pointer"
                  title="Pengaturan & Kata Sandi"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={onLogout}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg sm:rounded-xl transition-colors cursor-pointer"
                  title="Keluar / Switch Akun"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
