import React from 'react';
import { UserRole } from '../types';
import { SchoolLogo } from './SchoolLogo';
import {
  LayoutDashboard,
  QrCode,
  Users,
  FileSpreadsheet,
  Sparkles,
  History,
  Settings,
  ShieldAlert,
  CreditCard,
  Briefcase,
  UserCheck,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole?: UserRole;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, userRole = 'Admin' }) => {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard Kehadiran',
      icon: LayoutDashboard,
      roles: ['Admin', 'Guru', 'Kepala Sekolah'],
    },
    {
      id: 'scan',
      label: 'Scanner Absensi QR',
      icon: QrCode,
      roles: ['Admin', 'Guru'],
      badge: 'Utama',
    },
    {
      id: 'recap',
      label: 'Log Absensi Siswa',
      icon: FileSpreadsheet,
      roles: ['Admin', 'Guru', 'Kepala Sekolah'],
    },
    {
      id: 'teacher-recap',
      label: 'Log Presensi Guru',
      icon: UserCheck,
      roles: ['Admin', 'Guru', 'Kepala Sekolah'],
      badge: 'Guru',
    },
    {
      id: 'students',
      label: 'Database Siswa',
      icon: Users,
      roles: ['Admin', 'Guru', 'Kepala Sekolah'],
    },
    {
      id: 'teachers',
      label: 'Database Guru (NIP)',
      icon: Briefcase,
      roles: ['Admin', 'Guru', 'Kepala Sekolah'],
      badge: 'NIP',
    },
    {
      id: 'card-template',
      label: 'Template Kartu ID',
      icon: CreditCard,
      roles: ['Admin', 'Guru'],
      badge: 'Resmi',
    },
    {
      id: 'ai-analysis',
      label: 'Analisis AI Gemini',
      icon: Sparkles,
      roles: ['Admin', 'Kepala Sekolah'],
      badge: 'AI',
    },
    {
      id: 'logs',
      label: 'Log Aktivitas Sistem',
      icon: History,
      roles: ['Admin', 'Kepala Sekolah'],
    },
    {
      id: 'settings',
      label: 'Pengaturan Sekolah',
      icon: Settings,
      roles: ['Admin', 'Kepala Sekolah'],
    },
  ];

  const allowedItems = menuItems.filter((item) => item.roles.includes(userRole));

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900/90 dark:bg-slate-950/90 text-slate-300 min-h-[calc(100vh-4rem)] p-4 border-r border-slate-800/80 backdrop-blur-md transition-colors">
        <div className="mb-4 px-3.5 py-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Hak Akses</p>
            <p className="text-xs font-black text-cyan-400 mt-0.5">{userRole}</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Sesi Akses Aktif" />
        </div>

        <nav className="flex-1 space-y-1.5">
          {allowedItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25 scale-[1.01]'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-black tracking-wider uppercase ${
                      item.badge === 'AI'
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-slate-800/80 mt-auto text-xs text-slate-500 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <SchoolLogo className="w-6 h-6 drop-shadow-sm" />
            <span className="font-black text-cyan-400 tracking-wider text-sm">NEXA15</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">SMA Negeri 15 Ambon</p>
          <p className="text-[9px] text-slate-500 mt-0.5 font-mono">v2.5 • Smart School System</p>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 z-40 px-1 pt-2 pb-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex justify-around items-center text-xs shadow-2xl">
        {allowedItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all ${
                isActive ? 'text-cyan-400 font-extrabold bg-slate-800/90 shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'scale-110 text-cyan-400' : ''}`} />
              <span className="text-[9px] truncate max-w-[58px] leading-tight font-medium">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
